// Graph types for the Agentic Flow Visualizer

export interface ToolPort {
  id: string;
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export type NodeCategory = 'core' | 'optional' | 'hypothetical' | 'data';

export interface ToolNode {
  id: string;
  name: string;
  toolType: string;
  category: NodeCategory;
  inputs: ToolPort[];
  outputs: ToolPort[];
  position: Position;
  color: string;
  description?: string;
  isConditional?: boolean;
}

export interface ToolEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  label?: string;
  isConditional?: boolean;
  animationDelay?: number;
}

export interface FlowGraph {
  nodes: ToolNode[];
  edges: ToolEdge[];
  selectedNodeId: string | null;
  isAnimating: boolean;
  activeEdgeIndex: number;
  zoom: number;
  panOffset: Position;
}

export type FlowAction =
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'MOVE_NODE'; nodeId: string; position: Position }
  | { type: 'ADD_NODE'; node: ToolNode }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'UPDATE_NODE'; nodeId: string; updates: Partial<Omit<ToolNode, 'id'>> }
  | { type: 'ADD_EDGE'; edge: ToolEdge }
  | { type: 'REMOVE_EDGE'; edgeId: string }
  | { type: 'PLAY_ANIMATION' }
  | { type: 'STEP_ANIMATION' }
  | { type: 'RESET_ANIMATION' }
  | { type: 'RESET_GRAPH'; graph: FlowGraph };
