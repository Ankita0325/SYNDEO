import type { DocumentItem, LifeStageCategory } from '../types';

export interface SupabaseDocumentRow {
  id: string;
  file_name: string;
  category?: string;
  document_type?: string;
  mime_type?: string;
  file_size?: number;
  processing_status?: string;
  created_at: string;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapDocumentCategory(category?: string): LifeStageCategory {
  const normalized = (category || '').toLowerCase();
  if (['identity', 'education', 'employment', 'finance', 'healthcare'].includes(normalized)) {
    return normalized as LifeStageCategory;
  }
  return 'identity';
}

export function mapDocumentStatus(status?: string): 'Parsed' | 'Processing' | 'Needs Review' {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PARSED' || normalized === 'COMPLETED' || normalized === 'VERIFIED') {
    return 'Parsed';
  }
  if (normalized === 'PROCESSING' || normalized === 'PENDING') {
    return 'Processing';
  }
  return 'Needs Review';
}

export function mapSupabaseDocument(row: SupabaseDocumentRow): DocumentItem {
  return {
    id: row.id,
    name: row.file_name,
    category: mapDocumentCategory(row.category),
    fileType: (row.document_type || row.mime_type?.split('/')[1] || 'PDF').toUpperCase(),
    fileSize: formatFileSize(row.file_size),
    uploadDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recent',
    extractedFieldsCount: 0,
    status: mapDocumentStatus(row.processing_status),
  };
}
