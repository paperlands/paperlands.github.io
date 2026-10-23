# The fourth turn — the state of it, and a collapse to a firm base

**Status:** a meditation and an adversarial re-reading, not a ratified contract and not an
implemented refactor.

**Provenance:** read from the working tree of `assets/js/home/fourth-turn/` (instrument.mjs 1707
lines, programs.mjs 480, figure.mjs 144, run.mjs 198), `design/fourth-turn-foundation.md`,
`design/code-morphology.md`, `design/play-vistas.md`, the dojo `codex/primitives.org`, and the
dojo probes `live-rendering/`, `driven-intent/`, `free-point-relations/`. **No suite was run for
this reading.** Every claim below about behaviour is a claim about source, and is labelled as such.
Where I say "measured", the measurement is the one recorded in the tree's own comments, not mine.

---

## I. The state, read from the code rather than from the document

The fourth turn is now **five descriptions in one ordered chain** — `explicit`, `loop`, `defined`,
`polygon`, `pursuit` — where each description is a **descriptor**: an executable JavaScript record
carrying its own identity (`id`, `name`), the instrument it hands the hand (`axis`, `word`,
`argument`), the transition that leaves it (`advances`), the evidence it may claim (`executed`,
`returned`, `established`, `snapshot`), what it says (`invitation`, `reading`, `sentence`), the
source it writes (`parts(values)`), and its encounter policy (`opening`, `keeps`, `closed`,
`playedTurn`, `retires`, `performance`).

Four engines sit beneath the five descriptions:

- **one builder** — `build()` walks `parts` and writes source, displayed rows, and the row→line map
  in a single pass, so the recipe and its own line map cannot drift;
- **one arithmetic** — `figure.mjs` states what the page believes the walk is (`walkPoints`,
  `originOf`, `turnDial`, `turnGuide`, `walkPath`, `walkGap`), and is measured against ink by
  `fourth-turn-gate.mjs`;
- **one ledger** — `run.mjs` holds desired / submitted / presented and the request lifetime;
- **one controller** — `instrument.mjs`, 1707 lines, which owns the instruments, the pace, the
  series, the speech, and the transitions.

**This is a real achievement and it should be said plainly.** The descriptor is the honest form of
"declarative primitives": nothing branches on a description's name in the builder; the parts are
composable and nest (a loop may carry a spawn); a description can be replayed as authored or run as
the hand's own, by one mode parameter. `kindOf`, `walkPath`, and the milestone chips all refuse to
claim runtime observation the pinned host cannot supply.

**And the succinctness has not arrived.** Five descriptions at ~20 fields each, each `parts` body
hand-shaped, over a controller that has not collapsed. By the foundation document's own test — *a
ten-line declaration supported by a bespoke thousand-line controller is not succinct reuse* — the
state is **declarative registration with a bespoke controller**, and the controller is where the
mathematics still hides.

---

## II. The Mimsy reading — what the story actually asks of the toy

"Mimsy Were the Borogoves" is not an aesthetic. Read exactly, it asks five things, and each one is
a design constraint rather than a mood:

1. **The logic is real, and from another order.** The toys are not puzzles; they are a working
   mathematics whose *notation* is alien. Nothing about them is arbitrary decoration.
2. **The child masters it by play, without instruction.** Nobody teaches Scott the cube; he wishes,
   it answers, and the wishing becomes a grammar.
3. **It is legible to intuition and illegible as coercion.** The parents hold a trained either/or
   and can only see "nonsense". The toy does not explain itself; it *answers*.
4. **The mastery is causal.** The child's own gesture is the cause of the world's answer, and the
   answer changes what the child can do next.
5. **The failure mode is the parent, not the child** — the trained reader who mistakes a higher
   logic for nonsense, and who therefore cannot tell whether the toy is teaching.

Mapped onto this encounter: (1) is held — the surface is real Paperlang, never a fabricated English
dialect. (2) is held — the child acts and the runtime draws. (3) is partly held — the manuscript is
a poem over an exact grammar, which is precisely the jabberwocky relation (English syntax, alien
semantics, real structure underneath). **(4) is not held. (5) is the standing risk of this
document.**

**The piercing finding: the fourth turn answers number, not word.**

Its only instruments are `turn` (a degree) and `side` (a count). The child changes *quantities*; the
child never utters a *word* that the world then answers. The `name` stop **gives** a name — `def
polygon do` — it does not **take** one. There is no `def` the child authors, no call the child
composes, no word carried elsewhere. And "carried elsewhere" is exactly the etymology of *reuse* in
the brief.

So the encounter, as built, serves quantitative intuition faithfully and the jabberwocky intuition —
*a gesture small enough to hold and hand around* — not at all. That is the deepest gap between the
stated experience and the built thing, and it is not a gap in polish. It is a missing primitive.

---

## III. Assumptions that must not survive the next step

Each is checkable in the tree as it stands.

1. **The document is not the state.** `design/fourth-turn-foundation.md` still withdraws the
   "family of already-complete figures" recommendation only by *later asserting a decision inside
   the same section*. Its Recommendation — *"Do not quietly make the loop count follow the angle"* —
   still reads as live, while the code does precisely that (`loop ${sideFromTurn(turn)} do`), under
   the Decision that follows it. A reader — human or agent — has no precedence marker. The same
   failure appears as a **stale comment beside a live one**: `programs.mjs` justifies the turn
   domain as 60–120 by stage footprint, while `DOMAIN.turn` is 30–120 by the ladder. Design prose is
   `desired`; it becomes `presented` only when a machine can read it back. This is the same class of
   error the document itself names, turned on the document.

2. **`kindOf` is a second grammar.** The execution light counts turns by prefix-matching source text
   (`forward `, `fw `, `left `, `lt `, `faceto `…). The command table belongs to the language. An
   added alias, or a verb the page does not know, silently misclassifies the light. The foundation
   document forbids a second turtle language; `kindOf` is a miniature of one, and it is inside a
   file named for the *instrument*.

3. **`advances` is declarative registration, not semantic extensibility.** It is a string consumed
   by `TRANSITIONS[descriptionOf(rep).advances]?.()` — a hand-written map. A fifth description whose
   transition is genuinely new needs a controller edit. The descriptor *looks* universal and is not.

4. **"Runtime intervention" is the unmet centre, and the dojo already has it.** The pinned site host
   exposes no read-back and no hot-update. Every act is *dispose → fresh native run → whole-result
   presentation* — replay, paced beautifully. Meanwhile `dojo/probe/free-point-relations/hand_contract.mjs`
   exercises a real hand door (`requestMotion` in own / parent / world frames, with writer, owner and
   metric frame kept distinct), and `dojo/probe/live-rendering/` carries a settlement seam with
   drain-before-spend and coherent replacement. **The collapse must define one Transition vocabulary
   that the dojo satisfies natively and the pin satisfies only as `replay` — and must name honestly
   that no description on the site is `live` today.**

5. **Instinct is a latency budget, not an adjective.** The tree's own diagnostic measures the page's
   handler at ~1.4 ms and a native drawing run at 100–200 ms. Intuition binds an act to its answer
   only inside a coherence budget; past it, the world must *look* pending or it is lying. The
   Instrument and Transition contracts must carry a declared budget and a pending affordance, and a
   gate must measure them. "Richly expressive" must not be code for "slower than the hand".

6. **State ownership is not uniform.** `turn` is authoritative at `loop` and `defined`; `side` at
   `polygon`; `shift` at `pursuit`; nothing at `explicit`. `DOMAIN` is global; `DISPLACED` is
   description-local. The relation *turn = 360/side* is therefore writable from two ends at two
   stops — which the instrument calls "one state, two stops", and which the foundation document's
   State contract does not name. **The fact is the relation, not either variable.** A parameter is a
   chosen independent variable of a relation, and the choice belongs to the stop. This is a real
   refinement, not a contradiction, and it should be written into the contract rather than left to
   a code comment.

7. **The child's authorship collides with descriptor-owned source.** The manuscript is generated by
   `parts`. If a child may author a word, the Recipe must compile from (descriptor ∪ child edits)
   while keeping stable row identity and a truthful line map. Decide where authorship lives, or the
   Mimsy gate cannot be built without breaking the builder.

8. **The camera and the pin's optics are inside the mathematics.** `WORLD = 2·500·tan(π/6)` lives in
   `figure.mjs`; `beColour "ff9933"`, `bold 1.1`, `show 9` live beside the walk in `programs.mjs`.
   The document says the camera is not mathematics and the pin's framing is not a universal domain;
   the code disagrees. Projection and optics must be adapter inputs, not constants of the figure.

9. **`established` is one hand-written predicate with one measured case.** Honest, and the right
   seed — but an equivalence claim must carry its witness (which run, which measurement, which
   tolerance, and what is *not* claimed). Default to replay; only the measured case may rediscribe.

10. **The chips are authored arithmetic, and that is only honest while it stays labelled.** A chip is
    the walk the recipe actually is, brought home by walking, never a `Z`. Keep it — and make the
    provenance part of the value's type, so a future edit cannot quietly promote a prediction to a
    witness.

11. **"Extensible / richly expressive / succinct" has no measure.** Adopt the document's own test as
    a gate: **a fifth description — a bounded spiral — must be addable without editing
    `instrument.mjs`.** If it needs a new `TRANSITIONS` key and a new controller branch, the
    contracts are not yet the foundation.

---

## IV. The collapse

Four contracts, one type, one law. The contracts are the author's vocabulary, and they are
deliberately not the same layer as the child's vocabulary — the child's is Paperlang, the dojo's own
six primitives, and it must not be duplicated here.

### State — what may vary here, and who owns it
A description declares the parameters it offers. Each parameter names its **owner** (the one thing
allowed to write it), its **domain**, its initial value, its unit, and — where it is the independent
end of a relation — the relation. Derived values declare their dependencies and a pure calculation.
The fact that a relation may be presented with a *different* independent variable at a different stop
is first-class, not incidental: **the relation is the fact; the variable is the stop's choice.**
Reject duplicate owners, unknown references, dependency cycles, and non-finite values. Viewport
policy and native budgets are not mathematical domains and do not belong here.

### Recipe — what the runtime is actually asked to execute
A recipe compiles a **frozen** (declaration, bindings) into native source, stable displayed row
identities, the row→line map, and — from the language's own command table, never from string
sniffing — each row's kind. Bindings carry provenance: an authored derivation (`360/side = 72°`) is
not a runtime observation of a local variable, and the two must not share a representation. The
optional geometry adapter supplies landmarks and restricted equivalence checks; it is an
independently tested *prediction* of this recipe, never a generic interpreter.

### Instrument — another way to propose the same state change
An instrument reads its binding and domain; maps gesture or key to a proposal; begins, updates,
commits, or cancels one adjustment; projects a guide through the geometry adapter where one exists;
publishes accessible labels from the same binding; and **declares a coherence budget with a pending
affordance**. It owns no second value. A spatial inverse need not exist for every derived quantity;
"richly expressive" must not mean "everything is misleadingly draggable".

### Transition — what changes, and what must remain true
A transition maps state and representation and declares its obligation as one of exactly three
names: **rediscribe** (retain the native result only where equivalence is *established with a
witness*), **replay** (submit the new recipe and present its actual result — the default), or
**live** (a hand intervenes in a running figure; **declared, and today unimplemented**). `live`
becomes real only when a producer-owned contract supplies target identity, input updates,
observation provenance, ordering, and disposal — the dojo's hand/law/settlement vocabulary, not a
guessed patch. Animation is an optional rendering of the transition, never its semantics; cancelling
a token flight must not alter the mathematics.

### Witness — a type, not a fifth primitive
Every claim a primitive emits is exactly one of **input-chosen**, **program-accepted**,
**result-presented**, or **property-predicted**, and carries its request id and viewport lifetime. A
stale event is discarded before any evidence changes. No primitive may emit an unlabelled claim, and
no collection may store one. This is where honesty stops being a review habit and becomes a type.

### The Mimsy law — an invariant, not code
**The child's own word must be a possible cause.** Concretely: a recipe may expose a `def` row and a
call row as instrument-bearing; a finite registry of names is a valid State domain; a child-authored
name, once it has answered once, is carried into the kept work. Where a description cannot satisfy
this, it must say so — not in a caption, but in its own declaration.

### What richness then means, in the dojo's own grain
The fourth turn already composes five of the dojo's six primitives: the arrowhead (`fw`/`lt`), SE(3)
without tip/lean, the ambient (`as … do`, the pursuit's spawn), the communication gradient
(`faceto`, SEE). It does **not** use the eye or frame-targeting. The extensibility that is *succinct*
is therefore already available and needs no new abstraction: **the eye** (seeing is a movement — the
figure looks the way it does because of where you stand to watch it walked) and **frame-targeting**
(one arrowhead lays its ink inside another's world — a figure no longer private to the hand that drew
it). Richness from composing the language's six, not from page machinery.

---

## V. Build order — one step, strong and sure

Not the five-step programme wholesale. The first step is chosen because every other contract's
honesty depends on it, and because the failures in §III.1, §III.6 and §III.10 are all *state
description* failures.

**Step 1 — make the state self-describing and provenance-carrying.** One small DOM-free module:
parameter/relation declarations with owners and domains, pure derived values, and a
desired/submitted/presented envelope carrying request ids and lifetimes, declared per description and
validated against duplicate owners, unknown references, and cycles. Acceptance is adversarial and
does not sleep: derived values cannot drift; a submitted snapshot survives later edits; a delayed
finish cannot become presented after a newer desired; cancellation restores exactly the starting
adjustment; and the module can answer *"what may vary here, and who owns it?"* from data alone.

**Step 2 — lift the second grammar and the string-keyed transitions into declared data**, so that a
fifth description (the bounded spiral) is addable without editing the controller. This is the
extensibility gate, and it is measured by the diff, not by intention.

**Step 3 — the Mimsy gate.** A word domain, and one `def` row and one call row the child may author,
with stable row identity through the builder and an honest replay on every edit.

**Step 4 — the same descriptor, twice.** Satisfy the four contracts once by the site's replay adapter
on the pinned spike, and once by the dojo's live hand. The same descriptor, two runtimes, one
vocabulary. That, and not a thousand-line controller, is what "a firm and ample base" would prove.

---

**The chain to hold: an input has one owner; a recipe carries its bindings and its provenance; an
instrument proposes and never owns; a native run supplies bounded evidence; a transition preserves
only what it can witness; and the child's own word is a possible cause. Richness belongs in composing
those relations. Beauty may reveal them. It must never substitute for them.**
