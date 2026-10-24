# frozen_string_literal: true

# Check the product of Jekyll's render/cleanup/write lifecycle, not a fake CLI.
# Run after a build. SITE_DEST selects an alternate production destination.
require 'nokogiri'
require 'yaml'
require 'uri'

root = File.expand_path('../..', __dir__)
dest = File.expand_path(ENV.fetch('SITE_DEST', '_site'), root)
config = YAML.load_file(File.join(root, '_config.yml'))
expected = ['assets/css/app.css'] + config.fetch('css_modes').values.map { |mode| mode.fetch('output') }
checked = []
verify = lambda do |path|
  raise "Styles: outside destination: #{path}" unless path.start_with?(dest + File::SEPARATOR)
  raise "Styles: missing or empty #{path}; build the site before running this gate" unless File.file?(path) && File.size(path).positive?
  checked << path
end
expected.each { |relative| verify.call(File.expand_path(relative, dest)) }
app = File.join(dest, 'assets/css/app.css')
modes = expected.drop(1).map { |relative| File.expand_path(relative, dest) }
raise 'Styles: app.css still contains an unresolved @import' if File.read(app).match?(/@import\s/)
raise 'Styles: abandoned publisher tempfiles in the artifact' unless Dir[File.join(dest, '**/.style-*.tmp')].empty?

pages = Dir[File.join(dest, '**/*.html')].reject { |path| path.start_with?(File.join(dest, 'assets/')) }
raise "Styles: no rendered pages under #{dest}" if pages.empty?
pages.each do |path|
  links = Nokogiri::HTML(File.read(path)).css('link[rel="stylesheet"][href]').filter_map do |link|
    url = URI.parse(link['href'])
    next if url.host || url.scheme
    href = URI::DEFAULT_PARSER.unescape(url.path)
    baseurl = config.fetch('baseurl', '').to_s.delete_suffix('/')
    href = href.delete_prefix(baseurl) if !baseurl.empty? && href.start_with?(baseurl + '/')
    resolved = href.start_with?('/') ? File.expand_path(href.delete_prefix('/'), dest) : File.expand_path(href, File.dirname(path))
    verify.call(resolved)
    resolved
  end
  links.each_with_index do |sheet, index|
    next unless modes.include?(sheet)
    raise "Styles: app.css must precede mode sheets in #{path}" unless links.index(app) && links.index(app) < index
  end
end
puts "PASS: #{expected.size} configured sheets and every local stylesheet linked by #{pages.size} rendered pages (#{checked.uniq.size} files); layer order, resolved imports and clean publication"
