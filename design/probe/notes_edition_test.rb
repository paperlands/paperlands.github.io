# frozen_string_literal: true

# Contract checks for _plugins/notes_edition.rb — the filters the note layout
# depends on. Run after any change to the plugin or the note layout:
#
#   bundle exec ruby design/probe/notes_edition_test.rb
#
# Promoted with the plugin from the evening-ink study, where it was
# design/probe/reading_edition_test.rb. The figure assertions are inverted on
# purpose: figures are owned by _includes/figure and _includes/media/figure.html
# and must pass through these filters untouched.

require 'liquid'
require 'yaml'
require_relative '../../_plugins/notes_edition'

filter = Object.new.extend(NotesEdition)
source = <<~HTML.freeze
  <h2 id="thinking">Thinking &amp; making</h2>
  <h3 id="tools">Tools</h3>
  <figure><img src="/assets/lib/kids.jpg" alt="Children at a computer"><figcaption>Image caption.</figcaption></figure>
  <p>Before <label for="margin-toggle">⊕</label><input id="margin-toggle" type="checkbox"><span class="marginnote">A note with <em>emphasis</em>.</span> after.</p>
  <p>A window <label for="margin-toggle-2">⊕</label><input id="margin-toggle-2" type="checkbox"><span class="marginnote"><img src="/assets/lib/notes/our-approach/student-flower.webp" alt="A flower"></span>.</p>
  <p>A captioned window <label for="margin-toggle-3">⊕</label><input id="margin-toggle-3" type="checkbox"><span class="marginnote"><img src="/assets/lib/notes/our-approach/student-flower.webp" alt="A flower"><span class="edition-window-caption">A flower, drawn.</span></span>.</p>
  <p>A picture with words <label for="margin-toggle-4">⊕</label><input id="margin-toggle-4" type="checkbox"><span class="marginnote"><img src="/assets/lib/notes/our-approach/student-flower.webp" alt="A flower"> and words about it.</span>.</p>
  <p>A reference<sup id="fnref:1"><a class="footnote" href="#fn:1">1</a></sup>.</p>
  <div class="footnotes"><ol><li id="fn:1"><p>A footnote. <a class="reversefootnote" href="#fnref:1">↩</a></p></li></ol></div>
HTML
original = source.dup
html = filter.note_edition(source)
doc = Nokogiri::HTML::DocumentFragment.parse(html)
raise 'Mutated original note' unless source == original
raise 'Lost annotations' unless doc.css('[role="note"]').size == 5
raise 'Rewrote component-owned figure' unless doc.at_css('figure figcaption').text == 'Image caption.' && doc.css('figure [class], figure[class]').empty?
raise 'Lost image description' unless doc.at_css('img')['alt'] == 'Children at a computer'
raise 'Left duplicate footnotes' unless doc.css('.footnotes').empty?
raise 'Left checkbox UI' unless doc.css('input, label').empty?
raise 'Lost note formatting' unless doc.at_css('.edition-sidenote em').text == 'emphasis'
raise 'Lost paragraph continuation' unless doc.text.include?('after.')
# The annotation's name is a name, not a heading: no label is emitted into the
# rail, and the note carries its name for a screen reader instead.
raise 'Kept the note heading' unless doc.css('.edition-note-label').empty?
raise 'Lost the note name' unless doc.at_css('.edition-sidenote[aria-label="Margin note 01"]')
raise 'Lost the footnote name' unless doc.css('[role="note"][aria-label]').map { |n| n['aria-label'] }.include?('Footnote 1')
raise 'Lost an image window' unless doc.css('.edition-window').size == 2
raise 'Lost the window caption' unless doc.at_css('.edition-window .edition-window-caption').text == 'A flower, drawn.'
raise 'Accompanied the image window' unless doc.at_css('.edition-window .edition-note-label').nil?
# A window is still a note: it comes home by the same return link, to an
# anchor in the text that draws nothing (no visible marker).
raise 'Lost the window return' unless doc.css('.edition-window a.note-return').size == 2
raise 'Window return has no home' unless doc.css('.edition-window-ref + .edition-window').size == 2
# A picture with words beside it is a note that speaks, not a window: a
# caption may ride along with a picture, prose may not.
raise 'Swallowed a note that speaks' unless doc.css('[role="note"]:not(.edition-window)').size == 3 &&
  doc.css('.edition-sidenote:not(.edition-window) img').size == 1
doc.css('a[href^="#"]').each do |a|
  raise "Broken reference #{a['href']}" unless doc.css('[id]').any? { |node| node['id'] == a['href'].delete_prefix('#') }
end

# The drop cap is an ELEMENT, not a `::first-letter` pseudo, because the
# pseudo's float box is engine-defined — the same rule builds a 74px box in
# Chromium and a 50px box in Firefox for this face, and the letter lands 23px
# apart. Sheet geometry cannot fix that; a real span can (it lays out the same
# in both engines), so the letter is wrapped at build time.
cap = doc.at_css('.edition-dropcap')
raise 'No drop cap element' unless cap
raise 'Capped the wrong letter' unless cap.text == 'B'
raise 'Cap is not in the lede paragraph' unless cap.parent.name == 'p' && cap.parent.text.start_with?('Before')
raise 'Cap stayed inside a pseudo rule' if html.include?('::first-letter')
# The cap is the first LETTER as `::first-letter` defines it: an opening quote
# is part of the letter, and a door out is the opening gesture, not the prose.
door = Nokogiri::HTML::DocumentFragment.parse(filter.note_edition(
  %(<p><a class="internal-link side-link" href="/somewhere">Walk this way</a></p>) +
  %(<p>\u201cWhat I cannot create, I do not understand.\u201d \u2014 Feynman</p>)
))
raise 'Capped a door out' unless door.at_css('.edition-dropcap')&.text == "\u201cW"
raise 'Lost the rest of the lede' unless door.text.include?('hat I cannot create')

toc = Nokogiri::HTML::DocumentFragment.parse(filter.note_contents(html))
raise 'Incorrect TOC' unless toc.css('a').map { |a| a['href'] } == ['#thinking', '#tools']
raise 'Unescaped heading' unless toc.text.include?('Thinking & making')
raise 'Missing hierarchy' unless toc.at_css('.toc-h3')
raise 'Subheads not folded under their chapter' unless toc.at_css('li.toc-h2 > ol.toc-sub > li.toc-h3')
raise 'Orphaned chapter close' unless toc.css('li.toc-h2 > a').size == 1 && toc.css('ol.toc-sub').size == 1

graph = JSON.parse(File.read(File.expand_path('../../_includes/notes_graph.json', __dir__)))
# The JSON is a renderer fixture, not the build's graph (the generator keeps
# site.data.notes_graph in memory). Guard it against going stale: its node set
# must be exactly the notes collection's titles, and every edge must join two
# nodes it carries.
note_titles = Dir[File.expand_path('../../_notes/*.md', __dir__)].map do |path|
  front_matter = File.read(path)[/\A---\s*\n(.*?)\n---/m, 1]
  YAML.safe_load(front_matter)['title']
end.compact.sort
raise 'Stale graph fixture: node set does not match _notes/' unless graph['nodes'].map { |node| node['label'] }.sort == note_titles
node_ids = graph['nodes'].map { |node| node['id'] }
raise 'Graph fixture has an edge with no node' unless graph['edges'].all? { |edge| node_ids.include?(edge['source']) && node_ids.include?(edge['target']) }
[false, true].each do |compact|
  svg = Nokogiri::HTML::DocumentFragment.parse(filter.note_graph(JSON.dump(graph), '/beginnings', compact))
  raise 'Invented/missing edges' unless svg.css('line').size == graph['edges'].size
  raise 'Lost graph nodes' unless svg.css('a').size == graph['nodes'].size
  raise 'Missing current node' unless svg.css('.graph-current').size == 1
  raise 'Unlabeled graph links' unless svg.css('a').all? { |a| a['aria-label'] && a.at_css('title') }
end
raise 'Empty graph fails' unless filter.note_graph('{"nodes":[],"edges":[]}', '/beginnings') == ''
puts 'PASS: immutable source, figures untouched, notes, fragment links, heading hierarchy, graph data'
