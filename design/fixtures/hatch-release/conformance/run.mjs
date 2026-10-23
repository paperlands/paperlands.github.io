// Fixture conformance runner: the manifest must name the artifact, and the
// artifact must export the one factory the host contract promises.
import { readFileSync } from "node:fs"
const manifest = JSON.parse(readFileSync(new URL("../host-v1.manifest.json", import.meta.url), "utf8"))
const mod = await import(new URL("../" + manifest.artifact.file, import.meta.url))
if (typeof mod.createHatch !== "function") { console.error("no createHatch"); process.exit(1) }
const score = JSON.parse(readFileSync(new URL("./beat-score.json", import.meta.url), "utf8"))
if (!Array.isArray(score.expected) || !score.expected.length) { console.error("empty beat score"); process.exit(1) }
console.log("conformance ok:", manifest.artifact.file, "beat score", score.expected.length, "beats")
