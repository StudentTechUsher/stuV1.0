export interface ColumnConfig {
  id: string;
  label: string;
  accessor: string;
  defaultWidth: number;
  minWidth: number;
  isKey: boolean;
}

export interface TableLayout {
  columnWidths: Record<string, number>;
  columnVisibility: Record<string, boolean>;
  collapsed: Record<string, boolean>;
  previousWidths: Record<string, number>;
}

const STORAGE_KEY = 'stu-webscraper-table-v2';

export function loadLayout(): TableLayout {
  if (typeof window === 'undefined') return getDefaultLayout();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultLayout();

    const storedLayout = JSON.parse(stored) as TableLayout;
    const defaultLayout = getDefaultLayout();

    // Merge stored layout with defaults to handle new/changed columns
    return {
      columnWidths: {
        ...defaultLayout.columnWidths,
        ...storedLayout.columnWidths,
      },
      columnVisibility: {
        ...defaultLayout.columnVisibility,
        ...storedLayout.columnVisibility,
      },
      collapsed: storedLayout.collapsed || {},
      previousWidths: storedLayout.previousWidths || {},
    };
  } catch {
    return getDefaultLayout();
  }
}

export function saveLayout(layout: TableLayout): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    console.error('Failed to save table layout');
  }
}

export function getDefaultLayout(): TableLayout {
  return {
    columnWidths: {
      stu_fit_score: 80,
      category: 160,
      name: 180,
      website: 45,
      city: 100,
      state: 80,
      registrar_name: 140,
      registrar_email: 180,
      provost_name: 140,
      provost_email: 180,
      main_office_email: 180,
      main_office_phone: 120,
      source_urls: 240,
    },
    columnVisibility: {
      stu_fit_score: true,
      category: true,
      name: true,
      website: true,
      city: true,
      state: true,
      registrar_name: true,
      registrar_email: true,
      provost_name: true,
      provost_email: true,
      main_office_email: true,
      main_office_phone: true,
      source_urls: true,
    },
    collapsed: {},
    previousWidths: {},
  };
}

export function measureContentWidth(
  text: string,
  fontSize: string = '12px',
  fontWeight: string = 'normal'
): number {
  if (typeof document === 'undefined') return 100;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 100;
  ctx.font = `${fontWeight} ${fontSize} system-ui, -apple-system, sans-serif`;
  return Math.ceil(ctx.measureText(text).width) + 16;
}

export const COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'stu_fit_score', label: 'STU Score', accessor: 'stu_fit_score', defaultWidth: 80, minWidth: 80, isKey: true },
  { id: 'category', label: 'Category', accessor: 'category', defaultWidth: 160, minWidth: 100, isKey: true },
  { id: 'name', label: 'Institution', accessor: 'name', defaultWidth: 180, minWidth: 80, isKey: true },
  { id: 'website', label: 'Website', accessor: 'website', defaultWidth: 45, minWidth: 45, isKey: true },
  { id: 'city', label: 'City', accessor: 'city', defaultWidth: 100, minWidth: 80, isKey: false },
  { id: 'state', label: 'State', accessor: 'state', defaultWidth: 80, minWidth: 80, isKey: false },
  { id: 'registrar_name', label: 'Registrar', accessor: 'registrar_name', defaultWidth: 140, minWidth: 80, isKey: false },
  { id: 'registrar_email', label: 'Reg. Email', accessor: 'registrar_email', defaultWidth: 180, minWidth: 80, isKey: true },
  { id: 'provost_name', label: 'Provost', accessor: 'provost_name', defaultWidth: 140, minWidth: 80, isKey: false },
  { id: 'provost_email', label: 'Prov. Email', accessor: 'provost_email', defaultWidth: 180, minWidth: 80, isKey: true },
  { id: 'main_office_email', label: 'Main Email', accessor: 'main_office_email', defaultWidth: 180, minWidth: 80, isKey: false },
  { id: 'main_office_phone', label: 'Phone', accessor: 'main_office_phone', defaultWidth: 120, minWidth: 80, isKey: false },
  { id: 'source_urls', label: 'Sources', accessor: 'source_urls', defaultWidth: 240, minWidth: 140, isKey: false },
];
