'use client';

import React, { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ToolNode, FlowAction, Position } from './types';
import { NODE_WIDTH, NODE_HEIGHT, PORT_RADIUS } from './constants';

interface ToolNodeCardProps {
  node: ToolNode;
  isSelected: boolean;
  isActive: boolean;
  dispatch: React.Dispatch<FlowAction>;
}

const categoryLabels: Record<string, string> = {
  core: 'CORE',
  optional: 'OPTIONAL',
  hypothetical: 'IDEA',
  data: 'DATA',
};

export default function ToolNodeCard({ node, isSelected, isActive, dispatch }: ToolNodeCardProps) {
  const dragOrigin = useRef<{ nodePos: Position; pointerPos: Position } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragOrigin.current = {
        nodePos: { ...node.position },
        pointerPos: { x: e.clientX, y: e.clientY },
      };
    },
    [node.position],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragOrigin.current) return;
      const dx = e.clientX - dragOrigin.current.pointerPos.x;
      const dy = e.clientY - dragOrigin.current.pointerPos.y;
      dispatch({
        type: 'MOVE_NODE',
        nodeId: node.id,
        position: {
          x: dragOrigin.current.nodePos.x + dx,
          y: dragOrigin.current.nodePos.y + dy,
        },
      });
    },
    [dispatch, node.id],
  );

  const handlePointerUp = useCallback(() => {
    dragOrigin.current = null;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!dragOrigin.current) {
        dispatch({ type: 'SELECT_NODE', nodeId: node.id });
      }
    },
    [dispatch, node.id],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.03, boxShadow: `0 8px 24px ${node.color}33` }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        zIndex: isSelected ? 2 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      {/* Card body */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1E1E2E',
          border: `2px solid ${isSelected ? node.color : '#333'}`,
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Active glow */}
        {isActive && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 12,
              border: `2px solid ${node.color}`,
              boxShadow: `0 0 16px ${node.color}88, inset 0 0 16px ${node.color}22`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Category badge */}
        <span
          style={{
            alignSelf: 'flex-start',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: node.color,
            background: `${node.color}18`,
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {categoryLabels[node.category] ?? node.category}
        </span>

        {/* Tool name */}
        <span style={{ fontSize: 14, fontWeight: 600, color: '#E0E0E0' }}>{node.name}</span>

        {/* Port counts */}
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#888', marginTop: 'auto' }}>
          <span>{node.inputs.length} input{node.inputs.length !== 1 ? 's' : ''}</span>
          <span>{node.outputs.length} output{node.outputs.length !== 1 ? 's' : ''}</span>
          {node.isConditional && (
            <span style={{ color: node.color, fontStyle: 'italic' }}>conditional</span>
          )}
        </div>
      </div>

      {/* Input ports (left edge) */}
      {node.inputs.map((port, i) => {
        const spacing = NODE_HEIGHT / (node.inputs.length + 1);
        return (
          <div
            key={port.id}
            title={`${port.name}: ${port.type}`}
            style={{
              position: 'absolute',
              left: -PORT_RADIUS,
              top: spacing * (i + 1) - PORT_RADIUS,
              width: PORT_RADIUS * 2,
              height: PORT_RADIUS * 2,
              borderRadius: '50%',
              background: '#1E1E2E',
              border: `2px solid ${node.color}`,
            }}
          />
        );
      })}

      {/* Output ports (right edge) */}
      {node.outputs.map((port, i) => {
        const spacing = NODE_HEIGHT / (node.outputs.length + 1);
        return (
          <div
            key={port.id}
            title={`${port.name}: ${port.type}`}
            style={{
              position: 'absolute',
              right: -PORT_RADIUS,
              top: spacing * (i + 1) - PORT_RADIUS,
              width: PORT_RADIUS * 2,
              height: PORT_RADIUS * 2,
              borderRadius: '50%',
              background: node.color,
              border: `2px solid ${node.color}`,
            }}
          />
        );
      })}
    </motion.div>
  );
}
