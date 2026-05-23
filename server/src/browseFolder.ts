import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function runPicker(command: string): string | null {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return null;
    const resolved = path.normalize(output);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
    return null;
  } catch {
    return null;
  }
}

/** Opens a native folder picker (zenity/kdialog). Returns null if cancelled or unavailable. */
export function pickFolderNative(): string | null {
  const home = os.homedir();

  if (process.platform === "linux") {
    return (
      runPicker("zenity --file-selection --directory") ??
      runPicker(`kdialog --getexistingdirectory "${home}"`)
    );
  }

  if (process.platform === "darwin") {
    const script =
      'POSIX path of (choose folder with prompt "Select project folder")';
    return runPicker(`osascript -e '${script}'`);
  }

  if (process.platform === "win32") {
    const script = `
      $f = New-Object -ComObject Shell.Application
      $folder = $f.BrowseForFolder(0, "Select project folder", 0)
      if ($folder -ne $null) { $folder.Self.Path }
    `.trim();
    return runPicker(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`);
  }

  return null;
}
