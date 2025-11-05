'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { InstitutionRow } from '@/lib/services/webScraperService';
import { ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { loadLayout, saveLayout, getDefaultLayout, COLUMN_CONFIG, type TableLayout } from '@/lib/tableLayout';

type SortField = keyof InstitutionRow;

interface ResultsDataTableProps {
  rows: InstitutionRow[];
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}

const CATEGORY_COLORS: Record<InstitutionRow['category'], { bg: string; text: string; border: string }> = {
  'Elite Private University': { bg: 'bg-amber-50/60', text: 'text-amber-700', border: 'border-amber-200/50' },
  'Large Private/Public University': { bg: 'bg-blue-50/60', text: 'text-blue-700', border: 'border-blue-200/50' },
  'Mid-Tier State University': { bg: 'bg-cyan-50/60', text: 'text-cyan-700', border: 'border-cyan-200/50' },
  'Community College/Junior College': { bg: 'bg-emerald-50/60', text: 'text-emerald-700', border: 'border-emerald-200/50' },
  'For-Profit/Technical College': { bg: 'bg-rose-50/60', text: 'text-rose-700', border: 'border-rose-200/50' },
  'Small Private Non-Profits': { bg: 'bg-purple-50/60', text: 'text-purple-700', border: 'border-purple-200/50' },
};

function getCategoryBadgeClass(category: InstitutionRow['category']): { bg: string; text: string; border: string } {
  return CATEGORY_COLORS[category] || { bg: 'bg-gray-50/60', text: 'text-gray-700', border: 'border-gray-200/50' };
}

/**
 * Calculate RGB color based on score (red=0, green=100)
 * Uses HSL color space for smooth gradient
 */
function getScoreColor(score: number): { bg: string; text: string } {
  // Clamp score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, score));

  // Convert score to hue (red=0°, green=120°)
  const hue = (normalizedScore / 100) * 120;

  // Use HSL with full saturation and medium lightness
  const bgColor = `hsl(${hue}, 100%, 45%)`;

  // Determine text color based on lightness
  const textColor = normalizedScore < 50 ? 'text-white' : 'text-white';

  return {
    bg: bgColor,
    text: textColor,
  };
}

export function ResultsDataTable({ rows, sortField, sortDirection, onSort }: ResultsDataTableProps) {
  const [layout, setLayout] = useState<TableLayout>(getDefaultLayout());
  const [resizing, setResizing] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [guideLine, setGuideLine] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  // Debounce layout saves to avoid excessive localStorage writes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveLayout(layout);
    }, 300);

    return () => clearTimeout(timer);
  }, [layout]);

  const handleResizeStart = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(colId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(layout.columnWidths[colId] || 100);
    setGuideLine(e.clientX);
  }, [layout.columnWidths]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const toggleColumnVisibility = useCallback((colId: string) => {
    setLayout(prev => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [colId]: !prev.columnVisibility[colId],
      },
    }));
  }, []);

  const showAllColumns = useCallback(() => {
    const newVis: Record<string, boolean> = {};
    COLUMN_CONFIG.forEach(col => {
      newVis[col.id] = true;
    });
    setLayout(prev => ({
      ...prev,
      columnVisibility: newVis,
      collapsed: {},
    }));
    setContextMenu(null);
  }, []);

  const hideNonKeyColumns = useCallback(() => {
    const newVis: Record<string, boolean> = {};
    COLUMN_CONFIG.forEach(col => {
      newVis[col.id] = col.isKey;
    });
    setLayout(prev => ({
      ...prev,
      columnVisibility: newVis,
    }));
    setContextMenu(null);
  }, []);

  const restoreCollapsed = useCallback((colId: string) => {
    const prevWidth = layout.previousWidths[colId] || 100;
    setLayout(prev => ({
      ...prev,
      columnWidths: {
        ...prev.columnWidths,
        [colId]: prevWidth,
      },
      collapsed: {
        ...prev.collapsed,
        [colId]: false,
      },
      columnVisibility: {
        ...prev.columnVisibility,
        [colId]: true,
      },
    }));
  }, [layout.previousWidths]);

  const handleDoubleClick = useCallback((colId: string) => {
    const col = COLUMN_CONFIG.find(c => c.id === colId);
    if (!col) return;
    const headerMeasure = col.label.length * 8 + 8;
    let maxCellWidth = headerMeasure;
    for (let i = 0; i < Math.min(50, rows.length); i++) {
      const row = rows[i];
      const accessor = col.accessor as keyof InstitutionRow;
      const cellValue = row[accessor];
      let cellText = '';
      if (Array.isArray(cellValue)) {
        cellText = cellValue.join(', ');
      } else if (cellValue) {
        cellText = String(cellValue);
      }
      const cellWidth = cellText.length * 7 + 12;
      maxCellWidth = Math.max(maxCellWidth, cellWidth);
    }
    const finalWidth = Math.min(maxCellWidth + 8, 480);
    setLayout(prev => ({
      ...prev,
      columnWidths: {
        ...prev.columnWidths,
        [colId]: Math.max(finalWidth, col.minWidth),
      },
    }));
  }, [rows]);

  const handleHeaderKeyDown = useCallback((e: React.KeyboardEvent, colId: string) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLayout(prev => ({
          ...prev,
          columnWidths: {
            ...prev.columnWidths,
            [colId]: Math.max(prev.columnWidths[colId] - 12, 80),
          },
        }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLayout(prev => ({
          ...prev,
          columnWidths: {
            ...prev.columnWidths,
            [colId]: prev.columnWidths[colId] + 12,
          },
        }));
      }
    }
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX;
      const newWidth = Math.max(resizeStartWidth + delta, 80);

      const col = COLUMN_CONFIG.find(c => c.id === resizing);
      const minWidth = col?.minWidth || 80;

      setLayout(prev => {
        const updatedLayout = { ...prev };

        if (newWidth < minWidth - 16) {
          updatedLayout.columnWidths = {
            ...prev.columnWidths,
            [resizing]: 6,
          };
          updatedLayout.collapsed = {
            ...prev.collapsed,
            [resizing]: true,
          };
          updatedLayout.columnVisibility = {
            ...prev.columnVisibility,
            [resizing]: false,
          };
          updatedLayout.previousWidths = {
            ...prev.previousWidths,
            [resizing]: resizeStartWidth,
          };
        } else {
          updatedLayout.columnWidths = {
            ...prev.columnWidths,
            [resizing]: newWidth,
          };
        }

        return updatedLayout;
      });

      // Use requestAnimationFrame for smooth guide line updates
      requestAnimationFrame(() => {
        setGuideLine(e.clientX);
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
      setGuideLine(null);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, resizeStartX, resizeStartWidth]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu && !((e.target as HTMLElement).closest('[role="menu"]'))) {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const SortIcon = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <div className="w-3 h-3 opacity-0 group-hover:opacity-20" />
      )}
    </button>
  );

  const visibleColumns = COLUMN_CONFIG.filter(col => layout.columnVisibility[col.id] !== false);

  return (
    <div ref={containerRef} className="w-full rounded-xl border border-neutral-200 shadow-sm bg-white overflow-hidden">
      {guideLine !== null && (
        <div
          className="fixed top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-50"
          style={{ left: `${guideLine}px` }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="border-collapse text-xs" style={{ width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 sticky top-0 z-10">
              {visibleColumns.map(col => (
                <th
                  key={col.id}
                  className="px-2 py-1 text-left text-[11px] font-medium uppercase tracking-wide text-neutral-600 relative group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ width: `${layout.columnWidths[col.id] || col.defaultWidth}px` }}
                  tabIndex={0}
                  onKeyDown={(e) => handleHeaderKeyDown(e, col.id)}
                  onContextMenu={(e) => handleContextMenu(e)}
                  onDoubleClick={() => handleDoubleClick(col.id)}
                  aria-label={`${col.label}, sortable. Double-click to auto-fit. Right-click for options.`}
                >
                  <div className="flex items-center gap-1 truncate">
                    {col.id === 'name' || col.id === 'registrar_email' || col.id === 'provost_email' || col.id === 'website' || col.id === 'stu_fit_score' ? (
                      <SortIcon field={col.accessor as SortField} label={col.label} />
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </div>

                  <div
                    onMouseDown={(e) => handleResizeStart(e, col.id)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 hover:w-1 transition-all"
                    style={{
                      background: resizing === col.id ? '#3b82f6' : 'transparent',
                      right: '-4px',
                    }}
                    aria-label={`Resize column ${col.label}`}
                  />
                </th>
              ))}

              {Object.entries(layout.collapsed).map(([colId, isCollapsed]) => {
                if (!isCollapsed) return null;
                const col = COLUMN_CONFIG.find(c => c.id === colId);
                if (!col) return null;
                return (
                  <th
                    key={`stub-${colId}`}
                    className="px-0.5 py-1 bg-neutral-300 relative group hover:bg-neutral-400 cursor-pointer transition-colors"
                    style={{ width: '6px' }}
                    onClick={() => restoreCollapsed(colId)}
                    title={`Restore ${col.label}`}
                  >
                    <ChevronRight className="w-3 h-3 text-neutral-600" />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-neutral-100 hover:bg-neutral-100 transition-colors ${
                  idx % 2 === 1 ? 'bg-neutral-50' : ''
                }`}
              >
                {visibleColumns.map(col => {
                  const accessor = col.accessor as keyof InstitutionRow;
                  const value = row[accessor];
                  let cellContent: React.ReactNode = null;

                  if (col.id === 'stu_fit_score') {
                    const scoreValue = typeof value === 'number' ? value : null;
                    const scoreColor = scoreValue !== null ? getScoreColor(scoreValue) : { bg: '', text: 'text-neutral-700' };
                    cellContent = scoreValue !== null ? (
                      <div className="w-full h-6 rounded overflow-hidden">
                        <div
                          className={`w-full h-full flex items-center justify-center font-mono font-bold text-xs ${scoreColor.text} transition-all`}
                          style={{ backgroundColor: scoreColor.bg }}
                        >
                          {scoreValue}
                        </div>
                      </div>
                    ) : (
                      '—'
                    );
                  } else if (col.id === 'category') {
                    const catValue = value as InstitutionRow['category'];
                    cellContent = catValue ? (
                      <span
                        className={`inline-block px-1 py-0.5 rounded text-xs font-semibold border ${
                          getCategoryBadgeClass(catValue).bg
                        } ${getCategoryBadgeClass(catValue).text} ${getCategoryBadgeClass(catValue).border}`}
                      >
                        {catValue.split('/')[0]}
                      </span>
                    ) : (
                      '—'
                    );
                  } else if (col.id === 'city' && value) {
                    const state = row.state;
                    cellContent = state ? `${String(value)}, ${state}` : String(value);
                  } else if (col.id === 'website' && value) {
                    cellContent = (
                      <a
                        href={value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline truncate block"
                        title={value as string}
                      >
                        {(value as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    );
                  } else if ((col.id === 'registrar_email' || col.id === 'provost_email' || col.id === 'main_office_email') && value) {
                    cellContent = (
                      <a href={`mailto:${value}`} className="text-indigo-600 hover:underline truncate block" title={value as string}>
                        {(value as string).split('@')[0]}
                      </a>
                    );
                  } else if (col.id === 'source_urls' && Array.isArray(value)) {
                    cellContent = (
                      <div className="max-h-10 overflow-y-auto text-[10px] space-y-0.5">
                        {(value as string[]).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline block truncate"
                            title={url}
                          >
                            {url.replace(/^https?:\/\//, '')}
                          </a>
                        ))}
                      </div>
                    );
                  } else if (typeof value === 'string' || typeof value === 'number') {
                    cellContent = String(value);
                  } else {
                    cellContent = '—';
                  }

                  return (
                    <td
                      key={col.id}
                      className="px-2 py-1 text-xs text-neutral-700 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ width: `${layout.columnWidths[col.id] || col.defaultWidth}px` }}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          role="menu"
          className="fixed bg-white border border-neutral-200 rounded-lg shadow-lg z-50 py-1"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <div className="max-h-64 overflow-y-auto px-2 py-1">
            {COLUMN_CONFIG.map(col => (
              <label
                key={col.id}
                role="menuitemcheckbox"
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-neutral-100 rounded transition-colors"
                aria-checked={layout.columnVisibility[col.id] !== false}
              >
                <input
                  type="checkbox"
                  checked={layout.columnVisibility[col.id] !== false}
                  onChange={() => toggleColumnVisibility(col.id)}
                  className="w-3 h-3 cursor-pointer"
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-neutral-200 px-2 py-1 space-y-1">
            <button
              onClick={showAllColumns}
              className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-neutral-100 rounded transition-colors font-medium"
            >
              Show All
            </button>
            <button
              onClick={hideNonKeyColumns}
              className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-neutral-100 rounded transition-colors font-medium"
            >
              Hide Non-Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
