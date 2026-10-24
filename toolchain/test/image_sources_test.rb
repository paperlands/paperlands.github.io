# ruby toolchain/test/image_sources_test.rb — the still recipe matches the pages
# that ask for srcset. No encode, no gems.
require 'yaml'

ROOT = File.expand_path('../..', __dir__)
recipe = YAML.safe_load_file(File.join(ROOT, '_data/image_sources.yml'))
nav = YAML.safe_load_file(File.join(ROOT, '_data/nav.yml'))
scenes = YAML.safe_load_file(File.join(ROOT, '_data/helios_possibilities.yml'))

def fail(message)
  warn message
  exit 1
end

fail 'image recipe is empty' unless recipe.is_a?(Hash) && !recipe.empty?

recipe.each do |site_path, entry|
  fail "#{site_path}: path must stay under /assets" unless site_path.is_a?(String) && site_path.start_with?('/assets/') && !site_path.include?('..')
  widths = entry.is_a?(Hash) ? entry['widths'] : nil
  fail "#{site_path}: widths must be positive integers" unless widths.is_a?(Array) && widths.all? { |width| width.is_a?(Integer) && width.positive? }
  file = File.join(ROOT, site_path.delete_prefix('/'))
  fail "#{site_path}: missing source" unless File.file?(file)
end

banner = recipe['/assets/bannerpaperlang.png']
fail 'wordmark looks up the 768 banner rung (_includes/home/wordmark.html)' unless banner && banner['widths'].include?(768)

logo = nav.dig('brand', 'logo')
fail "nav logo #{logo} is not in the image recipe" unless recipe.key?(logo)

%w[inquiry creators].each do |name|
  scene = scenes.fetch(name)
  %w[echo body memory near].each do |slot|
    src = scene[slot]
    next if src.nil? || src.empty?
    fail "#{name}.#{slot} #{src} is rendered through media/img.html but is not in the image recipe" unless recipe.key?(src)
  end
end

puts "ok: #{recipe.length} image sources, banner 768, rendered stills are in the recipe"
