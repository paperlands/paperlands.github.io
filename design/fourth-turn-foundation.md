# Fourth Turn — a foundation before a framework

**Status: adversarial assessment and proposed next steps, not a ratified API or an implemented refactor.**

**Review boundary:** the working tree changed concurrently during this assessment. The first browser witness used the angle-dial generalisation; later source inspection found a count-control generalisation. The review preserves those edits. The four-step collection and angle-only replay decision remain in the later version; the keyboard finding below is explicitly historical.

The ambition is not a reusable polygon demonstration. It is a small language of interaction above Hatch: mathematical conditions can be held, changed, related, witnessed, and redescribed without losing their meaning. Succinctness must come from composing a few independent contracts, not from concealing obligations in flags.

**Build no new abstraction until the source, the hand, and the visible result agree.** A polished contradiction is a weaker foundation than an unfinished but truthful experiment.

## 1. What is already strong

The existing seams deserve preservation:

- `assets/js/home/fourth-turn/hatch.mjs` opens the pin; the study and native probe use that same door.
- `programs.mjs` produces source and its row-to-line map in one pass. A representation change need not manufacture execution evidence.
- `stage.mjs` separates progressive demonstration from whole-result presentation. Its back buffer is real Hatch output, not a synthetic tween of the mathematical object.
- `figure.mjs` explicitly calls its geometry an authored model, not observed runtime state.
- `kindle.mjs` extracts a genuinely narrow reusable operation: mapping execution beats onto page-owned rows.
- The inspector distinguishes composed source from executed source. The component has fallbacks, gesture cancellation, visibility suspension, and stale-run guards.

These are valuable experiments. They do not yet constitute an expressive interaction algebra. In particular, moving four descriptions into a registry has reduced dispatch duplication, but has not removed the story-specific assumptions from the controller.

## 2. The first breach is mathematical

### Four steps are not the family advertised by the series

The loop and the named definition execute **four** equal-length steps at every angle. `keepMilestone()` instead records the closed regular polygon *implied* by that angle, and `milestonePath(side)` draws that other polygon.

At length 250, the existing model gives:

| turn | executed four-step walk | implied regular polygon | endpoint gap of executed walk |
|---|---|---|---|
| 120° | three triangle edges, then the first edge retraced | 3 sides | 250 |
| 90° | closed square | 4 sides | approximately 0 |
| 72° | four edges of a pentagon | 5 sides | 250 |
| 60° | four edges of a hexagon | 6 sides | 433.013 |

The triangle's ink can outline a triangle, but the walk does not end where it began. Retracing and the final head position are observable, too.

The real study, on the pinned Hatch, was driven to 72°. Its executed source contained `loop 4 do` and `left 72`; its status announced **“pentagon: 5 sides … Kept in the series.”** This is not merely an imprecise comment. It is a false witness presented to the visitor.

Calling the chip “page arithmetic” does not cure this. The arithmetic computes a different count and a different placement. It is an **inferred completion**, not a snapshot of the executed walk.

### Generalisation is not generally a re-description

`generalise()` decides whether to run by checking only whether snapping changed the angle. At every milestone that test is false. But the program changes from four steps to `side` steps, and from fixed placement to polygon-centred placement.

At 72°, the origin changes from `(-125, -125)` to approximately `(-125, -172.048)`, and the count changes from 4 to 5. In the browser, entering the generalisation changed the displayed state to `side: 5`, but stage posts stayed at 2 and the last executed source stayed the four-step loop. The inspector honestly exposes this disagreement; the drawing and instrument still disagree.

Only the authored square has the established geometric equivalence. “Same angle” is not “same program effect.”

**Recommendation:** preserve the open four-step experiment. Let its failure to close earn the rule. Keep actual walk states; label any completed-polygon preview as a prediction. Name the intermediate procedure `walk`, or explicitly present its polygon name as a conjecture. Generalisation changes the procedure into a polygon and executes whenever the result changes. Do not quietly make the loop count follow the angle: that would move the discovery into hidden machinery.

The alternative is a family of already-complete polygons. That is legitimate, but the changing count must appear in the source from the beginning. It is a different lesson, not an implementation detail.

**Decision taken (this session): the alternative, with its condition met.** The study has moved to the
family of already-complete figures, and the changing count appears in the source from the beginning.
It is not hidden machinery:

- `loop 4 do` is no longer a constant of the loop. The count is written as the whole sides the played
  turn implies — `loop 5 do` at 72°, `loop 3 do` at 120° — derived in one place (`sideFromTurn`, the
  same rule the generalisation's argument uses) and written into the loop line by the one builder.
- The number in that line is drawn as the angle's own readout (`.tok-count`, gold, refreshed with the
  other readouts), and the grip's own value says it: `72 degrees, 5 steps`. The reading says
  `the turn is 72° · 5 steps`, and the status says the loop counts five steps again.
- Every change of the count sends the runtime a new program — the run is executed, never retained.
- A chip is the walk that ran: the steps, brought home by walking them and never by a `Z`. The
  `prediction` label is gone because there is nothing left to predict; at a milestone the loop walks
  exactly the sides the series keeps.

**What the loop now teaches, said plainly.** The open walk did not disappear — it is what the loop draws
*between* milestones, where a whole count cannot come home: five steps end 133.02 short at 80°, three end
137.52 short at 103°. The failure to close is still what earns the generalisation; it is now measured
against a walk that already follows its angle, rather than against a four-step walk that was never the
figure the series announced.

**Witnesses.** `fourth-turn-model.test.mjs`: the loop counts what its angle implies at every milestone,
the walk comes home there, and `80°` counts five steps that do not; `fourth-turn-act.mjs`: the manuscript
reads `loop 5 do` at 72°, the grip's value reads `72 degrees, 5 steps`, and the chip carries no `Z`;
`fourth-turn-foundation-audit.mjs`: `loopSteps` equals the milestone's side, with the two seams reported.

**Two handles at the loop, one state — and where each belongs.** The angle is played at the **hinge**:
the corner the walk turns at, where the recipe's own `left <turn>` row fires. It is deliberately not
where the pen stops: at 103° the head has wandered to `(-155.9, -9)` while the walk still turns at the
same corner, and an arc drawn at the head reads as an angle about nothing. The count is played **in the
source**: the number in `loop 5 do` is a handle too, and sliding it bumps the loop, the angle going to
the one that closes it (`360/side`) — the same slide that will choose a side's count at the
generalisation. The count has no third place here, and that is a fact about the arithmetic rather than a
simplification: every count that closes this walk — 3 at 120°, 4 at 90°, 5 at 72°, 6 at 60° — brings the
pen home to the same corner, so the count's spatial form *is* the hinge, and the dial's landmarks already
are the count's steps. At the generalisation the count becomes an argument of the recipe and the angle
becomes a readout of it: one state, two stops, and the second handle is one stop early.

**The runtime's own drawing is the slow part, and the hand is paced against it.**
`fourth-turn-latency-diagnose.mjs` measures the act frame by frame. The page's own handler costs 1.4 ms
(`moveGesture`), while a single native run costs the whole canvas: 100–200 ms in this software-rendered
environment, and the same with the optics reduced (`show 1`, `bold 1`) or removed — so it is the drawing,
not the page, and not the dots and the gold. A live gesture proposes a change per pointer move, so the
hand is paced: one program in flight, the next no sooner than the last one took, and the last value is
always the one drawn — nothing is dropped, only paced. The instrument's own frame rate (the dial, the
rail, the marks, the reading, the count in the source) stays the page's, at 16.7 ms idle and while the
gesture is live; only the drawing keeps up as fast as it honestly can.
## 3. Other assumptions that fail under pressure

### A discrete domain is not a continuous domain followed by rounding

In the initially reviewed angle-dial version, the generalisation snapped to `{60, 72, 90, 120}`. Keyboard arrows proposed `turn ± 1`; Shift proposed `turn ± 5`. Every proposal snapped back to the same landmark, at every landmark. Browser input confirmed ArrowRight and Shift+ArrowLeft both left 90° unchanged.

Concurrent edits subsequently changed the generalisation to an independent integer side-count control with a derived turn. The updated browser audit confirmed ArrowRight moves the square to 5 sides/72°, and Shift+ArrowLeft then reaches 3 sides/120°. The earlier snapping failure should not be reported as a defect of this later version. The count control is also the stronger state model proposed below. The reusable domain lesson remains:

A domain must own distinct operations:

- `project(candidate)` for pointer proposals;
- `next(value, direction, stride)` for keyboard movement;
- `first`, `last`, and formatting for accessible controls.

On a finite domain, arrows traverse members. They do not repeatedly add an increment too small to escape the nearest-member basin. Nor should a future seven-sided polygon require rounding its angle to an integer: its count is exact and its turn is derived.

### Desired input is not presented output

`setValue()` refreshes the source, guide, and series before scheduling the hand's native run. `keepMilestone()` can therefore record a state that has not completed, fails, or is superseded. During a slow run, the new guide can sit over the old front-buffer geometry.

The current `run` captures submitted inputs, and `lastExecuted` captures completed hand inputs. Those are good beginnings. But a single mutable `value` still drives claims about several different moments.

A witness must specify whether it means **input chosen**, **program accepted**, **result presented**, or **property predicted**. All four are useful. They are not interchangeable.

### Declarative registration is not semantic extensibility

The builder recognises a fixed set of parts and silently ignores unknown ones. Loop bodies contain steps rather than recursively composable parts. Definition and loop row IDs are hard-coded. Multiple definitions or nested loops would require changes. Unknown description IDs silently select the opening description.

The controller still embeds `left`, `polygon`, `len`, `side`, hand-coded turn/count adjustment, particular spatial rails, and custom `gather`, `name`, and `generalise` functions. Adding a fifth entry within those restrictions may be easy. Adding a second mathematical idea is not yet demonstrably easy.

A descriptor should either validate and compose within an explicit vocabulary, or delegate to a clearly named adapter. It should not look universal while quietly dropping unsupported meaning.

### A source line is not an execution occurrence

`createKindle()` keeps a set of visited lines. That is useful for “has this row been reached?” It cannot count repeated executions of a loop body. `lightRows()` derives `turnsSeen` from unique turning rows, so a repeated turning instruction is counted once.

Do not enlarge Kindle into an imagined execution trace. Keep reachability and occurrences separate. A beat can bundle commands, and the current host does not expose loop counters or local values. When exact occurrences cannot be recovered, the UI must not imply that they were observed.

### The camera is not mathematics

The 60–120° and 3–6 bounds are this encounter's framing and interaction policy, not universal mathematical domains. `WORLD` encodes an assumed fixed camera. That projection can be measured for this pin, but should not become a permanent primitive's definition.

Separate mathematical admissibility, runtime budget, and viewport policy. A new projection may restrict what this encounter offers without declaring other polygons mathematically invalid.

### Lifecycle is part of composition

The root has no public teardown. Window/document listeners, observers, timers, and animation work are owned informally by a long-lived page. This is not enough for dynamically mounting, removing, and remounting reusable instruments. Repeated HTML IDs also need component-local unique references before multiple instances are an accessibility-safe composition.

Likewise, multiple Fourth Turns independently toggle one body visibility attribute: the last reporting root wins, rather than the attribute reflecting whether any root is visible. Keep this homepage policy out of the reusable interaction core.

## 4. Collapse to four author-facing primitives

These are proposed contracts, not reasons to introduce four classes. The core can remain plain JavaScript modules. An executable descriptor containing functions is declarative **JavaScript**, not automatically serialisable JSON.

### 1. State — what may vary, and what follows from it

An independent parameter declares its identity, initial value, domain, and unit. A derived value declares its dependencies and pure calculation. Constants need no gesture domain.

For a regular polygon, choose `side` as independent and `turn = 360/side` as derived. The concurrently introduced count control follows this direction. An optional angle dial could select the finite family through the relation, rather than treating its turn as independently writable. Do not retain two independently writable copies of the same fact.

For a four-step experiment, `turn` is independent and the count is constant. These are different state spaces, connected by an explicit transition.

Begin with scalar ranges and finite choices. Do not add a general solver or reactive framework. Later vector or constrained-state adapters must preserve the same update contract, rather than require a special controller per shape.

### 2. Recipe — what Hatch is actually asked to execute

A recipe compiles a frozen input snapshot into native source, stable displayed row identities, and explicit bound operand spans. Demonstration rests are a deliberate execution mode.

Keep Paperlang as the mathematical language. Do not implement a second turtle language, an expression evaluator, or an incomplete parser above it. Existing `parts` can remain the local authoring convenience until a second example proves that another representation is necessary.

Bound source operands and displayed derived readouts are different things. Editing the call's count changes an input. Showing `360/side = 72°` is an authored derivation, not a runtime observation of a local variable. Bindings should carry that provenance.

The optional geometry adapter supplies landmarks for guides and restricted equivalence checks. It is an independently tested prediction of this recipe, never a generic interpreter or observer. Recipes without a geometry adapter can still expose source controls; spatial handles require a valid projection.

### 3. Instrument — another way to propose the same state change

A number scrubber, dial, keyboard control, or future point handle maps an action to a proposed update through a binding. Each renders from the same state snapshot. None owns a second value.

An instrument's reusable contract is small:

- read its bound value and domain;
- map a gesture or key to a proposal;
- begin, update, commit, or cancel one adjustment;
- project its guide through a geometry adapter when needed;
- publish accessible labels and values from that same binding;
- release every listener, capture, and animation on teardown.

A spatial inverse need not exist for every derived quantity. Declare it where meaningful; otherwise render a read-only guide. “Richly expressive” must not mean “everything is misleadingly draggable.”

### 4. Transition — what changes, and what must remain true

A transition maps state and representation, and declares its execution obligation:

- **re-description:** retain the current native result only when the relevant effect is established as equivalent;
- **replay:** submit the new recipe and present its actual result;
- **live intervention:** available only through a future, explicitly supported Hatch capability.

Animation is an optional rendering of the transition, not its semantics. Cancelling a token flight must not cancel or alter the mathematical transformation. Reduced motion uses the same transition without the flight.

For this restricted walk family, an effect comparison can include ordered world-space vertices, final pose, and relevant drawing settings, under a declared tolerance. Geometry equality is not full program equivalence: timing, retracing, heads, effects, and reactive behaviour may matter. Default to replay when equivalence is not established. Do not claim a generic equivalence checker for arbitrary Paperlang.

**Collections, milestone glows, trails, token flights, tours, and inspectors are compositions of these contracts—not additional core primitives.** A collection stores evidence-tagged snapshots; a tour proposes the same updates as a hand; an inspector projects the execution ledger.

## 5. One small execution ledger beneath those primitives

The minimum separation is:

```text
desired   — latest valid authored input + chosen representation
submitted — frozen recipe/input snapshot assigned to a native request
presented — snapshot whose native output is currently in the front buffer
```

Demonstration adds progressive evidence associated with its submitted snapshot; its first visible beat is not a claim that the entire result is complete. A hand run commits the back buffer at `finished`.

Every native event belongs to a request and a viewport lifetime. Discard stale events before updating any evidence, not just before swapping canvases. A representation change must not apply old-run line numbers to a new source map just because their row IDs happen to match.

A pure state transition layer can emit the effects `compile`, `play`, `present`, `announce`, and `dispose`; browser adapters perform them. No general event bus is required.

The scheduling policies remain distinct:

- gesture updates are coalesced to the latest valid desired snapshot;
- navigation preserves a bounded ordered sequence;
- native beats follow Hatch's logical playback;
- choreography and tour dwell follow wall time and may never fabricate a native beat.

A pending guide may preview desired input, but must be visibly pending or remain attached to the presented geometry until commit. Failure keeps the old presented result and its provenance; it does not relabel that result as the failed proposal. Cancellation restores the adjustment's starting input and submits a restoration if needed.

The page may *choose* when to guide the visitor onward. That pace belongs to the encounter, not the reusable mathematical core. A tour should not seize a focused source control merely because the pointer stopped moving.

## 6. What “above Hatch” can honestly mean today

The installed pin says `release: false`, `host_api: null`, and `language_revision: null`. The measured surface is `createHatch`, `play`, `onLine`, `dispose`, and a finite run's `finished`. It has no exported value read-back or hot-update channel.

The present interaction is **authored input → fresh native execution → whole-result presentation**. That can support delightful, instinctive mathematical play. It is not mutation of the running organism, persistent reactive state, or runtime-local observation.

Do not send guessed patches or read private runtime objects to make the API look richer. A future live-intervention adapter requires a producer-owned contract for target identity, input updates, observation provenance, ordering, and disposal. Its absence should not block building honest replay-based instruments now.

The same-origin frame remains an experimental adapter for this pin's window-sized canvas and body overlay. `design/hatch.org` describes a release contract that rejects an iframe as the permanent component boundary. Resolve that discrepancy deliberately when integrating a release; do not bake frame transport or its camera constants into the authoring vocabulary.

## 7. Strong and sure: the sequence of construction

### Step 0 — make the current mathematical encounter truthful

Before extracting a framework:

1. Replace false closed-polygon witnesses with executed walk snapshots or explicitly labelled completion predictions. **Met, by the first route:** a chip is the executed walk at the count its angle implies, brought home by walking and never by a `Z`, and no prediction needs labelling.
2. Check count and placement as well as angle when generalising; replay every non-equivalent milestone transition.
3. Preserve the count-control correction and verify keyboard traversal of every offered member; make finite-domain traversal explicit in the reusable contract.
4. Record result witnesses after the corresponding run is presented. An earlier record must say “chosen input,” not “drawn figure.”

Acceptance: exercise all four milestones on the actual study, forward and backward; verify source, native result, guide, collection, and announcements agree. The live walk must close at every milestone and be short between them, and the count it takes must be readable in the source. At 72°, 60°, and 120°, generalisation must not silently retain the run: the count the walk implied becomes an argument and the placement changes, so it is executed. The square may remain unchanged if its declared equivalence is verified.

### Step 1 — extract state and domains, not visual choreography

One small DOM-free module for range/finite domains, independent and derived values, adjustment rollback, and desired/submitted/presented snapshots. Reject invalid declarations, duplicate identities, unknown references, non-finite inputs, and dependency cycles. Keep viewport policy and native budgets outside the mathematical domain.

Acceptance: every finite member is keyboard-reachable; derived values cannot drift; immutable submitted snapshots survive later edits; cancellation restores precisely the starting adjustment.

### Step 2 — extract a bounded execution adapter

Retain the pinned Hatch boundary and native presentation strategy. Give the adapter explicit lifetime ownership and teardown. Separate latest-value scheduling from navigation queuing.

Acceptance: delay a native finish, change desired input again, then fail or dispose. No stale result becomes current; no unpresented proposal becomes a completed witness; remounting leaves no duplicate callbacks. These must be adversarial tests, not sleeps that assume the native run is fast.

### Step 3 — bind two surfaces without adding another value owner

Move manuscript scrubbing and spatial handles onto the same state/binding contract. Keep the angle arc as a renderer adapter, not as a universal controller branch.

Acceptance: either control updates the other through one canonical input; keyboard and pointer use the same domain; source operands retain stable identities; resize changes projection, not mathematical state.

### Step 4 — make transformations explicit

Retain gathering and naming as Fourth Turn choreography over validated transitions. Add the effect-equivalence rule only for the measured finite walk family. Unknown cases replay.

Acceptance: visual flights can be skipped, cancelled, or interrupted without changing the final recipe, native effect, or truth of an announcement.

### Step 5 — prove reuse with one different mathematical idea

Use a bounded spiral, for example: an independent turn and growth factor, a fixed iteration budget, native source controls, and an optional guide model. Compose two controls and demonstrate a parameter relation without adding `spiral` branches to the interaction controller.

This is a test of the primitives, not permission to build a gallery. If its geometry model is unavailable, source interaction must still work. If every extension needs another core flag, revise the contracts before adding more examples.

Only then shorten the authoring syntax. Measure all layers: descriptor size, required adapters, hidden defaults, diagnostics, and correctness tests. A ten-line declaration supported by a bespoke thousand-line controller is not succinct reuse.

## 8. Evidence, and what it does not prove

In this review, `node --test design/probe/fourth-turn-model.test.mjs` passed **19/19**. That suite establishes several useful source-map and arithmetic contracts. It does not establish whether the loop's chips witness its executed walk or whether all generalisation transitions preserve the visible result. The initial keyboard failure likewise escaped the then-current suite; the later count-control correction must be judged separately.

`fourth-turn-gate.mjs` compares the descriptions at 90° and measures the *generalised* milestone family against native ink. It does not establish the asserted equivalence between an arbitrary four-step milestone walk and its completed polygon. Shared model arithmetic also cannot independently prove the model's agreement with Hatch.

The new audit reports the arithmetic discrepancy and optionally reproduces the study's actual executed source, announcement, request count, and key results:

```sh
node design/probe/fourth-turn-foundation-audit.mjs

FOUNDATION_BROWSER=1 HTTP_PORT=8839 CDP_PORT=9259 \
  PROBE=fourth-turn-foundation-audit.mjs bash design/probe/fourth-turn.sh
```

This is a diagnostic, not a passing conformance gate. The browser observations used the real study and pinned runtime; this review did not independently recapture native pixel geometry or rerun the complete homepage act/gate suites. Future acceptance checks must compare independent native evidence as well as internal model consistency. Mechanical correctness still does not establish first-time human comprehension.

---

**The foundation is a chain of honest relations: an input has one owner; a recipe has explicit bindings; an instrument proposes a change; a native run supplies bounded evidence; a transition preserves only what it can justify.** Richness belongs in composing those relations. Beauty may reveal them. It must never substitute for them.
