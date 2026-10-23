// Fixture artifact — NOT the dojo. Exists only so the vendor command's seven
// checks can be exercised before a real release exists.
export function createHatch(canvas, options = {}) {
    const beats = []
    return {
        async play(program) {
            return { finished: Promise.resolve({ commandCount: 0 }) }
        },
        onLine(fn) { return fn },
        dispose() {},
    }
}
