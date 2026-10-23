// The interval page's own contract, on the shared CDP harness.
//
//   PROBE=interval.mjs bash design/probe/run.sh /helios-interval
//   (or any server that resolves Jekyll's pretty permalinks; BASE overrides)
//
// The page hands a canvas and a program to the pinned dojo runtime and kindles
// its source lines from the beat stream. That is five claims, and each one is
// checkable from outside the page:
//
//   1. a successful walk fetches the pinned hatch and NOTHING else — no film, no
//      still — and the walk ends with every line of the verse read;
//   2. at most one line is lit at a time — the page makes exactly one claim that
//      the walk is "here", and a second lit line would make that claim meaningless;
//   2b. a token's ink does not depend on the walk: the tokenizer gives hue, the
//      walk gives light, and if the ignite ever repaints a line the first of those
//      is destroyed exactly when a reader looks hardest;
//   2c. the language's own light lands where the runtime says nothing: a `wait`
//      is struck on every beat (the verse names which rest), a body's `end` is
//      ticked as its opener's pair, and the program's last `end` ends in the
//      afterglow — and none of it moves a token's ink;
//   3. reduced motion fetches the still and never the runtime;
//   4. a hatch that cannot be fetched leaves the still and says so.
//
// What it cannot see: whether the figure is beautiful, or whether the beat lines
// match the program's execution order. The first needs eyes; the second needs the
// dojo's own trace fixture.
import { connect, newPage } from './cdp.mjs';

const ROUTE = process.argv[2] || '/helios-interval';
const BASE = process.env.BASE || 'http://127.0.0.1:8801';

let failures = 0;
const check = (label, pass, detail = '') => {
    console.log(`   ${pass ? 'ok  ' : 'FAIL'} ${label}${detail ? `  — ${detail}` : ''}`);
    if (!pass) failures += 1;
};

const cdp = await connect();
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- motion ----
{
    const page = await newPage(cdp);
    await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await page.goto(BASE + ROUTE, 700);

    /* Poll while it plays: kindling is transient, so the union over time is the
       only honest measure of "which lines ever lit". */
    const lit = new Set();
    let mostLit = 0;   /* the claim "the walk is here" must never be made twice */
    let axes = null;   /* one gesture's ink, lit and unread, sampled mid-walk */
    const deadline = Date.now() + 30000;
    let status = '';
    let restPeak = 0;   /* how far a rest's light was ever driven, 0..1 */
    const restLines = new Set();   /* which lines were struck as rests */
    while (Date.now() < deadline) {
        const seen = await page.evaluate(
            `[...document.querySelectorAll('.${'helios-interval'}__line--lit')].map((e) => e.textContent.trim())`
        );
        for (const t of seen) lit.add(t);
        mostLit = Math.max(mostLit, seen.length);
        /* The rests are transient too, and their light is a number set per
           frame: the peak over the walk, and the line it was set on. */
        const struck = await page.evaluate(`(() => {
            const el = document.querySelector('.helios-interval__line--rest');
            if (!el) return null;
            return { p: Number(getComputedStyle(el).getPropertyValue('--helios-rest')) || 0,
                     text: el.textContent.trim() };
        })()`);
        if (struck) { restPeak = Math.max(restPeak, struck.p); restLines.add(struck.text); }
        if (!axes && seen.length) {
            axes = JSON.parse(await page.evaluate(`JSON.stringify((() => {
                const ch = (el) => {
                    const n = (getComputedStyle(el).color.match(/[0-9.]+/g) || []).map(Number).slice(0, 3);
                    return n.map((v) => Math.round(v * (Math.max(...n) <= 1 ? 255 : 1)));
                };
                const code = (l) => !l.className.includes('--mark') && !l.className.includes('--note');
                const lines = [...document.querySelectorAll('.helios-interval__line')].filter(code);
                const lit = lines.find((l) => l.className.includes('--lit') && l.querySelector('.helios-interval__tok--verb'));
                const unread = lines.find((l) => !l.className.includes('--lit') && !l.className.includes('--done')
                    && l.querySelector('.helios-interval__tok--verb'));
                return { lit: lit ? ch(lit.querySelector('.helios-interval__tok--verb')) : null,
                         unread: unread ? ch(unread.querySelector('.helios-interval__tok--verb')) : null };
            })())`));
        }
        status = await page.evaluate(`document.querySelector('[data-helios-interval-status]').textContent`);
        if (status === 'the finished figure') break;
        await settle(80);
    }

    const info = await page.evaluate(`JSON.stringify({
        canvas: [document.querySelector('[data-helios-interval-stroke]').width,
                 document.querySelector('[data-helios-interval-stroke]').height],
        stillHidden: document.querySelector('[data-helios-interval-still]').hidden,
        spans: document.querySelectorAll('.helios-interval__line').length,
        done: document.querySelectorAll('.helios-interval__line--done').length,
        marks: document.querySelectorAll('.helios-interval__line--mark').length,
        /* The verse is the page's content, not its contract: the checks below
           compare the score against the verse it was given, so the morphology
           and a smoke test both hold. */
        /* NB: this whole object is a template literal, so a backslash is eaten on
           the way in — a bare \s reaches the page as the letter s and the regex
           silently matches nothing. Doubling it is the fix, not decoration. */
        movementLines: [...document.querySelectorAll('.helios-interval__line')]
            .filter((e) => /^#\\s*movement\\s/.test(e.textContent.trim())).length,
        tokenized: [...document.querySelectorAll('.helios-interval__line')]
            .filter((e) => !e.className.includes('--mark') && !e.className.includes('--note') && e.textContent.trim().length)
            .every((e) => !!e.querySelector('.helios-interval__tok')),
        tokens: document.querySelectorAll('.helios-interval__tok').length,
        pairs: [...document.querySelectorAll('.helios-interval__line--pair')].map((e) => e.textContent.trim()),
        /* The afterglow belongs on the program's own last end, so compare its
           line index with the index of the last end instead of trusting a count:
           the contract is *which* end, not how many. */
        afterglowIndex: [...document.querySelectorAll('.helios-interval__line')]
            .findIndex((e) => e.className.includes('--afterglow')),
        lastEndIndex: [...document.querySelectorAll('.helios-interval__line')]
            .reduce((acc, e, i) => (e.textContent.trim() === 'end' ? i : acc), -1),
        afterglow: [...document.querySelectorAll('.helios-interval__line--afterglow')].map((e) => e.textContent.trim()),
        last: [...document.querySelectorAll('.helios-interval__line')].pop().textContent.trim()
    })`);
    const state = JSON.parse(info);
    const reqs = page.requests.filter((u) => /hatch-v1|\.mp4|morphology-/.test(u)).map((u) => u.split('/').pop());
    const errors = page.console.filter((c) => c.type === 'error' || c.type === 'exception');

    check('status settles', status === 'the finished figure', status);
    check('every line of the verse is read', state.done === state.spans, `${state.done}/${state.spans}`);
    check('the page names its movements', state.marks === state.movementLines,
        `${state.marks} mark(s) for ${state.movementLines} \`# movement\` line(s)`);
    check('the canvas is the field', state.canvas[0] > 600 && state.canvas[1] > 400, state.canvas.join('x'));
    check('the hatch was fetched, same origin', reqs.some((r) => /^hatch-v1/.test(r)), reqs.join(', ') || 'none');
    check('no fallback byte on a successful walk', !reqs.some((r) => /\.mp4|morphology-/.test(r)), reqs.join(', ') || 'none');
    check('the still stays hidden', state.stillHidden === true);
    check('lines kindle', lit.size > 0, `${lit.size} distinct lines ever lit`);
    check('at most one line claims to be the current one', mostLit === 1, `worst case ${mostLit} lit at once`);
    check('the score is tokenized', state.tokenized === true, `${state.tokens} tokens, every code line carrying at least one`);
    check('the rests are struck on the beat', restPeak > 0.2, `--helios-rest reached ${restPeak.toFixed(2)}`);
    check('the line struck is the rest', restLines.size > 0 && [...restLines].every((t) => /^wait\b/.test(t)),
        [...restLines].join(' | ') || 'none');
    /* Every tick is an `end`; the verse decides how many bodies there are. The
       old `=== 1` was calibrated to a smoke-test verse with a single loop, not
       to the page's program, and read a faithful score as a failure. */
    check("every body's far end is ticked",
        state.pairs.length > 0 && state.pairs.every((t) => t === 'end'),
        `${state.pairs.length} paired end line(s)`);
    check('the last end keeps the afterglow',
        state.afterglow.length === 1 && state.afterglow[0] === 'end' && state.afterglowIndex === state.lastEndIndex,
        `afterglow ${JSON.stringify(state.afterglow)} at line ${state.afterglowIndex}; last end at line ${state.lastEndIndex}`);
    check('the walk changes the light, not the ink',
        !!axes && !!axes.lit && !!axes.unread && String(axes.lit) === String(axes.unread),
        axes ? `a gesture is ${JSON.stringify(axes.lit)} lit, ${JSON.stringify(axes.unread)} unread` : 'no lit moment sampled');
    const inks = await page.evaluate(`JSON.stringify((() => {
        const ch = (sel) => { const el = document.querySelector(sel); if (!el) return null;
            const n = (getComputedStyle(el).color.match(/[0-9.]+/g) || []).map(Number).slice(0, 3);
            return n.map((v) => Math.round(v * (Math.max(...n) <= 1 ? 255 : 1))); };
        const alpha = (sel) => { const el = document.querySelector(sel); if (!el) return null;
            return getComputedStyle(el).color; };
        return { verb: ch('.helios-interval__tok--verb'), name: ch('.helios-interval__tok--name'),
                 num: ch('.helios-interval__tok--num'),
                 all: ['verb','kw','def','addr','cmt','name','num','op'].map((k) => alpha('.helios-interval__tok--' + k)) };
    })())`);
    const ink = JSON.parse(inks);
    const translucent = (ink.all || []).filter((c) => c && /\/|,\s*0?\.\d+\)$/.test(c));
    check('the ink says what a thing is: gestures warm',
        !!ink.verb && ink.verb[0] > ink.verb[1] && ink.verb[1] > ink.verb[2], JSON.stringify(ink.verb));
    check('the ink says what a thing is: names cool',
        !ink.name || ink.name[2] >= ink.name[0],
        ink.name ? JSON.stringify(ink.name) : 'the verse has no names');
    check('no kind leans on the light axis (every ink is solid)',
        !!translucent && translucent.length === 0, translucent && translucent.length ? translucent.join(', ') : 'all solid');
    check('a number is darker than a name, by colour and not by opacity',
        !ink.name || !ink.num || (ink.num[0] + ink.num[1] + ink.num[2]) < (ink.name[0] + ink.name[1] + ink.name[2]),
        `num ${JSON.stringify(ink.num)} vs name ${JSON.stringify(ink.name)}`);
    check('no console errors', errors.length === 0, errors.map((e) => e.text.slice(0, 80)).join(' | '));
}

// -------------------------------------------------------- reduced motion ----
{
    const page = await newPage(cdp);
    await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.goto(BASE + ROUTE, 2500);
    const state = JSON.parse(await page.evaluate(`JSON.stringify({
        canvasHidden: document.querySelector('[data-helios-interval-stroke]').hidden,
        stillHidden: document.querySelector('[data-helios-interval-still]').hidden,
        status: document.querySelector('[data-helios-interval-status]').textContent
    })`));
    const reqs = page.requests.filter((u) => /hatch-v1|\.mp4|morphology-/.test(u)).map((u) => u.split('/').pop());
    check('reduced: the runtime is never fetched', !reqs.some((r) => /^hatch-v1/.test(r)), reqs.join(', ') || 'none');
    check('reduced: the still is fetched and shown', state.stillHidden === false && reqs.some((r) => /morphology-/.test(r)), reqs.join(', '));
    check('reduced: the canvas steps aside', state.canvasHidden === true);
    check('reduced: the score is still the finished figure', state.status === 'the finished figure', state.status);
}

// ---------------------------------------------------------------- failure ---
{
    const page = await newPage(cdp);
    await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await page.s('Network.setBlockedURLs', { urls: ['*hatch-v1*'] });
    await page.goto(BASE + ROUTE, 3000);
    const state = JSON.parse(await page.evaluate(`JSON.stringify({
        canvasHidden: document.querySelector('[data-helios-interval-stroke]').hidden,
        stillHidden: document.querySelector('[data-helios-interval-still]').hidden,
        status: document.querySelector('[data-helios-interval-status]').textContent
    })`));
    check('failure: the page says so', /^fell back/.test(state.status), state.status);
    check('failure: the still stands in', state.canvasHidden === true && state.stillHidden === false);
}

console.log(failures ? `\ninterval page: ${failures} check(s) failed` : '\ninterval page holds');
cdp.close();
process.exit(failures ? 1 : 0);
