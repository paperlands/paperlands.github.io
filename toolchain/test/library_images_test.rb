# frozen_string_literal: true

# Run after a production build. SITE_DEST selects an alternate destination.
require 'nokogiri'
require 'uri'

root = File.expand_path('../..', __dir__)
dest = File.expand_path(ENV.fetch('SITE_DEST', '_site'), root)
page = File.join(dest, 'blog.html')
raise 'Build the site before checking Library covers' unless File.file?(page)
covers = Nokogiri::HTML(File.read(page)).css('#blog .grid > div > a > div:first-child > img')
raise 'Library must render its note covers' if covers.empty?

covers.each_with_index do |image, index|
  raise 'Cover must keep its full card box' unless %w[object-cover w-full h-full].all? { |name| image['class'].split.include?(name) }
  raise 'Cover needs intrinsic dimensions' unless image['width'].to_i.positive? && image['height'].to_i.positive?
  raise 'Cover sizes must follow the one/two-column grid' unless image['sizes'] == '(min-width: 640px) 44vw, 88vw'
  raise 'Cover decoding must not block presentation' unless image['decoding'] == 'async'
  expected = index.zero? ? %w[eager high] : %w[lazy low]
  raise 'Only the first cover is eager/high priority' unless [image['loading'], image['fetchpriority']] == expected
  candidates = image['srcset'].to_s.split(',').map do |candidate|
    path, width = candidate.strip.split
    raise "Invalid responsive candidate: #{candidate}" unless path&.end_with?('.webp') && width&.match?(/\A\d+w\z/)
    file = File.expand_path(URI::DEFAULT_PARSER.unescape(path).delete_prefix('/'), dest)
    raise "Missing cover rung: #{path}" unless file.start_with?(dest + '/') && File.file?(file) && File.size(file).positive?
    width.to_i
  end
  raise 'Cover needs a small-screen rung and full-resolution fallback' unless candidates.min == 384 && candidates.max == image['width'].to_i
end
puts "PASS: #{covers.size} responsive Library covers, bounded phone rungs, full-resolution candidates and LCP/deferred priorities"
