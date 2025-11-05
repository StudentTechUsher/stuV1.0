'use client';

import { InstitutionRow } from '@/lib/services/webScraperService';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';

interface ResultsTableProps {
  rows: InstitutionRow[];
  onSort: (field: keyof InstitutionRow) => void;
  sortField: keyof InstitutionRow;
  sortDirection: 'asc' | 'desc';
}

export function ResultsTable({
  rows,
  onSort,
  sortField,
  sortDirection,
}: ResultsTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    name: 250,
    city: 120,
    state: 80,
    category: 140,
    stu_fit_score: 100,
    registrar_name: 150,
    website: 80,
  });

  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(columnKey);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnKey]);
  }, [columnWidths]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + diff);

      setColumnWidths(prev => ({
        ...prev,
        [resizing]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, startX, startWidth]);

  const SortIcon = ({ field }: { field: keyof InstitutionRow }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  const SortHeader = ({ field, label }: { field: keyof InstitutionRow; label: string }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition-colors"
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.name}px` }}>
                <SortHeader field="name" label="Institution Name" />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'name')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'name' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.city}px` }}>
                <SortHeader field="city" label="City" />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'city')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'city' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.state}px` }}>
                <SortHeader field="state" label="State" />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'state')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'state' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.category}px` }}>
                <SortHeader field="category" label="Category" />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'category')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'category' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
              <th className="px-4 py-3 text-center text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.stu_fit_score}px` }}>
                <SortHeader field="stu_fit_score" label="Fit Score" />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'stu_fit_score')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'stu_fit_score' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.registrar_name}px` }}>
                <SortHeader field="registrar_name" label="Registrar" />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'registrar_name')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'registrar_name' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm relative whitespace-nowrap select-none" style={{ width: `${columnWidths.website}px` }}>
                <span>Website</span>
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'website')}
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
                  style={{ background: resizing === 'website' ? '#3b82f6' : 'transparent', width: '4px', marginRight: '-2px' }}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No institutions match your filters
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900" style={{ width: `${columnWidths.name}px` }}>
                    {row.name}
                    {row.aka && row.aka.length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        aka: {row.aka.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600" style={{ width: `${columnWidths.city}px` }}>
                    {row.city || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600" style={{ width: `${columnWidths.state}px` }}>
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-700">
                      {row.state || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ width: `${columnWidths.category}px` }}>
                    <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {row.category.substring(0, 15)}
                      {row.category.length > 15 ? '...' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" style={{ width: `${columnWidths.stu_fit_score}px` }}>
                    <div className="inline-flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            backgroundColor:
                              row.stu_fit_score >= 70
                                ? '#10b981'
                                : row.stu_fit_score >= 50
                                ? '#f59e0b'
                                : row.stu_fit_score >= 30
                                ? '#ef4444'
                                : '#9ca3af',
                          }}
                        >
                          {row.stu_fit_score}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600" style={{ width: `${columnWidths.registrar_name}px` }}>
                    {row.registrar_email ? (
                      <a
                        href={`mailto:${row.registrar_email}`}
                        className="text-blue-600 hover:underline truncate block"
                      >
                        {row.registrar_name || 'Contact'}
                      </a>
                    ) : row.registrar_contact_form_url ? (
                      <a
                        href={row.registrar_contact_form_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Form
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ width: `${columnWidths.website}px` }}>
                    {row.website ? (
                      <a
                        href={row.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block"
                        title={row.website}
                      >
                        Visit
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
