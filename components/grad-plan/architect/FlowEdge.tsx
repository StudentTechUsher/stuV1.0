'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ToolEdge } from './types';

interface FlowEdgeProps {
  edge: ToolEdge;
  isActive: boolean;
  isSelected: boolean;
  path: string;
  color: string;
}

export default function FlowEdge({ edge, isActive, isSelected, path, color }: FlowEdgeProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !pathRef.current) {
      setParticlePos(null);
      return;
    }

    const pathEl = pathRef.current;
    const pathLength = pathEl.getTotalLength();
    let startTime: number | null = null;
    const duration = 1200;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const point = pathEl.getPointAtLength(progress * pathLength);
      setParticlePos({ x: point.x, y: point.y });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  const strokeWidth = isSelected ? 2.5 : 1.5;
  const strokeOpacity = isSelected ? 0.9 : edge.isConditional ? 0.35 : 0.5;

  return (
    <g>
      {/* Edge path */}
      <path
        ref={pathRef}
        id={`path-${edge.id}`}
        d={path}
        fill="none"
        stroke={isSelected ? color : '#555'}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeDasharray={edge.isConditional ? '6 4' : undefined}
        style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
      />

      {/* Edge label */}
      {edge.label && path && (
        <text
          fill="#777"
          fontSize={10}
          textAnchor="middle"
          dy={-6}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          <textPath href={`#path-${edge.id}`} startOffset="50%">
            {edge.label}
          </textPath>
        </text>
      )}

      {/* Animated particle */}
      {isActive && particlePos && (
        <g>
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={10}
            fill={color}
            opacity={0.25}
          />
          <circle
            cx={particlePos.x}
            cy={particlePos.y}
            r={5}
            fill={color}
            opacity={0.9}
          />
        </g>
      )}
    </g>
  );
}
