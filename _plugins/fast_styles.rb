# frozen_string_literal: true

require "digest"
require "json"
require "fileutils"
require "tailwindcss/ruby"

# FastStyles — the stylesheet pipeline, run as one batch.
#
# WHY THIS FILE EXISTS. The build compiles four stylesheets: `app.css` (the
# shared entry, compiled by the Tailwind CLI) and one sheet per entry in
# `css_modes` (_config.yml). Two hooks used to do that work in sequence, each
# running the CLI once per sheet, and each CLI start is a process. On a repeat
# build of this site (the dev loop) those four runs were 1.9-2.1s of a 4.2s
# build — the largest single cost in it — and a sheet was recompiled even when
# nothing it is built from had changed.
#
# Two things make it cheap, in order of how much they buy:
#
#   1. FINGERPRINTED. Each output remembers what it was built from: the bytes
#      of its CSS import closure, the CLI and its flags, and, for a sheet that
#      scans for candidates, the bytes of every file the scanner reads. Nothing
#      in that set changed means nothing is recompiled — a repeat build runs no
#      CLI at all, and an edit to one note's prose recompiles only app.css. The
#      mode sheets are not built from the site at all, so they are skipped by
#      any edit that does not touch CSS (1.5s of the old cost).
#   2. PARALLEL. When sheets DO need building, the four compilations are
#      spawned together and waited for once, so the batch costs the slowest
#      sheet rather than the sum: measured on this machine, 2.7-3.5s serial
#      against 1.3s in one batch when quiet, and 13.8s against 6.6s under the
#      load of a few editors and browsers. A single run is ~0.4s quiet and up
#      to 6s loaded, which is why the fingerprint matters more than the
#      parallelism: the cheapest CLI run is the one that does not happen.
#
# Measured here on the repeat build, before and after (interleaved A/B, load
# ~13): the stylesheet hooks 1.9-2.1s -> 0.05-0.06s, the whole build 4.2s ->
# 1.85s. A clean build (no _site, no cache) is unchanged in shape and slightly
# faster: 3.9s -> 3.4s.
#
# WHAT IT REPLACES. The `jekyll-tailwind` gem's post_write hook compiles
# app.css, uncached and alone; `_plugins/css_modes.rb` compiles the mode sheets.
# The gem's hook is retired here and this file does that work in the same shape,
# so there is one owner of the pipeline and one place to look when a sheet is
# stale. `css_modes.rb` keeps its config contract and its documentation and
# delegates its hook to this module, which is how the mode sheets end up in the
# same batch: the whole pipeline is one `waitall`, not four sequential runs.
#
# The command line each sheet is built with is unchanged, and the outputs are
# validated the same way (a missing or empty sheet raises with the CLI's own
# log rather than failing silently in a browser).
module FastStyles
  # Never content-hashed when fingerprinting the scan set: media, archives and
  # fonts cannot contribute a class candidate, and hashing a 40MB video to
  # decide whether to recompile a stylesheet is not a trade worth making.
  UNSCANNABLE = %w[
    .png .jpg .jpeg .gif .webp .avif .svg .ico .bmp .tif .tiff
    .mp4 .webm .mov .avi .mkv .m4v .mp3 .wav .ogg .flac
    .woff .woff2 .ttf .otf .eot
    .zip .gz .tgz .bz2 .xz .7z .pdf .psd .ai .sketch .dmg .iso
    .so .dylib .dll .o .a .class .jar .wasm .bin .exe
  ].freeze

  # Directories Tailwind never reads, and neither do we.
  ALWAYS_SKIP = %w[.git node_modules].freeze

  # Nor does it read stylesheets (a sheet is a sheet, not a source of class
  # names) or lockfiles. Hashing them would rebuild app.css every time a
  # component's CSS was edited — the one edit that never changes what app.css
  # can contain, because a component arrives in it by `@import` and is in the
  # fingerprint's closure half.
  NOT_CANDIDATES = %w[.css .pcss .scss .sass .less .styl .map
                      package-lock.json yarn.lock pnpm-lock.yaml Gemfile.lock].freeze

  class << self
    # `fast_styles: false` is the off switch, and so is the `enabled` key:
    # either shape is honoured, because a config that raises NoMethodError is a
    # worse way to learn the syntax.
    def config(site)
      value = site.config["fast_styles"]
      value.is_a?(Hash) ? value : {}
    end

    # Drop the jekyll-tailwind gem's post_write hook, by file: it does the same
    # compile this file does, uncached and on its own.
    def retire_upstream_hook!
      registry = Jekyll::Hooks.instance_variable_get(:@registry)[:site][:post_write]
      return 0 if registry.nil?

      removed = registry.count { |hook| hook.source_location&.first.to_s.include?("jekyll-tailwind") }
      registry.reject! { |hook| hook.source_location&.first.to_s.include?("jekyll-tailwind") }
      removed
    end

    def enabled?(site)
      return false if ENV["PL_FAST_STYLES"] == "0"
      return false if site.config["fast_styles"] == false

      config(site).fetch("enabled", true)
    end

    # Both halves of the fast path: the escape hatch turns off the batch with the
    # cache, since a cache nobody may trust is worse than none.
    def caching?(site)
      enabled?(site) && config(site).fetch("cache", true)
    end

    # Build every sheet that needs building. `only:` restricts the batch, which
    # is what a fallback caller (css_modes.rb) uses if this hook did not run.
    def build(site, only: nil)
      wanted = jobs(site)
      wanted = wanted.select { |j| j[:kind] == only } if only
      wanted = wanted.reject { |j| fresh?(site, j) }

      pending = caching?(site) ? wanted.reject { |j| cached?(site, j) } : wanted

      if pending.empty?
        Jekyll.logger.debug "FastStyles:", "#{wanted.size} sheet(s) already up to date"
        return
      end

      Jekyll.logger.debug "FastStyles:", "building #{pending.map { |j| j[:name] }.join(", ")}"
      run(site, pending)
    end

    # A sheet whose file was written after this build started was built in this
    # pass — by the batch, or by the fallback in css_modes.rb — and is not built
    # again. `site.time` is set at the start of every build, including each
    # rebuild of a `jekyll serve` session, which is what makes this safe to ask
    # twice in one pass and harmless to ask on the next.
    def fresh?(site, job)
      File.file?(job[:output]) && File.mtime(job[:output]) >= site.time
    end

    # A sheet is either the Tailwind entry (`app.css`) or one of the site's
    # modes. Only the entry scans the source tree: a mode sheet is hand-written
    # CSS that carries no utilities, run through the same CLI so that it is
    # minified by the same minifier and a syntax error fails the build here
    # rather than in a browser.
    def jobs(site)
      list = []
      entry = site.config.fetch("tailwind", {})
      if entry["input"]
        list << make_job(
          site,
          :kind => :entry,
          :name => "app.css",
          :log => "Tailwind",
          :input => entry.fetch("input"),
          :output => File.join(site.dest, in_destination(site, entry.fetch("output"))),
          :minify => entry.fetch("minify", false),
          :scans => true,
          :spec => entry
        )
      end

      site.config.fetch("css_modes", {}).each do |name, spec|
        list << make_job(
          site,
          :kind => :modes,
          :name => name.to_s,
          :log => "CSS mode: #{name}",
          :input => spec.fetch("input"),
          :output => File.join(site.dest, in_destination(site, spec.fetch("output"))),
          :minify => spec.fetch("minify", true),
          :scans => false,
          :spec => spec
        )
      end
      list
    end

    # WHAT AN OUTPUT PATH MEANS. `tailwind.output` is written as
    # `_site/assets/css/app.css` — the destination directory plus the path
    # inside it — while a `css_modes` output is already relative to the
    # destination. Both mean "inside the site being built", so the destination
    # part is resolved away and what is left hangs off `site.dest`. Taken
    # literally, `_site/…` would put app.css in one site and the mode sheets in
    # another whenever the destination moved (`--destination build/`, a
    # per-agent destination, a config override), which is a split site with no
    # error to show for it.
    def in_destination(site, configured)
      configured = configured.to_s
      prefixes = [site.config["destination"], site.dest, File.basename(site.dest), "_site"]
      prefixes.compact.map(&:to_s).each do |prefix|
        prefix = prefix.chomp("/")
        next if prefix.empty?

        return configured[(prefix.length + 1)..] if configured.start_with?("#{prefix}/")
      end
      configured
    end

    def make_job(site, kind:, name:, log:, input:, output:, minify:, scans:, spec:)
      {
        :kind => kind,
        :name => name,
        :log => log,
        :input => File.expand_path(input, site.source),
        :output => File.expand_path(output),
        :minify => minify,
        :scans => scans,
        :spec => spec,
      }
    end

    # Does this sheet still match what it was built from? Cheapest first: the
    # output exists, the recorded fingerprint is this one, the size matches.
    def cached?(site, job)
      return false unless File.file?(job[:output])

      record = cache(site)[job[:name]]
      return false unless record && record["fp"] == fingerprint(site, job)
      return false unless record["bytes"] == File.size(job[:output])

      true
    end

    def fingerprint(site, job)
      parts = [tailwind_bin, job[:input], job[:output], job[:minify].to_s, command(site, job).join("\u0000")]
      closure(job[:input]).sort.each { |path| parts << path << Digest::SHA256.file(path).hexdigest }
      scan_set(site, job).each { |path| parts << path << Digest::SHA256.file(path).hexdigest } if job[:scans]
      Digest::SHA256.hexdigest(parts.join("\u0001"))
    end

    # Every stylesheet reachable from `entry` through `@import`. `@source` and
    # `@plugin` are not imports, but an edit to one changes the build, and the
    # entry's own bytes (hashed above) carry them.
    def closure(entry, seen = {})
      return [] if seen[entry] || !File.file?(entry)

      seen[entry] = true
      out = [entry]
      File.read(entry).scan(%r{@import\s+["']([^"']+)["']}) do |(ref)|
        next if ref.start_with?("http", "tailwindcss")

        out.concat(closure(File.expand_path(ref, File.dirname(entry)), seen))
      end
      out
    end

    # The files a scanning sheet reads for candidates: the whole source tree
    # less what the sheet itself excludes with `@source not` (resolved relative
    # to the stylesheet, as Tailwind resolves it), less the build's own output,
    # less the trees Tailwind ignores anyway. Over-inclusion only costs a
    # rebuild; under-inclusion would ship a stale sheet, so this is generous.
    def scan_set(site, job)
      excluded = File.read(job[:input]).scan(%r{@source\s+not\s+["']([^"']+)["']}).flatten
      excluded = excluded.map { |p| File.expand_path(p, File.dirname(job[:input])) }

      Dir.glob("**/*", File::FNM_DOTMATCH, :base => site.source).sort.filter_map do |rel|
        next if rel.start_with?(".")
        next if ALWAYS_SKIP.any? { |d| rel.start_with?("#{d}/") }
        next if destination?(site, rel)
        next unless File.file?(File.join(site.source, rel))

        abs = File.join(site.source, rel)
        next if UNSCANNABLE.include?(File.extname(abs).downcase)
        next if NOT_CANDIDATES.include?(File.extname(abs).downcase) || NOT_CANDIDATES.include?(File.basename(abs))
        next if excluded.any? { |ex| abs == ex || abs.start_with?("#{ex}/") }

        abs
      end
    end

    # A destination is not an input. Ours is excluded by construction, and so is
    # `_site` and any `_site.<session>` beside it: those are other builds' output
    # — a per-agent destination lives in this very directory — and hashing one
    # build's rendered HTML as Tailwind candidates is how a fingerprint ends up
    # depending on what somebody else's build happened to write.
    def destination?(site, rel)
      top = rel.to_s.split("/", 2).first
      return true if top == "_site" || top.start_with?("_site.")

      abs = File.expand_path(File.join(site.source, rel))
      dest = File.expand_path(site.dest)
      abs == dest || abs.start_with?("#{dest}/")
    end

    def tailwind_bin
      @tailwind_bin ||= Tailwindcss::Ruby.executable
    end

    # The command the gem and css_modes.rb built, flag for flag, so a sheet
    # that is rebuilt here is rebuilt exactly as it was before.
    def command(site, job)
      spec = job[:spec] || {}
      cmd = [tailwind_bin, "--output", job[:output], "--config", spec.fetch("config", "tailwind.config.js")]
      cmd += ["--input", job[:input]]
      cmd << "--minify" if job[:minify]
      postcss = spec.fetch("postcss", "postcss.config.js")
      cmd += ["--postcss", postcss] if File.exist?(File.join(site.source, postcss))
      cmd
    end

    # An output this pipeline wrote for a sheet that is no longer configured is
    # deleted — and only one it recorded, so nothing else in _site/assets/css is
    # touched by this.
    def prune(site)
      current = jobs(site).map { |j| j[:output] }
      removed = cache(site).reject { |_, record| current.include?(record["output"]) }
      removed.each do |name, record|
        File.delete(record["output"]) if record["output"] && File.file?(record["output"])
        Jekyll.logger.debug "FastStyles:", "removed #{name} (#{record["output"]})"
        cache(site).delete(name)
      end
    end

    # Spawn the batch, wait once. Each sheet gets its own log; a sheet that
    # fails, or that writes nothing, raises with that log — a build that exits 0
    # having written an empty stylesheet is the failure this pipeline exists to
    # prevent.
    def run(site, pending)
      parallel = enabled?(site) && config(site).fetch("parallel", true)

      # The fingerprint is taken BEFORE the CLI reads the tree, and taken again
      # after it has written its output; a sheet is recorded only when the two
      # agree. This tree is edited by several agents at once, and one of them can
      # change a scanned file while Tailwind is reading it — the output then
      # belongs to neither state. Recording the post-compile fingerprint is what
      # would certify that mixed output as current, which is a wrong sheet that
      # no later build has a reason to rebuild. Disagreeing costs one recompile.
      before = pending.to_h { |job| [job[:name], fingerprint(site, job)] }

      runs = pending.map do |job|
        log = File.join(cache_dir(site), "fast_styles-#{job[:name].gsub(/[^\w.-]/, "_")}.log")
        FileUtils.mkdir_p(File.dirname(job[:output]))
        FileUtils.mkdir_p(File.dirname(log))
        { :job => job, :log => log, :pid => Process.spawn(*command(site, job), :chdir => site.source, :out => log, :err => [:child, :out]) }
      end

      runs.each do |r|
        next if parallel && runs.size > 1

        Process.wait(r[:pid])
        r[:status] = $?
      end
      runs.each { |r| r[:status] ||= Process.wait2(r[:pid]).last } if runs.size > 1

      runs.each { |r| check(r[:job], r[:log], r[:status]) }
      store(site, pending, before) if caching?(site)
    end

    def check(job, log, status)
      ok = status && status.exitstatus&.zero? && File.file?(job[:output]) && File.size(job[:output]).positive?
      raise "FastStyles: #{job[:log]} produced nothing (exit #{status&.exitstatus})\n#{File.read(log)}" unless ok

      bytes = File.size(job[:output])
      label = job[:spec]["output"] || job[:output]
      if job[:kind] == :modes
        Jekyll.logger.info "CSS mode:", "#{job[:name]} -> #{label} (#{bytes} bytes)"
      else
        Jekyll.logger.info "Tailwind:", "#{label} (#{bytes} bytes)"
      end
    end

    # Keyed by site, not memoized on the module: a process that builds two sites
    # (a test, a prover comparing two states) must not have the second one read
    # the first one's cache and think it is its own.
    def cache_dir(site)
      (@cache_dirs ||= {})[site.dest] ||= File.join(site.source, site.config.fetch("cache_dir", ".jekyll-cache"))
    end

    def cache_file(site)
      File.join(cache_dir(site), "fast_styles.json")
    end

    def cache(site)
      path = cache_file(site)
      (@caches ||= {})[path] ||= begin
        File.file?(path) ? JSON.parse(File.read(path)) : {}
      rescue JSON::ParserError
        {}
      end
    end

    # Written after the batch, atomically: a second jekyll process (a server
    # and a one-shot build, say) must never read a half-written record.
    #
    # A sheet that is no longer in `css_modes` is deleted here, and only one
    # this pipeline is known to have written: `keep_files` (see _config.yml)
    # hides _site/assets/css from Jekyll's cleaner, so without this a removed
    # mode would ship its stylesheet forever.
    def store(site, built, before)
      built.each do |job|
        held_still = before[job[:name]]
        after = fingerprint(site, job)
        if held_still != after
          Jekyll.logger.debug "FastStyles:", "#{job[:name]}: sources changed while it was compiled; not cached"
          cache(site).delete(job[:name])
          next
        end

        cache(site)[job[:name]] = {
          "fp" => after,
          "bytes" => File.size(job[:output]),
          "output" => job[:output],
        }
      end
      prune(site)
      path = cache_file(site)
      FileUtils.mkdir_p(File.dirname(path))
      tmp = "#{path}.#{Process.pid}"
      File.write(tmp, JSON.pretty_generate(cache(site)))
      File.rename(tmp, path)
    end
  end
end

# The gem's hook compiles app.css with no cache and no batching. It is retired
# here, AT LOAD TIME and not from inside a hook: `Jekyll::Hooks.trigger`
# iterates a sorted copy of the registry, so removing a hook while it is being
# triggered would still let it run in that same pass — app.css would be compiled
# twice, once alone. Gems load before `_plugins/`, so the hook is registered by
# the time this file is read.
#
# `fast_styles: {enabled: false}` (or PL_FAST_STYLES=0) turns off the cache and
# the parallel batch, NOT the stylesheets: the batch below still owns all four
# sheets, it just builds them one after another, uncached. The escape hatch is
# for a suspect sheet, and a build with no app.css at all is not a useful thing
# to be able to ask for by accident.
# THE ASSUMPTION IS ASSERTED, not hoped for. Reaching into Jekyll's private hook
# registry is the price of one owner; the price of reaching in quietly is that a
# changed gem compiles app.css twice and nobody finds out until a stylesheet is
# stale. The gem defines `Jekyll::Tailwind`, so its presence plus an empty
# retirement is a contract break and stops the build.
retired = FastStyles.retire_upstream_hook!
if retired.zero? && defined?(Jekyll::Tailwind)
  raise Jekyll::Errors::FatalException, <<~MSG
    FastStyles: the jekyll-tailwind gem is loaded, but it registered no post_write
    hook to retire. Either the gem no longer compiles app.css (then delete this
    check) or it does and this file must stop it, because app.css would be built
    twice: once by the batch in _plugins/fast_styles.rb and once by the gem.
  MSG
end

Jekyll::Hooks.register :site, :post_write, :priority => 100 do |site|
  FastStyles.build(site)
end
