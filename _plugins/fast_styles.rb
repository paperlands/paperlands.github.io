# frozen_string_literal: true

require 'digest'
require 'json'
require 'fileutils'
require 'tmpdir'
require 'tempfile'
require 'find'
require 'tailwindcss/ruby'

# One owner for app.css and the per-surface mode sheets. A destination owns its
# manifest and lock; every invocation owns its compiler logs and TMPDIRs. The
# cleaner preserves assets/css (_config.yml), so we prune our retired outputs.
#
# Fingerprints cover the CLI, flags, CSS import closure and (for app.css) scan
# inputs. Output digests detect corruption too. A compiler failure leaves the
# last complete sheets in place, fails the build, and cannot certify stale CSS.
# app.css must be linked before a mode: its first @layer declaration fixes
# precedence. Modes carry component CSS, not another utility/source scan.
# Publication is atomic per sheet, not a transaction across the whole set.
# Modes contain component CSS and relative imports, not @config/@plugin/@reference.
# Contract: toolchain/test/fast_styles_test.rb.
module FastStyles
  UNSCANNABLE = %w[
    .png .jpg .jpeg .gif .webp .avif .svg .ico .bmp .tif .tiff
    .mp4 .webm .mov .avi .mkv .m4v .mp3 .wav .ogg .flac
    .woff .woff2 .ttf .otf .eot
    .zip .gz .tgz .bz2 .xz .7z .pdf .psd .ai .sketch .dmg .iso
    .so .dylib .dll .o .a .class .jar .wasm .bin .exe
    .css .pcss .scss .sass .less .styl .map
  ].freeze
  LOCKFILES = %w[package-lock.json yarn.lock pnpm-lock.yaml Gemfile.lock].freeze

  def self.tailwind_bin
    Tailwindcss::Ruby.executable
  end

  def self.build(site)
    Pipeline.new(site).build
  end

  class Pipeline
    def initialize(site)
      @site = site
      value = site.config['fast_styles']
      @settings = value.is_a?(Hash) ? value : {}
      accelerated = ENV['PL_FAST_STYLES'] != '0' && value != false && @settings.fetch('enabled', true)
      @caching = accelerated && @settings.fetch('cache', true)
      @parallel = accelerated && @settings.fetch('parallel', true)
      destination = Digest::SHA256.hexdigest(File.expand_path(site.dest))[0, 16]
      @cache_root = File.expand_path(site.config.fetch('cache_dir', '.jekyll-cache'), site.source)
      @cache_dir = File.join(@cache_root, 'styles', destination)
      @manifest = File.join(@cache_dir, 'manifest.json')
    end

    def build
      FileUtils.mkdir_p(@cache_dir)
      File.open(File.join(@cache_dir, 'build.lock'), 'a') do |lock|
        lock.flock(File::LOCK_EX)
        @records = read_manifest
        wanted = jobs
        clean_staging(wanted)
        prune(wanted)
        pending = wanted.reject { |job| @caching && cached?(job) }
        # Invalidate before spawning, including failed forced rebuilds. No old
        # success record may bless a later partial or unsuccessful compilation.
        pending.each { |job| @records[job[:name]] = { 'output' => job[:output] } }
        write_manifest
        compile(pending) unless pending.empty?
      end
    end

    private

    def jobs
      list = []
      entry = @site.config.fetch('tailwind', {})
      list << job('app.css', entry, true) if entry['input']
      @site.config.fetch('css_modes', {}).each { |name, spec| list << job(name.to_s, spec, false) }
      raise 'FastStyles: duplicate sheet names or outputs' unless
        list.map { |j| j[:name] }.uniq.size == list.size && list.map { |j| j[:output] }.uniq.size == list.size
      list
    end

    def job(name, spec, scans)
      configured = spec.fetch('output').to_s
      # The old entry config includes `_site/`; modes are destination-relative.
      [@site.config['destination'], @site.dest, File.basename(@site.dest), '_site'].compact.each do |prefix|
        prefix = prefix.to_s.chomp('/')
        next if prefix.empty? || !configured.start_with?(prefix + '/')
        configured = configured.delete_prefix(prefix + '/')
        break
      end
      output = File.expand_path(configured, @site.dest)
      raise "FastStyles: output outside destination: #{output}" unless inside?(output, @site.dest)
      { name: name, input: File.expand_path(spec.fetch('input'), @site.source), output: output,
        minify: spec.fetch('minify', !scans), scans: scans }
    end

    def command(job, output = job[:output])
      cmd = [FastStyles.tailwind_bin, '--input', job[:input], '--output', output]
      cmd << '--minify' if job[:minify]
      cmd
    end

    def fingerprint(job)
      parts = command(job)
      inputs = closure(job[:input])
      inputs += scan_set(job) if job[:scans]
      inputs.uniq.sort.each { |path| parts += [path, Digest::SHA256.file(path).hexdigest] }
      Digest::SHA256.hexdigest(parts.join("\0"))
    end

    def closure(path, seen = {})
      return [] if seen[path]
      raise "FastStyles: missing CSS input #{path}" unless File.file?(path)
      seen[path] = true
      imports = File.read(path).scan(/@import\s+["']([^"']+)["']/).flatten
      [path] + imports.filter_map do |ref|
        next if ref.start_with?('http', 'tailwindcss')
        local = File.expand_path(ref, File.dirname(path))
        next unless ref.start_with?('.') || File.file?(local)
        closure(local, seen)
      end.flatten
    end

    def scan_set(job)
      excluded = File.read(job[:input]).scan(/@source\s+not\s+["']([^"']+)["']/).flatten
        .map { |path| File.expand_path(path, File.dirname(job[:input])) }
      found = []
      Find.find(@site.source) do |path|
        next if path == @site.source
        name = File.basename(path)
        if File.directory?(path)
          Find.prune if name.start_with?('.') || name == 'node_modules' ||
            path == @cache_root || path == @site.dest || name == '_site' || name.start_with?('_site.') ||
            excluded.any? { |dir| path == dir }
        elsif File.file?(path)
          next if name.start_with?('.') && name != '.gitignore'
          next if UNSCANNABLE.include?(File.extname(name).downcase) || LOCKFILES.include?(name)
          next if excluded.any? { |dir| path == dir || inside?(path, dir) }
          found << path
        end
      end
      found
    end

    def cached?(job)
      record = @records[job[:name]]
      record.is_a?(Hash) && File.file?(job[:output]) && record['output'] == job[:output] &&
        record['fingerprint'] == fingerprint(job) && record['sha256'] == Digest::SHA256.file(job[:output]).hexdigest
    end

    def compile(pending)
      before = pending.to_h { |job| [job[:name], fingerprint(job)] }
      Dir.mktmpdir('compile-', @cache_dir) do |work|
        runs = []
        begin
          pending.each_with_index do |job, index|
            dir = File.join(work, index.to_s)
            FileUtils.mkdir_p(File.join(dir, 'tmp'))
            run = { job: job, output: File.join(dir, 'output.css'), log: File.join(dir, 'compiler.log') }
            run[:pid] = Process.spawn({ 'TMPDIR' => File.join(dir, 'tmp') }, *command(job, run[:output]),
              chdir: @site.source, out: run[:log], err: [:child, :out])
            runs << run
            wait(run) unless @parallel
          end
        ensure
          # Reap all children even if a later spawn fails. No process may still
          # write into the work directory when its owner removes it.
          runs.each { |run| wait(run) }
        end
        runs.each do |run|
          unless run[:status].success? && File.file?(run[:output]) && File.size(run[:output]).positive?
            raise "FastStyles: #{run[:job][:name]} failed (#{run[:status]})\n#{File.read(run[:log])}"
          end
        end
        runs.each do |run|
          job = run[:job]
          publish(run[:output], job[:output])
          after = fingerprint(job)
          @records[job[:name]] = {
            'output' => job[:output], 'sha256' => Digest::SHA256.file(job[:output]).hexdigest,
            'fingerprint' => @caching && before[job[:name]] == after ? after : nil,
          }
          Jekyll.logger.info 'Styles:', "#{job[:name]} (#{File.size(job[:output])} bytes)"
        end
        write_manifest
      end
    end

    def wait(run)
      run[:status] ||= Process.wait2(run[:pid]).last
    end

    def publish(source, output)
      FileUtils.mkdir_p(File.dirname(output))
      # The cache and destination may be on different filesystems. Stage beside
      # the destination for an atomic rename, not a cross-device rename.
      Tempfile.create(['.style-', '.tmp'], File.dirname(output)) do |tmp|
        IO.copy_stream(source, tmp)
        tmp.chmod(0o644) # Tempfile defaults to 0600; deployed sheets are public assets.
        tmp.close
        File.rename(tmp.path, output)
      end
    end

    def read_manifest
      value = JSON.parse(File.read(@manifest))
      value.is_a?(Hash) ? value : {}
    rescue Errno::ENOENT, JSON::ParserError
      {}
    end

    def write_manifest
      Tempfile.create(['manifest-', '.json'], @cache_dir) do |tmp|
        tmp.write(JSON.pretty_generate(@records))
        tmp.close
        File.rename(tmp.path, @manifest)
      end
    end

    # A killed publisher can leave a Tempfile beside its destination. The
    # destination lock excludes live publishers while we reap our own namespace.
    def clean_staging(wanted)
      paths = wanted.map { |job| job[:output] } + @records.values.filter_map { |record| record['output'] if record.is_a?(Hash) }
      paths.grep(String).select { |path| inside?(path, @site.dest) }.map { |path| File.dirname(path) }.uniq.each do |directory|
        Dir.glob(File.join(directory, '.style-*.tmp')).each { |path| FileUtils.rm_f(path) }
      end
    end

    def prune(wanted)
      outputs = wanted.map { |job| job[:output] }
      @records.delete_if do |_, record|
        output = record.is_a?(Hash) && record['output']
        removed = !outputs.include?(output)
        FileUtils.rm_f(output) if removed && output.is_a?(String) && inside?(output, @site.dest)
        removed
      end
    end

    def inside?(path, directory)
      File.expand_path(path).start_with?(File.expand_path(directory) + File::SEPARATOR)
    end
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  FastStyles.build(site)
end
