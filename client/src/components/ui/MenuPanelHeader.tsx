type MenuPanelHeaderProps = {
  title: string;
  subtitle?: string;
};

export function MenuPanelHeader({ title, subtitle }: MenuPanelHeaderProps) {
  return (
    <div className="border-b border-border px-3 py-2">
      <p className="font-mono text-xs font-semibold text-foreground">{title}</p>
      {subtitle ? (
        <p className="text-2xs leading-none text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
