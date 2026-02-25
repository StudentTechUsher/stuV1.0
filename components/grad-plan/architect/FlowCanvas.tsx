'use client';

import React, { useMemo } from 'react';
import { ToolNode, ToolEdge } from './types';
import { NODE_WIDTH, NODE_HEIGHT } from './constants';
import FlowEdge from './FlowEdge';

interface FlowCanvasProps {
  nodes: ToolNode[];
  edges: ToolEdge[];
  selectedNodeId: string | null;
  activeEdgeIndex: number;
}

/**
 * Determines if two nodes are in the same vertical column (similar x).
 * If so, edges should route bottom→top. Otherwise, right→left.
 */
function computeEdgePath(source: ToolNode, target: ToolNode): string {
  const sameColumn = Math.abs(source.position.x - target.position.x) < NODE_WIDTH;

  if (sameColumn) {
    // Vertical routing: bottom-center of source → top-center of target
    const x1 = source.position.x + NODE_WIDTH / 2;
    const y1 = source.position.y + NODE_HEIGHT;
    const x2 = target.position.x + NODE_WIDTH / 2;
    const y2 = target.position.y;

    const verticalGap = Math.abs(y2 - y1);
    const controlOffset = Math.max(verticalGap * 0.35, 30);

    return `M ${x1} ${y1} C ${x1} ${y1 + controlOffset}, ${x2} ${y2 - controlOffset}, ${x2} ${y2}`;
  }

  // Horizontal routing: right-center of source → left-center of target
  const sourceRight = source.position.x + NODE_WIDTH > target.position.x;

  let x1: number, y1: number, x2: number, y2: number;

  if (sourceRight) {
    // Source is to the right, connect left side of source to right side of target
    x1 = source.position.x;
    y1 = source.position.y + NODE_HEIGHT / 2;
    x2 = target.position.x + NODE_WIDTH;
    y2 = target.position.y + NODE_HEIGHT / 2;
  } else {
    // Normal: right side of source to left side of target
    x1 = source.position.x + NODE_WIDTH;
    y1 = source.position.y + NODE_HEIGHT / 2;
    x2 = target.position.x;
    y2 = target.position.y + NODE_HEIGHT / 2;
  }

  const horizontalGap = Math.abs(x2 - x1);
  const controlOffset = Math.max(horizontalGap * 0.4, 40);

  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
}

export default function FlowCanvas({
  nodes,
  edges,
  selectedNodeId,
  activeEdgeIndex,
}: FlowCanvasProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, ToolNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const edgePaths = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);

      if (!sourceNode || !targetNode) {
        return { edge, path: '', color: '#555' };
      }

      return {
        edge,
        path: computeEdgePath(sourceNode, targetNode),
        color: sourceNode.color,
      };
    });
  }, [edges, nodeMap]);

  const selectedEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return new Set(
      edges
        .filter(
          (e) => e.sourceNodeId === selectedNodeId || e.targetNodeId === selectedNodeId,
        )
        .map((e) => e.id),
    );
  }, [edges, selectedNodeId]);

  // Compute canvas size to cover all nodes with padding
  const canvasSize = useMemo(() => {
    if (nodes.length === 0) return { width: 1200, height: 900 };
    let maxX = 0;
    let maxY = 0;
    nodes.forEach((node) => {
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
    });
    return { width: maxX + 200, height: maxY + 200 };
  }, [nodes]);

  return (
    <svg
      width={canvasSize.width}
      height={canvasSize.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      {edgePaths.map(({ edge, path, color }, index) => (
        <FlowEdge
          key={edge.id}
          edge={edge}
          path={path}
          color={color}
          isActive={activeEdgeIndex === index}
          isSelected={selectedEdgeIds.has(edge.id)}
        />
      ))}
    </svg>
  );
}
