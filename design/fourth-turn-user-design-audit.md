# Fourth Turn — user-oriented design and timelessness audit

## Verdict

**The mathematical idea is durable. The visual language has a durable core. The current interaction is not yet a neutral, dependable tool.**

Its strongest asset is not the atmosphere: it is the correspondence between a written rule, a manipulable value, and a visible consequence. That remains useful when visual fashions change. Preserve it.

Its chief weakness is a conflict of ownership. The visitor is invited to explore, but the timed tour continues deciding what they see and sometimes changes the value they are attending to. Quiet presentation is not the same as unobtrusive behaviour.

The appropriate direction is **less unsolicited choreography, clearer affordances, and stronger geometric containment**, not a wholesale aesthetic redesign.

## Evidence and limits

Reviewed the current working tree, including its uncommitted changes, rather than an earlier iteration. Built it with `bundle exec jekyll build --destination /tmp/fourth-turn-design-audit-site` and inspected the actual homepage using headless Chromium and its pinned native drawing runtime.

Examined stable states at 1280×800, 390×844, 320×568, and 640×400; keyboard End/Home on the loop's count and the generalised count; focus during autonomous progression; and reduced-motion progression. Source transitions were also exercised through the exposed study API. Those API-driven transitions establish the resulting layout, not the discoverability of the navigation.

The model, guides, readouts, and run-controller suites passed **44/44**. The first browser pass recorded no JavaScript exceptions or failed requests. This does not establish complete browser conformance or first-time human comprehension.

Screenshots and structured observations are in `/tmp/fourth-turn-design-audit/`, particularly `detail-contact.png`, `report.json`, and `detail.json`. These are temporary session artifacts. Some labels in the first exploratory report describe an intended transition that did not occur; the `rep` field is authoritative. The second report waits for and records the actual stable representations.

No implementation changes were made for this audit. Screen-reader operation, real-device touch behaviour, browser text zoom, slow-network recovery, and novice comprehension were not independently tested. The 640×400 inspection is a short viewport, not a claim of a browser zoom test. Contrast estimates below are colour-compositing calculations, not a complete raster or WCAG certification.

## 1. First principles

A person arriving here should be able to answer, without having to decipher the designer's intention:

1. **What is this?** A rule making a figure.
2. **What can I change?** The marked angle or count.
3. **How do I change it?** Drag the handle or adjust the corresponding number.
4. **What happened?** The value and the resulting figure changed together.
5. **Who is in control now?** The visitor, once they engage.
6. **Can I recover?** Undo the adjustment, redraw, or return to the preceding description without ambiguity.

Timelessness follows from stable answers to these questions. It is not achieved by serif type, low decoration, or a fashionable interpretation of minimalism alone.

A neutral tool may have personality. It must not impose its personality as a competing task, judge the user's exploration, or silently substitute its own actions for theirs.

## 2. What is worth preserving

### The same idea in progressively richer descriptions

The explicit pairs, loop, named polygon, and general rule have a genuine conceptual relationship. This is meaningful simplification, not merely a sequence of screens. The figure remaining present while the rule is re-described gives the lesson continuity.

### Direct manipulation tied to the manuscript

Manipulating either the source operand or the figure's handle is an unusually strong foundation. The correspondence thread on attention helps show that these are two surfaces of the same input. Keyboard control, Home/End, and Escape are already represented in the implementation.

### Distinctive but restrained material

Warm ink on a dark field, readable code, fine geometric strokes, and expressive serif copy can survive trends because they reference writing, drawing, and study rather than an arbitrary interface fashion. Do not replace this with generic cards, glass effects, or a dashboard.

### Real restraint at useful boundaries

The homepage lazily starts the runtime on arrival. The code confines touch suppression to controls rather than the whole drawing surface. Reduced-motion styling removes ornamental transitions, and butterflies are suppressed under that preference. Exact source and execution provenance are kept underneath rather than competing with the main encounter.

The distinction between a composed recipe and an executed recipe is especially valuable: a tool should disclose what actually produced its result.

### Generous invisible targets

The grip and footer controls are 44×44 CSS pixels, and source operands enlarge their pointer targets through pseudo-elements. This is practical care. It does not, by itself, make those controls visually discoverable.

## 3. Confirmed defects, in priority order

### P1 — The tour changes a focused value

**Observed:** focusing the turn grip at 90° and making no adjustment left the grip focused while the tour changed the figure to 72° within the 11.5-second observation. Under reduced motion, focusing the source turn operand likewise did not protect it: the value progressed from 90° to 60° during the 16.5-second observation.

`instrument.mjs` postpones progression for gestures and recent activity, but `focusin` only reveals a readout; it does not establish lasting user ownership.

**Why this matters:** a stationary pointer or focused control is not evidence that a person has finished thinking. Reading, comparing, composing a question, and using assistive technology can all involve apparent inactivity. A five-second cooldown is an implementation timer, not consent.

**Recommendation:** let the opening demonstration establish the rule, then leave exploration stable. If an ongoing guided tour is retained, make it explicitly resumable. Focus within the instrument, an open inspector, or a user adjustment must prevent unsolicited progression. After actual manipulation, do not resume automatically merely because the person pauses.

**Acceptance:** focus any interactive operand or the grip and wait at least 20 seconds without changing it. Its value, representation, and relevant instructions remain unchanged. Repeat under reduced motion.

### P1 — Legal geometry clips or trespasses into reading space

**Observed with real keyboard input:** End on the loop count selects 12 sides. At 1280×800, the loop's dodecagon loses its upper edges at the top of the drawing frame. At 390×844 and 320×568, larger figures extend beyond the horizontal frame as well.

The model predicts, and screenshots corroborate, that the 390px loop dodecagon spans approximately x = −51 to 441. In the generalised 390px state, the dodecagon spans approximately x = −77 to 467. It crosses the thesis and recipe rather than occupying a clear drawing lane. At 320×568 the generalised figure fits horizontally but still intersects the heading and source. At 640×400, even the small square and source are crowded into intersecting horizontal territory.

There was **no document horizontal overflow** in these captures. That is not success: clipping hides the overflow while losing the mathematical object.

**Why this matters:** a user cannot reliably inspect closure or compare figures if the interface crops their result. A mathematically permitted state must also be a spatially supported state. Making the default square attractive is insufficient.

**Recommendation:** size and position the drawing from the envelope of the complete supported family, including the loop's fixed seat and the handle/rail footprint. Reserve separate reading and manipulation lanes. Prefer a taller, ordinarily scrollable section when necessary instead of clipping the figure or reducing the recipe to tiny type. Avoid opportunistic scale changes that make comparative geometry misleading.

**Acceptance:** every supported count and representative free angle stays inside the intended drawing bounds and outside text, navigation, and hints, at every tested viewport. Validate native ink as well as model bounds. Explicitly test the extremes, not only milestones 3–6.

### P1 — Availability semantics contradict the action

**Observed:** in the generalised state, the next arrow is labelled “Begin the pursuit” and has `aria-disabled="true"`. Clicking it nevertheless changes the representation to `pursuit` and starts drawing.

`programs.mjs` declares the polygon state retired but also gives it a pursuit transition. `updateEmphasis()` marks the arrow unavailable; the click handler still runs the transition.

**Why this matters:** people using accessibility semantics receive a different promise from people testing the action. Even visually, an inactive-looking next control is not a credible invitation to begin a performance.

**Recommendation:** choose one contract. If pursuit is an available, opt-in continuation, present an enabled, intelligibly labelled control. If it is unavailable, enforce that unavailability. During loading, a queued instruction should be described as queued rather than as a disabled action that secretly accepts input.

**Acceptance:** every control's visible treatment, accessible name, availability state, pointer behaviour, and keyboard behaviour agree.

### P2 — The tour consumes the first-use hint

**Observed:** the angle hint was present before the no-input focused observation and absent afterward, although the visitor had not manipulated the instrument.

`refreshArgument()` marks the active axis touched for both user and autonomous value updates. The same touched state controls whether the handling hint remains visible.

**Why this matters:** the system has mistaken its own demonstration for user learning. Someone watching the example may lose the instruction before they try anything.

**Recommendation:** distinguish user engagement from programmatic changes. Keep first-use guidance until an actual successful user interaction, and leave a quiet way to recover it. A hover, an automated update, or a failed attempt should not permanently consume help.

**Acceptance:** let the tour run without input; guidance remains available. Then adjust a value through keyboard and pointer routes; the hint retires appropriately and remains recoverable.

## 4. Aesthetic signalling: calm is not invisibility

### The handle needs to look graspable before hover

The angle grip has a 44px target but only an approximately 12px blue centre. In the stable square view, that centre looks plausibly like a vertex marker or glow, while the orange turtle-like marker at the other end of the base is more pictorially conspicuous.

The arc and dashed extension explain an angle once someone is already attending. They do not necessarily explain that the blue point can be dragged. A desktop grab cursor cannot help someone who has not located it; touch has no hover at all.

Use one quiet, persistent handle signifier: a restrained ring or similarly unmistakable control shape, with sufficient non-text contrast. Keep the 44px hit area. Do not solve weak affordance with endless pulsing or a larger verbal tutorial.

The operand underline is useful, but it also resembles ordinary emphasis. Give adjustable operands one consistent treatment, distinct from constants. If the loop offers both count and angle, both should look intentionally available, without implying that dashed means disabled.

### Essential information must not be the faintest information

The hunt's resting entries use `#b07a48` at 0.55 opacity. Against the component's nominal dark ground, that composites to about **2.37:1** contrast. Shown entries at 0.7 opacity are about **3.12:1**. Neither reaches the usual 4.5:1 threshold for small normal text. The gradient means the exact ratio varies by location; it does not rescue the underlying strategy.

Source text is substantially stronger, so indiscriminately brightening the whole page would be the wrong correction. Raise legibility for meaningful labels, keep subdued ornament subdued, and inspect focus outlines and all UI boundary marks separately against their actual backgrounds.

Colour may reinforce meaning, but “unfound,” “shown,” “current,” and “found” should not depend on brown, white, and green alone. Existing dots and strikethroughs provide some redundancy; their meanings still need to be understandable without reading the implementation comments.

### Hierarchy should change when the person starts working

The large glowing “differently” establishes the brand effectively. During exploration, it still competes strongly with a much smaller figure and manuscript. The display sentence is the promise; the instrument is the fulfilment.

Preserve expressive typography, but let the working relationship become the perceptual centre after engagement. This may be achieved through composition and less decorative luminance, without introducing another animated state.

## 5. Neutrality and room for expression

The hunt currently distinguishes figures demonstrated by the act from those “earned” by the hand. Its announcement says, “It is yours only if you find it.” Completion introduces green success signals and butterflies.

These are legitimate choices for a guided educational game. They are not neutral by default. They establish an approved set of achievements and judge whether an encounter counts as ownership. A person may instead want to study an open walk, compare a non-milestone angle, or investigate why closure fails.

The design should choose its primary identity:

- **Tool first:** all supported exploration is legitimate; observations are recorded without passing judgement; guidance is optional.
- **Lesson first:** state the goal and offer the guided activity deliberately; allow it to be skipped without losing access to the instrument.

Do not silently alternate between them.

Gathering repeated commands into a loop and collapsing specimens into a name can explain an actual transformation. Those animations have functional justification. Butterfly flight, glitching, and celebratory glow have a weaker claim on attention. Make such rewards optional or absent in the neutral exploration mode.

A bound such as 3–12 sides is sensible for a finite instrument. Make the bound understandable. A fading “circle” at the end of a hunt should not imply a discoverable state that the controls cannot reach. Communicate it as a limiting idea, not an unfinished task.

## 6. Small details that determine whether it feels precise

| Detail | Current observation or risk | Refinement |
|---|---|---|
| Navigation | Unlabelled visible arrows stand for changes of description, not browser history. Names are clearer to assistive technology than to a sighted newcomer. | Add concise visible action names where ambiguity matters; keep arrow positions stable. |
| Redraw | `↻` may look like reset rather than repeat the current recipe. | Distinguish redraw from restoring authored values in visible help and naming. Do not add a reset control unless recovery actually needs it. |
| Exact source | `{ }` is compact but familiar mainly to people who already know code conventions. | Preserve the native details disclosure; make “Source” discoverable without relying on a desktop title tooltip. |
| State orientation | The manuscript communicates the current form to an expert; there is no equally clear visible orientation for a novice. | Consider one small contextual label such as “One rule · loop,” rather than a progress dashboard. |
| Derived value | `360/side = …` fades after a 650ms rest, even though the mathematical reading remains elsewhere. | Keep the explanatory relationship available while focused, or make it recoverable without another adjustment. Do not require a precisely timed glance. |
| Phone hunt | The list scrolls horizontally while its scrollbar is deliberately hidden. | Show a continuation cue if offscreen choices matter. Check that current-item centring does not fight manual inspection. |
| Short viewport | Code shrinks to 11.5px and readings to 10px below 600px height. | Spend additional vertical space before sacrificing essential text legibility. Verify real text enlargement. |
| Phone instruction | At 320px, the drag instruction wraps into four narrow lines beside the footer controls. | Shorten it to an action-first phrase, e.g. “Drag the blue handle. Or slide 90°.” Adapt the referenced value dynamically. |
| Source targets | Two 44px operand targets can overlap as line spacing is compressed. The 320px measurements put count and angle centres about 39px apart vertically. | Test both target edges by hit testing; enlarge line separation or alter the target geometry where regions overlap. |
| Focus | There is a clear outline, but control ownership is not honoured by the tour. | Treat focus as interaction state, not only a paint effect. |
| Chrome | Final `body:has(.fourth-turn)` rules remove navigation backgrounds across the document whenever the component exists. | Review whether the change should instead be limited to the published instrument-visibility state. Offscreen components should not accidentally dictate site-wide chrome. |
| Error and loading | The code contains fallback, retry, Save-Data, and no-JavaScript paths, but those were not re-exercised here. | Independently verify that the recipe remains readable, the failure is intelligible, and retry never discards chosen values unexpectedly. |

These are not invitations to add more furniture. They are places where one clearer mark, word, boundary, or state rule can replace hidden assumptions.

## 7. Minimum refinement sequence

1. **Fix truthful control states and user ownership.** No available action described as disabled; no unsolicited change to a focused or user-owned instrument; automatic changes do not count as user learning.
2. **Fit the entire legal geometry family.** Validate ink, handles, text, and bounds together. Permit ordinary vertical scrolling when the room is insufficient.
3. **Strengthen one coherent manipulation language.** Recognisable handle, legible essential labels, consistent operand treatment, concise touch-first instruction.
4. **Cull evaluative and decorative competition.** Keep transformations that explain mathematics; make the hunt and reward layer a deliberate mode rather than the definition of successful use.
5. **Check comprehension with people.** Ask first-time visitors to change the figure, explain which value they changed, return to a prior state, and continue exploring without coaching. Include keyboard-only and touch users.

The implementation gates establish mechanical consistency. They cannot answer whether someone sees the handle, predicts its effect, or feels free to explore.

## Final criterion

The experience should communicate:

> This is a rule you can handle. Your change has a visible consequence. Nothing changes while you are thinking unless you ask it to.

When that promise survives every supported value, viewport, interaction mode, and failure state, the aesthetic has earned its quietness. Until then, some of that quietness is concealed effort placed on the user.
