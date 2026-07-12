import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";

type GraphNodeContextMenuProps = {
  x: number;
  y: number;
  onFindPath: () => void;
};

export function GraphNodeContextMenu({ x, y, onFindPath }: GraphNodeContextMenuProps) {
  return (
    <div
      className="pointer-events-auto fixed z-50 min-w-40 shadow-lg"
      style={{ left: x, top: y }}
    >
      <Container className="p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={onFindPath}
        >
          Find path to…
        </Button>
      </Container>
    </div>
  );
}
