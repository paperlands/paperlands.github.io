# Experiences: a page, not a note

## Ownership

- `_pages/experiences.md`: metadata, editorial content, reading order.
- `_includes/experiences/`: section markup, accessible relationships, ink artwork.
- `assets/css/components/experiences.css` and its `experiences-focus.css` /
  `experiences-seam.css` imports: presentation.
- `assets/js/experiences/`: progressive motion; not content or navigation.
- Existing media/ink catalogues: shared asset paths and dimensions. Do not duplicate
  their definitions in this page or move assets merely to match the page's folder.

The explicit permalink preserves `/experiences`. Moving out of `_notes` also
removes this offering from the notes graph. Existing `[[experiences|label]]`
links still resolve: the site's resolver searches both pages and notes.

## Composition

The body is a visible reading order: overture → prelude → possibilities → support
→ planning → finale. The existing `folio` layout supplies the one `<main>`.
The page uses a normal `<div>`, not the nonstandard `<content>` element.

Each section receives its own content explicitly; it does not reach back into
`page.*`. These are components of the **Experiences surface**, not universal
blocks. They deliberately retain its classes, single-instance IDs and motion
hooks. Reusing the whole section twice on one page would require an explicit ID
namespace; the current contract does not promise that.

## Authoring

Edit the front matter, not the templates, for copy changes:

- `hero`: label, rich heading, shared scene key and description of the composite.
- `prelude`: accessible label, paragraph list, invitation and focused phrase.
- `possibilities`: seam, jump label and ordered movements. Optional `seam.forms`
  entries carry `shape`, `src`, `width`, `height`; the art field is decorative,
  with empty descriptions and lazy loading. Keep actual PaperLand linework and
  its generation provenance in `design/stage/compile-possibilities.mjs`.
- `support`: heading, offer, practical information, ordered training routes and
  the earlier `cta` label.
- `planning`: label, heading and ordered question/answer pairs.
- `finale`: closing invitation; the contact route remains owned by `contact.yml`.

Rich text uses the existing `markup` filter: Markdown emphasis, inline HTML
(including deliberate `<br>`), and `[[lesson-plans|lesson plans]]` links.
Labels, descriptions and questions are plain strings and escaped. Content is
trusted repository-authored text, not an HTML sanitisation boundary. Quote YAML
strings containing `: ` or use `>-` for long text. Front-matter strings are not
Liquid templates: use wiki links rather than embedding `{{ ... }}` in copy.

Fields placed inside headings or paragraphs are **inline rich text**, not
arbitrary block Markdown. Each `prelude.paragraphs` entry is one paragraph.
The focus include decorates the first emphasized phrase; further emphasis keeps
its ordinary meaning. The hero's span and line break are deliberate composition,
not a title-splitting heuristic.

### Extend without branching templates

1. Add a movement to `possibilities.items`, with a unique, stable slug `id` and
   `jump`, `title`, `gesture`, `event`, `clip`, `body`. The title is one expressive
   thought with inline Markdown emphasis and an authored line break; the event
   is its plain-text event name. The body is one short invitation.
2. Use `reverse: true` to reverse the wide-screen composition. DOM order is
   event name + thought → human scene → invitation; mobile follows it directly.
   Use `gesture` (`create`, `explore`, `lead`) for the existing focus treatment.
   Optional `poster` selects a still; optional `position` authors CSS object-position
   for both poster and video. `framing: gathering` preserves a landscape group
   scene at 16:9; other scenes retain their 3:4 windows. Shared clips are unchanged.
3. Reference a real `_data/media.yml` key with `clip`. Images on training routes
   carry `src`, `alt`, `width`, `height`; responsive variants and loading behaviour
   remain the shared media component's responsibility.
4. Add routes to `support.routes` and questions to `planning.questions`. No new
   include or JavaScript is needed for another item.
5. Keep IDs stable after publication: incoming fragment links may depend on them.
   IDs must not collide with the page's own section/heading IDs.

## Decisions challenged

- **Why not just move the file?** That fixes classification but leaves two editing
  grammars, duplicate route/FAQ markup and ID-dependent behaviour intact.
- **Why not move all copy into `_data`?** It has one editorial owner. A second file
  adds indirection without reuse. Shared media already has its own catalogue.
- **Why not one enormous include?** It hides the composition from the page author.
  Section boundaries isolate real responsibilities; tiny one-element includes
  would only make reading harder.
- **Why not a section registry/schema engine?** There is one composition. Explicit
  include calls and item lists are sufficient; a polymorphic page builder would
  add more machinery than this page needs.
- **Why remove the commented film?** Disabled markup is not an optional-section
  contract. Restore a film intentionally as a composed section, with loading and
  accessibility checks, rather than leaving a second dormant page in a comment.

## Checks and editorial consistency

The seam uses one operator-supplied recursive tree, generated through the pinned
Hatch host rather than extracted from a WebP. `design/stage/forms.mjs` retains all
three supplied programmes; only the tree is staged. `compile-possibilities.mjs`
bakes complementary wood and canopy layers using pen-up source passes, not
colour extraction. Both retain the full tree's frame. `forms-receipt.json`
records the source, adapted programmes, compiler and host. No Hatch runtime
ships into this passage.

The operator rejected the crowded three-form composition and reserved empty
stage. A standing tree is rooted on the right, with its crown reaching left
behind the invitation and seam. The art is absolutely positioned and adds no
reading height. There is no minimum-height title card, extra halo or drawing
behind the jump links.
The hero's first thought remains attached and visible on mobile. Browser checks
are implementation evidence, not a claim of operator visual approval.
The final spacing pass gives the invitation 1.55 leading, 44px before the seam
copy, and a separate pause before the links. Six-width checks (320–1920px)
confirm that hiding the tree changes neither heading height nor link position,
that the tree remains rooted, and that the opening thought fits at 320×568.
Evidence: `/tmp/experiences-forms/report.json` and `*-breathing.png`.

The tree is now 14% smaller and leans left by 10 degrees. The existing reading
clock reveals wood from the root as “many Forms” enters the viewport; the canopy
waits until the phrase is near centre (57% → 50% of viewport height). At centre
it is complete. Scroll reversal retraces the growth; no time-based animation or
additional spacer is involved. Reduced motion, Save-Data and no JavaScript keep
the complete still; forced colours remove the decoration. The tree probe checks
six widths, timing, reversal, resting behaviour, shared frames and live fallback
changes. Evidence: `/tmp/experiences-tree/`.

```sh
bundle exec ruby toolchain/test/experiences_page_test.rb
node --test toolchain/test/experiences-stage.test.mjs
bundle exec jekyll build --destination /tmp/paperland-experiences-build
# With that destination served, and an existing Chromium CDP endpoint:
BASE_URL=http://127.0.0.1:4026 node design/probe/experiences.mjs
BASE_URL=http://127.0.0.1:4026 node design/probe/experiences-focus.mjs
BASE_URL=http://127.0.0.1:4026 node design/probe/experiences-tree.mjs
```

The Ruby contract renders actual Jekyll includes with a nonempty base URL and
checks page identity, collection/graph exclusion, heading/anchor relationships,
rich text, media fallbacks, adding/reordering movements, routes and FAQs,
explicit include inputs and tenth-item numbering.
The browser probe checks five widths (320–1920px), overflow, image decoding,
native FAQ operation, reduced motion, forced colors, normal video playback,
offscreen pausing and readable no-JavaScript output.

The preparation FAQ and support offer share the same **as few as 3 sessions**
commitment. Preparation and sharing are planned with each school; the FAQ does
not promise a separate fixed number of training or sharing sessions.

### Mobile reading rhythm

Each movement names its event once, immediately above its expressive thought,
then offers one human scene and a short invitation. Numbered captions, identity
slogans and outcome lines remain removed. The old 14px photographic caption is
replaced by 22–30px upright lettering in the same Cormorant family, with a pale
amber/ivory pigment. The thought keeps its larger scale and expressive italic.

The original words carry the force: “What I cannot create / I do not understand,”
“Find your own Why,” and “By students / for students.” The original concrete prose
returns too: art and nature, patterns, movies, conjectures, curiosity and peers.
The hierarchy comes from staging those words, not diluting them into shorter
marketing promises. The existing ink gesture follows the first emphasis;
further emphasis keeps its ordinary italic letterform.

The words are no longer reduced to preserve two-line headings or a fixed fold.
At 900px and below the movements stack before their text columns become narrow.
Headings use 44–76px type with 1.14 leading and less compressed tracking; prose
uses 20–26px with 1.75 leading. Mobile gutters are 16px, and the reading column
can use up to 44rem. Natural wrapping keeps the words large rather than enforcing
a smaller quotation exception. There is 32px between thought, scene and prose.

Desktop gives words the larger share of an asymmetric 1.45:1 grid within 80rem.
The old 34ch copy constraint is removed; paragraphs can use up to 52ch of the
wider column. Headings rise to 92px, with 36px between heading and prose. This
creates room inside the typography, not just empty space around it.

The festival and symposium keep their 3:4 windows, bounded by
`min(100%, 22rem, 36svh)` in the stacked layout. The festival removes upper empty
wall with bottom framing; the symposium keeps the projected mathematics visible.
The workshop now preserves its full 16:9 landscape source, bounded by
`min(100%, 32rem, 80svh)`. Only the outermost image edge dissolves. The first two
windows are intentional crops; the gathering is deliberately not a portrait.

The opening photograph, section pauses, 44px jump targets and motion/accessibility
fallbacks remain. The hero, seam, support, FAQ and finale are not recomposed.

The festival and symposium posters select actual frames at 00:01.500 from the
existing creators and star clips. The symposium's still shows the presenter
with a microphone and projected work; the festival includes the students and
their face drawing. The workshop still selects 00:01.500 from its landscape
source (see below). None is a composite. Shared catalogue posters remain untouched.
To reproduce, substitute each source/output pair below:

```sh
# creators-6ac435 / festival; star-126ed5 / symposium
ffmpeg -ss 1.5 -i assets/lib/helios/creators-6ac435.mp4 -frames:v 1 \
  -vf scale=540:960 -c:v libwebp -quality 85 \
  assets/lib/notes/experiences/festival-scene.webp
```
Responsive stills use the existing image pipeline. The movement contract checks
the poster binding, expressive emphasis and accessible event identification.
The browser probe checks the authored scene aspect ratios, matching poster/video positions,
available text width, type size, leading and visual order. It does not enforce
a two-line title or fit the entire thought and scene into a fixed viewport.

```sh
CDP_PORT=9341 BASE_URL=http://127.0.0.1:4028 node design/probe/experiences-mobile.mjs
```

Run against a served Jekyll build and your Chromium CDP port. This checks ten
widths (320–1440px), including both sides of the 900px movement breakpoint:
overflow, reading width, type size and leading, scene framing, event-name hierarchy,
reading order, alignment, section pauses, link targets, the short-screen opening
and native FAQ operation. Screenshots and measurements go to
`/tmp/experiences-mobile/` for visual review.

### Milestone 2 — give the gathering its room

The portrait `shell` rendition had already discarded the people beside the
student leader; CSS could not recover them. Experiences now uses the original
`design/assets/WHOLEADROHEY.mp4` at its complete 16:9 width. The excerpt is
00:00.000–00:02.600, before the later solo close-ups. The still is 00:01.500,
where the four students' mutual attention is clearest. The footage does not
clearly show their work surface: no other scene is substituted to imply it does.

`workshop_gathering` is a separate catalogue entry, with 1024×576 H.264 (259,860
bytes), AV1 (144,559 bytes), and a 20,344-byte WebP still. The shared `shell` clip
is untouched. No new player, animation clock or third-party request is added.
The optional `framing: gathering` follows the item through reordering; no fragment
ID controls the layout. The existing responsive still pipeline supplies the rungs.

Reproduce the excerpt and mint (the lossless intermediate is not published):

```sh
mkdir -p /tmp/workshop-framing
ffmpeg -i design/assets/WHOLEADROHEY.mp4 -t 2.6 -vf scale=1024:576 \
  -an -c:v ffv1 /tmp/workshop-framing/group-excerpt.mkv
node toolchain/mint-media.mjs video --id workshop-gathering \
  --source /tmp/workshop-framing/group-excerpt.mkv \
  --dest assets/lib/notes/experiences --max-width 1024 --crf 25 --av1-crf 36 \
  --poster-at 1.5 --poster-width 1024 --poster-quality 84
```

The mobile probe checks ten widths, matching still/video framing, real decoding
and duration, deferred loading, offscreen pause, and the full-width no-JavaScript
still. These are technical checks, not a claim of visual approval. Before:
`/tmp/workshop-framing/before/`; current: `/tmp/experiences-mobile/`.
The huddle artwork, copy, event-name hierarchy, festival and symposium framing
are unchanged. Review this human gathering before promoting event names.

### Milestone 3 — name the experience, then let it speak

The existing event name moves from the photograph's footnote to the movement
header, immediately above the thought. It appears once. The same stable event ID
still describes the article and now labels the figure through `aria-labelledby`.
The names remain escaped, plain page-owned text; event wording is unchanged.

A two-treatment study compared Cinzel inscription capitals with upright Cormorant.
The latter was chosen for its more human, unforced voice beside the expressive
italics: weight 500, 22–30px, 1.3 leading, .005em tracking, and an 18px interval
before the thought. The pigment mixes existing ivory and amber, without action
orange, shadows, gradients or motion. No new font, asset or dependency is added.
The three existing ink gestures and scene framings are unchanged.

The mobile probe checks the shared edge, close interval, natural case, upright
lettering, single name and subordinate scale at ten widths. The page contract
checks escaping, extension/reordering, stable IDs, and the externally named
figures. Still and motion fallbacks retain their existing checks. This verifies
the craft, not whether the hierarchy feels right to the operator.

Before and trial treatments: `/tmp/experiences-event-names/`; current captures:
`/tmp/experiences-mobile/`. Review the name, thought and scene as one grouping,
not the lettering in isolation.

### Three forces, one pigment

The movement focus is authored linework, not the same underline in three sizes.
`experiences/focus.html` owns the geometry; `experiences-focus.css` owns its
relationship to the italic letterforms. The original words and reading measure
are unchanged.

- **Create — encounter:** unequal strokes approach from opposite ends. Amber
  pigment gathers close to the receiving ends; the interval stays empty. The
  previous luminous dot is removed rather than made brighter.
- **Explore — yearning:** a loaded beginning thins into separated, almost-dry
  traces. The rising continuation is suggested, not completed as a flourish.
- **Lead — fellowship:** one broad wing shelters four little birds in a close
  huddle. The little wings share a common scale and brush rhythm; their small
  differences no longer scatter the motif into separate symbols.

All three use the same amber pigment, with a deeper loaded body and a small
ivory receiving edge. Pressure is authored as tapered filled contours, not a
noise filter or glow. The glyphs keep their common ivory. Fixed em-height fields
keep the marks near the baseline as font sizes change; the linework remains
inside the viewport.
The seam's `gather` and closing `invite` treatments retain their previous geometry.

The existing reading clock remains unchanged: approach/pool/departure variables
draw the authored paths. Reversal retraces them, and resting readers get no idle
animation, flicker or pulse. Reduced motion, Save-Data and no JavaScript retain
the complete still. Forced colours hide the decorative SVG; it never receives
focus, pointer events or an accessible name.

```sh
CDP_PORT=9342 BASE_URL=http://127.0.0.1:4032 node design/probe/experiences-focus.mjs
```

The probe checks four widths (320–1440px), the opposing approaches and empty gap,
rising broken departure, distinct fellowship ends, shared pigment, viewport
bounds, scroll reversal, resting behaviour and all still/contrast fallbacks.
Cropped typography and in-context screenshots, plus the geometry report, are in
`/tmp/experiences-focus/`. Before-study crops are retained at
`/tmp/experiences-focus-before-material/` locally.

**Milestone 1 — material study, awaiting operator review.** This does not claim
that a passing probe establishes tenderness, yearning or fellowship. Review the
loaded/dry contrast and the unoccupied intervals at reading size before moving
on to event prominence or changing the photography's framing. Copy, event
hierarchy, page spacing, shared light tokens and the motion clock are unchanged.

**Milestone 1b — the gathering.** Operator review requested a stronger fellowship
motif. Only `lead` is revised: five gestures replace the three loose flourishes,
with pigment carried into the neighbouring turns. The flock borrows a pattern of
coming together, not literal bird silhouettes or a leader/follower formation.
Its height changes from .75em to .78em without adding layout space. The existing
reading clock supplies the approach and answer; still fallbacks remain complete.
Before-study captures: `/tmp/experiences-focus-before-flock/`. Current crops,
context and three normal-motion reading stops (`flock-*.png`):
`/tmp/experiences-focus/`. Assess the sense of gathering at reading size before
proceeding to the deferred event hierarchy or photography.

**Milestone 1c — a child's first glimpse.** The earlier currents did not read as
birds on a first passing. The operator asked for childlike impression; the
abstraction is replaced, not ornamented further. Five individually drawn two-wing
gestures now suggest birds immediately, with no heads, eyes or feather detail.
Loaded bends release into thin tips; the intervals stay open, without a regular
V formation. The field sits at .84em with .7em height, clear of the words and
prose. Creation, seeking, copy, photography and layout remain unchanged.

The probe checks separate bird groups, two-wing construction, scale variation,
clearance, viewport fit, reversal and complete still fallbacks. These are craft
checks, not evidence of recognition by children. First-glance recognition still
requires visual review. Earlier currents: `/tmp/experiences-focus-before-birds/`;
current reading-size crops and context: `/tmp/experiences-focus/`.

**Huddle correction.** Operator review found the birds too heterogeneous. One
broad, asymmetric wing now gathers four closely spaced little birds beneath it.
The small wings share a common scale; the enclosing gesture stays open rather
than becoming a badge. Existing reading progress, still fallbacks, copy and layout
are unchanged. Before: `/tmp/experiences-focus-before-huddle/`; current crops,
context and reading stops: `/tmp/experiences-focus/`. Review whether the first
impression is one family rather than a set of separate bird marks.

### Festival film: an invitation, not a second stage

The festival movement's optional `film` owns its label, caption, title, ordinary
YouTube URL, privacy-enhanced embed URL and local poster with alt/dimensions.
`experiences/film.html` places a compact still, play mark and invitation after
the body: “Watch the festival film”, with “From young Gambians: math is alive,
and in our hands.” Softly feathered edges keep the preview attached to the
passage; the larger human scene and current movement staging remain unchanged.
IDs derive from the movement ID, including when movements are added or reordered.
Without JavaScript it remains an ordinary link; no iframe exists before intent.

The still is an **editorial composite**, not a claim of an actual projection:
GMFF film `IT7jGh46MPc`, 01:33.120, cropped to remove baked subtitles. The
existing creators torus is carried as warm light in the unoccupied wall, never
over a face or hand. `design/compose-festival-still.mjs` reproduces it from a
local copy of that film. The same still anchors the invitation and the opened viewer.

The native dialog owns modal focus. The shared shroud and return take 240ms.
For film, arrival continues through it over 500ms; the still's light settles
gently over 1100ms and overlaps a 450ms player dissolve. This borrows the legacy
GMFF handoff's overlapping energy, not its orange wipe, zoom or fixed delay.
No minimum loading hold is imposed. Reduced motion removes these effects.
Close, Escape and a complete outside click remove the player
immediately, unlock scrolling and return focus without scrolling. The dialog
also cleans up on pagehide. The fallback YouTube link remains available inside.

The viewer is shared with Approach's margin images:
`_includes/media/lightbox.html`, `assets/css/components/media-lightbox.css` and
`assets/js/media-lightbox.js`. Surface CSS owns only the invitation. The old
edition-specific viewer CSS/JS and Experiences modal controller are removed.
A circular aperture carries play, expand and close symbols. Gallery pictures
become real named buttons only when enhancement is available.

The local preview is lazy-loaded through the shared responsive image pipeline.
Its decoded still is immediately available beneath the film; the full-resolution
version is decoded on opening. The iframe fades in after its document loads; this does
not claim to detect YouTube playback readiness. Closing unloads it immediately.
There is no player API dependency, transform or animation loop.

```sh
CDP_PORT=9342 BASE_URL=http://127.0.0.1:4031 node design/probe/experiences-film.mjs
CDP_PORT=9342 BASE_URL=http://127.0.0.1:4031 node design/probe/media-lightbox.mjs
```

The probe checks six viewport shapes (320–1440px, including short landscape),
keyboard opening, native modal focus boundaries, all three dismissal routes,
scroll/focus return, player removal and reopening, deferred third-party requests,
reduced motion, forced colours and the no-JavaScript destination. Only the
remote player response is stubbed; this is dialog behaviour evidence, not a
claim of live YouTube playback. Screenshots: `/tmp/experiences-film/`.

### Editorial rhythm and wider mobile scenes

This pass supersedes the portrait-mobile framing and staged body pauses above.
The festival thought uses **we** rather than **I**: a shared conviction, not an
individual test. The opening keeps the possibility of an unexpected discovery;
the symposium borrows TJC's unmarked paths and starts with “Find a pattern. Ask
why.” The workshop retains care for someone else's questions. Movement bodies
flow as single paragraphs, without double-break closing pronouncements.

Support's optional `invitation` introduces hosting at school inside the offer's
existing paragraph, before “your students”. The operator's surprise-led offer
and “your stage together” remain. This is a change of audience made explicit,
not an extra section or ornamental pause. FAQ and practical copy use direct
language; the preparation commitment remains **as few as 3 sessions**.

At 900px and below, all three scenes retain their full 16:9 source frames,
centred and bounded by `min(100%, 32rem, 80svh)`. Heading, scene and prose are
24px apart; movement padding is 40px. Desktop retains its alternating portrait
windows and full-width gathering, with 36px between heading and prose to clear
the ink. Outer desktop movement padding is reduced to 48–72px.

`festival_scene` comes from `design/assets/become4.mp4` (3.4s);
`symposium_scene` comes from `design/assets/WHOCOMMKYLAR.mp4` (5s).
These restore the width discarded by the old portrait renditions; they do not
stretch or crop those exports into landscape. Both are silent 1024×576 H.264 /
AV1 pairs, with actual-frame posters at 1.5s and responsive still variants.
Helios's shared `creators` and `star` entries remain untouched.

Reproduce each pair (substitute the source and ID above):

```sh
ffmpeg -i design/assets/become4.mp4 -vf scale=1024:576 -an -c:v ffv1 /tmp/festival.mkv
node toolchain/mint-media.mjs video --id festival_scene \
  --source /tmp/festival.mkv --dest assets/lib/notes/experiences \
  --max-width 1024 --crf 25 --av1-crf 36 \
  --poster-at 1.5 --poster-width 1024 --poster-quality 84
```

The lossless scaling pass avoids the min-expression escaping defect in the
mint script's downscaler; this editorial pass does not change that tool.
The mobile probe now checks full-width no-JavaScript stills for every movement,
matching poster/video framing and real decoding/dimensions/duration of all three
clips. Its ten-width captures remain in `/tmp/experiences-mobile/`.
Browser checks establish readability and behaviour, not emotional effectiveness.
