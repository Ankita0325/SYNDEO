import React, { useState, useEffect, useCallback } from 'react';
import { initialDocuments, initialRecords } from '../../data/mockData';
import type { LifeStageCategory, RecordField, DocumentItem } from '../../types';
import { fetchRecordsFromBackend, fetchDocumentsFromBackend, addClaimToBackend } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { mapSupabaseDocument, type SupabaseDocumentRow } from '../../lib/documents';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ObsidianGraphView } from './ObsidianGraphView';
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
  CheckCircle2,
  FileCheck,
  ArrowRight,
  Network,
  LayoutGrid,
  Copy,
  Check,
} from 'lucide-react';

type ViewMode = 'graph' | 'cards' | 'documents';

export const MemoryPage: React.FC = () => {
  const [records, setRecords] = useState<RecordField[]>(initialRecords);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null);
  const [isUsingSampleDocuments, setIsUsingSampleDocuments] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LifeStageCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const useSampleDocuments = useCallback((error?: string) => {
    setDocuments(initialDocuments.slice(0, 2));
    setIsUsingSampleDocuments(true);
    setDocumentLoadError(error || null);
  }, []);

  // Sync with backend graph store
  useEffect(() => {
    let active = true;

    void (async () => {
      if (!supabase) {
        const backendRecs = await fetchRecordsFromBackend();
        if (active && backendRecs && Array.isArray(backendRecs) && backendRecs.length > 0) {
          setRecords(backendRecs);
        }
      }

      if (supabase) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          if (active) useSampleDocuments(userError.message);
          return;
        }
        if (!user) {
          if (active) useSampleDocuments('Sign in to load your vault documents.');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        if (profileError) {
          if (active) useSampleDocuments(profileError.message);
          return;
        }

        const { data, error } = await supabase
          .from('documents')
          .select('id, file_name, category, document_type, mime_type, file_size, processing_status, created_at')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false });
        if (!active) return;
        if (error) {
          useSampleDocuments(error.message);
          return;
        }
        const savedDocuments = (data || []).map((row) => mapSupabaseDocument(row as SupabaseDocumentRow));
        if (savedDocuments.length === 0) {
          useSampleDocuments();
        } else {
          setDocuments(savedDocuments);
          setIsUsingSampleDocuments(false);
          setDocumentLoadError(null);
        }
      } else {
        const backendDocs = await fetchDocumentsFromBackend();
        if (!active) return;
        if (backendDocs && Array.isArray(backendDocs) && backendDocs.length > 0) {
          setDocuments(backendDocs);
          setIsUsingSampleDocuments(false);
        } else {
          useSampleDocuments();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [useSampleDocuments]);


  // Modals state
  const [isAddInfoOpen, setIsAddInfoOpen] = useState<boolean>(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<LifeStageCategory>('education');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Add Info Form state
  const [newCategory, setNewCategory] = useState<LifeStageCategory>('identity');
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<'Confirmed by you' | 'Extracted from document'>('Confirmed by you');

  // Upload Document Flow state
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3 | 4>(1);

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

  const handleFinishUpload = async () => {
    if (!selectedFile) {
      setUploadError('Choose a PDF or image file first.');
      setUploadStep(1);
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setUploadError('Choose a file smaller than 25 MB.');
      setUploadStep(1);
      return;
    }
    if (!supabase) {
      setUploadError('Supabase is not configured. Check the VITE Supabase URL and anon key.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    let storagePath: string | null = null;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Sign in before uploading documents.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (profileError) throw profileError;

      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      const mimeType = selectedFile.type || (extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : '');
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(mimeType)) {
        throw new Error('Only PDF, PNG, and JPEG documents are supported.');
      }
      storagePath = `${profile.id}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, selectedFile, {
          contentType: mimeType,
          upsert: false,
        });
      if (storageError) throw storageError;

      const bytes = await selectedFile.arrayBuffer();
      const hashBytes = await crypto.subtle.digest('SHA-256', bytes);
      const sha256Hash = Array.from(new Uint8Array(hashBytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const { data: insertedDocument, error: documentError } = await supabase
        .from('documents')
        .insert({
          profile_id: profile.id,
          file_name: selectedFile.name,
          storage_path: storagePath,
          document_type: extension || 'unknown',
          category: uploadCategory,
          mime_type: mimeType,
          file_size: selectedFile.size,
          sha256_hash: sha256Hash,
          processing_status: 'PENDING',
        })
        .select('id, file_name, category, document_type, mime_type, file_size, processing_status, created_at')
        .single();
      if (documentError) throw documentError;

      const newDocument = mapSupabaseDocument(insertedDocument as SupabaseDocumentRow);
      setDocuments((previous) => [newDocument, ...(isUsingSampleDocuments ? [] : previous.filter((document) => document.id !== newDocument.id))]);
      setIsUsingSampleDocuments(false);
      setDocumentLoadError(null);
      setIsUploadDocOpen(false);
      setUploadStep(1);
      setSelectedFile(null);
    } catch (error) {
      if (storagePath) {
        await supabase.storage.from('documents').remove([storagePath]);
      }
      const message = error instanceof Error ? error.message : 'Document upload failed.';
      setUploadError(message.toLowerCase().includes('bucket not found')
        ? 'Supabase Storage bucket "documents" is missing. Run supabase_documents.sql in the Supabase SQL Editor, then retry.'
        : message);
    } finally {
      setIsUploading(false);
    }
  };

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
              setUploadStep(1);
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
          <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{documents.length}</p>
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
            <span>Cards Grid ({records.length})</span>
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
            <span>Evidence Files ({documents.length})</span>
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
              All ({records.length})
            </button>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const count = records.filter((r) => r.category === cat.id).length;
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
            {filteredRecords.map((record) => {
              const catMeta = categories.find((c) => c.id === record.category);
              const Icon = catMeta?.icon || FileText;

              return (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-[#1c1c28] bg-white dark:bg-[#07070a] hover:border-[#5a25eb]/40 transition-all space-y-2.5 flex flex-col justify-between shadow-2xs group"
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
                        <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-[#e4e1e8]">
                          {record.value}
                        </p>
                        <button
                          onClick={() => handleCopy(record.id, record.value)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                          title="Copy"
                        >
                          {copiedId === record.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
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

          {filteredRecords.length === 0 && (
            <div className="p-8 text-center border border-dashed border-zinc-300 dark:border-[#2d2b38] rounded-2xl bg-white dark:bg-[#07070a]">
              <Database className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs text-zinc-500">No matching records found.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: EVIDENCE FILES */}
      {viewMode === 'documents' && (
        <div className="space-y-3">
          {isUsingSampleDocuments && (
            <p role="status" className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              Showing two sample documents for testing. Upload a file after configuring the Supabase documents bucket to save your own.
            </p>
          )}
          {documentLoadError && (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Could not load vault documents: {documentLoadError}
            </p>
          )}
          {documents.length === 0 && !documentLoadError && (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-[#2d2b38]">
              No documents uploaded yet.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => (
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
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {doc.status}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-[#14141e] flex items-center justify-between text-[10px] text-zinc-400">
                <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> {doc.extractedFieldsCount} fields verified
                </span>
                <span className="capitalize">{doc.category}</span>
              </div>
            </div>
          ))}
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
        onClose={() => setIsUploadDocOpen(false)}
        title="Document Ingestion"
        subtitle="Extract & verify records from official documents"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {uploadError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {uploadError}
            </p>
          )}
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
            {['Select', 'Review', 'Confirm', 'Save'].map((label, idx) => (
              <div
                key={idx}
                className={`p-1.5 rounded-lg border ${
                  uploadStep === idx + 1
                    ? 'border-[#5a25eb] bg-[#5a25eb]/15 text-[#5a25eb] font-bold'
                    : uploadStep > idx + 1
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 font-semibold'
                    : 'border-zinc-200 dark:border-[#222230] text-zinc-400'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {uploadStep === 1 && (
            <div className="space-y-3 text-center">
              <div className="border border-dashed border-zinc-300 dark:border-[#2d2b38] rounded-2xl p-6 space-y-2">
                <UploadCloud className="w-8 h-8 text-[#5a25eb] mx-auto" />
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Select Document</p>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] || null;
                    if (file && file.size > 25 * 1024 * 1024) {
                      setSelectedFile(null);
                      setUploadError('Choose a file smaller than 25 MB.');
                      return;
                    }
                    setSelectedFile(file);
                    setUploadError(null);
                  }}
                  className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-[#23222c] dark:file:text-zinc-200"
                />
                {selectedFile && (
                  <span className="inline-block max-w-full break-all rounded bg-zinc-100 px-2.5 py-1 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
              <label className="block space-y-1 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                Document category
                <select
                  value={uploadCategory}
                  onChange={(event) => setUploadCategory(event.target.value as LifeStageCategory)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-[#2d2b38] dark:bg-[#18171f]"
                >
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadDocOpen(false)}
                  className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-[#14141e] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setUploadStep(2)}
                  disabled={!selectedFile}
                  className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Extract</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {uploadStep === 2 && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#0c0c12] border border-zinc-200 dark:border-[#222230] space-y-2">
                <p className="font-semibold text-zinc-900 dark:text-white">File selected</p>
                <p className="break-all text-zinc-600 dark:text-zinc-300">{selectedFile?.name}</p>
                <p className="text-zinc-500 dark:text-zinc-400">The original file will be stored privately in your vault.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadStep(3)}
                  className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer"
                >
                  Review Candidate Fields
                </button>
              </div>
            </div>
          )}

          {uploadStep === 3 && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-[#222230] bg-zinc-50 dark:bg-[#0c0c12] space-y-1">
                <span className="text-[10px] text-zinc-400">Document details</span>
                <p className="break-all font-semibold text-zinc-900 dark:text-white">{selectedFile?.name}</p>
                <p className="font-mono text-[#5a25eb] text-xs">{categories.find((item) => item.id === uploadCategory)?.label} · {selectedFile ? (selectedFile.size / 1024).toFixed(0) : 0} KB</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadStep(4)}
                  className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer"
                >
                  Confirm & Commit
                </button>
              </div>
            </div>
          )}

          {uploadStep === 4 && (
            <div className="space-y-3 text-center py-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-zinc-900 dark:text-white">Ready to lock into private vault</p>
              <button
                type="button"
                onClick={handleFinishUpload}
                disabled={isUploading}
                className="px-5 py-2 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer shadow-xs disabled:cursor-wait disabled:opacity-60"
              >
                {isUploading ? 'Uploading...' : 'Save to Memory'}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
