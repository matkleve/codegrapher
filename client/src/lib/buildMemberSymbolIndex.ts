import {
  extractContinuationParams,
  extractForOfBinding,
  extractParams,
  recordDestructuringBindings,
  recordLineBinding,
} from "@/lib/extractBindings";
import { localDefId } from "@/lib/localDefIds";
import type { BindingSite, MemberSymbolIndex } from "@/lib/localSymbolLinks";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { templateInterpolationSites } from "@/lib/templateInterpolations";

/**
 * Build def/usage map for one member body — mirrors connectors-proto.html
 * `data-def` / `data-target` wiring for params, locals, and property refs.
 *
 * `startLine` is the 1-based file line of `code`'s first line (the member
 * signature). Keys MUST be file-absolute — `CodeLine` queries this index
 * with its own `lineNumber` prop, which is always `startLine + i`, never a
 * bare in-snippet offset.
 */
export function buildMemberSymbolIndex(
  memberId: string,
  code: string,
  startLine = 1,
): MemberSymbolIndex {
  const usageTargets = new Map<string, string>();
  const defSites = new Map<string, string>();
  const bindingInitOf = new Map<string, BindingSite>();
  const bindingInitSites = new Map<string, string>();
  const lines = code.split("\n");
  const scope = new Map<string, string>();
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNumber = startLine + lineIdx;
    const line = lines[lineIdx] ?? "";
    const trimmed = line.trim();

    if (line.includes("(")) {
      for (const p of extractParams(line, memberId, lineNumber)) {
        scope.set(p.name, p.defId);
        defSites.set(`${lineNumber}:${p.tokenIndex}`, p.defId);
      }
    } else if (lineIdx === 0 || /^\w+\s*\??\s*:/.test(trimmed)) {
      for (const p of extractContinuationParams(line, memberId, lineNumber)) {
        scope.set(p.name, p.defId);
        defSites.set(`${lineNumber}:${p.tokenIndex}`, p.defId);
      }
    }

    const forOf = extractForOfBinding(line, memberId, lineNumber);
    if (forOf) {
      scope.set(forOf.name, forOf.defId);
      defSites.set(`${lineNumber}:${forOf.tokenIndex}`, forOf.defId);
      bindingInitOf.set(forOf.defId, {
        lineNumber,
        tokenIndex: forOf.iterable.tokenIndex,
        token: forOf.iterable.token,
      });
      bindingInitSites.set(
        `${lineNumber}:${forOf.iterable.tokenIndex}`,
        forOf.defId,
      );
    }

    const tokenized = tokenizeLine(line, inBlockComment);
    inBlockComment = tokenized.inBlockComment;
    const tokens = tokenized.tokens;
    recordDestructuringBindings(lineNumber, tokens, memberId, defSites, scope);
    let prev: string | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.kind === "whitespace") continue;

      if (t.kind === "identifier") {
        const siteKey = `${lineNumber}:${i}`;
        if (defSites.has(siteKey)) {
          prev = t.text;
          continue;
        }
        if (prev === "const" || prev === "let") {
          const defId = localDefId(memberId, t.text, lineNumber, "local");
          scope.set(t.text, defId);
          defSites.set(`${lineNumber}:${i}`, defId);
        } else if (prev === ".") {
          usageTargets.set(`${lineNumber}:${i}`, `property::${t.text}`);
        } else if (prev !== ":" && prev !== "function" && prev !== "class" && prev !== "interface") {
          const defId = scope.get(t.text);
          if (defId) usageTargets.set(`${lineNumber}:${i}`, defId);
        }
        prev = t.text;
        continue;
      }

      prev = t.text;
    }

    for (const site of templateInterpolationSites(line)) {
      const defId = scope.get(site.name);
      if (defId) {
        usageTargets.set(`${lineNumber}:${site.tokenIndex}`, defId);
      }
    }

    recordLineBinding(
      lineNumber,
      tokens,
      defSites,
      bindingInitOf,
      bindingInitSites,
    );
  }

  return { usageTargets, defSites, bindingInitOf, bindingInitSites };
}
