export type DocumentKind = 'excel' | 'csv' | 'pdf' | 'pptx' | 'image' | 'text';

export type NavTab =
  | 'dashboard'
  | 'documents'
  | 'operations'
  | 'assistant'
  | 'privacy';

export interface ParsedTable {
  name: string;
  headers: string[];
  rows: Record<string, string | number | null>[];
}

export interface ExtractedMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  period?: string;
  category: 'revenue' | 'cost' | 'profit' | 'volume' | 'count' | 'other';
  sourceDocId: string;
}

export interface TertipDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  size: number;
  uploadedAt: string;
  category: string;
  rawText: string;
  tables: ParsedTable[];
  summary: string;
  ocrUsed?: boolean;
  status: 'ready' | 'processing' | 'error';
  error?: string;
}

export interface AssetItem {
  id: string;
  name: string;
  code?: string;
  department: string;
  category: string;
  acquiredAt?: string;
  status: 'active' | 'maintenance' | 'attention';
  nextMaintenanceDate?: string;
  notes?: string;
  linkedDocIds: string[];
}

export interface ReminderItem {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category: 'maintenance' | 'sut' | 'finance' | 'meeting' | 'other';
  completed: boolean;
  sourceDocId?: string;
  assetId?: string;
  autoExtracted?: boolean;
  notes?: string;
}

export interface ChartSeriesPoint {
  period: string;
  patients?: number;
  discharged?: number;
  revenue?: number;
  cost?: number;
  profit?: number;
  margin?: number;
  [key: string]: string | number | undefined;
}

export interface AiConfig {
  provider: 'local-offline' | 'ollama' | 'gemini-byok';
  ollamaUrl: string;
  ollamaModel: string;
  geminiApiKey: string;
  geminiModel: string;
}

export interface WorkspaceState {
  workspaceName: string;
  sector: string;
  documents: TertipDocument[];
  assets: AssetItem[];
  reminders: ReminderItem[];
  metrics: ExtractedMetric[];
  chartSeries: ChartSeriesPoint[];
}
