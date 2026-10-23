# frozen_string_literal: true

# bundle exec ruby design/probe/experiences_page_test.rb
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
  %w[id jump identity invitation event title gesture clip caption body outcome].each do |field|
    check.call(item[field].is_a?(String) && !item[field].strip.empty?, "Missing movement field: #{field}")
  end
  check.call(item['id'].match?(/\A[a-z][a-z0-9-]*\z/), "Invalid fragment ID: #{item['id']}")
  check.call(%w[explore create lead].include?(item['gesture']), "Unknown movement gesture: #{item['gesture']}")
  check.call(site.data.fetch('media').key?(item['clip']), "Unknown media clip: #{item['clip']}")
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
check.call(doc.css('.experiences-arcs svg path').size == 8 && doc.css('[data-stage-torus]').size == 1, 'Lost static motion fallbacks')
hero = doc.at_css('.experiences-gathering-creators')
check.call(hero['loading'] == 'eager' && hero['fetchpriority'] == 'high', 'Hero loading priority changed')
doc.css('.experiences-seam-form').each do |form|
  check.call(form['alt'] == '' && form['loading'] == 'lazy' && form.ancestors.any? { |node| node['aria-hidden'] == 'true' }, 'Seam art is not decorative/deferred')
end
doc.css('.experiences-routes img').each { |image| check.call(image['loading'] == 'lazy' && !image['alt'].empty?, 'Route image loading/description changed') }
doc.css('.experiences img').each do |image|
  check.call(image['src'].start_with?('/preview/assets/') && image['width'].to_i.positive? && image['height'].to_i.positive?, "Invalid image: #{image}")
end
check.call(doc.css('.experiences-movement video').size == 3, 'Missing media')
check.call(doc.css('.experiences-movement video source[src]').empty?, 'Video sources attach before intent/visibility')

# A new ID must not silently inherit a gesture from an ID-specific case branch.
data = JSON.parse(JSON.generate(original.data))
items = data.fetch('possibilities').fetch('items')
extra = items.first.dup.merge(
  'id' => 'math-circle', 'jump' => 'Math circle', 'title' => 'Another *question.*', 'gesture' => 'create',
  'body' => 'A **bold** [[lesson-plans|experiment]].', 'outcome' => 'Make *connections.*'
)
items.unshift(extra)
items.rotate!
routes = data.fetch('support').fetch('routes')
routes << routes.first.merge('title' => 'We train your *community.*')
data.fetch('planning').fetch('questions') << { 'question' => 'Can we extend this?', 'answer' => 'Yes, with **care** and [[experiences|a stage]].' }
extended = render.call(data)
check.call(extended.css('.experiences-movement').map { |node| node['id'] } == items.map { |item| item.fetch('id') }, 'Movement order is hardcoded')
check.call(extended.css('.experiences-jump a').map { |node| node['href'] } == items.map { |item| "##{item.fetch('id')}" }, 'Jumps drifted from movements')
check.call(extended.at_css('#math-circle [data-stage-focus]')&.[]('data-stage-focus') == 'create', 'Gesture still depends on ID')
check.call(extended.at_css('#math-circle .stage-focus__word')&.text == 'question.', 'New title lost rich emphasis')
check.call(extended.at_css('#math-circle .experiences-movement-body strong')&.text == 'bold', 'Movement body lost rich text')
check.call(extended.at_css('#math-circle .experiences-movement-body a')&.[]('href') == '/preview/lesson-plans', 'Movement body lost wiki links')
check.call(extended.at_css('#math-circle .experiences-movement-outcome em')&.text == 'connections.', 'Movement outcome lost rich text')
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
check.call(component.css('.experiences-movement-number').map(&:text) == labels, 'Movement numbering drifted from navigation')
check.call(component.css('.experiences-movement-visual figcaption').last.text.strip.start_with?('10 /'), 'Caption numbering drifted')
puts 'PASS: page identity, notes boundary, reading order, accessible anchors, rich copy, baseurl, media fallbacks, extension and reordering'
