# retired probes — the fourth turn, before the four descriptions

These are the probes of the earlier shapes of the study, kept for the record rather than for
running. Each one asserts a design that no longer exists, so each one now fails on purpose:

| retired | what it was for | why it retired |
|---|---|---|
| `fourth-turn.mjs` | Phase 0: the native proof against the current pin — vocabulary, numeric semantics, polygon geometry, siblings, pursuit, colour, heads, lifecycle, native X | the vocabulary and geometry questions live in `fourth-turn-gate.mjs`, which measures the recipes the page actually runs rather than re-typed ones; pursuit and native X were dropped from the study's scope |
| `fourth-turn-phase1.mjs`, `-phase2.mjs` | the pairs, their gathering into a loop, and the loop's naming as `square` | the naming is now `polygon`, and it is earned by the series the loop play keeps; the loop/gather behaviour is measured in `fourth-turn-act.mjs` |
| `fourth-turn-phase3.mjs`, `-phase3-gate.mjs`, `-phase4.mjs` | `def square len do`, the length instrument, and the count-as-instrument generalisation | the length is no longer offered to the hand and the count is read off the angle, so both instruments are gone; the gate's measurements (placement, footprint, side-4 identity, angle unit) survive in `fourth-turn-gate.mjs` |
| `fourth-turn-refinement.mjs` | the five-stop shared instrument on the built homepage | superseded by `fourth-turn-act.mjs`, which measures the four descriptions, the series, the collapse and the generalisation |
| `fourth-turn-priors.mjs`, `-x.mjs`, `-successor.mjs`, `-order.mjs`, `-smoke.mjs`, `-labels.mjs` | Phase 0's side questions: the operator's own snippets, the native reactive point, `fn` vs `let` successors, spawn ordering, a quick vocabulary pass, numeric successor labels | the study settled on a finite, replayable drawing rather than a pursuit or a native-X organism |
| `fourth-turn-canvas-diagnose.mjs`, `-canvas-read.mjs`, `-instrument-diagnose.mjs`, `-thread-diagnose.mjs` | one-off investigations: why a static capture is blank, how the instrument's SVG is (mis)placed, where the thread routes | the first answered a question the gate now documents where it depends on it (screencast frames, not page screenshots); the others diagnosed layouts that have since been rebuilt |
| `fourth-turn-bfcache.mjs` | the resume after `pagehide`/`pageshow` | the act's own probe exercises leaving and returning, and the disclosure that returning is a fresh run |

They still need the same runner and the same repository root:

```sh
PROBE=retired/fourth-turn-phase4.mjs bash design/probe/fourth-turn.sh
```

The phase documents in `design/iterations/` name these files in their reproduction commands, and
their reports and screenshots stay in that folder: the history is the documents and the
evidence, not a probe that has to keep passing.
