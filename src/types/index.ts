export type LifeStageCategory = 'identity' | 'education' | 'employment' | 'finance' | 'healthcare';

export type ConfidenceType = 'evidence-backed' | 'user-confirmed' | 'unverified' | 'unknown';

export interface RecordField {
  id: string;
  category: LifeStageCategory;
  fieldName: string;
  value: string;
  source: 'Extracted from document' | 'Confirmed by you' | 'Not provided';
  evidenceDocName?: string;
  lastUpdated: string;
  confidence: ConfidenceType;
  isSensitive?: boolean;
}

export interface DocumentItem {
  id: string;
  name: string;
  category: LifeStageCategory;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  extractedFieldsCount: number;
  status: 'Parsed' | 'Processing' | 'Needs Review';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourceType?: 'evidence-backed' | 'user-confirmed' | 'unknown';
  sourceNote?: string;
  evidenceDoc?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: ChatMessage[];
}

export interface SharedLink {
  id: string;
  recipient: string;
  recipientLogo?: string;
  fieldsShared: string[];
  createdAt: string;
  expiry: string;
  status: 'Active' | 'Revoked' | 'Expired';
  accessCount: number;
}

export interface ShareRequest {
  id: string;
  requesterName: string;
  requesterType: string;
  purpose: string;
  requestedFields: {
    key: string;
    label: string;
    category: LifeStageCategory;
    isRequired: boolean;
    defaultValue: string;
    isEvidenceBacked: boolean;
  }[];
}
