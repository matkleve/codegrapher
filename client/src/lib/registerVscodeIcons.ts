import { addCollection } from "@iconify/react";
import vscodeIcons from "@iconify-json/vscode-icons/icons.json";

let registered = false;

export function registerVscodeIcons(): void {
  if (registered) return;
  addCollection(vscodeIcons);
  registered = true;
}
