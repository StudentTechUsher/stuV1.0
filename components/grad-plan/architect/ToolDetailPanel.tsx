'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Link } from 'lucide-react';
import { ToolNode, FlowAction, ToolPort, NodeCategory } from './types';
import { CATEGORY_COLORS } from './constants';

interface ToolDetailPanelProps {
  node: ToolNode | null;
  allNodes: ToolNode[];
  dispatch: React.Dispatch<FlowAction>;
}

export default function ToolDetailPanel({ node, allNodes, dispatch }: ToolDetailPanelProps) {
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');

  const handleClose = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', nodeId: null });
  }, [dispatch]);

  const handleNameChange = useCallback(
    (value: string) => {
      if (!node) return;
      setLocalName(value);
      dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { name: value } });
    },
    [node, dispatch],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      if (!node) return;
      setLocalDescription(value);
      dispatch({ type: 'UPDATE_NODE', nodeId: node.id, updates: { description: value } });
    },
    [node, dispatch],
  );

  const handleCategoryChange = useCallback(
    (value: NodeCategory) => {
      if (!node) return;
      dispatch({
        type: 'UPDATE_NODE',
        nodeId: node.id,
        updates: { category: value, color: CATEGORY_COLORS[value] },
      });
    },
    [node, dispatch],
  );

  const handleAddInput = useCallback(() => {
    if (!node) return;
    const newPort: ToolPort = {
      id: `${node.id}-in-${Date.now()}`,
      name: 'newInput',
      type: 'unknown',
      required: false,
    };
    dispatch({
      type: 'UPDATE_NODE',
      nodeId: node.id,
      updates: { inputs: [...node.inputs, newPort] },
    });
  }, [node, dispatch]);

  const handleAddOutput = useCallback(() => {
    if (!node) return;
    const newPort: ToolPort = {
      id: `${node.id}-out-${Date.now()}`,
      name: 'newOutput',
      type: 'unknown',
    };
    dispatch({
      type: 'UPDATE_NODE',
      nodeId: node.id,
      updates: { outputs: [...node.outputs, newPort] },
    });
  }, [node, dispatch]);

  const handleUpdatePort = useCallback(
    (portId: string, isInput: boolean, updates: Partial<ToolPort>) => {
      if (!node) return;
      const ports = isInput ? node.inputs : node.outputs;
      const updated = ports.map((p) => (p.id === portId ? { ...p, ...updates } : p));
      dispatch({
        type: 'UPDATE_NODE',
        nodeId: node.id,
        updates: isInput ? { inputs: updated } : { outputs: updated },
      });
    },
    [node, dispatch],
  );

  const handleDeletePort = useCallback(
    (portId: string, isInput: boolean) => {
      if (!node) return;
      const ports = isInput ? node.inputs : node.outputs;
      const updated = ports.filter((p) => p.id !== portId);
      dispatch({
        type: 'UPDATE_NODE',
        nodeId: node.id,
        updates: isInput ? { inputs: updated } : { outputs: updated },
      });
    },
    [node, dispatch],
  );

  const handleAddConnection = useCallback(
    (targetNodeId: string) => {
      if (!node || node.outputs.length === 0) return;
      const targetNode = allNodes.find((n) => n.id === targetNodeId);
      if (!targetNode || targetNode.inputs.length === 0) return;

      const edge = {
        id: `e-${Date.now()}`,
        sourceNodeId: node.id,
        sourcePortId: node.outputs[0].id,
        targetNodeId,
        targetPortId: targetNode.inputs[0].id,
        animationDelay: 0,
      };
      dispatch({ type: 'ADD_EDGE', edge });
    },
    [node, allNodes, dispatch],
  );

  const handleDeleteTool = useCallback(() => {
    if (!node) return;
    if (confirm(`Delete tool "${node.name}"?`)) {
      dispatch({ type: 'REMOVE_NODE', nodeId: node.id });
    }
  }, [node, dispatch]);

  // Sync local state when node changes
  React.useEffect(() => {
    if (node) {
      setLocalName(node.name);
      setLocalDescription(node.description ?? '');
    }
  }, [node?.id]); // Only sync on node ID change

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 380,
            background: '#1A1A24',
            borderLeft: `2px solid ${node.color}`,
            overflowY: 'auto',
            zIndex: 10,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#E0E0E0', margin: 0 }}>
              Tool Details
            </h3>
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
                padding: 4,
              }}
              aria-label="Close panel"
            >
              <X size={20} />
            </button>
          </div>

          {/* Name */}
          <div>
            <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 6 }}>
              Tool Name
            </label>
            <input
              type="text"
              value={localName}
              onChange={(e) => handleNameChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#252535',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#E0E0E0',
                fontSize: 14,
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 6 }}>
              Category
            </label>
            <select
              value={node.category}
              onChange={(e) => handleCategoryChange(e.target.value as NodeCategory)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#252535',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#E0E0E0',
                fontSize: 14,
              }}
            >
              <option value="core">Core</option>
              <option value="optional">Optional</option>
              <option value="hypothetical">Hypothetical</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#252535',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#E0E0E0',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Inputs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#999' }}>Input Ports</label>
              <button
                onClick={handleAddInput}
                style={{
                  background: 'transparent',
                  border: `1px solid ${node.color}`,
                  color: node.color,
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={12} /> Add Input
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {node.inputs.map((port) => (
                <PortRow
                  key={port.id}
                  port={port}
                  isInput
                  color={node.color}
                  onUpdate={(updates) => handleUpdatePort(port.id, true, updates)}
                  onDelete={() => handleDeletePort(port.id, true)}
                />
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#999' }}>Output Ports</label>
              <button
                onClick={handleAddOutput}
                style={{
                  background: 'transparent',
                  border: `1px solid ${node.color}`,
                  color: node.color,
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={12} /> Add Output
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {node.outputs.map((port) => (
                <PortRow
                  key={port.id}
                  port={port}
                  isInput={false}
                  color={node.color}
                  onUpdate={(updates) => handleUpdatePort(port.id, false, updates)}
                  onDelete={() => handleDeletePort(port.id, false)}
                />
              ))}
            </div>
          </div>

          {/* Add Connection */}
          <div>
            <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 6 }}>
              Add Connection
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddConnection(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#252535',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#E0E0E0',
                fontSize: 14,
              }}
            >
              <option value="">Select target tool...</option>
              {allNodes
                .filter((n) => n.id !== node.id)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Delete Tool */}
          <button
            onClick={handleDeleteTool}
            style={{
              background: 'transparent',
              border: '1px solid #EF4444',
              color: '#EF4444',
              padding: '10px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 'auto',
            }}
          >
            <Trash2 size={16} /> Delete Tool
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Port Row Subcomponent ──────────────────────────────────────────────────────

interface PortRowProps {
  port: ToolPort;
  isInput: boolean;
  color: string;
  onUpdate: (updates: Partial<ToolPort>) => void;
  onDelete: () => void;
}

function PortRow({ port, isInput, color, onUpdate, onDelete }: PortRowProps) {
  return (
    <div
      style={{
        background: '#252535',
        border: '1px solid #333',
        borderRadius: 6,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={port.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Port name"
          style={{
            flex: 1,
            padding: '4px 8px',
            background: '#1A1A24',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#E0E0E0',
            fontSize: 12,
          }}
        />
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#EF4444',
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Delete port"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <input
        type="text"
        value={port.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        placeholder="Type (e.g., string, number)"
        style={{
          width: '100%',
          padding: '4px 8px',
          background: '#1A1A24',
          border: '1px solid #444',
          borderRadius: 4,
          color: '#E0E0E0',
          fontSize: 11,
        }}
      />
      {isInput && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#999' }}>
          <input
            type="checkbox"
            checked={port.required ?? false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            style={{ accentColor: color }}
          />
          Required
        </label>
      )}
    </div>
  );
}
