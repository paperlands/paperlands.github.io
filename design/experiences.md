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
   `jump`, `identity`, `invitation`, `event`, `title`, `gesture`, `clip`, `caption`,
   `body`, `outcome`. Navigation and numbering follow the same list and order.
2. Set `gesture` explicitly (`explore`, `create`, `lead`). It is visual treatment,
   not something inferred from the public ID. Use `reverse: true` to reverse the
   wide-screen composition; mobile keeps the same DOM reading order.
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
