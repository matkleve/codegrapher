import {
  INTERACTIVE_ROW,
  INTERACTIVE_ROW_LEFT,
} from "@/lib/controlTokens";

/** Shared VS Code–like explorer row density classes. */

export const EXPLORER_X_PAD = "px-2";

export const TREE_ROW = `${INTERACTIVE_ROW} explorer-file-row font-mono`;

export const TREE_FOLDER_ROW = `${INTERACTIVE_ROW_LEFT} py-0 font-medium disabled:cursor-not-allowed`;

export const TREE_SECTION_ROW = `${INTERACTIVE_ROW_LEFT} explorer-section-header py-0 font-medium`;
