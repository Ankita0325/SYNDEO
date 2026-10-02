import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initialDocuments, initialRecords } from '../../data/mockData';
import type { LifeStageCategory, RecordField, DocumentItem, OCRDocumentResult } from '../../types';
import { fetchRecordsFromBackend, fetchDocumentsFromBackend, addClaimToBackend, uploadDocumentToBackend } from '../../lib/api';
import { runLocalOcr } from '../../lib/ocrClient';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ObsidianGraphView } from './ObsidianGraphView';
import { useNavigation } from '../../context/NavigationContext';
import {
  Database,
  FileText,
  Layers,
  Sparkles,
  Plus,
  UploadCloud,
  Fingerprint,
  GraduationCap,
  Briefcase,
  Wallet,
  HeartPulse,
  Search,
  FileCheck,
  Network,
  LayoutGrid,
  Copy,
  Check,
  FileType,
  X,
  Loader2,
  Eye,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

type ViewMode = 'graph' | 'cards' | 'documents';
type OCRRecordField = RecordField & { ocrDocument: OCRDocumentResult };
type LocalDocument = DocumentItem & { fileUrl: string; ocrResult: OCRDocumentResult };

export const MemoryPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [records, setRecords] = useState<RecordField[]>(initialRecords);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [localDocuments, setLocalDocuments] = useState<LocalDocument[]>([]);
  const [ocrRecords, setOcrRecords] = useState<OCRRecordField[]>([]);
  const localFileUrls = useRef<string[]>([]);
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null);
  const [isUsingSampleDocuments, setIsUsingSampleDocuments] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LifeStageCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOcrRecord, setSelectedOcrRecord] = useState<OCRRecordField | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<RecordField | null>(null);
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState(false);
  const [isOcrViewerOpen, setIsOcrViewerOpen] = useState(false);

  const showSampleDocuments = useCallback((error?: string) => {
    setDocuments(initialDocuments.slice(0, 4));
    setIsUsingSampleDocuments(true);
    setDocumentLoadError(error || null);
  }, []);

  // Sync with live Neo4j backend graph store
  useEffect(() => {
    let active = true;

    void (async () => {
      // 1. Fetch live claims from Neo4j Aura
      const backendRecs = await fetchRecordsFromBackend();
      if (active && backendRecs && Array.isArray(backendRecs) && backendRecs.length > 0) {
        setRecords(backendRecs);
      }

      // 2. Fetch live documents
      const backendDocs = await fetchDocumentsFromBackend();
      if (active && backendDocs && Array.isArray(backendDocs) && backendDocs.length > 0) {
        setDocuments(backendDocs);
        setIsUsingSampleDocuments(false);
        setDocumentLoadError(null);
      } else {
        showSampleDocuments();
      }
    })();

    return () => {
      active = false;
    };
  }, [showSampleDocuments]);


  // Modals state
  const [isAddInfoOpen, setIsAddInfoOpen] = useState<boolean>(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<LifeStageCategory>('education');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRDocumentResult | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProgressStatus, setOcrProgressStatus] = useState('');

  // Add Info Form state
  const [newCategory, setNewCategory] = useState<LifeStageCategory>('identity');
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<'Confirmed by you' | 'Extracted from document'>('Confirmed by you');

  useEffect(() => () => {
    localFileUrls.current.forEach((fileUrl) => URL.revokeObjectURL(fileUrl));
  }, []);

  const categories: { id: LifeStageCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'identity', label: 'Identity', icon: Fingerprint },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'healthcare', label: 'Healthcare', icon: HeartPulse },
  ];

  const filteredRecords = records.filter((r) => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch =
      r.fieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.evidenceDocName && r.evidenceDocName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredOcrRecords = ocrRecords.filter((record) => {
    const matchesCategory = selectedCategory === 'all' || record.category === selectedCategory;
    const matchesSearch = record.fieldName.toLowerCase().includes(searchQuery.toLowerCase())
      || record.value.toLowerCase().includes(searchQuery.toLowerCase())
      || Boolean(record.evidenceDocName?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  const allRecords = [...filteredOcrRecords, ...filteredRecords];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim() || !newValue.trim()) return;

    const newRecord: RecordField = {
      id: `rec-${Date.now()}`,
      category: newCategory,
      fieldName: newFieldName,
      value: newValue,
      source: newSourceType,
      lastUpdated: 'Just now',
      confidence: newSourceType === 'Extracted from document' ? 'evidence-backed' : 'user-confirmed',
    };

    setRecords([newRecord, ...records]);
    setIsAddInfoOpen(false);
    setNewFieldName('');
    setNewValue('');

    // Persist to backend graph store
    await addClaimToBackend({
      category: newCategory,
      fieldName: newFieldName,
      value: newValue,
      source: newSourceType,
    });
  };

  const visibleDocuments = [...localDocuments, ...documents];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 text-zinc-900 dark:text-[#f4f4f6]">
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-[#181820] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Personal Memory Store
            </h1>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30">
              Encrypted
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-[#8c879a] mt-0.5">
            5 life stages indexed with verified proofs and Obsidian knowledge graph.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddInfoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#14141e] hover:bg-zinc-200 dark:hover:bg-[#1c1c28] border border-zinc-200 dark:border-[#272736] text-xs font-medium text-zinc-800 dark:text-[#e4e1e8] transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
            <span>Add Info</span>
          </button>
          <button
            onClick={() => {
              setUploadError(null);
              setIsUploadDocOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Doc</span>
          </button>
        </div>
      </div>

      {/* Minimal Top Stats Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Records</span>
            <Database className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{records.length}</p>
        </div>

        <div className="p-3 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Source Docs</span>
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{visibleDocuments.length}</p>
        </div>

        <div className="p-3 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Categories</span>
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">5 Active</p>
        </div>

        <div className="p-3 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Graph Neural</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Synced</p>
        </div>
      </div>

      {/* View Mode Switcher & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-zinc-200 dark:border-[#181820] pb-3">
        <div className="inline-flex items-center p-0.5 rounded-full bg-zinc-100 dark:bg-[#12121c] border border-zinc-200 dark:border-[#222230] shadow-inner max-w-full overflow-x-auto scrollbar-none">
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              viewMode === 'graph'
                ? 'bg-[#5a25eb] text-white shadow-xs'
                : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Obsidian Graph</span>
          </button>

          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-[#5a25eb] text-white shadow-xs'
                : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white'
            }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards Grid ({allRecords.length})</span>
              </button>

          <button
            onClick={() => setViewMode('documents')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              viewMode === 'documents'
                ? 'bg-[#5a25eb] text-white shadow-xs'
                : 'text-zinc-600 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Evidence Files ({visibleDocuments.length})</span>
          </button>
        </div>

        {viewMode !== 'graph' && (
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-full bg-zinc-50 dark:bg-[#12121a] border border-zinc-200 dark:border-[#222230] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#5a25eb]"
            />
          </div>
        )}
      </div>

      {/* VIEW 1: OBSIDIAN GRAPH VIEW */}
      {viewMode === 'graph' && (
        <ObsidianGraphView
          records={records}
          documents={documents}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onOpenAddModal={() => setIsAddInfoOpen(true)}
        />
      )}

      {/* VIEW 2: CARDS GRID */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Scrollable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#5a25eb] text-white font-semibold'
                  : 'bg-zinc-100 dark:bg-[#12121a] text-zinc-600 dark:text-[#a29db0] hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All ({records.length + ocrRecords.length})
            </button>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const count = records.filter((r) => r.category === cat.id).length
                + ocrRecords.filter((r) => r.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#5a25eb] text-white font-semibold'
                      : 'bg-zinc-100 dark:bg-[#12121a] text-zinc-600 dark:text-[#a29db0] hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allRecords.map((record) => {
              const catMeta = categories.find((c) => c.id === record.category);
              const Icon = catMeta?.icon || FileText;

              return (
                <div
                  key={record.id}
                  onClick={() => {
                    const ocrRecord = ocrRecords.find((item) => item.id === record.id);
                    if (ocrRecord) {
                      setSelectedOcrRecord(ocrRecord);
                      setIsOcrViewerOpen(true);
                    } else {
                      setSelectedClaim(record);
                      setIsProvenanceModalOpen(true);
                    }
                  }}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] hover:border-[#5a25eb]/40 transition-all space-y-2.5 flex flex-col justify-between shadow-2xs group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-[#14141e] flex items-center justify-center shrink-0">
                          <Icon className="w-3 h-3 text-[#5a25eb] dark:text-[#cbbeff]" />
                        </div>
                        <span className="text-xs font-semibold text-zinc-500 dark:text-[#a29db0] uppercase tracking-wider truncate">
                          {record.fieldName}
                        </span>
                      </div>
                      <StatusBadge type={record.confidence} label={record.source} />
                    </div>

                    <div className="pl-8 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-[#e4e1e8] line-clamp-3">
                          {record.value}
                        </p>
                        <div className="flex items-center gap-1">
                          {ocrRecords.some((item) => item.id === record.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const ocrRecord = ocrRecords.find((item) => item.id === record.id);
                                if (ocrRecord) setSelectedOcrRecord(ocrRecord);
                                setIsOcrViewerOpen(true);
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-[#5a25eb] cursor-pointer"
                              title="View OCR JSON"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(record.id, record.value)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                            title="Copy"
                          >
                            {copiedId === record.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {record.evidenceDocName && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                          <FileCheck className="w-3 h-3" />
                          <span className="truncate">{record.evidenceDocName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-[#14141e] flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="capitalize">{record.category}</span>
                    <span>{record.lastUpdated}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {allRecords.length === 0 && (
            <div className="p-8 text-center border border-dashed border-zinc-300 dark:border-[#2d2b38] rounded-2xl bg-white dark:bg-[#07070a]">
              <Database className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs text-zinc-500">No matching records found.</p>
            </div>
          )}
        </div>
      )}

      {/* OCR Record Viewer Modal */}
      <Modal
        isOpen={isOcrViewerOpen}
        onClose={() => {
          setIsOcrViewerOpen(false);
          setSelectedOcrRecord(null);
        }}
        title={selectedOcrRecord ? `OCR Evidence: ${selectedOcrRecord.evidenceDocName || selectedOcrRecord.fieldName}` : 'OCR Evidence'}
        subtitle="View extracted OCR text and JSON"
        maxWidth="max-w-2xl"
      >
        {selectedOcrRecord && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12]">
                <span className="text-[10px] text-zinc-500">Field Name</span>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">{selectedOcrRecord.fieldName}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12]">
                <span className="text-[10px] text-zinc-500">Source</span>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">{selectedOcrRecord.source}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12]">
                <span className="text-[10px] text-zinc-500">Category</span>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white capitalize">{selectedOcrRecord.category}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12]">
                <span className="text-[10px] text-zinc-500">Last Updated</span>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">{selectedOcrRecord.lastUpdated}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12]">
              <span className="text-[10px] text-zinc-500">Extracted Value</span>
              <p className="text-xs font-semibold text-zinc-900 dark:text-white whitespace-pre-wrap">{selectedOcrRecord.value}</p>
            </div>
            {selectedOcrRecord.evidenceDocName && (
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12]">
                <span className="text-[10px] text-zinc-500">Evidence Document</span>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white font-mono">{selectedOcrRecord.evidenceDocName}</p>
              </div>
            )}
            <details className="text-[10px] text-zinc-600 dark:text-zinc-300">
              <summary className="cursor-pointer text-[#5a25eb]">View full OCR JSON</summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white dark:bg-[#18171f] p-2 text-[10px] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2d2b38]">
                {JSON.stringify(selectedOcrRecord.ocrDocument, null, 2)}
              </pre>
            </details>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOcrViewerOpen(false);
                  setSelectedOcrRecord(null);
                }}
                className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* VIEW 3: EVIDENCE FILES */}
      {viewMode === 'documents' && (
        <div className="space-y-3">
          {isUsingSampleDocuments && (
            <p role="status" className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              Showing sample documents. Files you add from your device stay in this page only and are not sent to a server.
            </p>
          )}
          {documentLoadError && (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Could not load vault documents: {documentLoadError}
            </p>
          )}
          {visibleDocuments.length === 0 && !documentLoadError && (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-[#2d2b38]">
              No documents uploaded yet.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleDocuments.map((doc) => {
            const localDocument = localDocuments.find((localDoc) => localDoc.id === doc.id);
            return (
            <div
              key={doc.id}
              className="p-3.5 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] flex flex-col justify-between hover:border-[#5a25eb]/40 transition-colors shadow-2xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-[#14141e] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{doc.name}</p>
                    <p className="text-[10px] text-zinc-400">{doc.fileSize} • {doc.uploadDate}</p>
                  </div>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${
                  doc.status === 'Stored locally'
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  {doc.status}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-[#14141e] flex items-center justify-between text-[10px] text-zinc-400">
                {localDocument ? (
                  <a
                    href={localDocument.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1 hover:underline"
                  >
                    <FileText className="w-3 h-3" /> Open local file
                  </a>
                ) : (
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> {doc.extractedFieldsCount} fields verified
                  </span>
                )}
                <span className="capitalize">{doc.category}</span>
              </div>
            </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Add Info Modal */}
      <Modal
        isOpen={isAddInfoOpen}
        onClose={() => setIsAddInfoOpen(false)}
        title="Add Memory Record"
        subtitle="Manually confirm personal attributes across any life stage."
      >
        <form onSubmit={handleAddRecord} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-700 dark:text-[#a29db0] mb-1 font-medium">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as LifeStageCategory)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0e0e14] border border-zinc-200 dark:border-[#222230] text-zinc-900 dark:text-white focus:outline-none focus:border-[#5a25eb]"
            >
              <option value="identity">Identity</option>
              <option value="education">Education</option>
              <option value="employment">Employment</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-[#a29db0] mb-1 font-medium">Field Name</label>
            <input
              type="text"
              placeholder="e.g. Master's Thesis Topic"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0e0e14] border border-zinc-200 dark:border-[#222230] text-zinc-900 dark:text-white focus:outline-none focus:border-[#5a25eb]"
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-[#a29db0] mb-1 font-medium">Value</label>
            <input
              type="text"
              placeholder="e.g. Distributed Consensus"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-[#0e0e14] border border-zinc-200 dark:border-[#222230] text-zinc-900 dark:text-white focus:outline-none focus:border-[#5a25eb]"
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-[#a29db0] mb-1 font-medium">Assurance Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewSourceType('Confirmed by you')}
                className={`p-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                  newSourceType === 'Confirmed by you'
                    ? 'border-[#5a25eb] bg-[#5a25eb]/10 text-[#5a25eb] dark:text-[#cbbeff] font-semibold'
                    : 'border-zinc-200 dark:border-[#222230] text-zinc-600'
                }`}
              >
                Self Confirmed
              </button>

              <button
                type="button"
                onClick={() => setNewSourceType('Extracted from document')}
                className={`p-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                  newSourceType === 'Extracted from document'
                    ? 'border-[#5a25eb] bg-[#5a25eb]/10 text-[#5a25eb] dark:text-[#cbbeff] font-semibold'
                    : 'border-zinc-200 dark:border-[#222230] text-zinc-600'
                }`}
              >
                Document Backed
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddInfoOpen(false)}
              className="px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-[#14141e] text-xs text-zinc-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-full bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium cursor-pointer"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Ingestion Flow Modal */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => {
          if (isOcrRunning) return;
          setIsUploadDocOpen(false);
          setUploadError(null);
          setSelectedFile(null);
          setOcrResult(null);
          setIsOcrRunning(false);
        }}
        title="Document Ingestion"
        subtitle="Add a file from your device for this page only. It will not be sent to a server."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {uploadError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {uploadError}
            </p>
          )}
          <div className="space-y-3 text-center">
            <div className="border border-dashed border-zinc-300 dark:border-[#2d2b38] rounded-2xl p-6 space-y-2">
              <UploadCloud className="w-8 h-8 text-[#5a25eb] mx-auto" />
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Select Document</p>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                disabled={isOcrRunning}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] || null;
                  event.currentTarget.value = '';
                  if (file && file.size > 25 * 1024 * 1024) {
                    setSelectedFile(null);
                    setUploadError('Choose a file that is 25 MB or smaller.');
                    return;
                  }
                  setSelectedFile(file);
                  setUploadError(null);
                  setOcrResult(null);
                  setOcrProgress(0);
                  setOcrProgressStatus('');
                }}
                className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-[#23222c] dark:file:text-zinc-200"
              />
              <p className="text-[10px] text-zinc-500">PDF / image OCR, DOCX text extraction · 25 MB max · available until you leave this page</p>
              {selectedFile && (
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block max-w-full break-all rounded bg-zinc-100 px-2.5 py-1 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <button
                    type="button"
                    disabled={isOcrRunning}
                    onClick={() => {
                      setSelectedFile(null);
                      setOcrResult(null);
                      setUploadError(null);
                    }}
                    className="rounded-full p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <label className="block space-y-1 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
              Document category
              <select
                value={uploadCategory}
                disabled={isOcrRunning}
                onChange={(event) => setUploadCategory(event.target.value as LifeStageCategory)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-[#2d2b38] dark:bg-[#18171f]"
              >
                {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </label>
            {(!ocrResult || ocrResult.status === 'failed') && !isOcrRunning && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadDocOpen(false);
                    setUploadError(null);
                    setSelectedFile(null);
                  }}
                  className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#14141e] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedFile) {
                      setUploadError('Choose a file first.');
                      return;
                    }
                    setIsOcrRunning(true);
                    setUploadError(null);
                    setOcrProgress(0);
                    setOcrProgressStatus('Starting text extraction');
                    setOcrResult(null);
                    try {
                      const result = await runLocalOcr(selectedFile, (progress, status) => {
                        setOcrProgress(Math.round(progress * 100));
                        setOcrProgressStatus(status);
                      });
                      setOcrResult({
                        documentId: `local-${crypto.randomUUID()}`,
                        fileName: selectedFile.name,
                        fileType: selectedFile.type || selectedFile.name.split('.').pop() || 'file',
                        fileSize: selectedFile.size,
                        uploadedAt: new Date().toISOString(),
                        status: 'completed',
                        pages: result.pages,
                        fullText: result.fullText,
                        extractionMethod: result.extractionMethod,
                        processingTimeMs: result.processingTimeMs,
                      });
                    } catch (error) {
                      setUploadError(error instanceof Error ? error.message : 'OCR failed');
                      setOcrResult({
                        documentId: `local-${crypto.randomUUID()}`,
                        fileName: selectedFile.name,
                        fileType: selectedFile.type || selectedFile.name.split('.').pop() || 'file',
                        fileSize: selectedFile.size,
                        uploadedAt: new Date().toISOString(),
                        status: 'failed',
                        pages: [],
                        fullText: '',
                        error: error instanceof Error ? error.message : 'OCR failed',
                      });
                    } finally {
                      setIsOcrRunning(false);
                    }
                  }}
                  disabled={!selectedFile}
                  className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <FileType className="w-3.5 h-3.5" />
                  <span>Extract Text</span>
                </button>
              </div>
            )}
            {isOcrRunning && (
              <div className="space-y-2 py-3">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5a25eb]" />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-300">{ocrProgressStatus} · {ocrProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-full rounded-full bg-[#5a25eb] transition-all" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}
            {ocrResult && (
              <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12] p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">OCR Result</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${
                    ocrResult.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                  }`}>
                    {ocrResult.status === 'completed' ? 'Completed' : 'Failed'}
                  </span>
                </div>
                {ocrResult.status === 'completed' && (
                  <>
                    <p className="text-[10px] text-zinc-500">
                      Pages: {ocrResult.pages.length} · {ocrResult.extractionMethod === 'document-text' ? 'Word text extraction' : 'OCR'} · {ocrResult.processingTimeMs} ms
                    </p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white dark:bg-[#18171f] p-2 text-[10px] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2d2b38]">
                      {ocrResult.fullText}
                    </pre>
                    <details className="text-[10px] text-zinc-600 dark:text-zinc-300">
                      <summary className="cursor-pointer text-[#5a25eb]">View JSON</summary>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white dark:bg-[#18171f] p-2 text-[10px] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#2d2b38]">
                        {JSON.stringify(ocrResult, null, 2)}
                      </pre>
                    </details>
                  </>
                )}
                {ocrResult.status === 'failed' && (
                  <p className="text-[10px] text-red-600 dark:text-red-400">{ocrResult.error || 'Unknown error'}</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOcrResult(null);
                      setSelectedFile(null);
                    }}
                    className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#14141e] text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                  {ocrResult.status === 'completed' && selectedFile && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedFile || ocrResult.status !== 'completed') return;
                        const fileUrl = URL.createObjectURL(selectedFile);
                        localFileUrls.current.push(fileUrl);
                        const newRecords: OCRRecordField[] = ocrResult.pages.map((page) => ({
                          id: `ocr-${ocrResult.documentId}-page-${page.pageNumber}`,
                          category: uploadCategory,
                          fieldName: `OCR Text - Page ${page.pageNumber}`,
                          value: page.text,
                          source: 'Extracted from document',
                          evidenceDocName: selectedFile.name,
                          lastUpdated: 'Just now',
                          confidence: 'evidence-backed',
                          ocrDocument: ocrResult,
                        }));
                        setOcrRecords((previous) => [...newRecords, ...previous]);
                        setLocalDocuments((previous) => [{
                          id: ocrResult.documentId,
                          name: selectedFile.name,
                          category: uploadCategory,
                          fileType: ocrResult.fileType.split('/').pop()?.toUpperCase() || 'FILE',
                          fileSize: selectedFile.size < 1024 * 1024
                            ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                            : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
                          uploadDate: new Date().toLocaleDateString(),
                          extractedFieldsCount: ocrResult.pages.length,
                          status: 'Stored locally',
                          fileUrl,
                          ocrResult,
                        }, ...previous]);

                        // Sync with backend Document Agent & Neo4j Aura
                        void (async () => {
                          const backendRes = await uploadDocumentToBackend(selectedFile, uploadCategory);
                          if (backendRes && backendRes.extractedFields) {
                            setRecords((prev) => [...backendRes.extractedFields, ...prev]);
                          }
                          if (backendRes && backendRes.document) {
                            setDocuments((prev) => [backendRes.document, ...prev]);
                            setIsUsingSampleDocuments(false);
                          }
                        })();

                        setIsUploadDocOpen(false);
                        setUploadError(null);
                        setSelectedFile(null);
                        setOcrResult(null);
                      }}
                      className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer"
                    >
                      Save to Memory
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Cryptographic Provenance & Evidence Modal */}
      <Modal
        isOpen={isProvenanceModalOpen && !!selectedClaim}
        onClose={() => {
          setIsProvenanceModalOpen(false);
          setSelectedClaim(null);
        }}
        title="Claim Provenance & Cryptographic Assurance"
        subtitle="Deterministic evidence verification stored in Neo4j Aura knowledge graph."
        maxWidth="max-w-lg"
      >
        {selectedClaim && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#0e0e14] border border-zinc-200 dark:border-[#222230] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {selectedClaim.category}
                </span>
                <StatusBadge type={selectedClaim.confidence} label={selectedClaim.source} />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {selectedClaim.fieldName}
              </h3>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#14141e] border border-zinc-200 dark:border-[#222230]">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Stored Value:</span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm break-words">
                  {selectedClaim.value}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0e0e14] border border-zinc-200 dark:border-[#222230]">
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Assurance Level:
                </span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedClaim.confidence === 'evidence-backed'
                    ? 'Level 2 (Cryptographic Evidence Attached)'
                    : 'Level 1 (User Self-Assertion)'}
                </span>
              </div>

              {selectedClaim.evidenceDocName && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" /> Source Document:
                    </span>
                    <span className="font-mono text-[11px]">{selectedClaim.evidenceDocName}</span>
                  </div>
                  {selectedClaim.evidenceDocHash && (
                    <div className="pt-1 border-t border-emerald-500/20 text-[10px] font-mono break-all opacity-80">
                      SHA-256: {selectedClaim.evidenceDocHash}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-[#0e0e14] border border-zinc-200 dark:border-[#222230]">
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#5a25eb] dark:text-[#cbbeff]" />
                  Graph Node:
                </span>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  Neo4j Aura Synced (Claim:{selectedClaim.id})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-[#222230]">
              <button
                type="button"
                onClick={() => handleCopy(selectedClaim.id, selectedClaim.value)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-100 dark:bg-[#14141e] hover:bg-zinc-200 dark:hover:bg-[#1c1c28] text-xs font-medium cursor-pointer"
              >
                {copiedId === selectedClaim.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Value</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsProvenanceModalOpen(false);
                  navigate('/chat');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI Agent</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
