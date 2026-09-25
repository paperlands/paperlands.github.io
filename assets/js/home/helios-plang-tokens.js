/* ==========================================================================
   home/helios-plang-tokens.js — the language's vocabulary, as a word list
   --------------------------------------------------------------------------
   A tokenizer, not a highlighter and not a parser. Given one line of PaperLang
   it returns the line split into tokens and a KIND for each, and nothing else:
   no DOM, no classes, no colours. The page decides what a kind looks like, and
   what to do with the tokens — today it wraps them in spans.

   WHY A WORD LIST IS ACCEPTABLE HERE, AND WHERE IT IS NOT.
     The verbs are the runtime's own command table (assets/js/turtling/commands.js
     at the pinned commit) and the block words are the parser's. Copying them is a
     copy of a language fact, and a list like this drifts when the language grows.
     What keeps it honest: it is one file with no dependencies, the page asserts
     the inks it produces (design/probe/interval.mjs), and the day the dojo
     publishes a tokenizer this module is replaced by an import of it — the shape
     below is deliberately the same shape such a thing would have.

   REMOVING IT: delete this file, its one import in helios-interval.js, and the
   `helios-interval__tok--*` rules in components/helios.css. The driver falls back
   to plain text lines with no other change.

   Usage
     import { tokensOf } from "./helios-plang-tokens.js"
     tokensOf("def ring sides r do")
     // [{ text: "def", kind: "kw" }, { text: " " , kind: null }, …]
   ========================================================================== */

/* The runtime's command table (COMMANDS in turtling/commands.js). */
export const VERBS = [
  "beColour", "bold", "dive", "erase", "faceto", "fill", "fw", "goto", "grid",
  "hd", "hide", "home", "jmp", "jmpto", "label", "limitCommand", "limitMessage",
  "limitRecurse", "lt", "pitch", "roll", "rt", "show", "wait", "yaw", "yield",
];

/* The parser's block words: the six that open or close a body. */
export const BLOCKS = { def: 1, loop: 1, when: 1, as: 1, end: 1, fn: 1 };

/* One pattern, alternation in priority order: a quoted address, a comment, a
   word, a number, the modulo operator, then any single non-space character. */
const TOKEN = /("[^"]*"|'[^']*'|#[^\n]*|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\/\/|[^\s\w])/;

/** The kind of one token. `naming` is true for the token right after def or as:
 *  that token is the name a walk is being given, which is its own fact. */
function kindOf(token, naming) {
  if (token.charAt(0) === "#") return "cmt";
  if (/^["']/.test(token)) return "addr";      /* an address: this language's signature gesture */
  if (BLOCKS[token]) return "kw";
  if (naming) return "def";
  if (VERBS.indexOf(token) !== -1) return "verb";
  if (/^\d/.test(token)) return "num";
  if (/^[A-Za-z_$]/.test(token)) return "name";
  return "op";
}

/** Split one line into `{ text, kind }`, whitespace and all. `kind` is null for
 *  the gaps between tokens, so a caller can reproduce the line exactly. */
export function tokensOf(line) {
  const out = [];
  const re = new RegExp(TOKEN.source, "g");
  let last = 0;
  let naming = false;
  let m;
  while ((m = re.exec(line))) {
    const token = m[0];
    if (!token.length) { re.lastIndex += 1; continue; }
    if (m.index > last) out.push({ text: line.slice(last, m.index), kind: null });
    out.push({ text: token, kind: kindOf(token, naming) });
    naming = token === "def" || token === "as";
    last = m.index + token.length;
  }
  if (last < line.length) out.push({ text: line.slice(last), kind: null });
  return out;
}
