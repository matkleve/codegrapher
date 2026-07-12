import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { TokenConnectionMenuPanel } from "@/components/code/TokenConnectionMenuPanel";

export function TokenConnectionMenu() {
  const { connectionMenu, clearConnectionMenu } = useGraphInteraction();

  if (!connectionMenu) return null;

  return (
    <TokenConnectionMenuPanel
      menu={connectionMenu}
      onClose={clearConnectionMenu}
    />
  );
}
