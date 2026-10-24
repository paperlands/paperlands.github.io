# frozen_string_literal: true

# Date integration contract: authored publication is independent of build time;
# sitemap modification follows a file's Git history, not the latest site push.
require 'jekyll'
require 'nokogiri'
require 'tmpdir'
require 'fileutils'
require 'open3'
require 'yaml'
require 'date'

ROOT = File.expand_path('../..', __dir__)
TIMEZONE = YAML.load_file(File.join(ROOT, '_config.yml')).fetch('timezone')

def assert(condition, message)
  raise message unless condition
end

def git(root, *args, env: {})
  out, err, status = Open3.capture3(env, 'git', '-C', root, *args)
  raise "git #{args.join(' ')}: #{err}" unless status.success?
  out.strip
end

def commit(root, date)
  git(root, 'add', '.')
  git(root, 'commit', '-qm', date, env: { 'GIT_AUTHOR_DATE' => date, 'GIT_COMMITTER_DATE' => date })
end

def build(root, time, host_timezone = 'UTC')
  previous_timezone = ENV['TZ']
  ENV['TZ'] = host_timezone
  site = Jekyll::Site.new(Jekyll.configuration(
    'source' => root, 'destination' => File.join(root, '_site'), 'quiet' => true,
    'time' => time, 'timezone' => TIMEZONE, 'url' => 'https://example.test',
    'plugins' => %w[jekyll-last-modified-at jekyll-sitemap],
    'collections' => { 'notes' => { 'output' => true, 'permalink' => '/:slug' } },
    'defaults' => [{ 'scope' => { 'path' => '' }, 'values' => { 'layout' => 'note' } }]
  ))
  site.process
  html = Nokogiri::HTML(File.read(File.join(site.dest, 'first.html')))
  xml = Nokogiri::XML(File.read(File.join(site.dest, 'sitemap.xml')))
  xml.remove_namespaces!
  {
    publication: html.at_css('meta[property="article:published_time"]')['content'],
    dateline: html.at_css('time.dateline')['datetime'],
    modifications: xml.css('url').to_h { |url| [url.at_css('loc').text, url.at_css('lastmod')&.text] }
  }
ensure
  ENV['TZ'] = previous_timezone
end

# Catch absent dates before Jekyll can silently populate them from site.time.
Dir[File.join(ROOT, '_notes/*.md')].each do |path|
  source = File.read(path)
  front = source[/\A---\s*\n(.*?)\n---/m, 1]
  data = YAML.safe_load(front, permitted_classes: [Date, Time])
  assert(data.key?('date') && !data.key?('last_date'), "#{path}: declare publication as date: YYYY-MM-DD")
  assert(data['date'].to_s.match?(/\A\d{4}-\d{2}-\d{2}\z/), "#{path}: use an ISO publication date")
end
puts 'ok: every note declares one unambiguous publication date'

Dir.mktmpdir('metadata-contract-') do |work|
  root = File.join(work, 'source')
  FileUtils.mkdir_p(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'contract@example.test')
  git(root, 'config', 'user.name', 'Date contract')
  git(root, 'config', 'uploadpack.allowFilter', 'true')
  %w[_notes _includes/notes _layouts _data].each { |dir| FileUtils.mkdir_p(File.join(root, dir)) }
  %w[head.html notes/header.html].each do |name|
    FileUtils.cp(File.join(ROOT, '_includes', name), File.join(root, '_includes', name))
  end
  File.write(File.join(root, '_layouts/note.html'), <<~LIQUID)
    <!doctype html><html>{% include head.html %}<body>
    {% include notes/header.html note=page %}{{ content }}</body></html>
  LIQUID
  File.write(File.join(root, '_data/nav.yml'), "brand:\n  label: Test\n")
  File.write(File.join(root, '_data/notes.yml'), "kicker: Notes\nkicker_subject: Test\n")
  File.write(File.join(root, '.gitignore'), "_site/\n.jekyll-cache/\n")
  File.write(File.join(root, '_notes/first.md'), "---\ntitle: First\nauthor: Test\ndate: 2020-02-03\n---\nFirst.\n")
  File.write(File.join(root, '_notes/second.md'), "---\ntitle: Second\nauthor: Test\ndate: 2021-03-04\n---\nSecond.\n")
  File.write(File.join(root, 'standing.md'), "---\ntitle: Standing\nauthor: Test\ndate: 2020-01-01\npermalink: /standing\n---\nA standing page.\n")
  commit(root, '2022-01-01T12:00:00Z')
  File.open(File.join(root, '_notes/first.md'), 'a') { |file| file.puts('An actual revision.') }
  commit(root, '2023-04-05T12:00:00Z')
  ENV['TZ'] = 'UTC'
  before = build(root, '2025-01-01T00:00:00Z')
  assert(ENV['TZ'] == 'UTC', 'fixture leaked its configured timezone into its caller')
  File.write(File.join(root, 'README.md'), "An unrelated site change.\n")
  commit(root, '2024-06-07T12:00:00Z')
  after = build(root, '2026-01-01T00:00:00Z', 'America/Los_Angeles')
  assert(before == after, 'unrelated push or build time changed note dates')
  assert(after[:publication] == '2020-02-03T00:00:00+08:00', 'publication is not the authored date')
  assert(after[:dateline] == '2020-02-03', 'visible dateline disagrees with publication metadata')
  assert(after[:modifications]['https://example.test/first'] == '2023-04-05T20:00:00+08:00', 'first lastmod is not its revision')
  assert(after[:modifications]['https://example.test/second'] == '2022-01-01T20:00:00+08:00', 'second lastmod advanced with another file')
  assert(after[:modifications]['https://example.test/standing'] == '2022-01-01T20:00:00+08:00', 'standing page lastmod advanced with another file')
  puts 'ok: publication, visible dateline and per-path sitemap dates survive an unrelated push'

  # A real local partial clone exercises the same history shape CI requests.
  clone = File.join(work, 'filtered')
  git(work, 'clone', '-q', '--filter=blob:none', '--no-local', "file://#{root}", clone)
  assert(git(clone, 'rev-parse', '--is-shallow-repository') == 'false', 'filtered clone lost history')
  assert(git(clone, 'rev-list', '--count', 'HEAD') == '3', 'filtered clone lacks commit history')
  assert(build(clone, '2027-01-01T00:00:00Z') == after, 'filtered checkout changed metadata')
  puts 'ok: full filtered history produces the same metadata'
end

{ 'jekyll.yml' => 'build', 'perf.yml' => 'budget' }.each do |workflow, job|
  config = YAML.load_file(File.join(ROOT, '.github/workflows', workflow))
  checkout = config.fetch('jobs').fetch(job).fetch('steps').find { |step| step['uses'].to_s.start_with?('actions/checkout@') }
  assert(checkout.fetch('with').values_at('fetch-depth', 'filter') == [0, 'blob:none'], "#{workflow}: build needs full blob-filtered history")
end
puts 'PASS: publication and modification date contracts, including CI checkout configuration'
