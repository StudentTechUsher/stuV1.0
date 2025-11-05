'use client';

import { InstitutionRow } from '@/lib/services/webScraperService';
import { ArrowUp, ArrowDown } from 'lucide-react';

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

function getFitScoreColor(score: number): string {
  // Red (0) -> Orange (25) -> Yellow (50) -> Lime (75) -> Green (100)
  if (score >= 90) return 'bg-green-500 text-white';
  if (score >= 75) return 'bg-lime-500 text-white';
  if (score >= 50) return 'bg-yellow-500 text-white';
  if (score >= 25) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
}

export function ResultsDataTable({ rows, sortField, sortDirection, onSort }: ResultsDataTableProps) {
  const SortIcon = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-medium hover:text-foreground/80 transition-colors"
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )
      ) : (
        <div className="w-3.5 h-3.5 opacity-20" />
      )}
    </button>
  );

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-3 py-3 text-left whitespace-nowrap">
              <SortIcon field="name" label="Institution" />
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Location</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Website</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Category</th>
            <th className="px-3 py-3 text-left whitespace-nowrap">
              <SortIcon field="stu_fit_score" label="Score" />
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Registrar
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Provost
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-muted/25 transition-colors">
              <td className="px-3 py-3 font-semibold text-foreground truncate max-w-xs">{row.name}</td>
              <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {row.city && row.state ? (
                  <span>{row.city}, {row.state}</span>
                ) : row.city ? (
                  <span>{row.city}</span>
                ) : row.state ? (
                  <span>{row.state}</span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.website ? (
                  <a
                    href={row.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs truncate block max-w-xs"
                    title={row.website}
                  >
                    {row.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-xs">
                {row.category ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                      getCategoryBadgeClass(row.category).bg
                    } ${getCategoryBadgeClass(row.category).text} ${getCategoryBadgeClass(row.category).border}`}
                  >
                    {row.category.split('/')[0]}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap">
                {row.stu_fit_score || row.stu_fit_score === 0 ? (
                  <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${getFitScoreColor(row.stu_fit_score)}`}>
                    {row.stu_fit_score}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-xs">
                {row.registrar_email ? (
                  <a href={`mailto:${row.registrar_email}`} className="text-primary hover:underline truncate block max-w-sm" title={row.registrar_email}>
                    {row.registrar_email.split('@')[0]}
                  </a>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-3 text-xs">
                {row.provost_email ? (
                  <a href={`mailto:${row.provost_email}`} className="text-primary hover:underline truncate block max-w-sm" title={row.provost_email}>
                    {row.provost_email.split('@')[0]}
                  </a>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
