import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

type VscodeFileIconProps = {
  icon: string;
  className?: string;
  size?: number;
};

export function VscodeFileIcon({ icon, className, size = 16 }: VscodeFileIconProps) {
  return (
    <Icon
      icon={`vscode-icons:${icon}`}
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      aria-hidden
    />
  );
}
