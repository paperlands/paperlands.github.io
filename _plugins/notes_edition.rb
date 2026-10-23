# frozen_string_literal: true

require 'nokogiri'
require 'cgi'
require 'json'

# Notes edition assembly — the three derivations the note layout cannot make
# in Liquid, and nothing else.
#
# This is production, promoted from the evening-ink design study (06) that
# lives in the reimage worktree. The study called it `reading_edition`; the
# filters are renamed for the surface they serve. Their contract is asserted
# by design/probe/notes_edition_test.rb.
#
#   note_edition(html)      annotations -> edition sidenotes
#   note_contents(html)     the contents rail from RENDERED heading ids
#   note_graph(json, url)   the server-rendered notes graph
#
# WHY A FILTER AT ALL. Two of these must see output that does not exist until
# the page is rendered (kramdown's footnote list, kramdown's heading ids), and
# the third is float geometry over a graph data file. Everything that CAN be
# an include IS one: the figure components emit their own semantic markup, so
# this filter deliberately does not rewrite figures — that would be a second,
# silent owner of their markup.
#
# THE MARGINALIA CONTRACT. `core/document.css` calls the Tufte apparatus
# "the apparatus the Library must keep", and it does: the {% margin %} and
# {% sidenote %} tags, and kramdown's own footnote output, stay exactly as
# they are. This filter only restyles what they emit into the edition's one
# marginalia vocabulary, and keeps every annotation AT ITS SOURCE PASSAGE:
#
#   <sup id="edition-margin-1-ref"><a href="#edition-margin-1">01</a></sup>
#   <span class="edition-sidenote" id="edition-margin-1" role="note"
#         aria-label="Margin note 01"> …
#     <a class="note-return" href="#edition-margin-1-ref">↩</a>
#   </span>
#
# The same shape serves kramdown footnotes, named the same way and keeping the
# reader's own numbering. The name is a name, not a heading: "Margin note 01"
# set as ink at the top of a 15rem rail costs every annotation its first line,
# and the superscription at the source passage plus the return link already
# carry the tie. `aria-label` is what the printed heading used to do for a
# screen reader, without the ink. Nothing is hidden behind a hover or a
# checkbox, and the source document is never mutated — filters run on the
# rendered copy.
module NotesEdition
  def note_edition(html)
    doc = Nokogiri::HTML::DocumentFragment.parse(html)

    # Papert margin notes and Tufte sidenotes remain at their source position
    # in the DOM. A float places them in the margin on wide screens; narrow
    # screens and print show them inline, where they already sit.
    doc.css('span.marginnote, span.sidenote').each_with_index do |note, index|
      id = "edition-margin-#{index + 1}"
      input = note.previous_element
      label = input&.previous_element
      label.remove if label&.name == 'label'
      input.remove if input&.name == 'input'

      # A margin note that is only a picture is a window in the side: the image,
      # and the caption it may carry, expanded by .edition-window. Accompaniment
      # is for notes that speak, so a window keeps no visible marker — but it is
      # still a note with a source passage, and it still comes home by the same
      # return link the other notes carry.
      #
      # The caption is a span rather than a figcaption because this note sits
      # INSIDE a paragraph (it holds the source passage's place), and a
      # block-level child ends that paragraph in kramdown — which is how the
      # note ends up empty, its figure orphaned in the body, and its `</span>`
      # escaped into the text. Anything block-level belongs in a plate.
      caption = note.element_children.drop(1)
      if note.element_children.first&.name == 'img' &&
          caption.all? { |child| child.name == 'span' && child['class'].to_s.split.include?('edition-window-caption') } &&
          note.children.select(&:text?).all? { |text| text.text.strip.empty? }
        # The anchor that receives the return link sits in the text at the
        # passage and draws nothing, so the window stays unmarked. It is what
        # `#<id>-ref` names; without it the return link would be dead.
        anchor = Nokogiri::XML::Node.new('a', doc)
        anchor['id'] = "#{id}-ref"
        anchor['class'] = 'edition-window-ref'
        anchor['aria-hidden'] = 'true'
        note.add_previous_sibling(anchor)
        note['id'] = id
        note['class'] = 'edition-sidenote edition-window'
        note['role'] = 'note'
        note['aria-label'] = "Margin note #{format('%02d', index + 1)}"
        note.inner_html = "#{note.inner_html} <a class=\"note-return\" href=\"##{id}-ref\" aria-label=\"Return to the source passage\">↩</a>"
        next
      end

      marker = Nokogiri::XML::Node.new('sup', doc)
      marker['id'] = "#{id}-ref"
      marker.inner_html = %(<a href="##{id}" aria-label="Margin note #{index + 1}">#{format('%02d', index + 1)}</a>)
      note.add_previous_sibling(marker)
      note['id'] = id
      note['class'] = 'edition-sidenote'
      note['role'] = 'note'
      note['aria-label'] = "Margin note #{format('%02d', index + 1)}"
      note.inner_html = "#{note.inner_html} <a class=\"note-return\" href=\"##{id}-ref\" aria-label=\"Return to margin note reference\">↩</a>"
    end

    # Kramdown footnotes become a second kind of marginalia, not a duplicate
    # endnote list: their body joins their reference, their list is removed.
    doc.css('.footnotes li[id]').each do |footnote|
      reference = doc.css('a.footnote').find { |a| a['href'] == "##{footnote['id']}" }
      next unless reference

      note = Nokogiri::XML::Node.new('span', doc)
      note['id'] = footnote['id']
      note['class'] = 'edition-sidenote edition-footnote'
      note['role'] = 'note'
      footnote.css('p').each { |p| p.replace(p.children) }
      note['aria-label'] = "Footnote #{reference.text}"
      note.inner_html = footnote.inner_html
      reference.parent.add_next_sibling(note)
      footnote.remove
    end
    doc.css('.footnotes').each { |node| node.remove if node.css('li').empty? }

    wrap_dropcap(doc)
    doc.to_html
  end

  # The drop cap is an ELEMENT, not a `::first-letter` pseudo.
  #
  # The pseudo cannot be authored. Its float box is the engine's decision, and
  # the engines disagree about it: measured on /our-approach with this
  # stylesheet and this face, the same rule builds a 74px box in Chromium 153
  # and a 50px box in Firefox 152, an explicit `height` on the pseudo is
  # ignored by both, and stating `line-height` moves only Chromium's offset. The
  # letter lands 23px apart — Chromium sinks it below the two lines it should
  # cap — and no property settles it, because the box is not in the CSS. A real
  # span lays out identically in both engines (73.59 vs 73.63px), so the letter
  # is wrapped here and its geometry is stated in evening.css.
  #
  # WHICH PASSAGE. The same one the pseudo targeted: the essay's first
  # paragraph, skipping a paragraph that is itself a door out (a side-link) —
  # the door is the opening gesture and the cap belongs to the prose after it.
  # Direct children only: the epigraph's paragraph belongs to its blockquote.
  #
  # WHAT IS WRAPPED. The first LETTER as `::first-letter` defines it: leading
  # punctuation and quotes belong to the cap ('“W' caps the W's quote, not the
  # W), and leading whitespace stays outside it. Trailing punctuation is not
  # included; no note in the Library opens with '(A)' or a closing quote.
  def wrap_dropcap(doc)
    paragraph = doc.children.find { |node| node.name == 'p' && node.css('a.side-link').empty? }
    return unless paragraph

    paragraph.xpath('.//text()').each do |text|
      match = text.content.match(/\A(?<space>\s*)(?<punct>[^\p{L}\s]*)(?<letter>\p{L})/)
      next unless match

      remainder = text.content[match.end(0)..] || ''
      span = Nokogiri::XML::Node.new('span', doc)
      span['class'] = 'edition-dropcap'
      span.content = match[:punct] + match[:letter]
      if match[:space].empty?
        text.replace(span)
      else
        text.content = match[:space]
        text.add_next_sibling(span)
      end
      span.add_next_sibling(Nokogiri::XML::Text.new(remainder, doc)) unless remainder.empty?
      break
    end
  end

  # Contents for the rail, from the ids kramdown actually generated — never a
  # second outline that can drift from the headings.
  def note_contents(html)
    doc = Nokogiri::HTML::DocumentFragment.parse(html)
    items = +''
    in_h2 = false
    open_sub = false
    doc.css('h2[id], h3[id]').each do |heading|
      link = %(<a href="##{CGI.escapeHTML(heading['id'])}">#{CGI.escapeHTML(heading.text)}</a>)
      if heading.name == 'h2'
        items << '</ol>' if open_sub
        items << '</li>' if in_h2
        items << %(<li class="toc-h2">#{link})
        in_h2 = true
        open_sub = false
      elsif in_h2
        items << '<ol class="toc-sub">' unless open_sub
        items << %(<li class="toc-h3">#{link}</li>)
        open_sub = true
      else
        items << %(<li class="toc-h3">#{link}</li>)
      end
    end
    items << '</ol>' if open_sub
    items << '</li>' if in_h2
    items
  end

  # The graph, server-rendered: real links, real edges, the current note
  # distinguished, and no invented proximity. Two renditions — a horizontal
  # constellation and a vertical thread for narrow screens — rather than one
  # layout shrinking labels into illegibility. Nodes come from
  # site.data.notes_graph, built in memory by
  # _plugins/bidirectional_links_generator.rb (a build writes no source files).
  def note_graph(json, current_url, compact = false)
    data = JSON.parse(json)
    nodes = data.fetch('nodes')
    return '' if nodes.empty?

    width = compact ? 320 : 840
    height = compact ? nodes.size * 90 + 10 : 265
    positions = nodes.each_with_index.to_h do |node, index|
      [node.fetch('id'), compact ? [18, 35 + index * 90] : [width * (index + 0.5) / nodes.size, index.even? ? 100 : 145]]
    end
    # Gradient blending, so the constellation reads as light rather than hard
    # gold sticks: every edge carries its own gradient, emerging from the
    # source node's ink, warming through the shared gold at the middle, and
    # dissolving into the target's. Nodes are soft radial orbs. `key` keeps
    # the two renditions' gradient ids distinct, since both live in one
    # document.
    key = compact ? 'narrow' : 'wide'
    node_ink = nodes.to_h do |node|
      [node.fetch('id'), node['path'] == current_url ? 'var(--evening-sun)' : 'var(--evening-orbit)']
    end
    defs = +%(<radialGradient id="graph-orb-#{key}"><stop offset="0" style="stop-color: var(--evening-orbit); stop-opacity: 0.85"/><stop offset="0.5" style="stop-color: var(--evening-gold); stop-opacity: 0.35"/><stop offset="1" style="stop-color: var(--evening-orbit); stop-opacity: 0"/></radialGradient>)
    defs << %(<radialGradient id="graph-orb-current-#{key}"><stop offset="0" style="stop-color: var(--evening-sun); stop-opacity: 1"/><stop offset="0.45" style="stop-color: var(--evening-flare); stop-opacity: 0.5"/><stop offset="1" style="stop-color: var(--evening-flare); stop-opacity: 0"/></radialGradient>)
    edges = data.fetch('edges').each_with_index.filter_map do |edge, index|
      source, target = positions[edge['source']], positions[edge['target']]
      next unless source && target

      defs << %(<linearGradient id="graph-edge-#{key}-#{index}" gradientUnits="userSpaceOnUse" x1="#{source[0]}" y1="#{source[1]}" x2="#{target[0]}" y2="#{target[1]}"><stop offset="0" style="stop-color: #{node_ink[edge['source']]}; stop-opacity: 0.05"/><stop offset="0.14" style="stop-color: #{node_ink[edge['source']]}; stop-opacity: 0.8"/><stop offset="0.5" style="stop-color: var(--evening-gold); stop-opacity: 1"/><stop offset="0.86" style="stop-color: #{node_ink[edge['target']]}; stop-opacity: 0.8"/><stop offset="1" style="stop-color: #{node_ink[edge['target']]}; stop-opacity: 0.05"/></linearGradient>)
      %(<line x1="#{source[0]}" y1="#{source[1]}" x2="#{target[0]}" y2="#{target[1]}" style="stroke: url(#graph-edge-#{key}-#{index})" />)
    end.join
    circles = nodes.map do |node|
      x, y = positions.fetch(node.fetch('id'))
      active = node['path'] == current_url
      label = CGI.escapeHTML(node.fetch('label'))
      words = node.fetch('label').split
      lines = words.each_with_object(['']) do |word, result|
        if result.last.length + word.length > 24
          result << word
        else
          result[-1] = [result.last, word].reject(&:empty?).join(' ')
        end
      end
      text_x, text_y = compact ? [48, y + 5] : [x, y + 34]
      text = lines.each_with_index.map { |line, i| %(<tspan x="#{text_x}" dy="#{i.zero? ? 0 : 19}">#{CGI.escapeHTML(line)}</tspan>) }.join
      orb = active ? "graph-orb-current-#{key}" : "graph-orb-#{key}"
      %(<a href="#{CGI.escapeHTML(node.fetch('path'))}" aria-label="#{label}"#{active ? ' class="graph-current"' : ''}><title>#{label}#{active ? ' — this note' : ''}</title><circle cx="#{x}" cy="#{y}" r="#{active ? 9 : 5}" style="fill: url(##{orb})" /><text x="#{text_x}" y="#{text_y}" text-anchor="#{compact ? 'start' : 'middle'}">#{text}</text></a>)
    end.join
    %(<svg class="edition-graph#{compact ? ' edition-graph-compact' : ' edition-graph-wide'}" viewBox="0 0 #{width} #{height}" role="group" aria-label="Notes graph. Lines represent links between notes."><defs>#{defs}</defs><g class="graph-edges">#{edges}</g>#{circles}</svg>)
  end
end

Liquid::Template.register_filter(NotesEdition)
