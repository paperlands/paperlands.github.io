# frozen_string_literal: true

# SiteMarkup — the site's inline markup, in one module.
#
# A letter's words are the site's words, so they are written in the grammar the
# notes already use and not in one invented for a data file:
#
#   [[experiences|Experience]]      a link to a note or a page, by the target's
#                                   filename or by its title
#   *emphasis*  **strong**          kramdown, as in a note's prose
#   <span class="font-paperlang">PaperLand</span>
#                                   a word wearing classes — how a data file
#                                   sets a face. NOT `[word]{: .class}`, which
#                                   looks like it should work and does not:
#                                   kramdown hangs a span IAL on emphasis and
#                                   on links only. The span is the site's own
#                                   idiom; every page accents a word with it.
#
# ONE GRAMMAR, TWO SURFACES.
#
#   BidirectionalLinksGenerator   resolves the brackets over every note's and
#                                 page's CONTENT, before kramdown — which is
#                                 what makes a note's prose linked at all.
#   `markup` (Liquid filter)      resolves them over a STRING IN _data/*.yml.
#                                 No generator walks _data/, so a `[[…]]` in
#                                 _data/contact.yml printed its own brackets on
#                                 every page of the site.
#
# The resolver lives here so the two cannot drift. A second implementation of
# this grammar would be a second, silent owner of it — the mistake
# _plugins/notes_edition.rb refuses to make about figures.
#
# WHY A FILTER AND NOT `markdownify`. Markdown has no `[[…]]`, and turning a
# note's title into a note's url needs the SITE — which Liquid cannot hand to a
# template that was handed a string.
#
# WHY THE FILTER IS INLINE. The element is the caller's: contact_modal.html
# writes the <h2> and the <p>, and the filter hands back what goes INSIDE them.
# A single paragraph is unwrapped; a field that renders as several is returned
# whole, because a <p> inside a <p> is not a thing to guess at — a
# two-paragraph field wants its own include, not this filter.
#
# PLUGIN REGISTRATION IS BOOT-TIME, and this is the one failure that looks like a
# build bug on every page at once. `jekyll serve` renders on change but never
# reloads _plugins/, so a server started BEFORE this file existed has no `markup`
# filter — and Liquid prints an unknown filter's input unchanged, so the letter's
# words come out with their brackets and their markdown intact. Restart the
# server; nothing is wrong with the build.
module SiteMarkup
  # What is left of a `[[…]]` that names nothing. Greyed out rather than
  # dropped, so the author sees the typo where the reader would have.
  INVALID_LINK = <<~HTML.delete("\n")
    <span title='There is no note that matches this link.' class='invalid-link'><span class='invalid-link-brackets'>[[</span>\\1<span class='invalid-link-brackets'>]]</span></span>
  HTML

  module_function

  # Every [[bracket]] in `text`, resolved against the site's notes and pages.
  # Returns a new string: neither a note's content nor a data string is mutated.
  def resolve(site, text)
    return text if text.nil?

    # MOST STRINGS HAVE NO BRACKETS IN THEM — the letter's title, its address, its
    # receipt — and a string with no `[` cannot name anything. One `include?`
    # instead of a pattern per document per field, because this runs at RENDER
    # time on every page the letter is placed on. (Measured: it spent ~6ms of a
    # build whose real cost is two Tailwind CLI runs; this is the difference
    # between the filter being free and being nothing.)
    return text unless text.include?('[')

    extension = link_extension(site)
    targets(site).each do |target|
      basename = File.basename(target.basename, File.extname(target.basename))
      basename = Regexp.escape(basename).gsub('\_', '[ _]').gsub('\-', '[ -]').capitalize

      title = target.data['title']
      title = Regexp.escape(title) if title

      # \1 is the label: what the author wrote between the bracket and the
      # `|`, or — for a bare [[name]] — the name as they spelled it, which is
      # why each pattern captures one. A pattern without a group left the link
      # text empty, so [[a note]] drew a link with nothing in it.
      anchor = "<a class='internal-link' href='#{site.baseurl}#{target.url}#{extension}'>\\1</a>"

      # [[A note about cats|this is a link to the note about cats]]
      text = text.gsub(/\[\[#{basename}\|(.+?)(?=\])\]\]/i, anchor)
      # [[cats|this is a link to the note about cats]]
      text = text.gsub(/\[\[#{title}\|(.+?)(?=\])\]\]/i, anchor) if title
      # [[A note about cats]]
      text = text.gsub(/\[\[(#{title})\]\]/i, anchor) if title
      # [[cats]]
      text = text.gsub(/\[\[(#{basename})\]\]/i, anchor)
    end

    text.gsub(/\[\[([^\]]+)\]\]/i, INVALID_LINK)
  end

  # The documents a bracket may name. A note is a document; so is a page —
  # `_pages/contact.md` and `/experiences` are both reachable this way.
  def targets(site)
    site.collections['notes'].docs + site.pages
  end

  # What every link to a document ends with, so a bracket link and the graph
  # node that names the same document agree on one address.
  def link_extension(site)
    site.config['use_html_extension'] ? '.html' : ''
  end

  # A lone paragraph comes back without its <p>; more than one comes back as
  # kramdown wrote it.
  def inline(html)
    return html unless html.scan('<p>').size == 1 && html.scan('</p>').size == 1

    html[/\A<p>(.*)<\/p>\s*\z/m, 1]
  end
end

# The Liquid side: `{{ letter.lede | markup }}`, in a data file's template.
module SiteMarkupFilters
  def markup(text)
    return text if text.nil?

    site = @context.registers[:site]
    markdown = site.find_converter_instance(Jekyll::Converters::Markdown)
    SiteMarkup.inline(markdown.convert(SiteMarkup.resolve(site, text.to_s)))
  end
end

Liquid::Template.register_filter(SiteMarkupFilters)
