# frozen_string_literal: true

# bundle exec ruby toolchain/test/experiences_page_test.rb
#
# Renders the actual page and includes from data this contract mutates:
# reordered movements, an added fragment id, an extended FAQ. It is the one
# gate whose question cannot be answered from `_site/` after the fact — it asks
# whether the templates follow the data, so it needs the templates. The engine
# is named in contract_site.rb and nowhere below it.
require 'json'
require 'nokogiri'
require_relative 'contract_site'

source = File.expand_path('../..', __dir__)
site = ContractSite::Site.load(source: source)

check = ->(condition, message) { raise message unless condition }
original = site.page('_pages/experiences.md')
check.call(original, 'Experiences must be a page, not a note')
check.call(original.url == '/experiences', 'Public URL changed')
check.call(site.notes.none? { |name| name == 'experiences' }, 'Experiences is still in the notes collection')
check.call(site.notes_graph_paths.none? { |path| path.end_with?('/experiences') }, 'Experiences is still in the notes graph')
original.data.fetch('possibilities').fetch('items').each do |item|
  %w[id jump event title gesture clip body].each do |field|
    check.call(item[field].is_a?(String) && !item[field].strip.empty?, "Missing movement field: #{field}")
  end
  check.call(item['id'].match?(/\A[a-z][a-z0-9-]*\z/), "Invalid fragment ID: #{item['id']}")
  check.call(%w[create explore lead].include?(item['gesture']), "Unknown movement gesture: #{item['gesture']}")
  check.call(site.data.fetch('media').key?(item['clip']), "Unknown media clip: #{item['clip']}")
  media = site.data.fetch('media').fetch(item['clip'])
  check.call(media.fetch('width') * 9 == media.fetch('height') * 16, 'Movement scenes need full landscape sources for mobile')
end

# A fresh composition per call, so no two data sets share a Liquid cache key.
render = ->(data, content = original.content) { site.render(data: data, content: content) }

doc = render.call(JSON.parse(JSON.generate(original.data)))
root = doc.at_css('main > .experiences')
check.call(root, 'Missing semantic page root')
check.call(doc.css('main').size == 1 && doc.css('h1').size == 1, 'Page needs one main and one h1')
order = root.element_children.reject { |node| node.name == 'a' }.map(&:name)
check.call(order == %w[header section section section section footer], "Reading order changed: #{order}")
check.call(root.css('.experiences-movement').size == original.data.dig('possibilities', 'items').size, 'Missing movements')
root.css('.experiences-movement').zip(original.data.dig('possibilities', 'items')).each do |movement, item|
  check.call(movement.element_children.map(&:name) == %w[header figure div], 'Movement must read thought, named human scene, then invitation')
  check.call(movement.at_css('.stage-focus__word').text == item['title'].split('*')[1], 'The page must own the expressive thought')
  check.call(movement.css('h3 em').map { |em| em.at_css('.stage-focus__word')&.text || em.text } == item['title'].scan(/\*([^*]+)\*/).flatten, 'Every authored emphasis must survive, including the paired create/understand thought')
  check.call(movement.at_css('[data-stage-focus]')['data-stage-focus'] == item['gesture'], 'The gesture must follow the thought, not the fragment ID')
  ink = movement.at_css('h3 .stage-focus__ink')
  check.call(ink['aria-hidden'] == 'true' && ink['focusable'] == 'false' && ink.css('text, title, foreignObject').empty?, 'Focus ink must stay silent and must not duplicate the words')
  case item['gesture']
  when 'create'
    check.call(ink.css('.stage-focus__stroke').size == 2 && ink.css('.stage-focus__charge, ellipse, circle').empty?, 'Creation needs unequal approaches and an unoccupied gap')
  when 'explore'
    check.call(ink.css('.stage-focus__stroke').size == 1 && ink.css('.stage-focus__departure').size == 1, 'Seeking needs an open departure')
  when 'lead'
    check.call(ink.css('.stage-focus__bird').size == 5 && ink.css('.stage-focus__arrival').size == 5 && ink.css('.stage-focus__shelter').size == 1 && ink.css('.stage-focus__shared').empty?, 'Fellowship needs five distinct birds, not a continuous flourish')
  end
  event = movement.at_css('.experiences-movement-event')
  check.call(event.text == item['event'], 'The page must own its event name')
  check.call(movement.at_css('header').element_children.map(&:name) == %w[p h3], 'The event name must introduce its thought')
  check.call(movement.css('.experiences-movement-event').size == 1 && movement.css('.experiences-movement-visual figcaption').empty?, 'The name appears once, not again beneath the picture')
  check.call(movement['aria-describedby'] == event['id'] && movement.at_css('figure')['aria-labelledby'] == event['id'], 'The event must still identify its movement and human scene')
  check.call(movement.at_css('.experiences-movement-copy').element_children.first['class'] == 'experiences-movement-body', 'Copy must open with the invitation')
  body = movement.at_css('.experiences-movement-body')
  check.call(body.name == 'div', 'Movement body must contain paragraphs without nesting p elements')
  if item['body'].include?("\n\n")
    check.call(body.element_children.count { |node| node.name == 'p' } > 1, 'Authored paragraphs must remain semantic paragraphs')
  end
  check.call(body.css('br.experiences-desktop-break').size == item['body'].scan('class="experiences-desktop-break"').size, 'Authored desktop sentence breaks must survive markup')
  check.call(movement.at_css('video')['aria-label'].to_s.length.positive?, 'Human scene needs an accessible description')
  check.call(movement.at_css('video')['poster'] == "/preview#{item['poster']}", 'Scene poster must be page-owned and baseurl-aware')
  gathering = item['framing'] == 'gathering'
  check.call(movement.at_css('figure')['class'].include?('experiences-movement-visual-gathering') == gathering, 'Gathering framing must follow the item, not its ID')
  check.call(movement.at_css('video')['data-src'] == "/preview#{site.data.fetch('media').fetch(item['clip']).fetch('src')}", 'The scene must use its actual catalog rendition')
  check.call(movement.css('.experiences-label, .experiences-movement-identity, .experiences-movement-outcome').empty?, 'No competing eyebrow or outcome slogan')
  check.call(movement.css('h3 [data-stage-focus]').size == 1, 'One expressive centre, not several emphases')
end
check.call(root.css('.experiences-routes article').size == original.data.dig('support', 'routes').size, 'Missing training routes')
check.call(root.css('details').size == original.data.dig('planning', 'questions').size, 'Missing questions')
ids = doc.css('[id]').map { |node| node['id'] }
check.call(ids.uniq == ids, 'Duplicate IDs')
root.css('a[href^="#"]').each { |link| check.call(ids.include?(link['href'].delete_prefix('#')), "Broken jump: #{link}") }
root.css('[aria-labelledby]').each do |node|
  node['aria-labelledby'].split.each { |id| check.call(ids.include?(id), "Missing accessible heading: #{id}") }
end
check.call(root.css('content, iframe, p p').empty?, 'Invalid wrapper, nested paragraph or unrequested embed')
check.call(!root.text.include?('[[') && !root.text.include?('{{'), 'Unrendered content syntax')
check.call(doc.at_css('h1 span em')&.text == 'Stage.', 'Lost hero emphasis/line composition')
check.call(doc.at_css('.experiences-hero-brand')&.text == original.data.dig('hero', 'brand'), 'Hero brand must remain page-owned')
check.call(doc.at_css('.experiences-hero-text .experiences-label').text.strip == [original.data.dig('hero', 'brand'), original.data.dig('hero', 'label')].join(' '), 'Brand and descriptor must read as one line')
check.call(doc.css('.experiences-routes h3 em').map(&:text) == %w[students. teachers.], 'Lost route emphasis')
check.call(doc.css('.experiences-practical strong').map(&:text) == %w[online in-person], 'Lost rich copy')
check.call(doc.at_css('.experiences-faq a')&.[]('href') == '/preview/lesson-plans', 'FAQ link ignores baseurl')
check.call(doc.at_css('.experiences-cta')&.[]('href') == '/preview/contact', 'Contact link ignores baseurl')
early_cta = root.at_css('.experiences-support-cta')
check.call(early_cta&.[]('href') == '/preview/contact', 'Earlier CTA must use the shared contact route and baseurl')
check.call(early_cta.text.strip == original.data.dig('support', 'cta'), 'Earlier CTA copy is not page-owned')
check.call(early_cta.parent.previous_element == root.at_css('.experiences-routes'), 'Earlier CTA must follow the training options')
check.call(root.at_css('.experiences-support').next_element == root.at_css('.experiences-planning'), 'FAQ must remain after the earlier CTA')
check.call(root.css('a.internal-link[href="/preview/contact"]').size == 2, 'Both contact opportunities must remain ordinary links')
check.call(doc.at_css('.experiences-cta em')&.text == 'stage together.', 'Lost finale emphasis')
scripts = doc.css('script[src]').map { |node| node['src'] }
%w[stage focus].each { |name| check.call(scripts.include?("/preview/assets/js/experiences/#{name}.mjs"), 'Missing page module or baseurl') }
check.call(scripts.count('/preview/assets/js/media-lightbox.js') == 1, 'Shared viewer boot must load exactly once')
check.call(doc.css('.experiences-arcs svg path').size == 8 && doc.css('[data-stage-torus]').size == 1, 'Lost static motion fallbacks')
hero = doc.at_css('.experiences-gathering-creators')
check.call(hero['loading'] == 'eager' && hero['fetchpriority'] == 'high', 'Hero loading priority changed')
doc.css('.experiences-seam-form').each do |form|
  check.call(form['alt'] == '' && form['loading'] == 'lazy' && form.ancestors.any? { |node| node['aria-hidden'] == 'true' }, 'Seam art is not decorative/deferred')
end
doc.css('.experiences-routes img').each { |image| check.call(image['loading'] == 'lazy' && !image['alt'].empty?, 'Route image loading/description changed') }
doc.css('.experiences img[src]').each do |image|
  check.call(image['src'].start_with?('/preview/assets/') && image['width'].to_i.positive? && image['height'].to_i.positive?, "Invalid image: #{image}")
end
check.call(doc.css('.experiences-movement video').size == 3, 'Missing media')
check.call(doc.css('.experiences-movement video source[src]').empty?, 'Video sources attach before intent/visibility')

film = root.at_css('#festival .experiences-film')
film_data = original.data.dig('possibilities', 'items').find { |item| item['id'] == 'festival' }.fetch('film')
check.call(film['href'] == film_data['href'], 'Film must keep its ordinary YouTube fallback')
check.call(film.at_css('.experiences-film__label').text == film_data['label'], 'Film invitation is not page-owned')
check.call(film.at_css('.experiences-film__caption').text == film_data['caption'], 'Film caption is not page-owned')
check.call(film['aria-labelledby'] == film.at_css('.experiences-film__label')['id'], 'Film needs a concise accessible name')
check.call(film['aria-describedby'] == film.at_css('.experiences-film__caption')['id'], 'Film caption must describe the invitation')
check.call(film.css('img').size == 1 && film.at_css('img')['loading'] == 'lazy', 'Film invitation needs one deferred still')
check.call(film.at_css('img')['src'] == "/preview#{film_data['poster']}" && film.at_css('img')['alt'] == film_data['alt'], 'Film still must be local, described and baseurl-aware')
check.call(film.at_css('.experiences-film__play.media-lightbox-mark svg'), 'Film invitation needs its shared play mark')
check.call(film.previous_element['class'] == 'experiences-movement-body', 'Film must extend the festival invitation')
check.call(root.css('a[data-lightbox-open]').size == 1, 'Film preview leaked into other movements')
dialog = root.at_css("dialog##{film['data-lightbox-open']}")
check.call(dialog && !dialog.key?('open') && dialog['aria-label'] == film_data['title'], 'Film must start closed and named')
check.call(dialog['data-lightbox-embed'] == film_data['embed'] && dialog.css('iframe').empty?, 'YouTube must not load before intent')
check.call(dialog.at_css('[data-lightbox-close]').text.include?('Close'), 'Film needs an explicit close control')

# An added event keeps its own name, scene, rich invitation and optional film.
data = JSON.parse(JSON.generate(original.data))
items = data.fetch('possibilities').fetch('items')
extra = items.first.dup.merge(
  'id' => 'math-circle', 'jump' => 'Math circle', 'event' => 'Another <question> & conversation',
  'title' => 'A different<br>*possibility.*', 'gesture' => 'lead',
  'body' => 'A **bold** [[lesson-plans|experiment]].'
)
extra.delete('poster') # Page-specific stills are optional; shared media remains the fallback.
items.unshift(extra)
items.rotate!
routes = data.fetch('support').fetch('routes')
routes << routes.first.merge('title' => 'We train your *community.*')
data.fetch('planning').fetch('questions') << { 'question' => 'Can we extend this?', 'answer' => 'Yes, with **care** and [[experiences|a stage]].' }
extended = render.call(data)
check.call(extended.css('.experiences-movement').map { |node| node['id'] } == items.map { |item| item.fetch('id') }, 'Movement order is hardcoded')
check.call(extended.css('.experiences-jump a').map { |node| node['href'] } == items.map { |item| "##{item.fetch('id')}" }, 'Jumps drifted from movements')
check.call(extended.at_css('#math-circle .experiences-movement-event').text == 'Another <question> & conversation', 'Event name lost escaping')
check.call(extended.css('#math-circle .experiences-movement-event question').empty?, 'Event names are plain text, not HTML')
check.call(extended.at_css('#math-circle .stage-focus__word').text == 'possibility.', 'Added thought lost its authored emphasis')
check.call(extended.at_css('#math-circle [data-stage-focus]')['data-stage-focus'] == 'lead', 'Added movement gesture still depends on ID')
check.call(extended.at_css('#math-circle video')['poster'] == "/preview#{site.data.fetch('media').fetch(extra['clip']).fetch('poster')}", 'Absent scene poster must fall back to the shared catalogue')
check.call(extended.at_css('#math-circle .experiences-movement-body strong')&.text == 'bold', 'Movement body lost rich text')
check.call(extended.at_css('#math-circle .experiences-movement-body a')&.[]('href') == '/preview/lesson-plans', 'Movement body lost wiki links')
check.call(extended.css('.experiences-routes article').size == 3 && extended.css('.experiences-routes h3 em').last.text == 'community.', 'Training routes cannot extend')
check.call(extended.css('.experiences-faq details').size == 5 && extended.css('.experiences-faq strong').last.text == 'care', 'FAQs cannot extend with rich text')
check.call(extended.css('.experiences-faq a').last['href'] == '/preview/experiences', 'Wiki links no longer resolve Experiences as a page')

# A section's explicit argument, not a hidden page.possibilities fallback, owns it.
# The tenth item also catches the easy-to-miss "010" numbering regression.
component_data = JSON.parse(JSON.generate(original.data))
component_data['sample'] = component_data.delete('possibilities')
component_data['sample']['seam'].delete('forms')
component_data['sample']['items'] = (1..10).map do |index|
  extra.merge('id' => "format-#{index}", 'jump' => "Format #{index}")
end
component = render.call(component_data, '{% include experiences/possibilities.html possibilities=page.sample %}')
check.call(component.css('.experiences-seam-form').empty?, 'Optional seam art is not optional')
labels = (1..10).map { |index| format('%02d', index) }
check.call(component.css('.experiences-jump-number').map(&:text) == labels, "Explicit component input or jump numbering failed: #{component.css('.experiences-jump-number').map(&:text).inspect}")
check.call(component.css('.experiences-movement h3').size == 10, 'Extended movements lost their headings')
check.call(component.css('.experiences-movement-heading .experiences-movement-event').size == 10, 'Every added scene needs its event identification')
check.call(component.css('.experiences-movement-heading .experiences-movement-event').last.text == extra['event'], 'Names must identify the event without repeating navigation numbering')

# The edition configures the same component rather than owning another dialog.
gallery = render.call(original.data, '{% include notes/lightbox.html %}')
gallery_dialog = gallery.at_css('dialog[data-lightbox="image"]')
check.call(gallery_dialog['class'] == dialog['class'], 'Image and film viewers must share the same frame')
check.call(gallery_dialog['data-lightbox-gallery'] == '.edition-window', 'Edition gallery binding drifted')
check.call(gallery_dialog['data-lightbox-caption-selector'] == '.edition-window-caption', 'Edition captions must stay attached')
check.call(gallery_dialog.at_css('[data-lightbox-image]')['src'].nil?, 'Closed gallery must not request an empty image')
check.call(gallery_dialog.at_css('template .media-lightbox-mark svg'), 'Image invitation needs its shared expand mark')
check.call(dialog.at_css('[data-lightbox-close] .media-lightbox-mark svg'), 'Film needs the shared close mark')
check.call(dialog['data-lightbox-poster'] == "/preview#{film_data['poster']}", 'Full-size film still ignores baseurl')
puts 'PASS: page identity, notes boundary, reading order, accessible anchors, rich copy, baseurl, media fallbacks, extension and reordering'
