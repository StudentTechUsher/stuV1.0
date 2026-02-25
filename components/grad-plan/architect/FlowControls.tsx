'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Play, SkipForward, RotateCcw, Trash2 } from 'lucide-react';
import { FlowAction, FlowGraph, ToolNode } from './types';
import { CATEGORY_COLORS } from './constants';

interface FlowControlsProps {
  isAnimating: boolean;
  initialGraph: FlowGraph;
  dispatch: React.Dispatch<FlowAction>;
}

export default function FlowControls({ isAnimating, initialGraph, dispatch }: FlowControlsProps) {
  const [showAddToolPopover, setShowAddToolPopover] = useState(false);
  const [newToolName, setNewToolName] = useState('');

  const handlePlay = useCallback(() => {
    dispatch({ type: 'PLAY_ANIMATION' });
  }, [dispatch]);

  const handleStep = useCallback(() => {
    dispatch({ type: 'STEP_ANIMATION' });
  }, [dispatch]);

  const handleResetAnimation = useCallback(() => {
    dispatch({ type: 'RESET_ANIMATION' });
  }, [dispatch]);

  const handleResetGraph = useCallback(() => {
    if (confirm('Reset graph to initial state? This will discard all changes.')) {
      dispatch({ type: 'RESET_GRAPH', graph: initialGraph });
    }
  }, [dispatch, initialGraph]);

  const handleAddTool = useCallback(() => {
    if (!newToolName.trim()) return;

    const newNode: ToolNode = {
      id: `hypo-${Date.now()}`,
      name: newToolName.trim(),
      toolType: newToolName.toLowerCase().replace(/\s+/g, '_'),
      category: 'hypothetical',
      color: CATEGORY_COLORS.hypothetical,
      position: { x: 600, y: 200 },
      inputs: [
        {
          id: `hypo-${Date.now()}-in-1`,
          name: 'input',
          type: 'unknown',
        },
      ],
      outputs: [
        {
          id: `hypo-${Date.now()}-out-1`,
          name: 'output',
          type: 'unknown',
        },
      ],
      description: 'Hypothetical tool for brainstorming',
    };

    dispatch({ type: 'ADD_NODE', node: newNode });
    setNewToolName('');
    setShowAddToolPopover(false);
  }, [newToolName, dispatch]);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        background: '#1A1A24',
        padding: '12px 20px',
        borderBottom: '1px solid #333',
        justifyContent: 'center',
        flexShrink: 0,
        zIndex: 5,
      }}
    >
      {/* Add Tool */}
      <div style={{ position: 'relative' }}>
        <ControlButton
          icon={<Plus size={18} />}
          label="Add Tool"
          onClick={() => setShowAddToolPopover(!showAddToolPopover)}
          color="#A855F7"
        />
        {showAddToolPopover && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 8,
              background: '#1E1E2E',
              border: '1px solid #444',
              borderRadius: 8,
              padding: 16,
              minWidth: 240,
              boxShadow: '0 8px 24px #00000088',
            }}
          >
            <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 6 }}>
              Tool Name
            </label>
            <input
              type="text"
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTool()}
              placeholder="e.g., Prerequisite Validator"
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#252535',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#E0E0E0',
                fontSize: 13,
                marginBottom: 10,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddToolPopover(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #555',
                  color: '#999',
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTool}
                disabled={!newToolName.trim()}
                style={{
                  background: '#A855F7',
                  border: 'none',
                  color: '#FFF',
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: newToolName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                  opacity: newToolName.trim() ? 1 : 0.5,
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Play */}
      <ControlButton
        icon={<Play size={18} />}
        label="Play"
        onClick={handlePlay}
        disabled={isAnimating}
        color="#37DBC3"
      />

      {/* Step */}
      <ControlButton
        icon={<SkipForward size={18} />}
        label="Step"
        onClick={handleStep}
        disabled={isAnimating}
        color="#37DBC3"
      />

      {/* Reset Animation */}
      <ControlButton
        icon={<RotateCcw size={18} />}
        label="Reset Anim"
        onClick={handleResetAnimation}
        color="#F59E0B"
      />

      <Divider />

      {/* Reset Graph */}
      <ControlButton
        icon={<Trash2 size={18} />}
        label="Reset Graph"
        onClick={handleResetGraph}
        color="#EF4444"
      />
    </div>
  );
}

// ─── Control Button Subcomponent ────────────────────────────────────────────────

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}

function ControlButton({ icon, label, onClick, disabled = false, color }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        background: 'transparent',
        border: `1px solid ${disabled ? '#444' : color}`,
        color: disabled ? '#666' : color,
        padding: '8px 14px',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        transition: 'all 0.2s',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = `${color}22`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Divider ────────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ width: 1, height: 32, background: '#333' }} />;
}
