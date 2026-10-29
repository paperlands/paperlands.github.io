# frozen_string_literal: true

# Render the real boot include/layouts; no browser or private media masters.
require 'liquid'
require 'nokogiri'
require_relative '../../_plugins/media_boot'
require_relative 'contract_site'

check = ->(condition, message) { raise message unless condition }
filter = Object.new.extend(MediaBoot)
needs = ->(html, extra = nil) { filter.media_requirements(html, extra).select { |_key, value| value }.keys }
check.call(needs.call(nil).empty? && needs.call('<p>No players.</p>').empty?, 'Plain/empty documents must need no players')
check.call(needs.call("<video DATA-MEDIA = 'video'></video>") == ['video'], 'Parse HTML attributes, including case/spacing/quotes')
check.call(needs.call('<div data-media-carousel="stack"></div>') == ['carousel'], 'A carousel independently needs its writer')
check.call(needs.call('<section data-media-surface="film"></section>') == ['film'], 'Hosted film needs only its own player')
check.call(needs.call('<dialog data-lightbox="image"></dialog>') == ['lightbox'], 'A real viewer needs its lifecycle')
check.call(needs.call('<div data-lightbox="image"></div><div data-media="image"></div>').empty?, 'Unrelated data marks are not players')
check.call(needs.call(<<~HTML).empty?, 'Comments, escaped examples, script strings and inert templates must not request players')
  <!-- <video data-media="video"></video> -->
  <pre>&lt;dialog data-lightbox="image"&gt;&lt;/dialog&gt;</pre>
  <script>const example = '<section data-media-surface="film"></section>';</script>
  <template><div data-media-carousel="stack"><video data-media="video"></video></div></template>
  <noscript><video data-media="video"></video><dialog data-lightbox="image"></dialog></noscript>
HTML
check.call(needs.call('<p>Essay.</p>', '<dialog data-lightbox="image"></dialog>') == ['lightbox'], 'Layout-owned markup must participate')
check.call(needs.call('<p>Next page.</p>').empty?, 'Requirements must not leak between documents')

root = File.expand_path('../..', __dir__)
site = ContractSite::Site.load(source: root)
markup = <<~HTML
  <div data-media-carousel="stack"><video data-media="video"></video></div>
  <section data-media-surface="film"></section>
  <dialog data-lightbox="image"></dialog>
HTML
scripts = ->(doc) { doc.css('script[src]').select { |script| script['src'].match?(%r{/assets/js/media-(?:video|carousel|film|lightbox)\.js\z}) } }
expected = %w[video carousel film lightbox].map { |name| "/preview/assets/js/media-#{name}.js" }
[
  ['<video data-media="video"></video>', ['video']],
  ['<div data-media-carousel="stack"></div>', ['carousel']],
  ['<section data-media-surface="film"></section>', ['film']],
  ['<dialog data-lightbox="image"></dialog>', ['lightbox']],
].each do |content, names|
  doc = site.render(data: { 'layout' => 'folio', 'title' => 'One player' }, content: content * 2)
  check.call(scripts.call(doc).map { |script| script['src'] } == names.map { |name| "/preview/assets/js/media-#{name}.js" }, 'Repeated surfaces must request only their own script, exactly once')
end
%w[default folio legacy/nobgdefault].each do |layout|
  data = { 'layout' => layout, 'title' => 'Media boot fixture' }
  plain = site.render(data: data.dup, content: '<p>Plain text.</p>')
  check.call(scripts.call(plain).empty?, "#{layout}: plain content must load no shared players")
  media = site.render(data: data.dup, content: markup)
  boot = scripts.call(media)
  check.call(boot.map { |script| script['src'] } == expected, "#{layout}: scripts must retain baseurl, uniqueness and player-before-writer order")
  check.call(boot.all? { |script| script.key?('defer') && !script.key?('async') && script['type'] != 'module' }, 'Keep the existing deferred script scheduling')
end
note = site.render(data: { 'layout' => 'note', 'title' => 'Essay boot fixture',
  'heroimgurl' => '/assets/lib/kids.jpg' }, content: '<p>An essay without video.</p>')
check.call(note.css('dialog[data-lightbox]').size == 1, 'Notes must keep the layout-owned viewer')
check.call(scripts.call(note).map { |script| script['src'] } == [expected.last], 'A note without media must still boot its layout-owned viewer, and nothing else')

# The real built site is checked independently of the requirement filter above.
dest = File.expand_path(ENV.fetch('SITE_DEST', '_site'), root)
checked = 0
Dir[File.join(dest, '**/*.html')].each do |path|
  next if path.start_with?(File.join(dest, 'assets/'))
  doc = Nokogiri::HTML(File.read(path))
  doc.css('template, noscript').remove
  wanted = {
    'video' => '[data-media="video"]', 'carousel' => '[data-media-carousel]',
    'film' => '[data-media-surface="film"]', 'lightbox' => 'dialog[data-lightbox]',
  }.filter_map { |name, selector| name if doc.at_css(selector) }
  boot = scripts.call(doc)
  actual = boot.map { |script| File.basename(script['src'], '.js').delete_prefix('media-') }
  check.call(actual == wanted, "#{path}: shipped scripts #{actual.inspect} must match rendered surfaces #{wanted.inspect}")
  check.call(boot.all? { |script| script.key?('defer') }, "#{path}: boot must remain deferred")
  checked += 1
end
check.call(checked.positive?, 'Build the site before checking shipped media boot')
puts "PASS: media requirements, real layout/baseurl isolation, layout-owned note viewer and #{checked} shipped pages"
