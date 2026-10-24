#!/usr/bin/env node
// Vendor Dojo's producer output; legacy spike pins remain readable.
// node toolchain/vendor.mjs --from-release /path/to/dojo/dist/host --install
// node toolchain/vendor.mjs --check
import { createHash } from "node:crypto"
import { verifyHostRelease, installHostRelease } from './host-release.mjs'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const LIB = join(ROOT, "assets/lib/hatch")
const PIN = join(ROOT, "_data/hatch.yml")
const PAGE = join(ROOT, '_includes/home/fourth-turn.html')
const PIN_SCHEMA = 1

/* Who is in the bundle, and under what licence. The closure check refuses any
   input this table cannot classify: a licence nobody recognised is the failure
   that shipped a 1.1 MB AGPL runtime with no notices at all. */
const COMPONENTS = [
    { name: "three.js r185 (core + module)", licence: "MIT",
      copyright: "Copyright © 2010-2026 Three.js Authors", url: "https://github.com/mrdoob/three.js",
      match: /^assets\/js\/utils\/three(\.core|\.module)\.min\.js$/ },
    { name: "three.js r185 examples/jsm/lines (fat-line addons)", licence: "MIT",
      copyright: "Copyright © 2010-2026 Three.js Authors", url: "https://github.com/mrdoob/three.js/tree/r185/examples/jsm/lines",
      match: /^assets\/js\/utils\/three-addons\// },
    { name: "OrbitControls, three.js r185 examples (threeorbital.js)", licence: "MIT",
      copyright: "Copyright © 2010-2026 Three.js Authors", url: "https://github.com/mrdoob/three.js/blob/r185/examples/jsm/controls/OrbitControls.js",
      match: /^assets\/js\/utils\/threeorbital\.js$/ },
    { name: "troika-three-text + Typr.ts custom build (threetext.js)", licence: "MIT",
      copyright: "Copyright © 2023-prototype, ProtectWise, Inc. and Troika contributors; Typr.ts © Fredrik Lidström",
      url: "https://github.com/protectwise/troika", match: /^assets\/js\/utils\/threetext\.js$/ },
    { name: "the dojo / PaperLang runtime", licence: "AGPL-3.0-only",
      copyright: "Copyright © paperland", url: "https://dojo.paperland.sg",
      match: /^assets\/js\// },
]

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex")
const sha256File = (p) => sha256(readFileSync(p))
const bytes = (p) => statSync(p).size

let failures = 0
const ok = (what, detail = "") => console.log(`ok    ${what}${detail ? "  — " + detail : ""}`)
const bad = (what, detail) => { failures++; console.log(`FAIL  ${what}  — ${detail}`) }
const check = (what, pass, detail = "") => (pass ? ok(what, detail) : bad(what, detail))

function parseArgs(argv) {
    const out = { _: [] }
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a.startsWith("--")) { out[a.slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith("--")) ? argv[++i] : true }
        else out._.push(a)
    }
    return out
}

/* ---- the closure: what is actually inside the artifact ---------------------- */

function closureOf(argv) {
    const metaPath = argv.metafile
    if (!metaPath || !existsSync(metaPath)) return null
    const meta = JSON.parse(readFileSync(metaPath, "utf8"))
    return { path: resolve(metaPath), inputs: Object.keys(meta.inputs).sort() }
}

function classify(inputs) {
    const found = new Map()
    const unknown = []
    for (const i of inputs) {
        const c = COMPONENTS.find((c) => c.match.test(i))
        if (!c) { unknown.push(i); continue }
        found.set(c.name, (found.get(c.name) ?? 0) + 1)
    }
    return { found, unknown }
}

/* Notices are derived from the closure, never written from memory. */
function noticesFor(found, { dojoCommit, artifactSha }) {
    const mit = COMPONENTS.filter((c) => found.has(c.name) && c.licence === "MIT")
    const agpl = COMPONENTS.filter((c) => found.has(c.name) && c.licence === "AGPL-3.0-only")
    const lines = []
    lines.push("THIRD-PARTY NOTICES")
    lines.push("=".repeat(80))
    lines.push("")
    lines.push("This bundle is a single esbuild artifact. It contains code from the")
    lines.push("components listed below. The list is derived from the build's esbuild")
    lines.push("metafile by toolchain/vendor.mjs, not maintained by hand.")
    lines.push("")
    lines.push(`artifact sha256: ${artifactSha}`)
    lines.push("")
    for (const c of mit) {
        lines.push("-".repeat(80))
        lines.push(`${c.name}`)
        lines.push(`  licence   : ${c.licence}`)
        lines.push(`  copyright : ${c.copyright}`)
        lines.push(`  source    : ${c.url}`)
        lines.push(`  inputs    : ${found.get(c.name)} file(s)`)
        lines.push("")
        lines.push("Permission is hereby granted, free of charge, to any person obtaining a")
        lines.push("copy of this software and associated documentation files (the \"Software\"),")
        lines.push("to deal in the Software without restriction, including without limitation")
        lines.push("the rights to use, copy, modify, merge, publish, distribute, sublicense,")
        lines.push("and/or sell copies of the Software, and to permit persons to whom the")
        lines.push("Software is furnished to do so, subject to the following conditions:")
        lines.push("")
        lines.push("The above copyright notice and this permission notice shall be included in")
        lines.push("all copies or substantial portions of the Software.")
        lines.push("")
        lines.push("THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR")
        lines.push("IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,")
        lines.push("FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE")
        lines.push("AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER")
        lines.push("LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING")
        lines.push("FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER")
        lines.push("DEALINGS IN THE SOFTWARE.")
        lines.push("")
    }
    if (agpl.length) {
        lines.push("-".repeat(80))
        for (const c of agpl) lines.push(`${c.name} — ${c.licence} (see LICENSE beside this file)`)
        lines.push("")
        lines.push("This artifact is a build of the dojo runtime and is offered under the GNU")
        lines.push("Affero General Public License v3.0 only. The complete corresponding source")
        lines.push("for this build is the dojo repository at the commit named in the pin:")
        lines.push("")
        lines.push(`  dojo commit: ${dojoCommit}`)
        lines.push(`  source     : ${agpl[0].url}`)
        lines.push("")
        lines.push("The site imports this artifact as an unmodified build output; no dojo file")
        lines.push("has been edited after the build.")
    }
    return lines.join("\n") + "\n"
}


/* ---- the two producer paths ------------------------------------------------ */

function fromRelease(argv) {
    const dir = resolve(argv['from-release'])
    try {
        const release = verifyHostRelease(dir)
        ok('producer release verified', release.manifest.revision)
        ok('closure and source snapshot', `${release.inputs.length} inputs`)
        if (argv.install) {
            const installed = installHostRelease(dir, ROOT)
            ok('installed', installed.name)
        } else console.log('Re-run with --install to replace the pin.')
    } catch (error) { bad('producer release', error.message) }
}

function fromSpike(argv) {
    const artifact = resolve(typeof argv["from-spike"] === "string" ? argv["from-spike"] : (argv._[0] ?? ""))
    console.log(`spike   : ${artifact}`)
    if (!existsSync(artifact)) return bad("artifact present", "not found")
    const dojoCommit = argv["dojo-commit"]
    check("provenance named", !!dojoCommit, `dojo_commit=${dojoCommit ?? "missing"}`)
    if (!dojoCommit) return

    const closure = closureOf(argv)
    check("closure metafile present", !!closure, closure ? `${closure.inputs.length} inputs` : "pass --metafile <meta.json>")
    let found = new Map()
    if (closure) {
        const c = classify(closure.inputs)
        found = c.found
        check("closure fully classified (no unknown licence)", c.unknown.length === 0, c.unknown.slice(0, 3).join(", "))
        for (const [name, n] of found) ok(`  component: ${name}`, `${n} input(s)`)
    }

    const licence = argv.licence ? resolve(argv.licence) : null
    check("licence file given + present", !!licence && existsSync(licence), licence ?? "pass --licence <file>")
    if (failures) return

    const sha = sha256File(artifact)
    const n = bytes(artifact)
    const notices = closure ? noticesFor(found, { dojoCommit, artifactSha: sha }) : "THIRD-PARTY NOTICES\n(closure unknown: no metafile was given)\n"
    ok("artifact", `${basename(artifact)} ${n} B sha256:${sha.slice(0, 16)}`)

    if (argv.install) {
        const name = `hatch-v1.${sha.slice(0, 16)}.mjs`
        const staged = join(LIB, name)
        mkdirSync(LIB, { recursive: true })
        for (const f of readdirSync(LIB)) if (/\.mjs$/.test(f) && f !== name) rmSync(join(LIB, f), { force: true })
        cpSync(artifact, staged)
        cpSync(licence, join(LIB, "LICENSE"))
        writeFileSync(join(LIB, "THIRD_PARTY_NOTICES.txt"), notices)
        const pin = [
            "# Written by toolchain/vendor.mjs --from-spike. A SPIKE PIN, NOT A RELEASE:",
            "# there is no dojo manifest, no host-v1 entry, no tag and no conformance",
            "# fixture behind these bytes. Do not edit by hand — re-run the command.",
            "# Checked by design/probe/hatch.py.",
            `schema: ${PIN_SCHEMA}`,
            `release: false`,
            `host_api: null`,
            `language_revision: null`,
            `dojo_commit: ${dojoCommit}`,
            `artifact: ${name}`,
            `artifact_path: /assets/lib/hatch/${name}`,
            `artifact_sha256: ${sha}`,
            `artifact_bytes: ${n}`,
            `closure_inputs: ${closure ? closure.inputs.length : 0}`,
            `closure_sha256: ${closure ? sha256(closure.inputs.join("\n")) : ""}`,
            `licence: LICENSE`,
            `licence_id: AGPL-3.0-only`,
            `licence_sha256: ${sha256File(licence)}`,
            `notices: THIRD_PARTY_NOTICES.txt`,
            `notices_sha256: ${sha256(notices)}`,
            `vendored_at: ${new Date().toISOString().slice(0, 10)}`,
            "",
        ].join("\n")
        writeFileSync(PIN, pin)
        console.log(`ok    installed  — assets/lib/hatch/${name} + LICENSE + THIRD_PARTY_NOTICES.txt`)
        console.log("ok    pin written — _data/hatch.yml (release: false)")
        console.log("next: python3 design/probe/hatch.py")
    } else {
        console.log("\nspike checks passed. Re-run with --install to write the pin.")
    }
}

/* ---- --check: the installed state, no writes ------------------------------- */

function readPin() {
    if (!existsSync(PIN)) return null
    const out = {}
    for (const line of readFileSync(PIN, "utf8").split("\n")) {
        if (!line || line.startsWith("#")) continue
        const i = line.indexOf(":")
        if (i < 0) continue
        out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "")
    }
    return out
}

function checkInstalled() {
    const pin = readPin()
    check("pin exists", !!pin, PIN)
    if (!pin) return
    check("pin schema", String(pin.schema) === String(PIN_SCHEMA), pin.schema)
    if (pin.producer === 'paperlang-host') {
        try {
            const release = verifyHostRelease(LIB, { hostFile: pin.artifact })
            check('release manifest hash', sha256File(join(LIB, pin.release_manifest)) === pin.release_manifest_sha256)
            check('pin source revision', pin.dojo_revision === release.manifest.revision && pin.dojo_commit === release.manifest.commit)
            check('pin source digest', pin.source_digest === release.manifest.sourceDigest && pin.source_dirty === String(release.manifest.sourceDirty))
        } catch (error) { bad('installed release evidence', error.message) }
    }
    const artifact = join(LIB, pin.artifact)
    check("artifact present", existsSync(artifact), pin.artifact)
    if (existsSync(artifact)) {
        check("artifact sha256 matches pin", sha256File(artifact) === pin.artifact_sha256, sha256File(artifact).slice(0, 16))
        check("artifact bytes match pin", String(bytes(artifact)) === String(pin.artifact_bytes), `${bytes(artifact)}`)
    }
    const licence = join(LIB, pin.licence ?? "LICENSE")
    check("licence present + matches pin", existsSync(licence) && (!pin.licence_sha256 || sha256File(licence) === pin.licence_sha256), pin.licence_id)
    const notices = join(LIB, pin.notices ?? "THIRD_PARTY_NOTICES.txt")
    check("notices present + match pin", existsSync(notices) && (!pin.notices_sha256 || sha256File(notices) === pin.notices_sha256), pin.notices)
    const js = existsSync(LIB) ? readdirSync(LIB).filter((f) => /\.(mjs|js)$/.test(f)) : []
    check("exactly one executable artifact installed", js.length === 1, js.join(", "))
    const page = readFileSync(PAGE, "utf8")
    check("the page templates the pin (no literal path)", page.includes("site.data.hatch.artifact_path"), "site.data.hatch.artifact_path")
    const built = join(ROOT, '_site/index.html')
    if (existsSync(built)) {
        check("the built page imports the pin", readFileSync(built, "utf8").includes(pin.artifact_path), pin.artifact_path)
    } else {
        ok("the built page imports the pin", "no build present — run jekyll build, then hatch.py")
    }
}

const argv = parseArgs(process.argv.slice(2))
console.log(`vendor  : pin schema ${PIN_SCHEMA}`)
if (argv["from-release"]) fromRelease(argv)
else if (argv["from-spike"]) fromSpike(argv)
else if (argv.check) checkInstalled()
else { console.log('Usage: node toolchain/vendor.mjs --from-release <dir> [--install] | --check'); process.exit(0) }

if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1) }
console.log("\nvendor ok")
