/** Client-side relative import resolution (mirrors server resolveImportPath heuristics). */
export function resolveClientImportPath(
  fromFile: string,
  quotedSpecifier: string,
): string {
  const spec = quotedSpecifier.replace(/^['"]|['"]$/g, "");
  if (!spec.startsWith(".")) return spec;

  const normalized = fromFile.replace(/\\/g, "/");
  const dir = normalized.includes("/")
    ? normalized.slice(0, normalized.lastIndexOf("/"))
    : "";

  const segments = spec.split("/");
  const parts = dir ? dir.split("/") : [];
  for (const segment of segments) {
    if (segment === "." || segment === "") continue;
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }

  const joined = parts.join("/");
  if (/\.tsx?$/.test(joined)) return joined;
  // Prefer .ts; server resolveImportPath also tries .tsx
  return `${joined}.ts`;
}

/** Ensure load targets use an absolute path when the source file is absolute. */
export function normalizeLoadFilePath(
  sourceFilePath: string,
  targetPath: string,
): string {
  const normalizedSource = sourceFilePath.replace(/\\/g, "/");
  const normalizedTarget = targetPath.replace(/\\/g, "/");
  if (normalizedTarget.startsWith("/")) return normalizedTarget;
  if (!normalizedSource.startsWith("/")) return normalizedTarget;
  const dir = normalizedSource.includes("/")
    ? normalizedSource.slice(0, normalizedSource.lastIndexOf("/"))
    : "";
  return dir ? `${dir}/${normalizedTarget.replace(/^\.\//, "")}` : normalizedTarget;
}

export function isRelativeImportSpecifier(text: string): boolean {
  const spec = text.replace(/^['"]|['"]$/g, "");
  return spec.startsWith(".");
}
