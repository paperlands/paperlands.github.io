# frozen_string_literal: true

# Contract checks for _plugins/site_markup.rb — the one resolver a note's prose
# and a data file's words both go through, and the `markup` filter that puts a
# data string through it. Run after any change to the plugin, to the generator
# that calls it, or to a data file that relies on it:
#
#   bundle exec ruby toolchain/test/site_markup_test.rb
#
# The site is stood in for by three answers — what it links to, where they are,
# and whether links carry a `.html` — because the check is about the grammar and
# nothing else.
#
# One stand-in document deliberately has NO title. It is not hypothetical: a
# document without one used to hand an unanchored alternation to the title
# regex, which then ate the `[[` of every bracket the document named. The
# grammar has to leave such a bracket for the resolver that owns it.

require 'liquid'
require_relative 'contract_site'
require_relative '../../_plugins/site_markup'

# The filter asks its site for a markdown converter. In a build that is the
# generator's; here it is kramdown directly (contract_site.rb), set once on the
# resolver's seam so nothing below imports the generator.
SiteMarkup.markdown_renderer = ->(_site, text) { ContractSite::Markdown.convert(text) }

Doc = Struct.new(:basename, :url, :data)

class FakeSite
  attr_reader :collections, :pages, :baseurl

  def initialize(baseurl, html_extension)
    @baseurl = baseurl
    @html_extension = html_extension
    @collections = {
      'notes' => Struct.new(:docs).new([
        Doc.new('experiences.md', '/experiences', { 'title' => 'Math Takes The Stage' }),
        Doc.new('our_approach.md', '/our-approach', { 'title' => 'Create First' })
      ])
    }
    @pages = [
      Doc.new('contact.md', '/contact', { 'title' => 'Contact' }),
      Doc.new('lesson-plans.md', '/lesson-plans', { 'title' => 'Lesson Plans' }),
      Doc.new('plain.md', '/plain', {})
    ]
  end

  def config
    { 'use_html_extension' => @html_extension }
  end

end

site = FakeSite.new('', false)

def link(href, label)
  "<a class='internal-link' href='#{href}'>#{label}</a>"
end

# ---- a bracket names a document -------------------------------------------
by_file = SiteMarkup.resolve(site, 'an [[experiences|Experience]] you craft')
raise "By filename: #{by_file.inspect}" unless by_file ==
  "an #{link('/experiences', 'Experience')} you craft"

by_title = SiteMarkup.resolve(site, 'see [[Math Takes The Stage|the stage]]')
raise "By title: #{by_title.inspect}" unless by_title ==
  "see #{link('/experiences', 'the stage')}"

# A filename's hyphen is a space a reader would write: `lesson-plans.md`
# answers to "lesson plans".
hyphen = SiteMarkup.resolve(site, '[[lesson plans|the lessons]]')
raise "Hyphenated filename: #{hyphen.inspect}" unless hyphen ==
  link('/lesson-plans', 'the lessons')

# The UNDERSCORE half of that mapping is inert on this Ruby: `Regexp.escape
# ('our_approach')` no longer escapes the `_`, so resolve's `gsub('\_', '[ _]')`
# finds nothing to replace and `our_approach.md` answers to its title alone.
# Pinned as it is rather than asserted as it should be — the live example
# (`[[Our Approach|Our Approach]]` in _notes/experiences.md) is answered today
# by _pages/redirects/approach.md, whose TITLE is "Our Approach", so repairing
# the mapping moves where a note points and has to be taken deliberately.
underscored = SiteMarkup.resolve(site, '[[Our Approach|Create First]]')
raise "An underscore now maps to a space: #{underscored.inspect}" unless
  underscored.include?('invalid-link')

# A bare bracket is a link that reads as the name the author wrote.
bare = SiteMarkup.resolve(site, '[[contact]] and [[experiences]]')
raise "Bare name: #{bare.inspect}" unless bare ==
  "#{link('/contact', 'contact')} and #{link('/experiences', 'experiences')}"

raise 'Mutated the source' unless begin
  source = 'a [[experiences|note]] and *emphasis*'
  original = source.dup
  SiteMarkup.resolve(site, source)
  source == original
end

# ---- a bracket that names nothing is greyed out, not eaten ----------------
# The titleless page is in the pool, and the label survives inside the marker.
gone = SiteMarkup.resolve(site, 'the [[gmff|film festival]]')
raise 'Dropped the words' unless gone.include?('film festival')
raise "Not marked invalid: #{gone.inspect}" unless gone.include?("class='invalid-link'")
raise 'No brackets shown' unless gone.scan('invalid-link-brackets').size == 2

# ---- the link extension is the site's -------------------------------------
html = SiteMarkup.resolve(FakeSite.new('/site', true), '[[contact]]')
raise "Extension/baseurl: #{html.inspect}" unless html ==
  "<a class='internal-link' href='/site/contact.html'>contact</a>"

# ---- the filter: a data string's markup, inline ---------------------------
filter = Object.new.extend(SiteMarkupFilters)
filter.instance_variable_set(:@context, Struct.new(:registers).new({ :site => site }))

lede = filter.markup('your hopes for an [[experiences|Experience]] you like')
raise "Filter lost the link: #{lede.inspect}" unless lede ==
  'your hopes for an <a class="internal-link" href="/experiences">Experience</a> you like'

# The element is the caller's: one paragraph comes back without its <p>.
raise "Not inline: #{filter.markup('*emphasis*').inspect}" unless
  filter.markup('*emphasis*') == '<em>emphasis</em>'

# A field that renders as two paragraphs is returned whole, markers and all.
raise 'Silently unwrapped two paragraphs' unless
  filter.markup("one\n\ntwo").include?('<p>one</p>')

# A word wearing a class is how a data file sets a face, and the class survives.
worn = filter.markup('To <span class="font-paperlang">PaperLand</span>')
raise "Lost the span: #{worn.inspect}" unless
  worn == 'To <span class="font-paperlang">PaperLand</span>'

address = filter.markup('Or write to [info@paperland.sg](mailto:info@paperland.sg)')
raise "Lost the mail link: #{address.inspect}" unless
  address == 'Or write to <a href="mailto:info@paperland.sg">info@paperland.sg</a>'

puts 'PASS: brackets by file, title and bare name; greedy-free with a titleless ' \
     'document; greyed out when a bracket names nothing; nothing mutated; the ' \
     'site’s link extension; and the filter: link, emphasis, span, mail link, ' \
     'inline but never multi-paragraph'
