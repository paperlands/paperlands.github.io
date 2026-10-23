# frozen_string_literal: true

# The one file in design/probe that is allowed to know which generator built
# the site.
#
# Two contracts need more than the written HTML. `experiences_page_test.rb`
# re-renders a page from data it mutates (reordered movements, an added
# fragment id, an extended FAQ) to prove the templates are data-driven rather
# than hardcoded, and `site_markup_test.rb` stands a fake site in front of the
# bracket resolver, which needs a markdown converter to turn a resolved link
# back into inline HTML. Neither question can be asked of `_site/` after the
# fact, so both asked Jekyll directly — one import away from making the whole
# probe suite a Jekyll test suite.
#
# Everything the two contracts need is here instead: the site's model (a page,
# its notes, its data) and one way to render a template against it. The bodies
# of the contracts below this file name no engine and no generator, so moving
# to another one means writing a second backend here, not rewriting 400 lines
# of assertions.
#
#   page(path)              -> ContractSite::Page(url:, data:, content:, path:)
#   notes                   -> ["our_approach", ...]  (basenames, no extension)
#   notes_graph_paths       -> ["/our-approach", ...]
#   data                    -> the site's _data, merged
#   render(data:, content:) -> HTML, rendered fresh from the given data
#
# The backend below is Jekyll. `ContractSite::Markdown` is deliberately NOT
# Jekyll's converter: the resolver only needs kramdown, and taking the wrapper
# out of the loop is what lets site_markup_test.rb drop `require "jekyll"`.
require 'json'
require 'tmpdir'

module ContractSite
  Page = Struct.new(:url, :data, :content, :path, keyword_init: true)

  # kramdown, configured as Jekyll's Markdown converter configures it: GFM
  # input, rouge for fences, and nothing else set. Kept here rather than taken
  # from the engine so the resolver can be tested without one.
  module Markdown
    OPTIONS = {
      :input => 'GFM',
      :syntax_highlighter => 'rouge',
      :syntax_highlighter_opts => { :default_lang => 'plaintext', :guess_lang => nil },
    }.freeze

    def self.convert(text)
      require 'kramdown'
      require 'kramdown-parser-gfm'
      Kramdown::Document.new(text.to_s, **OPTIONS).to_html
    end
  end

  class Site
    # Reads and generates a site once, into a scratch destination: no build
    # output lands in the worktree, and the plugins that fill `site.data`
    # (notes graph, media, image variants) have run by the time this returns.
    def self.load(source:, baseurl: '/preview')
      require 'jekyll'

      site = Jekyll::Site.new(Jekyll.configuration(
        'source' => source,
        'destination' => File.join(Dir.tmpdir, 'paperland-contract'),
        'baseurl' => baseurl,
        'quiet' => true
      ))
      site.reset
      site.read
      site.generate
      new(site)
    end

    def initialize(site)
      @site = site
      @rendered = 0
    end

    def page(path)
      found = @site.pages.find { |candidate| candidate.path == path }
      raise "No page at #{path}" unless found

      Page.new(
        url: found.url,
        data: found.data,
        content: found.content,
        path: found.path
      )
    end

    def notes
      @site.collections.fetch('notes').docs.map(&:basename_without_ext)
    end

    def notes_graph_paths
      @site.data.fetch('notes_graph').fetch('nodes').map { |node| node[:path] || node['path'] }
    end

    def data
      @site.data
    end

    # A fresh composition every call: Jekyll caches parsed Liquid by filename,
    # so two renders of different data under one name would answer with the
    # first one's HTML. A counter makes the cache key unique by construction.
    def render(data:, content:)
      require 'nokogiri'

      @rendered += 1
      page = Jekyll::PageWithoutAFile.new(@site, @site.source, '', "contract-#{@rendered}.html")
      page.data = data
      page.content = content.dup
      Nokogiri::HTML.parse(Jekyll::Renderer.new(@site, page, @site.site_payload).run)
    end
  end
end
