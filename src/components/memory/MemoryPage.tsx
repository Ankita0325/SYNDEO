import React, { useState } from 'react';
import { initialRecords, initialDocuments } from '../../data/mockData';
import type { LifeStageCategory, RecordField, DocumentItem } from '../../types';
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
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [selectedCategory, setSelectedCategory] = useState<LifeStageCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [isAddInfoOpen, setIsAddInfoOpen] = useState<boolean>(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState<boolean>(false);

  // Add Info Form state
  const [newCategory, setNewCategory] = useState<LifeStageCategory>('identity');
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<'Confirmed by you' | 'Extracted from document'>('Confirmed by you');

  // Upload Document Flow state
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3 | 4>(1);
  const uploadedFileName = 'Degree_Provisional_Certificate.pdf';
  const uploadedFileSize = '1.8 MB';

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

  const handleAddRecord = (e: React.FormEvent) => {
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
  };

  const handleFinishUpload = () => {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      name: uploadedFileName,
      category: 'education',
      fileType: 'PDF',
      fileSize: uploadedFileSize,
      uploadDate: 'Just now',
      extractedFieldsCount: 2,
      status: 'Parsed',
    };

    const newExtractedRec: RecordField = {
      id: `rec-ext-${Date.now()}`,
      category: 'education',
      fieldName: 'University Provisional Number',
      value: 'PRV-2024-8849',
      source: 'Extracted from document',
      evidenceDocName: uploadedFileName,
      lastUpdated: 'Just now',
      confidence: 'evidence-backed',
    };

    setDocuments([newDoc, ...documents]);
    setRecords([newExtractedRec, ...records]);
    setIsUploadDocOpen(false);
    setUploadStep(1);
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
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
            {['Upload', 'Extract', 'Review', 'Save'].map((label, idx) => (
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
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  Degree_Provisional_Certificate.pdf (1.8 MB)
                </span>
              </div>
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
                  className="px-4 py-1.5 rounded-full bg-[#5a25eb] text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
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
                <div className="flex items-center justify-between">
                  <span>Parsing Fields...</span>
                  <span className="text-emerald-500 font-mono">100% Done</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#5a25eb] h-full rounded-full w-full" />
                </div>
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
                <span className="text-[10px] text-zinc-400">Extracted Field</span>
                <p className="font-semibold text-zinc-900 dark:text-white">University Provisional Number</p>
                <p className="font-mono text-[#5a25eb] text-xs">PRV-2024-8849</p>
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
                className="px-5 py-2 rounded-full bg-[#5a25eb] text-white text-xs font-medium cursor-pointer shadow-xs"
              >
                Save to Memory
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
