import data from "../../public/data/glossary.json";

export interface GlossaryEntry {
  id: string;
  term: string;
  aliases?: string[];
  definition: string;
}

interface GlossaryFile {
  version: string;
  terms: GlossaryEntry[];
}

const file = data as GlossaryFile;

// Build a list of (matchString, entry) pairs sorted by length desc so that
// longer terms ("GRADEアプローチ") match before shorter ones ("GRADE").
interface Pattern {
  match: string;
  entry: GlossaryEntry;
}

const patterns: Pattern[] = [];
for (const e of file.terms) {
  patterns.push({ match: e.term, entry: e });
  for (const a of e.aliases ?? []) {
    patterns.push({ match: a, entry: e });
  }
}
patterns.sort((a, b) => b.match.length - a.match.length);

const byId = new Map<string, GlossaryEntry>();
for (const e of file.terms) byId.set(e.id, e);

export function getGlossary(): GlossaryEntry[] {
  return file.terms;
}

export function findEntryById(id: string): GlossaryEntry | undefined {
  return byId.get(id);
}

interface MatchSegment {
  type: "text" | "term";
  text: string;
  entry?: GlossaryEntry;
}

// Split a text string into alternating text / term segments.
// Greedy left-to-right longest match. Returns at least one segment.
export function splitTextByTerms(text: string): MatchSegment[] {
  if (!text) return [{ type: "text", text }];
  const segments: MatchSegment[] = [];
  let i = 0;
  while (i < text.length) {
    let matched: Pattern | null = null;
    for (const p of patterns) {
      if (text.startsWith(p.match, i)) {
        matched = p;
        break;
      }
    }
    if (matched) {
      segments.push({ type: "term", text: matched.match, entry: matched.entry });
      i += matched.match.length;
    } else {
      // accumulate plain text up to the next possible match start
      let j = i + 1;
      while (j < text.length) {
        let any = false;
        for (const p of patterns) {
          if (text.startsWith(p.match, j)) {
            any = true;
            break;
          }
        }
        if (any) break;
        j++;
      }
      const last = segments[segments.length - 1];
      const chunk = text.slice(i, j);
      if (last && last.type === "text") {
        last.text += chunk;
      } else {
        segments.push({ type: "text", text: chunk });
      }
      i = j;
    }
  }
  return segments;
}
