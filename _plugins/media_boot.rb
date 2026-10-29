# frozen_string_literal: true

require 'nokogiri'

# Inspect rendered markup once, not page flags or raw Markdown. Layout-owned
# surfaces (the notes viewer) pass their actual captured markup as `extra`.
# This keeps the ordinary deferred scripts and their ordering: no client-side
# loader, late discovery, or second DOMContentLoaded race for priority video.
module MediaBoot
  SELECTORS = {
    'video' => '[data-media="video"]',
    'carousel' => '[data-media-carousel]',
    'film' => '[data-media-surface="film"]',
    'lightbox' => 'dialog[data-lightbox]',
  }.freeze

  def media_requirements(html, extra = nil)
    markup = [html, extra].compact.join("\n")
    return {} unless markup.match?(/data-(?:media|lightbox)/i)

    document = Nokogiri::HTML::DocumentFragment.parse(markup)
    # Player queries cannot see template content or JS-enabled noscript text.
    document.css('template, noscript').remove
    SELECTORS.transform_values { |selector| !document.at_css(selector).nil? }
  end
end

Liquid::Template.register_filter(MediaBoot)
