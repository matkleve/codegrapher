const EXTENSION_SUFFIXES = [
  ".component.tsx",
  ".component.ts",
  ".service.ts",
  ".module.ts",
  ".resolver.ts",
  ".guard.ts",
  ".pipe.ts",
  ".directive.ts",
  ".spec.tsx",
  ".spec.ts",
  ".test.tsx",
  ".test.ts",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
] as const;

export function getFileExtensionLabel(filePath: string): string {
  const lower = filePath.toLowerCase();
  for (const ext of EXTENSION_SUFFIXES) {
    if (lower.endsWith(ext)) return ext;
  }
  const dot = filePath.lastIndexOf(".");
  return dot >= 0 ? filePath.slice(dot) : "";
}

export type FileTypeChipStyle = {
  vscodeIcon: string;
  extension: string;
  /** Tailwind classes for the pill (background, border, label text). */
  pillClass: string;
};

const TS_PILL =
  "border-[#3178c6]/45 bg-[#3178c6]/15 text-[#9cdcfe]";
const REACT_PILL =
  "border-[#61dafb]/45 bg-[#61dafb]/15 text-[#b3ecff]";
const ANGULAR_PILL =
  "border-[#dd0031]/45 bg-[#dd0031]/15 text-[#f5a3b3]";
const TEST_PILL =
  "border-amber-500/45 bg-amber-500/15 text-amber-200";
const DEFAULT_PILL =
  "border-border bg-muted text-muted-foreground";

export function getFileTypeChipStyle(filePath: string): FileTypeChipStyle {
  const lower = filePath.toLowerCase();
  const extension = getFileExtensionLabel(filePath);

  if (lower.endsWith(".component.ts") || lower.endsWith(".component.tsx")) {
    return {
      vscodeIcon: "file-type-ng-component-ts",
      extension,
      pillClass: ANGULAR_PILL,
    };
  }
  if (lower.endsWith(".service.ts")) {
    return {
      vscodeIcon: "file-type-ng-service-ts",
      extension,
      pillClass: ANGULAR_PILL,
    };
  }
  if (lower.endsWith(".module.ts")) {
    return {
      vscodeIcon: "file-type-ng-module-ts",
      extension,
      pillClass: ANGULAR_PILL,
    };
  }
  if (lower.endsWith(".guard.ts")) {
    return {
      vscodeIcon: "file-type-ng-guard-ts",
      extension,
      pillClass: ANGULAR_PILL,
    };
  }
  if (lower.endsWith(".pipe.ts")) {
    return {
      vscodeIcon: "file-type-ng-pipe-ts",
      extension,
      pillClass: ANGULAR_PILL,
    };
  }
  if (lower.endsWith(".directive.ts")) {
    return {
      vscodeIcon: "file-type-ng-directive-ts",
      extension,
      pillClass: ANGULAR_PILL,
    };
  }
  if (
    lower.endsWith(".spec.ts") ||
    lower.endsWith(".spec.tsx") ||
    lower.endsWith(".test.ts") ||
    lower.endsWith(".test.tsx")
  ) {
    return {
      vscodeIcon: "file-type-testts",
      extension,
      pillClass: TEST_PILL,
    };
  }
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
    return {
      vscodeIcon: "file-type-reactts",
      extension,
      pillClass: REACT_PILL,
    };
  }
  if (lower.endsWith(".ts") || lower.endsWith(".js")) {
    return {
      vscodeIcon: "file-type-typescript-official",
      extension,
      pillClass: TS_PILL,
    };
  }

  return {
    vscodeIcon: "default-file",
    extension: extension || ".file",
    pillClass: DEFAULT_PILL,
  };
}
