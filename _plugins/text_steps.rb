# frozen_string_literal: true

# Text steps — the string arithmetic a template should not be doing by hand.
#
# An audit of every `assign` and `capture` in _layouts/ and _includes/ found the
# templates doing exactly three operations that Liquid makes awkward, and a lot
# of things that looked like them but are not:
#
#   ends_with(input, tail)        does the text end with this word
#   without_tail(input, tail)     the text with that word taken off the end
#   zero_pad(input, width)        7 -> "07", 10 -> "10"
#
# The first two replace, in _includes/home/focus.html, a `size | minus: size`
# offset feeding two `slice` calls — arithmetic over character counts that had
# to agree with itself or silently render the wrong half of a heading. They say
# what the layout means instead: the focus is the LAST word, and the rest is
# the text before it.
#
# `zero_pad` replaces `{% if forloop.index < 10 %}0{% endif %}` in
# _includes/experiences/possibilities.html, where it was written out twice and
# a tenth movement would have made the two copies disagree.
#
# What is deliberately NOT here: the 54 `capture` blocks that assemble markup,
# the parameter bindings (`assign label = include.label | default: …`) and the
# data lookups. Those are what a template language is for; moving them into
# Ruby would mean holding HTML in strings to escape from a language that is
# already only rendering HTML. The contract is
# toolchain/test/text_steps_test.rb.
require 'liquid'

module TextSteps
  # False for a nil or empty tail: `"".end_with?("")` is true in Ruby, and a
  # template asking whether its text ends with a word it does not have must not
  # be told yes.
  def ends_with(input, tail)
    return false if input.nil? || tail.nil?

    word = tail.to_s
    return false if word.empty?

    input.to_s.end_with?(word)
  end

  # Only a suffix: "one two two" without "two" is "one two ", and nothing
  # earlier in the string moves. Nil input passes through, so a template with
  # no text renders none.
  def without_tail(input, tail)
    return input if input.nil? || tail.nil?

    word = tail.to_s
    return input.to_s if word.empty?

    input.to_s.delete_suffix(word)
  end

  # `width` is the minimum, not the length: 100 at width 2 stays "100". A
  # non-integer width is a template mistake, so it stops the build rather than
  # quietly padding to something.
  def zero_pad(input, width = 2)
    return input if input.nil?

    padded = begin
      Integer(width)
    rescue ArgumentError, TypeError
      raise Liquid::ArgumentError, "zero_pad width must be an integer, got #{width.inspect}"
    end
    raise Liquid::ArgumentError, "zero_pad width must be positive, got #{padded}" unless padded.positive?

    input.to_s.rjust(padded, '0')
  end
end

Liquid::Template.register_filter(TextSteps)
