# frozen_string_literal: true

# bundle exec ruby design/probe/text_steps_test.rb
#
# Contract for _plugins/text_steps.rb. The three steps exist because two
# templates were doing the arithmetic themselves — one over character counts,
# one with a hand-written zero — and neither had a check of its own: the focus
# split in _includes/home/focus.html is asserted by nothing but the rendered
# home page, and the movement numbering only by the experiences gate, which
# runs against the page it happens to build.
require 'liquid'
require_relative '../../_plugins/text_steps'

step = Object.new.extend(TextSteps)
check = ->(condition, message) { raise message unless condition }

# ---- ends_with -------------------------------------------------------------
check.call(step.ends_with('a stage for everyone', 'everyone'), 'Missed a real suffix')
check.call(!step.ends_with('a stage for everyone', 'stage'), 'Word in the middle counted as a suffix')
check.call(!step.ends_with('everyone', 'a stage for everyone'), 'Longer tail counted as a suffix')
check.call(step.ends_with('a stage.', '.') , 'Punctuation is a suffix')
check.call(!step.ends_with('anything', ''), 'Empty tail answered yes')
check.call(!step.ends_with('anything', nil), 'Nil tail answered yes')
check.call(!step.ends_with(nil, 'anything'), 'Nil text answered yes')
check.call(step.ends_with('漢字', '字'), 'Multi-byte suffix')

# ---- without_tail ----------------------------------------------------------
check.call(step.without_tail('a stage for everyone', 'everyone') == 'a stage for ',
           'Cut the wrong amount')
check.call(step.without_tail('one two two', 'two') == 'one two ',
           'Took an interior occurrence, not the suffix')
check.call(step.without_tail('a stage', 'everyone') == 'a stage', 'Cut a word that was not there')
check.call(step.without_tail('a stage', nil) == 'a stage', 'Nil tail cut something')
check.call(step.without_tail(nil, 'stage').nil?, 'Nil text became a string')
check.call(step.without_tail('漢字', '字') == '漢', 'Multi-byte cut')

# The pair replaces `focus_text.size | minus: focus_word.size` feeding two
# `slice` calls. Same answer on the shapes the layout actually sees.
[
  ['A different way to *see.*', 'see.*'],
  ['One word, one encounter.', 'encounter.'],
  ['everyone', 'everyone'],
].each do |text, word|
  check.call(step.ends_with(text, word), "Suffix check disagreed on #{word.inspect}")
  check.call(step.without_tail(text, word) + word == text,
             "Split does not reassemble #{text.inspect}")
end
check.call(!step.ends_with('A different way to *see.*', 'see'),
           'The emphasis marker is part of the word')

# ---- zero_pad --------------------------------------------------------------
check.call(step.zero_pad(1, 2) == '01', 'Single digit')
check.call(step.zero_pad(9, 2) == '09', 'Last single digit')
check.call(step.zero_pad(10, 2) == '10', 'Tenth item is not truncated')
check.call(step.zero_pad(100, 2) == '100', 'Width is a minimum, not a length')
check.call(step.zero_pad(7, 3) == '007', 'Wider pad')
check.call(step.zero_pad('7', 2) == '07', 'String input')
check.call(step.zero_pad(nil, 2).nil?, 'Nil passed through')
begin
  step.zero_pad(1, 'two')
  raise 'A non-integer width did not stop the build'
rescue Liquid::ArgumentError
  # expected
end

# ---- registered, and usable as a filter ------------------------------------
check.call(Liquid::Template.parse('{{ n | zero_pad: 2 }}').render('n' => 7) == '07',
           'zero_pad is not reachable from a template')
# Liquid does NOT evaluate a filter inside a condition: `{% if t | ends_with: w %}`
# reduces to the truthiness of `t`, so it answers yes for any text at all. That
# silently-wrong branch is why focus.html asks the question in an assign and
# tests the result. Asserted, so this file fails loudly if Liquid ever starts
# evaluating it and the assign is no longer the only way to ask.
no_filter_here = Liquid::Template.parse('{% if t | ends_with: w %}yes{% else %}no{% endif %}')
check.call(no_filter_here.render('t' => 'a stage', 'w' => 'nonsense') == 'yes',
           'Liquid now evaluates filters in conditions — the focus split can be written ' \
           'differently, and this contract needs rewriting rather than deleting')
check.call(Liquid::Template.parse('{{ t | without_tail: w }}').render('t' => 'a stage', 'w' => 'stage') == 'a ',
           'without_tail is not reachable from a template')

puts 'PASS: suffix tests, suffix cuts, multi-byte and interior occurrences, ' \
     'nil in and nil out, zero padding as a minimum width, and all three ' \
     'filters reachable from a template'
