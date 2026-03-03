import type { Meta, StoryObj } from '@storybook/react';
import AgentFlowVisualizer from './AgentFlowVisualizer';
import { INITIAL_GRAPH, CATEGORY_COLORS } from './constants';
import { FlowGraph, ToolNode } from './types';

const meta = {
  title: 'Grad Plan/Architecture/AgentFlowVisualizer',
  component: AgentFlowVisualizer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AgentFlowVisualizer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default Story ──────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    autoPlay: false,
  },
};

// ─── Animating Flow Story ───────────────────────────────────────────────────────

export const AnimatingFlow: Story = {
  args: {
    autoPlay: true,
  },
};

// ─── With Hypothetical Tool Story ───────────────────────────────────────────────

const hypotheticalNode: ToolNode = {
  id: 'prereq_validator',
  name: 'Prerequisite Validator',
  toolType: 'prerequisite_validator',
  category: 'hypothetical',
  color: CATEGORY_COLORS.hypothetical,
  position: { x: 580, y: 40 + 160 * 3 },
  description:
    'AI-powered validation of course prerequisites and co-requisites before finalizing the schedule.',
  inputs: [
    {
      id: 'pv-in-courses',
      name: 'selectedCourses',
      type: 'CourseSelection[]',
      required: true,
    },
    {
      id: 'pv-in-transcript',
      name: 'transcriptCourses',
      type: 'TranscriptCourse[]',
    },
  ],
  outputs: [
    {
      id: 'pv-out-valid',
      name: 'isValid',
      type: 'boolean',
    },
    {
      id: 'pv-out-warnings',
      name: 'prerequisiteWarnings',
      type: 'Warning[]',
    },
    {
      id: 'pv-out-suggestions',
      name: 'alternativeSuggestions',
      type: 'Course[]',
    },
  ],
};

const graphWithHypothetical: FlowGraph = {
  ...INITIAL_GRAPH,
  nodes: [...INITIAL_GRAPH.nodes, hypotheticalNode],
  edges: [
    ...INITIAL_GRAPH.edges,
    {
      id: 'e-course-prereq',
      sourceNodeId: 'course_selection',
      sourcePortId: 'cs-out-courses',
      targetNodeId: 'prereq_validator',
      targetPortId: 'pv-in-courses',
      isConditional: true,
      label: 'validate prerequisites',
      animationDelay: 1400,
    },
    {
      id: 'e-prereq-credit',
      sourceNodeId: 'prereq_validator',
      sourcePortId: 'pv-out-valid',
      targetNodeId: 'credit_distribution',
      targetPortId: 'cd-in-totalCredits',
      isConditional: true,
      animationDelay: 1600,
    },
  ],
};

export const WithHypotheticalTool: Story = {
  args: {
    initialGraph: graphWithHypothetical,
    autoPlay: false,
  },
};

// ─── Empty Canvas Story ─────────────────────────────────────────────────────────

const emptyGraph: FlowGraph = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isAnimating: false,
  activeEdgeIndex: -1,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
};

export const EmptyCanvas: Story = {
  args: {
    initialGraph: emptyGraph,
    autoPlay: false,
  },
};
