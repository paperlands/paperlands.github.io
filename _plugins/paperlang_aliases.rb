# frozen_string_literal: true

# The public PaperLang ESM aliases. One catalogue, immutable generations.
#
# /paperlang/<line>.js and /paperlang/latest.js are raw JavaScript, not pages:
# they re-export the exact same-origin artifact named by _data/paperlang.json.
# The build fails closed when a line, artifact, release manifest, source hash or
# legal file is missing or changed. Publication is a separate act; a dirty
# snapshot is emitted with explicit provenance and is not called clean.
require 'digest'
require 'fileutils'
require 'json'

module PaperLangAliases
  SCHEMA = 1
  DIGEST = /\A[a-f0-9]{64}\z/
  VERSION = /\A(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\z/
  LINE = /\A(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\z/
  REQUIRED_ARTIFACTS = %w[host.mjs host.meta.json host.mjs.LEGAL.txt LICENSE NOTICE.txt package.json README.md].freeze
  BANNED_INPUTS = ['/hooks/', '/editor/', '/terminal/', '/export/', 'phoenix', 'mediabunny'].freeze

  module_function

  def safe_relative?(name)
    return false unless name.is_a?(String) && !name.empty? && !name.start_with?('/') && !name.include?('\\')
    name.split('/', -1).all? { |part| !part.empty? && part != '.' && part != '..' }
  end

  def file_within!(root, relative, label)
    raise "#{label} path is unsafe" unless safe_relative?(relative)
    path = File.join(root, relative)
    raise "#{label} is missing" unless File.file?(path)
    real_root = File.realpath(root)
    real = File.realpath(path)
    raise "#{label} escapes its generation" unless real.start_with?(real_root + File::SEPARATOR)
    real
  end

  def catalogue(source)
    path = File.join(source, '_data', 'paperlang.json')
    raise 'PaperLang catalogue is missing; run node toolchain/vendor.mjs --install' unless File.file?(path)
    data = JSON.parse(File.read(path))
    raise "PaperLang catalogue schema is not #{SCHEMA}" unless data['schema'] == SCHEMA
    raise 'PaperLang catalogue latest is not a line' unless data['latest'].is_a?(String) && data['latest'].match?(LINE)
    lines = data['lines']
    raise 'PaperLang catalogue has no lines' unless lines.is_a?(Hash) && !lines.empty?
    raise 'PaperLang catalogue latest does not name an installed line' unless lines.key?(data['latest'])
    [data, lines]
  end

  # Every label is checked against the bytes beside the generation it names.
  def verify!(source, line, entry)
    raise "PaperLang line #{line} is not major.minor" unless line.match?(LINE)
    raise "PaperLang line #{line} entry is not an object" unless entry.is_a?(Hash)
    version = entry['version'].to_s
    raise "PaperLang line #{line} names version #{version.inspect}" unless version.match?(VERSION)
    raise "PaperLang line #{line} version #{version} is on another line" unless version.split('.').first(2).join('.') == line
    raise "PaperLang line #{line} source_dirty is not a boolean" unless [true, false].include?(entry['source_dirty'])
    raise "PaperLang line #{line} release manifest is not canonical" unless entry['release_manifest'] == 'release.json'

    generation = entry['generation'].to_s
    raise "PaperLang line #{line} generation is not canonical" unless generation.start_with?("/assets/lib/paperlang/#{line}/")
    manifest = file_within!(source, "#{generation.delete_prefix('/')}/release.json", "PaperLang line #{line} release manifest")
    evidence = Digest::SHA256.file(manifest).hexdigest
    canonical = "/assets/lib/paperlang/#{line}/#{evidence}"
    raise "PaperLang line #{line} generation is not canonical for its evidence" unless generation == canonical
    raise "PaperLang line #{line} evidence digest does not match release.json" unless entry['evidence_sha256'] == evidence
    raise "PaperLang line #{line} release manifest digest does not match" unless entry['release_manifest_sha256'] == evidence

    artifact_path = "#{generation}/host.mjs"
    raise "PaperLang line #{line} artifact path is not canonical" unless entry['artifact_path'] == artifact_path
    artifact = file_within!(source, artifact_path.delete_prefix('/'), "PaperLang line #{line} artifact")
    raise "PaperLang line #{line} artifact hash does not match" unless
      entry['artifact_sha256'].to_s.match?(DIGEST) && Digest::SHA256.file(artifact).hexdigest == entry['artifact_sha256']
    raise "PaperLang line #{line} artifact bytes do not match" unless entry['artifact_bytes'] == File.size(artifact)

    release = JSON.parse(File.read(manifest))
    raise "PaperLang line #{line} is not a host release" unless release['artifact'] == 'paperlang-host'
    raise "PaperLang line #{line} source_dirty does not match release.json" unless release['sourceDirty'] == entry['source_dirty']
    raise "PaperLang line #{line} commit does not match release.json" unless release['commit'] == entry['commit']
    raise "PaperLang line #{line} source digest does not match release.json" unless release['sourceDigest'] == entry['source_digest']
    expected_revision = release['sourceDirty'] ? "#{release['commit']}-dirty+#{release['sourceDigest'].to_s[0, 12]}" : release['commit']
    raise "PaperLang line #{line} revision does not match release.json" unless release['revision'] == entry['revision'] && release['revision'] == expected_revision
    raise "PaperLang line #{line} licence/notices names are not canonical" unless entry['licence'] == 'LICENSE' && entry['notices'] == 'NOTICE.txt'

    artifacts = release['artifacts']
    sources = release['sources']
    raise "PaperLang line #{line} inventories are malformed" unless artifacts.is_a?(Hash) && sources.is_a?(Hash) && !sources.empty?
    (REQUIRED_ARTIFACTS - artifacts.keys).each { |name| raise "PaperLang line #{line} is missing #{name}" }
    raise "PaperLang line #{line} has no dependency licence text" unless artifacts.keys.any? { |name| name.start_with?('licenses/') }
    artifacts.each do |name, hash|
      file = file_within!(source, "#{generation.delete_prefix('/')}/#{name}", "PaperLang line #{line} artifact #{name}")
      raise "PaperLang line #{line} evidence artifact hash does not match: #{name}" unless Digest::SHA256.file(file).hexdigest == hash
    end
    sources.each do |name, hash|
      file = file_within!(source, "#{generation.delete_prefix('/')}/sources/#{name}", "PaperLang line #{line} source #{name}")
      raise "PaperLang line #{line} source hash does not match: #{name}" unless Digest::SHA256.file(file).hexdigest == hash
    end

    package = JSON.parse(File.read(file_within!(source, "#{generation.delete_prefix('/')}/package.json", "PaperLang line #{line} package")))
    raise "PaperLang line #{line} package version does not match" unless package['version'] == version
    raise "PaperLang line #{line} package is not @paperland/paperlang" unless package['name'] == '@paperland/paperlang'
    raise "PaperLang line #{line} package entry is not ./host.mjs" unless
      package['exports'] == './host.mjs' || package.dig('exports', '.') == './host.mjs'
    raise "PaperLang line #{line} package licence is not AGPL-3.0-only" unless package['license'] == 'AGPL-3.0-only'

    meta = JSON.parse(File.read(file_within!(source, "#{generation.delete_prefix('/')}/host.meta.json", "PaperLang line #{line} host metadata")))
    inputs = meta['inputs'].is_a?(Hash) ? meta['inputs'].keys : []
    outputs = meta['outputs'].is_a?(Hash) ? meta['outputs'] : {}
    raise "PaperLang line #{line} closure is absent from sources" unless inputs.include?('assets/js/host.js') && inputs.all? { |name| sources.key?(name) }
    raise "PaperLang line #{line} closure contains application machinery" if inputs.any? { |name| BANNED_INPUTS.any? { |word| name.include?(word) } }
    executables = outputs.keys.select { |name| name.end_with?('.mjs', '.js') }
    raise "PaperLang line #{line} is not a single executable module" unless executables == ['host.mjs']
    raise "PaperLang line #{line} does not export createWorld" unless outputs.dig('host.mjs', 'exports')&.include?('createWorld')
    raise "PaperLang line #{line} has external executable imports" unless outputs.dig('host.mjs', 'imports') == []
    raise "PaperLang line #{line} closure count does not match" unless entry['closure_inputs'] == inputs.length
    raise "PaperLang line #{line} licence digest does not match" unless entry['licence_sha256'] == artifacts['LICENSE']
    raise "PaperLang line #{line} notices digest does not match" unless entry['notices_sha256'] == artifacts['NOTICE.txt']
  end

  def body(line, entry)
    state = entry['source_dirty'] ? 'dirty development snapshot' : 'clean producer revision'
    <<~JS
      /* PaperLang #{line} — generated from _data/paperlang.json. Do not edit.
         generation: #{entry['generation']}
         sha256: #{entry['artifact_sha256']}
         revision: #{entry['revision']} (#{state}) */
      export * from #{JSON.generate(entry['artifact_path'])};
    JS
  end

  # Pure function for the test and the post_write hook.
  def aliases_for(source)
    data, lines = catalogue(source)
    lines.each { |line, entry| verify!(source, line, entry) }
    aliases = lines.map { |line, entry| ["paperlang/#{line}.js", body(line, entry)] }
    latest = data['latest']
    aliases << ['paperlang/latest.js', body(latest, lines.fetch(latest))]
    aliases
  end
end

if defined?(Jekyll)
  Jekyll::Hooks.register :site, :post_read do |site|
    site.config['paperlang_aliases'] = PaperLangAliases.aliases_for(site.source)
  end
  Jekyll::Hooks.register :site, :post_write do |site|
    (site.config['paperlang_aliases'] || []).each do |relative, body|
      path = File.join(site.dest, relative)
      FileUtils.mkdir_p(File.dirname(path))
      File.write(path, body)
    end
  end
end
