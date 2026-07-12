import { createPortal } from "react-dom";
import { useLayoutEffect } from "react";
import { LoadStubAnchor } from "@/components/graph/LoadStubAnchor";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { notifyWireTransform } from "@/lib/wireEngine";

/** Off-canvas load targets rendered as floating chips left of the class node. */
export function LoadStubAnchors() {
  const { previewEdges } = useGraphInteraction();
  const loadEdges = previewEdges.filter((edge) => edge.load != null);

  useLayoutEffect(() => {
    if (loadEdges.length > 0) notifyWireTransform();
  }, [loadEdges]);

  if (loadEdges.length === 0) return null;

  return createPortal(
    <>
      {loadEdges.map((edge) => (
        <LoadStubAnchor key={edge.id} edge={edge} />
      ))}
    </>,
    document.body,
  );
}
