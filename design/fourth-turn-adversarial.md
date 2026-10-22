# Fourth Turn — the review must survive its own piercing eye

**Status:** adversarial assessment, not a ratified API or an implemented refactor. This document challenges `fourth-turn-state.md`; it does not silently replace either earlier design document.

**Evidence boundary:** inspected the current site sources and the current dojo under `/home/putra/dojo` (not the separate `/home/putra/paperland/dojo` checkout). Ran the four site Node suites: **43/43 pass**. Ran the dojo's `probe/free-point-relations/hand_contract.mjs`: its assertions pass. Reproduced two retention failures and a manuscript mismatch in headless Chromium on the actual Fourth Turn study, which imports the shipped instrument and opens the site's pinned Hatch. Used reduced motion, 1280 × 800. No new native pixel comparison, latency measurement, homepage-build test, or child-learning evidence is claimed.

## 1. The distinctive experience is not a vocabulary inventory

The valuable thing here is a continuous encounter: a hand changes a condition, a walk answers, a relation becomes perceptible, and a small expression can eventually carry that relation elsewhere. The manuscript and the drawing are two ways of meeting the same act. This is more distinctive than either a turtle demo with sliders or a code editor beside a canvas.

But the review mistakes three different freedoms for one:

- **Variation:** choose a quantity within a designer's experiment. Fourth Turn already has this, and it is causal.
- **Composition:** alter or combine the behaviour being experimented with. Fourth Turn offers designer-authored transformations, not child-authored composition.
- **Abstraction:** preserve that behaviour as an expression that can be invoked elsewhere. Fourth Turn supplies the name; its chips preserve conditions and predicted shapes, not reusable procedure bodies.

These are a progression, not a moral ranking. A child discovering closure through an angle has not failed to exercise intuition because the gesture is numerical.

**The corrected centre: the child's contribution must be able to change the rule of the experiment, and that changed rule must be carryable.** A name is a handle for that contribution, not its substance.

## 2. The Mimsy reading needs an adversary too

The [supplied story](https://jabberwockland.blogspot.com/2007/03/mimsy-were-borogoves-by-lewis-padgett.html) gives strong images: the cube answers Scott's wish; Emma develops marks Scott can use; the children translate a formula into an arrangement that works. Apparent nonsense has operational structure. Its meaning can be learned through consequences and communicated before an adult can explain it.

Those images support causal play, composable expression, and representation that grows with understanding. They do **not** establish five literal product requirements or a theory of child development.

Three corrections matter:

1. **The fourth criterion already partly holds.** Number changes cause native answers. Missing procedure authorship is a missing degree of freedom, not absence of causality.
2. **Mastery and intuitive legibility are untested.** A working interpreter proves execution, not that a newcomer understands the act. The current automatic tour, landmark magnetism, and four-figure hunt structure attention toward an authored discovery. That may help; it may also teach obedience to the checklist. Neither verdict follows from the source.
3. **The parent is not the only failure mode in the story.** The toys deliberately condition the children; the earlier girl never finds the way. Adult incomprehension is tragic, not a safety principle. Our toy should make causality inspectable and errors recoverable, not aspire to being illegible to adults.

Borrow the invitation, not the coercion. The desired jabberwocky is **unfamiliar meaning with dependable consequences**, not mystery preserved by hiding the mechanism.

## 3. The code has a sharper contradiction than controller length

The one-pass builder is worth preserving. The native back buffer is worth preserving. The DOM-free run ledger is worth preserving. But the manuscript does not simply display the build being executed.

`instrument.mjs:210–216` reads `programs[name].rows`: the standing recipes compiled at `AUTHORED`. `argumentRow()` then reconstructs selected rows in handwritten HTML templates; `refreshArgument()` updates selected tokens. Native submission separately builds a recipe at the chosen values.

**One builder, two different input snapshots, plus a second presentation compiler.** The builder's internal source/row/line-map agreement cannot make those consumers agree.

### A. Generalising 88° retains the wrong drawing — browser reproduced

`generalise()` at `instrument.mjs:399–436` saves the old values, snaps to a milestone, then tests `polygon.established()` against the **new** values. At 88°, the new state is the authored square and passes the predicate. The old walk is not that square.

Observed on the real study:

- Stage posts: **2 → 2**; no new program sent.
- Declared state: `polygon`, 4 sides, 90°.
- Presented native source: `loop 4 do`, `left 88`.
- Announcement: **“88° · 4 steps and 4 sides at 90° draw the identical figure. Nothing was sent.”**

The page model predicts a 25.1046-unit endpoint gap for the 88° walk. That distance is model arithmetic, not newly measured pixels. The source and request evidence already establish the false retention claim.

An equivalence predicate over the destination alone is not equivalence. It must relate the **actually presented artifact** to the proposed artifact. Even checking the old desired angle would be insufficient if the visible run lags behind it.

### B. Going backward from a pentagon ignores placement — browser reproduced

`stepBack()` at `instrument.mjs:438–466` checks selected count/angle differences, not the recipe's placement or the effect left by a performance.

Observed after presenting `polygon 5`:

- Stage posts: **3 → 3**.
- Description changes to `defined` at 72°/5 steps.
- Presented source remains the centred, parameterised polygon recipe.
- The defined recipe requires the fixed jump `jmpto -125 -125` instead.

The predicted starting y-coordinates differ: **−172.0477 vs −125**, a 47.0477-unit translation. The backward edge has an execution obligation just as the forward edge does. A forward-only transition declaration cannot establish reversible coherence.

### C. The manuscript advertises a different count — browser reproduced

In that same backward state, the manuscript's rows read `loop 4 do` and `left 72°`. Building `defined` at those chosen values produces `loop 5 do` and `left 72`.

The 72° angle token is refreshed, but the standing count row is not. This is not an optics problem. It is the visible recipe contradicting the chosen recipe.

### D. The pursuit call is reconstructed incorrectly — source-level reproduced

`argumentRow()` renders `pursuit 250 5 91 0` for the five-sided case. The actual builder produces **`pursuit 5 91 0`**; the definition accepts `side steps shift`, not `len side steps shift`. The HTML template adds a non-existent argument.

Replacing the controller's numeric state with a pristine new State module would leave both manuscript defects intact. The artifact consumed by the manuscript must be part of the first repair.

### E. The count relation is directional, not an equation in two costumes

At the loop, `side = round(360/turn)` (bounded by the offered domain). At the polygon, `turn = 360/side`. At 80°, the loop takes five steps without closing. Therefore **`turn = 360/side` is not a fact of the loop state**.

There is an additional discontinuity in `setValue()` (`instrument.mjs:734–770`): proposing side 5 while at 80°/5 returns unchanged because the stored side already equals 5. It does not move to the count's promised closing angle, 72°. This was reproduced by executing the extracted real function with DOM/play stubs; not by a browser pointer gesture.

The two update directions lose different information. The stop must declare an update policy; the transition between the open walk and the regular family must declare its projection. Do not install a generic relation solver to disguise that policy choice.

### F. Nesting is not yet hygienic composition

`build()` can nest selected parts, but structural IDs still default to `loop`, `end-loop`, `call`, and the spawn's fixed law IDs. Two sibling default loops produce duplicate row IDs. That was reproduced directly with the exported builder. Unknown parts are silently ignored.

A composition contract needs stable, scoped identities and explicit rejection. Current examples passing unique-map tests prove the current examples, not arbitrary compositions.

## 4. Corrections to the preliminary assumptions

| Claim | More exact conclusion |
|---|---|
| The controller is where mathematics hides | Yes, but display reconstruction also hides a second recipe. Size alone does not distinguish mathematics from legitimate encounter choreography. |
| `kindOf` is inside the instrument | It is currently in `programs.mjs`. The instrument still contains separate keyword/command/parameter sets and source-specific HTML templates. |
| Kind must come from the language table | The current dojo table declares aliases, implementations, and argument holes, not the page's `draw/turn/structure` taxonomy. `fd` is an actual draw alias missed by `kindOf`. Emit authored row roles for built source; use exported runtime metadata when available. Do not import today's dojo table and pretend it describes the older site pin. |
| `advances` being a string is the defect | Strings are legitimate references. The defect is resolving them to closures coupled to global `rep`, `value`, DOM, and unexpressed preservation rules. Moving those closures into the descriptor would not collapse anything. |
| Ownership is turn/side/shift/none across stops | `defined.axis` and `pursuit.axis` are both null. Defined inherits values; pursuit changes `shift` through a preset transition. A declared interactive axis, stored state, and who may propose a write are different facts. The loop also has a count source handle before side becomes its primary spatial axis. |
| The dojo has coherent replacement | It has a real settlement seam. `probe/live-rendering/README.org:11–18` explicitly says coherent replacement and browser experience are **not certified**. The review promoted that evidence beyond its boundary. |
| A Witness type makes honesty automatic | Tags help only if issuance and consumption enforce the claim. The current counterexamples could wear perfectly valid-looking tags while still relating the wrong artifacts. |
| No fifth description may require an instrument edit | There are already five. The spiral is a sixth description and, more importantly, a second mathematical family. Count core and adapter changes, not just edits to one filename. |

The foundation document explicitly labels its later paragraph “Decision taken”; precedence is not wholly absent. Its historical recommendation and obsolete measurements still need clearer separation from current acceptance criteria. Fix that documentation drift, but do not equate it with a false native witness.

The six dojo learning primitives are also not six disjoint implementation modules. Fourth Turn exercises planar stepping/turning, ambients, and SEE-like sibling readings. Calling that “five of six” while naming four and excluding two is simply a counting error. Adding an eye or frame target may deepen the encounter; using every primitive is not an acceptance criterion.

## 5. Collapse along causal cuts, not impressive nouns

Keep the four proposed headings as a reading aid. Do not turn them into four frameworks.

### State: a chosen snapshot plus an explicit update policy

One immutable mathematical snapshot per revision. Per stop: what is offered, the applicable domain, how each proposal updates the snapshot, and what is derived. The loop's rounding and the regular polygon's exact division are different policies. An identifier domain is not a numeric domain; “reject non-finite values” applies to numeric quantities, not to every future word.

Use pure, named derivations where needed. Do not begin with a general dependency graph, constraint solver, universal owner registry, or a second execution ledger. `run.mjs` is already DOM-free and already models desired/submitted/presented. Strengthen that seam rather than duplicate it.

### Recipe: the compiled artifact is the unit of agreement

Freeze the declaration/body and bindings at a revision, and compile once for the selected execution mode. The artifact owns source, scoped row identity, line map, operand spans, and authored row roles. Display that artifact; decorate its spans without rewriting the instruction. An annotation such as `= 72°` remains visibly distinct from executable source.

Child edits belong to the recipe's authored body, not a late union of arbitrary descriptor fields and strings. Start with one bounded editable body or composable word, and retain the runtime parser as the authority. Stable identities can be scoped builder paths for structured recipes; arbitrary text editing may legitimately establish a new source-map lifetime. Do not promise persistent row identity across every possible rewrite.

Optics and projection are explicit encounter/runtime inputs. The mathematical model should not import a viewport policy just to compute a walk. But extracting every stylistic constant is not prerequisite to an honest first repair.

### Instrument: proposes; it does not secretly compose a new recipe

A source scrubber and spatial handle bind to the same update policy. Readouts may be derived; dragging a derived value requires a declared inverse proposal. Keyboard stepping, pointer projection, and landmark magnetism remain distinct operations.

Track **proposal → submission → acceptance → presentation**, not only handler time. The 100–200 ms drawing measurement is a recorded observation in one rendering environment, not a universal bound or a theory of instinct. Latency, continuity, and the legibility of the answer all matter.

When desired and presented diverge, show that distinction immediately in the guide/source treatment. A responsiveness budget decides whether this interaction strategy is adequate; it must not decide when a false correspondence becomes permissible. A pending affordance must identify which result remains visible, not just dim an unrelated button. Measure tail latency and the final release, not only averages.

### Transition: a relation between artifacts, with capability-specific execution

Keep **redescribe / replay / live**, but do not claim they are interchangeable implementations.

- **Redescribe:** retain an actual presented artifact under a bounded equivalence witness relating old and new artifacts. Both forward and backward edges owe this check. Source identity, placement, ordered motion, final pose, style, timing, and residual ink may matter; declare which effects are being compared. Replay otherwise.
- **Replay:** execute the new artifact from its declared beginning. It does not preserve a live trajectory or all identities.
- **Live:** request a supported intervention on an identified runtime target at a declared revision/frame, then observe the admitted and presented result. Rejection or unchanged admission must remain possible.

The dojo hand probe is instructive: with its hand-first responder B reaches the wish and A follows; with built-in conservation, the request returns `accept` while B remains at its old position and no motion revision is created. **Accepted does not mean achieved.** The target, writer, law owner, metric frame, admission policy, and resulting revision are not decorations.

Changing a polygon's side count and moving one constrained point are different operations. The same descriptor can share a semantic intent only where both adapters genuinely support it. Unsupported live topology changes must be refused or explicitly presented as restart/replay. A silent replay fallback would erase the very distinction the brief asks us to make.

### Evidence: events do not certify propositions

`input-chosen`, `program-accepted`, and `result-presented` are lifecycle facts. `property-predicted` describes an epistemic basis. An equivalence witness is a proposition relating two subjects. Flattening all of these into one four-way tag loses information.

Attach evidence to its subject: declaration/binding revision or artifact identity; native run and viewport lifetime where applicable; relevant observed effect and its provenance. Equivalence additionally names both artifacts, observation scope, tolerance, runtime/projection assumptions, and exclusions. Pure predictions need not fabricate a request id when no native request exists.

A kept chip can honestly combine **native completion at these submitted inputs** with **a model-derived thumbnail**. Completion does not promote the thumbnail into observed geometry. Likewise, a collection may keep an explicitly failed experiment; require provenance, not success as a condition of keeping.

Do not prohibit every older finish after a newer desire. The current stage really swaps each completed committing run into view, and the ledger records it. That older result may be an honestly labelled presented state while the latest desire remains pending. If newest-only presentation is required, enforce it in the stage before the swap. Discarding the ledger event alone would make the record disagree with the canvas.

## 6. The Mimsy gate must reject cosmetic authorship

A finite list of names is a menu, not sufficient evidence that the child authored a word. Renaming `polygon` to `mim` and changing its call is alpha-renaming; it should preserve behaviour, not be celebrated as a new mathematical power.

The minimum substantial gate is:

1. Open one actual word body and encounter the smaller acts it contains.
2. Change or compose one act; a native answer changes for that reason.
3. Give the altered behaviour a valid name, without silently rewriting unrelated bindings.
4. Invoke it twice or inside another word/ambient.
5. Carry the definition, dependencies, and invocation into a fresh encounter; the native runtime answers there too.
6. Break the word and recover without erasing it or claiming an old drawing is its successful answer.

Not every stop must offer authorship. Nor must a free-form editor be the first surface. A bounded composition of real Paperlang acts may suffice. What matters is altering a behaviour, not merely selecting a costume for it.

There is already a closer seed in this repository: `design/play-vistas.md` and `design/iterations/16-play-vistas.mjs`. Their working-word bodies and calls are editable, and kept work stores source state; the document explicitly distinguishes renaming from geometric change. Reuse or test that seam before building another word registry. Those are design probes, not a certified solution or proof of teaching.

## 7. The revised build order

### Step 0 — stop retaining and displaying false recipes

Before a new State module:

- Replay 88° → regular square; compare the presented input before any projection.
- Replay the reverse pentagon placement change; apply preservation checks in both directions.
- Render the chosen compiled rows rather than patching authored-default rows.
- Remove the pursuit's phantom length argument.
- Turn the discovered counterexamples into acceptance tests, including delayed presentation.

This is a correctness repair, not the full extensibility refactor. Preserve the one-pass builder, native presentation, and existing ledger while making them consume coherent artifacts.

### Step 1 — extract only the state/update seam the repairs expose

Pure snapshot derivation and proposal policies, bound to existing run identities. Test 80°/5 as a lossy mapping, exact `360/7`, immutable submitted inputs, rollback, supersession, failure, and teardown. State, manuscript, and guide can say “desired”; a collection cannot claim “presented” without corresponding evidence.

### Step 2 — prove two independent compositions, not registration

One bounded spiral with turn and growth controls, no required spatial model; one word-body composition with two scoped instances. Count all required changes to generic state, builder, scheduler, bridge, and controller. Shape-specific source, prediction, and optional projection adapters are allowed and disclosed. Hiding a bespoke controller inside a descriptor does not pass.

Measure authoring burden as **declaration + adapters + exceptions + duplicated semantics**, not a fixed line target. Functions in descriptors are legitimate declarative JavaScript when their inputs and obligations are explicit.

### Step 3 — the carryable-word gate

Use the existing word probe as a comparison, then satisfy the six authorship checks above in the repaired encounter. A small human encounter with appropriate consent can test whether a newcomer predicts a consequence, deliberately changes it, and recomposes it without being walked through the designer's preferred chain. Mechanical gates and learning evidence remain separate.

### Step 4 — one supported intent across replay and live

Choose a small intervention both runtimes can honestly express, with a declared difference in continuity. Check target identity, coordinates under a rotated parent, admission versus achievement, stale revisions, settlement, presentation, and disposal. Only then consider adding the eye or frame-targeting where they answer a child's question. Do not promote the dojo's settlement result into a browser-experience guarantee.

## 8. Reproduction and limits

```sh
node --test design/probe/fourth-turn-{model,run,readouts,guides}.test.mjs

HTTP_PORT=8843 CDP_PORT=9263 \
  PROBE=fourth-turn-adversarial.mjs bash design/probe/fourth-turn.sh

node /home/putra/dojo/probe/free-point-relations/hand_contract.mjs
```

The browser diagnostic reports observations and violation flags; a zero exit means the diagnostic completed, **not that Fourth Turn is correct**. It tests the actual source-served study, not a rebuilt homepage. The Node suites passing alongside these browser failures is evidence of missing cross-seam cases, not evidence that the suites are worthless. The source-only counterexamples for count proposals, pursuit markup, and duplicate loop IDs were separately exercised with the exported builder and extracted controller functions; they do not certify pointer behaviour or native pixels.

**The firm base is not four names and a type. It is an unbroken causal correspondence: what the child changed, what the manuscript says, what was asked, what actually appeared, and what can be carried into the next act. Collapse whatever duplicates that correspondence. Keep whatever lets the child enlarge it.**
