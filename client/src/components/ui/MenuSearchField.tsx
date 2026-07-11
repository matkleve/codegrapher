import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type MenuSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
};

export function MenuSearchField({
  value,
  onChange,
  placeholder,
  autoFocus,
}: MenuSearchFieldProps) {
  return (
    <div className="border-b border-border px-3 py-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[var(--control-height-sm)] pl-8 text-xs"
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}
