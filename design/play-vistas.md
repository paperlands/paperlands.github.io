# Four small doors — living incantations

## The correction that governs the design

**The code is not behind the play. The code is the thing the child plays with.**

A little word makes something happen. Open that word and find smaller words inside. Change one and the world answers differently. Give your own gesture a name, and carry it elsewhere.

The first proposal separated diagrams from their incantations too far. That storyboard treatment has been replaced, not kept as the intended direction. `design/iterations/16-play-vistas.html` now contains four **live, editable Paperlang studies**, drawn exclusively by the installed interpreter. There is no JavaScript geometry renderer or invented English dialect masquerading as executable source.

These are design probes, not a production learning environment. The homepage, existing gardens, pinned artifact, and dojo codex are unchanged.

## Ancestry, not wallpaper

Read in `/home/putra/dojo/codex/`:

- `fragments/getting_started.org`: the line is the memory of something walking. Show the making, not only its constellation.
- `fragments/the-whirlpool.org`: each dancer knows one small rule; the figure belongs to their relationship. “Who choreographed this?” stays a live question.
- `fragments/magic-word.org`: a name makes a gesture small enough to hold and hand around.
- `fragments/the-endless-chain.org`: a family is grown, not repeatedly typed.
- `fragments/the-wonderland-society.org`: actions can return home before their algebra has a name.
- `fragments/the-looking-glass.org`: the mirror-walk is explicitly unplayed. Do not turn that honest opening into a claim of existing implementation.
- `voices/the-companion.org`: speak beside the walker; picture before name.
- `voices/the-storyteller.org`: let behaviour have character; hold the question open; let every edge be a door. Carroll’s nonsense has exact structure underneath it.
- `child.org` and `play.org`: the world’s actual answer outranks the index and the promises.

From this site: the reversible morphology of `design/code-morphology.md`, the restrained light of `inward-garden-priors.md`, and the child's permitted deviations in `open-garden-README.md`.

Alice supplies permission to argue with a world's arrangements, not playing-card wallpaper. The moving tip can be the protagonist. No face or mascot is necessary: aniconic form can still have legible behaviour.

## One screen, one incantation, one world

Desktop: a manuscript to the left and an unboxed drawing to the right. The child sees a named definition **and the call that invokes it**. Selecting another word opens its real body; it does not replace code with an explanation. Each vista has a few ways to extend the experiment and one question-door into another vista.

Phone: title, drawing, working definition, invocation. At 390 × 844 the smallest encounters should fit without microscopic type. Longer definitions remain readable in a scrollable editor; landscape, enlarged text, small heights, and zoom can scroll naturally. One screen is a compositional target, not a reason to clip the words.

Warm ivory is the visible consequence; ember is the offered change; mineral blue distinguishes a comparison. Light follows the actual interpreter’s source beats. No fake running cursor or cinematic delay pretends to be execution.

The first drawing waits for the child to **say it**. No autoplay or timed unlocking. Source edits are deliberate: change the words, then speak them. A changed spell retires its previous drawing rather than falsely associating old output with new code.

## I. Halfway to anywhere

**The being:** a point that approaches without arriving all at once.

**The first word:** `halfway`.

```paperlang
def halfway vx vy do
  jmpto [[x+vx]/2] [[y+vy]/2]
end

halfway 120 100
```

This is actual tested syntax. Whole-argument brackets matter in the current pin. The coordinates describe the destination; `x` and `y` are the traveller’s current position. `jmpto` changes position without connecting the old and new points by an ink line.

**First touch:** say the word once. Change `120 100` and say it again. Ask where the point will go before speaking.

**Mischief:** open `wonder`; a loop invokes `choose random` and `speck`. Open `choose` and move its three destinations. The equilateral triangle is not privileged. Any non-collinear triangle gives an affine form of the midpoint gasket.

Consecutive `when` blocks in this pin form a first-match chain. `choose` tests increasing upper bounds rather than nesting a middle-range guard that would swallow the high range. This is actual control flow, not three independent `if` statements. The native probe checks that every random choice performs exactly one halfway jump.

**Further in:** open two beginnings. Two native walkers start apart and follow the same explicitly written alternating destinations. The separation shrinks; their histories become harder to distinguish. This is a concrete experiment in forgetting, not a metaphor painted over a finished fractal.

The initial one-jump study also calls `speck`. Its real body is:

```paperlang
def speck do
  fw 1
  jmp -1
end
```

The tiny mark is a one-unit stroke, not a mathematical zero-size dot. Jumping back preserves the halfway position; the marker does not bias the next jump.

**Rabbit hole inside the words:** `wonder → choose → halfway`; `wonder → speck`. A child can descend into any part, alter it, then return to the whole.

**Question-door:** “Can a word make a dance nobody planned?”

**Truth guard:** `random` is not seeded through the inspected host API. Replaying `wonder` can change the choices. The two-beginnings experiment instead uses an explicit shared sequence; it is not a random replay comparison. Finite specks approximate the attractor. Initial points need not lie on the exact attractor.

**Watch:** does the child predict a halfway move, open a word, and make a change of their own?

## II. Nobody wrote the dance

**The being:** four lights, each concerned only with its neighbour.

**The first word:** `follow`.

```paperlang
def follow px py do
  faceto px py
  fw 2
  wait 0.04
end
```

Each light carries this little wish. The enclosing `dance` places four native sibling walkers around a square and assigns each the next walker. The native pursuit produces the trails. Nobody’s individual rule contains a spiral.

**First touch:** a few steps. The child can open `follow`, where direction, movement, and time sit together in five readable lines.

**Mischief:** open `dance`. The expression `[[count+1]//4]` names the next neighbour. Change `+1` to `+3` for the opposite ring direction; `+2` assigns opposite partners. The code—not a “reverse dance” preset icon—is the instrument.

**Further in:** give the dancers more rounds. Stop cancels the run; begin again or return to an earlier source with Back. The finite two-unit steps approach the centre but do not prove exact continuous-time convergence or simultaneous arrival.

**Rabbit hole inside the words:** `dance → follow → faceto / fw / wait`. The enclosing definition remains inspectable. Modulo and computed names are a deeper doorway, not vocabulary the first encounter demands.

**Question-door:** “Could an edge be a door instead?”

**Truth guard:** this is the codex’s cyclic pursuit family, not a rotor-router model. A rotor floor remains a valuable later counterpoint in memory, but is not among the four implemented spells. Cull it for now rather than fake its state with a separate page engine.

**Watch:** can the child point to the individual following and distinguish it from the collective dance?

## III. An edge that opens

**The being:** an ordinary walker encountering an extraordinary connection.

**The first word:** `seam`.

```paperlang
def seam do
  when x > 140 do
    jmpto x-280 y
  end
end
```

`walk` takes an ordinary step, calls `seam`, and waits. The same step can continue through an identified boundary because another small word changes where the next step begins.

**First touch:** walk toward the seam. Its threshold is in the source, not an invisible rule. A future visual instrument should additionally show the paired edge points in context; this source-first probe has no claim of a completed seam UI.

**Mischief:** let the walk cross. The excess distance is preserved by subtracting the patch width, rather than snapping to a hard-coded starting point. No diagonal is drawn across the jump.

**Further in:** the third spelling changes the transport to `jmpto x-280 -y`. The re-entry height is reflected. The horizontal walking direction is unchanged.

**Rabbit hole inside the words:** `walk → seam → when / jmpto`. Change the seam without changing the stepping rule. This is authorship of a connection, not only a line’s appearance.

**Question-door:** “Can you teach a word of your own?”

**Truth guard:** this is a bounded horizontal coordinate-transport experiment, not a general Möbius simulation. It does not yet transport an arbitrary traveller’s full local frame or provide a handedness witness. Identifying one opposing edge pair without a twist suggests a cylinder; joining two untwisted pairs would suggest a torus. Those fuller topological vistas require their own genuine runtime experiments. The current probe claims only what it actually draws.

**Watch:** does changing this one word make the child ask what an edge or neighbour really is? Can they predict the re-entry height?

## IV. A word of your own

**The being:** a child’s bend, made portable by a name.

**First word:** `bend`; then `mim`.

```paperlang
def bend length angle do
  lt angle
  fw [length/[2*cos[angle]]]
  rt [2*angle]
  fw [length/[2*cos[angle]]]
  lt angle
end

bend 240 32
```

This bend preserves its endpoint displacement and returns to the original heading. The trigonometric expression has a job: changing the bend angle should not secretly move the two endpoints. It is visible, not replaced by a falsely simple incantation backed by hidden arithmetic.

**First touch:** change `32`. There is no preferred triangle, leaf, or letter. At zero the bend becomes a straight line. A future direct handle should manipulate this same source value, not a second drawing.

**Mischief:** open `mim`. In each of the two legs, the word calls itself at a smaller length and one fewer remaining level. Zero remaining draws the primitive leg and returns.

```paperlang
mim 240 32 3
```

The name above is an actual call, not a shorthand pasted beside a separately rendered curve. Its complete recursive definition is available in the word strip and in the whole incantation.

**Further in:** invoke it twice with a small turn between calls. The child can change the name in its definition and update the calls accordingly. A name change alone must not be presented as a geometric metamorphosis.

**Rabbit hole inside the words:** `mim → mim → fw`, with a visible decreasing level. This is a world inside a word inside itself, not an endless zoom.

**Question-door:** “Can little words grow a world of their own?”

**Truth guard:** the default angle is 32°. Strictly smaller legs require `|angle| < 60°`. An unrestricted edited program can violate that condition; the probe makes no promise of beautiful or contractive output for every edit. Runtime command and recursion caps are safety limits, not mathematical stopping conditions. The source’s `remaining` condition is the actual stopping rule.

**Watch:** can the child recognize their bend inside the generated family, then wish to carry it elsewhere?

## Morphology of an incantation

Not four picture presets with code beside them. Each should eventually have a reversible relation between these forms:

1. **One concrete act:** the child can predict the next local effect.
2. **A true name:** the definition and call remain visibly connected.
3. **Words inside words:** opening a call reveals its actual body and its dependencies.
4. **One changed ingredient:** the child can distinguish the effect of their change.
5. **Repetition or self-reference:** one understood act is entrusted to a larger rule.
6. **A carried part:** a named gesture is reused without global state leaking into its neighbours.

No token travel should pretend to be program execution. Naming can change the description while leaving the drawing perfectly still; that stillness is evidence.

The current probe implements definition browsing, editable bodies and calls, explicit execution, finite variants, actual beat-linked illumination, undoable source states, and a small session pocket. It does **not** yet implement reversible semantic token choreography, contextual value inspection, full time scrubbing, or a general cross-vista code-transplant operation.

## Learnability beneath the spell

Bret Victor’s *Learnable Programming* is a design constraint, not a badge:

- **Vocabulary:** demonstrate the primitive in context. The probe’s code and working words are real, but its vocabulary labelling is still limited; names alone do not prove understanding.
- **Flow:** actual runtime beats illuminate the visible word body and complete source. Slowly adds real `wait` commands, disclosed in the complete requested source. Stop cancels rather than claiming to pause and resume interpreter state.
- **State:** output and lines are not enough. The existing host does not supply all local values or a call stack; do not invent them from a parallel evaluator.
- **Reacting:** editing the incantation makes a new requested program. An obsolete drawing is retired. Random comparisons are not falsely described as seeded replays.
- **Abstracting:** one understood act before a larger named or repeated behaviour.
- **Recomposition:** kept work retains its definitions and invocation, not only an image.

A child should not need to memorize `fw`, `lt`, or `jmpto` before beginning. The next iteration should give those primitive words concrete demonstrations and allow child-authored aliases through actual `def`, not invent unsupported built-ins such as `forward`.

## Return, keep, begin

Back restores earlier source states, not a time-reversed runtime trajectory. Kept spells are held **for this page visit**, up to eight; at eight the keep control stops accepting more rather than overwriting a child's earlier work. Beginning again is undoable and does not erase the pocket. There is no durable storage, analytics, or claim of synchronized randomness.

Question-doors preserve the current vista’s source in memory and enter another room. Returning restores the earlier source; it does not migrate a traveller or transplant incompatible geometry across algorithms.

The field is never an award for obeying the designer. A degenerate line, altered dance, or failed spell can be the start of a better question. Failures are explicit; no fallback film or imitation drawing claims the interpreter succeeded.

## Runtime boundaries

`16-play-vistas-stage.html` uses the existing same-origin `morphology-stage.mjs` probe boundary. It reads `_data/hatch.yml` and imports the exact installed artifact. That stage provides an isolated viewport for the pin’s window-sized canvas; it is not a ratified production iframe architecture.

The exercised host door remains `createHatch`, `play`, `onLine`, and `dispose`. The source is capped at 15,000 commands and recursion depth 40 by this stage. Edited programs may encounter those caps. Current dojo capabilities and the website’s pinned artifact remain separate questions.

No runtime loads until the visitor explicitly invokes a spell. Reduced-motion visitors do not receive automatic playback; Slowly is disabled. Stop, an edit, a vista change, page exit, or backgrounding an active run disposes it. The next drawing requires another invocation. Geometry comes only from Paperlang.

## Preview and evidence

Serve the repository root rather than `_site`:

```sh
python3 design/probe/serve.py 8810 "$PWD"
```

Open `/design/iterations/16-play-vistas.html`. Direct entries: `#halfway`, `#dance`, `#room`, `#word`.

Native program probes:

```sh
PROBE=play-vistas.mjs bash design/probe/morphology.sh
PROBE=play-vistas-ui.mjs bash design/probe/morphology.sh
```

Browser drawings, navigation, editing, dialogs, undo, kept work, error recovery, source evidence, and responsive composition are checked separately. Screenshots and reports go under `/tmp/play-vistas-evidence/`. A successful interpreter completion is not enough: the first native run exposed malformed whole-argument bracketing through its **wrong drawing**, despite finishing successfully.

The current run passes **26 native assertions across twelve programs** and **53 UI assertions**. The initial encounters fit 1440 × 900 and 390 × 844. These are implementation and composition checks, not evidence of successful teaching.

No probe result establishes child learning. The next human encounter should watch, with appropriate consent, whether an unfamiliar child opens a word, predicts a local consequence, changes something deliberately, returns to an earlier spell, and asks a question we did not write.

## What to build next — and what to cull

Halfway is the first real curiosity test; Dance is the strongest codex inheritance; Word tests whether the child becomes an author. The seam study earns a fuller topological room only after its connections and orientation can be explained through actual execution.

Defer the rotor floor, arbitrary graph editing, crowds, infinite growth, atmospheric asset packs, collectible rewards, and cross-algorithm transplant machinery. Improve **one word’s visible meaning** before multiplying worlds.

The Sacred Yes is not a caption the page announces. It is the fact that the child’s altered word—not the designer’s preferred specimen—can be the next thing the world answers.
