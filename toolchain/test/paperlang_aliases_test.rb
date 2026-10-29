# frozen_string_literal: true

# Contract for the public raw-JS aliases. No Jekyll build is needed for the pure
# cases; when a built site is present its aliases/evidence are checked too.
require 'digest'
require 'fileutils'
require 'json'
require 'tmpdir'

ROOT = File.expand_path('../..', __dir__)
require File.join(ROOT, '_plugins/paperlang_aliases')

def assert(condition, message)
  raise message unless condition
end

def refuses(message)
  yield
  raise "accepted #{message}"
rescue StandardError => error
  raise if error.message == "accepted #{message}"
  error
end

def sha(bytes) = Digest::SHA256.hexdigest(bytes)

# A complete, canonical generation. The directory name is the release.json SHA.
def generation(site, line:, version:, commit: 'a' * 40, dirty: true, artifact: "export const createWorld = () => {}\n", source_name: 'assets/js/host.js')
  files = {
    'host.mjs' => artifact,
    'host.meta.json' => JSON.generate({ inputs: { 'assets/js/host.js' => {} }, outputs: { 'host.mjs' => { exports: ['createWorld'], imports: [] } } }),
    'host.mjs.LEGAL.txt' => 'legal',
    'LICENSE' => 'AGPL license',
    'NOTICE.txt' => 'notice',
    'licenses/MIT.txt' => 'MIT',
    'package.json' => JSON.generate({ name: '@paperland/paperlang', version: version, exports: './host.mjs', license: 'AGPL-3.0-only' }),
    'README.md' => 'readme',
  }
  sources = { source_name => sha("export const createWorld = () => {}\n") }
  artifacts = files.transform_values { |body| sha(body) }
  source_digest = sha(JSON.generate(sources))
  release = {
    artifact: 'paperlang-host', format: 'esm', commit: commit,
    sourceDirty: dirty, checkoutDirty: dirty, sourceDigest: source_digest,
    revision: dirty ? "#{commit}-dirty+#{source_digest[0, 12]}" : commit,
    sources: sources, artifacts: artifacts,
  }
  release_json = JSON.generate(release)
  evidence = sha(release_json)
  dir = File.join(site, 'assets/lib/paperlang', line, evidence)
  FileUtils.mkdir_p(File.join(dir, 'sources', File.dirname(source_name)))
  FileUtils.mkdir_p(File.join(dir, 'licenses'))
  files.each { |name, body| File.write(File.join(dir, name), body) }
  File.write(File.join(dir, 'sources', source_name), "export const createWorld = () => {}\n")
  File.write(File.join(dir, 'release.json'), release_json)
  {
    version: version, revision: release[:revision], commit: commit,
    source_dirty: dirty, source_digest: source_digest,
    evidence_sha256: evidence,
    generation: "/assets/lib/paperlang/#{line}/#{evidence}",
    artifact_path: "/assets/lib/paperlang/#{line}/#{evidence}/host.mjs",
    artifact_sha256: artifacts['host.mjs'], artifact_bytes: artifact.bytesize,
    closure_inputs: 1, release_manifest: 'release.json',
    release_manifest_sha256: evidence,
    licence: 'LICENSE', licence_id: 'AGPL-3.0-only',
    licence_sha256: artifacts['LICENSE'],
    notices: 'NOTICE.txt', notices_sha256: artifacts['NOTICE.txt'],
    sources: 'sources/', installed_at: '2026-01-01',
  }
end

def catalogue(site, lines, latest:)
  FileUtils.mkdir_p(File.join(site, '_data'))
  File.write(File.join(site, '_data/paperlang.json'), JSON.pretty_generate({ schema: 1, latest: latest, lines: lines }))
end

Dir.mktmpdir('paperlang-alias-') do |site|
  six = generation(site, line: '0.6', version: '0.6.0')
  catalogue(site, { '0.6' => six }, latest: '0.6')
  aliases = PaperLangAliases.aliases_for(site).to_h
  assert(aliases.keys.sort == ['paperlang/0.6.js', 'paperlang/latest.js'], "aliases: #{aliases.keys}")
  body = aliases.fetch('paperlang/0.6.js')
  assert(body.start_with?('/* PaperLang 0.6'), 'raw JS comment missing')
  assert(body.include?('export * from ' + JSON.generate(six[:artifact_path]) + ';'), 'alias does not export the immutable artifact')
  assert(body.include?('dirty development snapshot'), 'dirty provenance is missing')
  assert(!body.include?('<html'), 'alias is a page, not raw JS')
  assert(aliases.fetch('paperlang/latest.js').include?(six[:artifact_path]), 'latest does not export the pinned line')

  seven = generation(site, line: '0.7', version: '0.7.0', commit: 'b' * 40)
  catalogue(site, { '0.6' => six, '0.7' => seven }, latest: '0.7')
  aliases = PaperLangAliases.aliases_for(site).to_h
  assert(aliases.fetch('paperlang/0.6.js').include?(six[:artifact_path]), '0.6 was retargeted by 0.7')
  assert(aliases.fetch('paperlang/0.7.js').include?(seven[:artifact_path]), '0.7 is missing')
  assert(aliases.fetch('paperlang/latest.js').include?(seven[:artifact_path]), 'latest did not follow the catalogue')

  catalogue(site, { '0.6' => six.merge(version: '0.7.0') }, latest: '0.6')
  assert(refuses('relabelled line') { PaperLangAliases.aliases_for(site) }.message.include?('another line'), 'relabelled line accepted')

  catalogue(site, { '0.6' => six.merge(evidence_sha256: 'a' * 64) }, latest: '0.6')
  assert(refuses('spoofed evidence') { PaperLangAliases.aliases_for(site) }.message.include?('evidence digest'), 'spoofed evidence accepted')

  catalogue(site, { '0.6' => six.merge(source_dirty: false) }, latest: '0.6')
  assert(refuses('dirty label spoof') { PaperLangAliases.aliases_for(site) }.message.include?('source_dirty'), 'dirty label spoof accepted')

  catalogue(site, { '0.6' => six.merge(artifact_path: "#{six[:generation]}/../host.mjs") }, latest: '0.6')
  assert(refuses('artifact traversal') { PaperLangAliases.aliases_for(site) }.message.include?('artifact path'), 'traversal accepted')

  catalogue(site, { '0.6' => six.merge(version: '0.6.garbage') }, latest: '0.6')
  assert(refuses('version garbage') { PaperLangAliases.aliases_for(site) }.message.include?('names version'), 'garbage version accepted')

  traversal = generation(site, line: '0.6', version: '0.6.0', source_name: '../escape')
  catalogue(site, { '0.6' => traversal }, latest: '0.6')
  assert(refuses('source traversal') { PaperLangAliases.aliases_for(site) }.message.include?('unsafe'), 'source traversal accepted')

  catalogue(site, { '0.6' => six }, latest: '0.6')
  FileUtils.rm_f(File.join(site, six[:artifact_path].delete_prefix('/')))
  assert(refuses('missing artifact') { PaperLangAliases.aliases_for(site) }.message.include?('artifact'), 'missing artifact accepted')

  six = generation(site, line: '0.6', version: '0.6.0')
  catalogue(site, { '0.6' => six }, latest: '0.6')
  FileUtils.rm_f(File.join(site, six[:generation].delete_prefix('/'), 'LICENSE'))
  assert(refuses('missing licence') { PaperLangAliases.aliases_for(site) }.message.include?('LICENSE'), 'missing licence accepted')

  bare = generation(site, line: '0.6', version: '0.6.0')
  FileUtils.rm_rf(File.join(site, bare[:generation].delete_prefix('/'), 'sources'))
  catalogue(site, { '0.6' => bare }, latest: '0.6')
  assert(PaperLangAliases.aliases_for(site).to_h.fetch('paperlang/0.6.js').include?(bare[:artifact_path]), 'checkout without sources/ refused')

  kept = generation(site, line: '0.6', version: '0.6.0')
  File.write(File.join(site, kept[:generation].delete_prefix('/'), 'sources/assets/js/host.js'), 'tampered')
  catalogue(site, { '0.6' => kept }, latest: '0.6')
  assert(refuses('tampered source') { PaperLangAliases.aliases_for(site) }.message.include?('source hash'), 'tampered source accepted')
end

build = File.expand_path(ENV.fetch('SITE_DEST', '_site'), ROOT)
if File.file?(File.join(build, 'paperlang/0.6.js'))
  body = File.read(File.join(build, 'paperlang/0.6.js'))
  raise 'built alias is not raw JavaScript' unless body.start_with?('/* PaperLang')
  raise 'built alias is HTML' if body.include?('<html')
  raise 'built alias does not re-export' unless body.match?(/export \* from "\/assets\/lib\/paperlang\//)
end

puts 'PASS: raw same-origin aliases, canonical evidence/version/line, dirty provenance, traversal and hash/legal fail-closed'
