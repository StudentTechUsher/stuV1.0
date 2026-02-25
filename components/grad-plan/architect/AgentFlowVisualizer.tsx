'use client';

import React, { useReducer, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FlowGraph, FlowAction } from './types';
import { INITIAL_GRAPH } from './constants';
import FlowCanvas from './FlowCanvas';
import ToolNodeCard from './ToolNodeCard';
import ToolDetailPanel from './ToolDetailPanel';
import FlowControls from './FlowControls';

export interface AgentFlowVisualizerProps {
  autoPlay?: boolean;
  initialGraph?: FlowGraph;
}

// ─── Reducer Function ───────────────────────────────────────────────────────────

function flowGraphReducer(state: FlowGraph, action: FlowAction): FlowGraph {
  switch (action.type) {
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId };

    case 'MOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId ? { ...node, position: action.position } : node,
        ),
      };

    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.node],
      };

    case 'REMOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== action.nodeId),
        edges: state.edges.filter(
          (edge) => edge.sourceNodeId !== action.nodeId && edge.targetNodeId !== action.nodeId,
        ),
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      };

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId ? { ...node, ...action.updates } : node,
        ),
      };

    case 'ADD_EDGE':
      return {
        ...state,
        edges: [...state.edges, action.edge],
      };

    case 'REMOVE_EDGE':
      return {
        ...state,
        edges: state.edges.filter((edge) => edge.id !== action.edgeId),
      };

    case 'PLAY_ANIMATION':
      return {
        ...state,
        isAnimating: true,
        activeEdgeIndex: 0,
      };

    case 'STEP_ANIMATION': {
      const nextIndex = state.activeEdgeIndex < state.edges.length - 1 ? state.activeEdgeIndex + 1 : 0;
      return {
        ...state,
        activeEdgeIndex: nextIndex,
      };
    }

    case 'RESET_ANIMATION':
      return {
        ...state,
        isAnimating: false,
        activeEdgeIndex: -1,
      };

    case 'RESET_GRAPH':
      return action.graph;

    default:
      return state;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AgentFlowVisualizer({
  autoPlay = false,
  initialGraph = INITIAL_GRAPH,
}: AgentFlowVisualizerProps) {
  const [state, dispatch] = useReducer(flowGraphReducer, initialGraph);

  // Auto-advance animation when playing
  React.useEffect(() => {
    if (!state.isAnimating) return;

    const timer = setTimeout(() => {
      if (state.activeEdgeIndex < state.edges.length - 1) {
        dispatch({ type: 'STEP_ANIMATION' });
      } else {
        dispatch({ type: 'RESET_ANIMATION' });
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [state.isAnimating, state.activeEdgeIndex, state.edges.length]);

  // Auto-play on mount
  React.useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        dispatch({ type: 'PLAY_ANIMATION' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay]);

  // Deselect node when clicking canvas background
  const handleCanvasClick = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', nodeId: null });
  }, []);

  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId) ?? null;

  // Determine which nodes are active during animation
  const activeNodeIds = new Set<string>();
  if (state.activeEdgeIndex >= 0 && state.activeEdgeIndex < state.edges.length) {
    const activeEdge = state.edges[state.activeEdgeIndex];
    activeNodeIds.add(activeEdge.sourceNodeId);
    activeNodeIds.add(activeEdge.targetNodeId);
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#0F0F17',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Fixed toolbar at top */}
      <FlowControls
        isAnimating={state.isAnimating}
        initialGraph={initialGraph}
        dispatch={dispatch}
      />

      {/* Scrollable canvas */}
      <div
        onClick={handleCanvasClick}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Inner canvas with enough room for all nodes */}
        <div
          style={{
            position: 'relative',
            minWidth: 1000,
            minHeight: 2200,
            padding: 20,
          }}
        >
          {/* SVG Edge Canvas */}
          <FlowCanvas
            nodes={state.nodes}
            edges={state.edges}
            selectedNodeId={state.selectedNodeId}
            activeEdgeIndex={state.activeEdgeIndex}
          />

          {/* Tool Node Cards */}
          <AnimatePresence>
            {state.nodes.map((node) => (
              <ToolNodeCard
                key={node.id}
                node={node}
                isSelected={node.id === state.selectedNodeId}
                isActive={activeNodeIds.has(node.id)}
                dispatch={dispatch}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Panel */}
      <ToolDetailPanel node={selectedNode} allNodes={state.nodes} dispatch={dispatch} />
    </div>
  );
}
