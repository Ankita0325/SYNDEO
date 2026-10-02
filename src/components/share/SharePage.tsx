import React, { useState, useMemo } from 'react';
import { initialSharedLinks } from '../../data/mockData';
import type { SharedLink } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Share2,
  Plus,
  Search,
  Check,
  Copy,
  ExternalLink,
  Globe,
  GraduationCap,
  Landmark,
  HeartPulse,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  Eye,
  UserCheck,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectableFieldItem {
  id: string;
  category: 'social' | 'education' | 'finance' | 'health';
  categoryLabel: string;
  label: string;
  value: string;
  signature: string;
}

const AVAILABLE_FIELDS: SelectableFieldItem[] = [
  // Social
  {
    id: 'soc-github',
    category: 'social',
    categoryLabel: 'Social',
    label: 'GitHub',
    value: 'https://github.com/indresh404/SYNDEO',
    signature: '0x9a8f...4e1',
  },
  {
    id: 'soc-linkedin',
    category: 'social',
    categoryLabel: 'Social',
    label: 'LinkedIn',
    value: 'https://linkedin.com/in/indresh-suresh-093646399',
    signature: '0x81bd...2c4',
  },
  {
    id: 'soc-email',
    category: 'social',
    categoryLabel: 'Social',
    label: 'Email',
    value: 'indresh@example.com',
    signature: '0x27fc...88a',
  },
  {
    id: 'soc-twitter',
    category: 'social',
    categoryLabel: 'Social',
    label: 'Twitter / X',
    value: '@indresh404',
    signature: '0x14ea...559',
  },
  {
    id: 'soc-discord',
    category: 'social',
    categoryLabel: 'Social',
    label: 'Discord',
    value: '@indresh404#1337',
    signature: '0x5b33...7d1',
  },
  {
    id: 'soc-portfolio',
    category: 'social',
    categoryLabel: 'Social',
    label: 'Portfolio Website',
    value: 'https://indresh.dev',
    signature: '0x6e9a...3f0',
  },

  // Education
  {
    id: 'edu-school',
    category: 'education',
    categoryLabel: 'Education',
    label: 'School / College',
    value: 'SLRTCE (Shree L. R. Tiwari College of Engineering)',
    signature: '0xec21...8b7',
  },
  {
    id: 'edu-degree',
    category: 'education',
    categoryLabel: 'Education',
    label: 'Degree & Major',
    value: 'Bachelor of Engineering in Computer Science',
    signature: '0x77d2...9c1',
  },
  {
    id: 'edu-cgpa',
    category: 'education',
    categoryLabel: 'Education',
    label: 'GPA / CGPA',
    value: '8.45 / 10.0 (Top 5% Merit)',
    signature: '0x33e1...12a',
  },
  {
    id: 'edu-gradyear',
    category: 'education',
    categoryLabel: 'Education',
    label: 'Graduation Year',
    value: 'Class of 2024',
    signature: '0x992b...a0f',
  },
  {
    id: 'edu-transcript',
    category: 'education',
    categoryLabel: 'Education',
    label: 'Official Transcripts',
    value: 'SLRTCE Final Transcript Registrar Record #88219',
    signature: '0xfa11...32d',
  },

  // Finance
  {
    id: 'fin-bank',
    category: 'finance',
    categoryLabel: 'Finance',
    label: 'Bank Account',
    value: 'HDFC Bank (IFSC: HDFC0000128) ****0128',
    signature: '0xbb04...8e2',
  },
  {
    id: 'fin-credit',
    category: 'finance',
    label: 'Credit Score',
    categoryLabel: 'Finance',
    value: '782 (Excellent Tier)',
    signature: '0x12c4...77e',
  },
  {
    id: 'fin-tax',
    category: 'finance',
    categoryLabel: 'Finance',
    label: 'Tax ID / PAN',
    value: 'ABCPS9821K (ITD Verified)',
    signature: '0x88f1...19a',
  },
  {
    id: 'fin-income',
    category: 'finance',
    categoryLabel: 'Finance',
    label: 'Monthly Income',
    value: '₹85,000 / month (Verified Deposit)',
    signature: '0x49a2...61b',
  },
  {
    id: 'fin-crypto',
    category: 'finance',
    categoryLabel: 'Finance',
    label: 'Crypto Wallet',
    value: '0x71C...3a9F (Ethereum Mainnet)',
    signature: '0x00f8...5e9',
  },

  // Health
  {
    id: 'hlth-blood',
    category: 'health',
    categoryLabel: 'Health',
    label: 'Blood Group',
    value: 'O Positive (O+)',
    signature: '0x32ba...11f',
  },
  {
    id: 'hlth-vaccine',
    category: 'health',
    categoryLabel: 'Health',
    label: 'Vaccine Records',
    value: 'COVID-19 Booster & MMR Complete',
    signature: '0x99ea...72c',
  },
  {
    id: 'hlth-insurance',
    category: 'health',
    categoryLabel: 'Health',
    label: 'Medical Insurance',
    value: 'Star Health & Allied — Policy #SH-88921-99',
    signature: '0x66c8...34e',
  },
  {
    id: 'hlth-emergency',
    category: 'health',
    categoryLabel: 'Health',
    label: 'Emergency Contact',
    value: 'Ankita (+91 98201 55910)',
    signature: '0x18db...44b',
  },
  {
    id: 'hlth-allergies',
    category: 'health',
    categoryLabel: 'Health',
    label: 'Known Allergies',
    value: 'Penicillin (Severe), Pollen (Mild)',
    signature: '0x70aa...29f',
  },
];

export const SharePage: React.FC = () => {
  // Selected State for Creator
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(
    new Set(['soc-github', 'soc-linkedin', 'soc-email', 'edu-school', 'edu-degree'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientInput, setRecipientInput] = useState('Acme University Postgraduate Admissions');
  const [expiryOption, setExpiryOption] = useState<'1h' | '24h' | '7d' | 'never'>('24h');

  // Modals & Drawers
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [isShareSuccessModalOpen, setIsShareSuccessModalOpen] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>('link-1');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newShareToken, setNewShareToken] = useState('share-78b10f2c');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Link History
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>(initialSharedLinks);

  // Add Field To Link Drawer Modal
  const [activeDrawerLinkId, setActiveDrawerLinkId] = useState<string | null>(null);
  const [searchAddDrawerQuery, setSearchAddDrawerQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleField = (id: string) => {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFieldIds(new Set(AVAILABLE_FIELDS.map((f) => f.id)));
  };

  const clearAll = () => {
    setSelectedFieldIds(new Set());
  };

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return AVAILABLE_FIELDS;
    const q = searchQuery.toLowerCase();
    return AVAILABLE_FIELDS.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.categoryLabel.toLowerCase().includes(q) ||
        f.value.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const categories: Array<{ key: SelectableFieldItem['category']; label: string; icon: React.ReactNode }> = [
    { key: 'social', label: 'Social', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { key: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4 text-purple-400" /> },
    { key: 'finance', label: 'Finance', icon: <Landmark className="w-4 h-4 text-emerald-500" /> },
    { key: 'health', label: 'Health', icon: <HeartPulse className="w-4 h-4 text-rose-500" /> },
  ];

  const handleGenerateShare = () => {
    if (selectedFieldIds.size === 0) return;

    const token = `share-${Math.random().toString(36).substring(2, 9)}`;
    const selectedFieldsList = AVAILABLE_FIELDS.filter((f) => selectedFieldIds.has(f.id)).map((f) => f.label);

    const newLink: SharedLink = {
      id: token,
      recipient: recipientInput || 'Verified Partner Review',
      fieldsShared: selectedFieldsList,
      createdAt: 'Just now',
      expiry:
        expiryOption === '1h'
          ? 'Expires in 1 hour'
          : expiryOption === '24h'
          ? 'Expires in 24 hours'
          : expiryOption === '7d'
          ? 'Expires in 7 days'
          : 'Permanent (Until revoked)',
      status: 'Active',
      accessCount: 0,
      viewers: [],
      accessRequests: [],
    };

    setNewShareToken(token);
    setSharedLinks([newLink, ...sharedLinks]);
    setExpandedLinkId(token);
    setIsCreatePanelOpen(false);
    setIsShareSuccessModalOpen(true);
    showToast('New verifiable share link generated!');
  };

  // Open real separate share link in a new tab
  const openShareLinkInNewTab = (tokenId: string) => {
    const url = `${window.location.origin}/?share=${tokenId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyUrl = (tokenId: string) => {
    const url = `${window.location.origin}/?share=${tokenId}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(tokenId);
    showToast('Unique share link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevoke = (id: string) => {
    setSharedLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, status: 'Revoked', expiry: 'Revoked by user' } : link))
    );
    showToast('Link access revoked.');
  };

  const handleRestore = (id: string) => {
    setSharedLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, status: 'Active', expiry: 'Active (24h)' } : link))
    );
    showToast('Link reactivated.');
  };

  // Live Field Removal from Link Drawer
  const handleRemoveFieldFromLink = (linkId: string, fieldName: string) => {
    setSharedLinks((prev) =>
      prev.map((link) => {
        if (link.id !== linkId) return link;
        return {
          ...link,
          fieldsShared: link.fieldsShared.filter((f) => f !== fieldName),
        };
      })
    );
    showToast(`Removed "${fieldName}" from live link.`);
  };

  // Live Field Addition to Link Drawer
  const handleAddFieldToLink = (linkId: string, fieldName: string) => {
    setSharedLinks((prev) =>
      prev.map((link) => {
        if (link.id !== linkId) return link;
        if (link.fieldsShared.includes(fieldName)) return link;
        return {
          ...link,
          fieldsShared: [...link.fieldsShared, fieldName],
        };
      })
    );
    setActiveDrawerLinkId(null);
    showToast(`Added "${fieldName}" to live link.`);
  };

  // Handle Access Request Approval / Decline
  const handleApproveRequest = (linkId: string, requestId: string, reqFields: string[]) => {
    setSharedLinks((prev) =>
      prev.map((link) => {
        if (link.id !== linkId) return link;
        const newFields = Array.from(new Set([...link.fieldsShared, ...reqFields]));
        const updatedReqs = link.accessRequests?.map((r) => (r.id === requestId ? { ...r, status: 'approved' as const } : r));
        return {
          ...link,
          fieldsShared: newFields,
          accessRequests: updatedReqs,
        };
      })
    );
    showToast('Access request approved! Disclosed requested fields.');
  };

  const handleDeclineRequest = (linkId: string, requestId: string) => {
    setSharedLinks((prev) =>
      prev.map((link) => {
        if (link.id !== linkId) return link;
        const updatedReqs = link.accessRequests?.map((r) => (r.id === requestId ? { ...r, status: 'declined' as const } : r));
        return {
          ...link,
          accessRequests: updatedReqs,
        };
      })
    );
    showToast('Access request declined.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-[#5a25eb] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Minimalist Header with Top Corner Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-[#23222a]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#e4e1e8]">
              Share Information
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              Zero-Knowledge Verification
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-[#8c879a] mt-1">
            Generate scoped share links. Real-time audit logs show who has viewed and who is requesting access.
          </p>
        </div>

        {/* Top Corner Button */}
        <button
          onClick={() => setIsCreatePanelOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white font-semibold text-sm transition-all shadow-md shadow-[#5a25eb]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Create Share Link
        </button>
      </div>

      {/* Redesigned Active & Past Shared Links with Accordion Toggle Drawers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8c879a] flex items-center gap-2">
            <span>Active & Past Shared Links ({sharedLinks.length})</span>
            <span className="text-xs font-normal font-sans text-zinc-400">
              • Click any link to inspect viewers & access requests
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          {sharedLinks.map((link) => {
            const isExpanded = expandedLinkId === link.id;
            const viewers = link.viewers || [];
            const requests = link.accessRequests || [];
            const pendingRequests = requests.filter((r) => r.status === 'pending');

            return (
              <div
                key={link.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-white dark:bg-[#131317] ${
                  isExpanded
                    ? 'border-[#5a25eb]/60 shadow-md ring-1 ring-[#5a25eb]/20'
                    : 'border-zinc-200 dark:border-[#24232c] hover:border-zinc-300 dark:hover:border-[#353340]'
                }`}
              >
                {/* Accordion Row Header */}
                <div
                  onClick={() => setExpandedLinkId(isExpanded ? null : link.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-[#171620]/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#1f1e29] border border-zinc-200 dark:border-[#2d2b38] flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff] shrink-0 mt-0.5 sm:mt-0">
                      <Share2 className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-[#e4e1e8] truncate">
                          {link.recipient}
                        </h3>
                        <StatusBadge
                          type={
                            link.status === 'Active'
                              ? 'active'
                              : link.status === 'Revoked'
                              ? 'revoked'
                              : 'expired'
                          }
                          label={link.status}
                        />
                        {pendingRequests.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {pendingRequests.length} Access Request Pending
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-[#8c879a] flex-wrap">
                        <span className="font-mono text-[11px]">TOKEN: {link.id}</span>
                        <span>•</span>
                        <span>{link.fieldsShared.length} Disclosed Fields</span>
                        <span>•</span>
                        <span>{viewers.length} Verified Views</span>
                        <span>•</span>
                        <span className="font-mono">{link.expiry}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Toggle Indicator */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openShareLinkInNewTab(link.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#5a25eb]/10 hover:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Open link in a new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(link.id);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-[#2d2c38] text-zinc-600 dark:text-[#c4bfcf] hover:bg-zinc-100 dark:hover:bg-[#201f2b] transition-colors cursor-pointer"
                      title="Copy Shareable Link"
                    >
                      {copiedToken === link.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <div className="p-1 text-zinc-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* EXPANDABLE DRAWER DETAILS */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-zinc-100 dark:border-[#201f29] bg-zinc-50/50 dark:bg-[#16151e]/60 p-5 space-y-6"
                    >
                      {/* Section 1: Who Has Seen My Link */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c4bfcf] flex items-center gap-2">
                            <Eye className="w-4 h-4 text-[#5a25eb]" />
                            <span>Who Has Seen This Link ({viewers.length})</span>
                          </h4>
                          <span className="text-[11px] font-mono text-zinc-400">
                            Zero-Knowledge Audit Trail
                          </span>
                        </div>

                        {viewers.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-[#262530] text-center text-xs text-zinc-500">
                            No one has accessed or decrypted this link yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {viewers.map((viewer) => (
                              <div
                                key={viewer.id}
                                className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#262530] bg-white dark:bg-[#131317] flex items-start justify-between gap-3 shadow-sm"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] font-bold text-[10px] flex items-center justify-center">
                                      {viewer.userName[0]}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                      {viewer.userName}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500 dark:text-[#8c879a]">{viewer.roleOrOrg}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                    <Clock className="w-3 h-3" />
                                    <span>{viewer.viewedAt}</span>
                                    <span>•</span>
                                    <MapPin className="w-3 h-3" />
                                    <span>{viewer.ipLocation}</span>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 2: Access Requests (Users Who Want Access to Additional Info) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c4bfcf] flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-amber-500" />
                            <span>Access Requests & Inbound Inquiries ({requests.length})</span>
                          </h4>
                        </div>

                        {requests.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-[#262530] text-center text-xs text-zinc-500">
                            No pending access requests for this link.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {requests.map((req) => (
                              <div
                                key={req.id}
                                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-[#1a171c] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                      {req.requesterName} ({req.organization})
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono">Requested {req.requestedAt}</span>
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-[#b4afc2]">
                                    Purpose: <em>"{req.purpose}"</em>
                                  </p>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <span className="text-[11px] font-medium text-zinc-500">Requested Fields:</span>
                                    {req.requestedFields.map((f, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#5a25eb]/10 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30"
                                      >
                                        +{f}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {req.status === 'pending' ? (
                                    <>
                                      <button
                                        onClick={() => handleApproveRequest(link.id, req.id, req.requestedFields)}
                                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                                      >
                                        Approve Access
                                      </button>
                                      <button
                                        onClick={() => handleDeclineRequest(link.id, req.id)}
                                        className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#383645] text-zinc-600 dark:text-[#c4bfcf] hover:bg-zinc-200 dark:hover:bg-[#252430] text-xs font-medium cursor-pointer transition-colors"
                                      >
                                        Decline
                                      </button>
                                    </>
                                  ) : req.status === 'approved' ? (
                                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Approved
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-[#201f2b] text-zinc-500">
                                      Declined
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 3: Live Disclosed Fields Management (Add/Remove Anytime) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c4bfcf] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            <span>Currently Disclosed Fields ({link.fieldsShared.length})</span>
                          </h4>

                          <button
                            onClick={() => setActiveDrawerLinkId(link.id)}
                            className="text-xs text-[#5a25eb] dark:text-[#cbbeff] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Information to this Live Link
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {link.fieldsShared.map((field, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#1a1924] border border-zinc-200 dark:border-[#2e2c3b] text-zinc-800 dark:text-[#e4e1e8] flex items-center gap-2 shadow-sm"
                            >
                              <span>{field}</span>
                              <button
                                onClick={() => handleRemoveFieldFromLink(link.id, field)}
                                className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                title={`Remove ${field} from this link`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 4: Link Controls */}
                      <div className="pt-3 border-t border-zinc-200 dark:border-[#22212d] flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                          <span>LINK URL:</span>
                          <span className="text-zinc-800 dark:text-[#cbbeff] truncate max-w-xs sm:max-w-md">
                            {window.location.origin}/?share={link.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openShareLinkInNewTab(link.id)}
                            className="px-4 py-2 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open In New Tab
                          </button>

                          {link.status === 'Active' ? (
                            <button
                              onClick={() => handleRevoke(link.id)}
                              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium cursor-pointer transition-colors"
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(link.id)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium cursor-pointer transition-colors"
                            >
                              Restore Link
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE SHARE MODAL / SLIDE-OVER PANEL */}
      <Modal
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
        title="Create Scoped Share Packet"
        subtitle="Search and select fields to disclose. Selected cards turn white."
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any information (e.g. GitHub, GPA, School, LinkedIn, Bank)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#2d2b38] bg-zinc-50 dark:bg-[#18171f] text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#5a25eb]/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Select Controls */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200 dark:border-[#22212b]">
            <span className="font-semibold text-zinc-700 dark:text-[#a29db0]">
              Selected: <strong className="text-[#5a25eb] dark:text-[#cbbeff]">{selectedFieldIds.size}</strong> fields
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-xs text-[#5a25eb] dark:text-[#cbbeff] hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-zinc-400">•</span>
              <button
                onClick={clearAll}
                className="text-xs text-zinc-500 hover:text-red-500 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Categorized White Capsule Selection Cards */}
          <div className="space-y-5">
            {categories.map((cat) => {
              const catFields = filteredFields.filter((f) => f.category === cat.key);
              if (catFields.length === 0) return null;

              return (
                <div key={cat.key} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-[#c4bfcf]">
                    {cat.icon}
                    <span>{cat.label}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ({catFields.filter((f) => selectedFieldIds.has(f.id)).length}/{catFields.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {catFields.map((field) => {
                      const isSelected = selectedFieldIds.has(field.id);
                      return (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() => toggleField(field.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-2 border ${
                            isSelected
                              ? 'bg-white text-zinc-950 font-semibold border-white shadow-lg ring-2 ring-[#5a25eb]/40'
                              : 'bg-zinc-100 dark:bg-[#1a1923] text-zinc-700 dark:text-[#b4afc2] border-zinc-200 dark:border-[#2d2b38] hover:border-zinc-300 dark:hover:border-[#3e3b4d]'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                              isSelected
                                ? 'bg-[#5a25eb] text-white'
                                : 'border border-zinc-400 dark:border-[#4d495b]'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{field.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recipient & Expiry */}
          <div className="pt-4 border-t border-zinc-200 dark:border-[#23222a] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-[#a29db0]">
                Recipient / Institution
              </label>
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="e.g. Acme University Admissions"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2b38] bg-zinc-50 dark:bg-[#18171f] text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5a25eb]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-[#a29db0]">
                Link Expiry
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value as '1h' | '24h' | '7d' | 'never')}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2b38] bg-zinc-50 dark:bg-[#18171f] text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5a25eb]/50 cursor-pointer"
              >
                <option value="1h">1 Hour</option>
                <option value="24h">24 Hours (Default)</option>
                <option value="7d">7 Days</option>
                <option value="never">Permanent (Until Revoked)</option>
              </select>
            </div>
          </div>

          {/* Bottom Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={() => setIsCreatePanelOpen(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2b38] text-zinc-700 dark:text-[#c4bfcf] hover:bg-zinc-100 dark:hover:bg-[#201f2b] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateShare}
              disabled={selectedFieldIds.size === 0}
              className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                selectedFieldIds.size > 0
                  ? 'bg-[#5a25eb] hover:bg-[#6b37fa] text-white shadow-[#5a25eb]/25'
                  : 'bg-zinc-300 dark:bg-[#252430] text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Share2 className="w-4 h-4" />
              Generate & Share ({selectedFieldIds.size})
            </button>
          </div>
        </div>
      </Modal>

      {/* POPUP MODAL ON CREATION: QR + DIRECT SHARE LINK */}
      <Modal
        isOpen={isShareSuccessModalOpen}
        onClose={() => setIsShareSuccessModalOpen(false)}
        title="Share Link & QR Code Generated"
        subtitle="This scoped link can be opened in a new tab and requires platform registration to decrypt."
      >
        <div className="space-y-6 text-center py-2">
          {/* Sample QR Code Box */}
          <div className="p-6 bg-white rounded-2xl w-56 h-56 mx-auto flex items-center justify-center shadow-xl border border-zinc-100">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" fill="white" />
              {/* Corner 1 */}
              <rect x="10" y="10" width="25" height="25" fill="#131317" rx="3" />
              <rect x="15" y="15" width="15" height="15" fill="white" rx="1" />
              <rect x="18" y="18" width="9" height="9" fill="#5a25eb" />
              {/* Corner 2 */}
              <rect x="65" y="10" width="25" height="25" fill="#131317" rx="3" />
              <rect x="70" y="15" width="15" height="15" fill="white" rx="1" />
              <rect x="73" y="18" width="9" height="9" fill="#5a25eb" />
              {/* Corner 3 */}
              <rect x="10" y="65" width="25" height="25" fill="#131317" rx="3" />
              <rect x="15" y="70" width="15" height="15" fill="white" rx="1" />
              <rect x="18" y="73" width="9" height="9" fill="#5a25eb" />
              {/* Matrix Dots */}
              <rect x="42" y="12" width="6" height="6" fill="#131317" />
              <rect x="52" y="12" width="6" height="6" fill="#131317" />
              <rect x="42" y="24" width="6" height="6" fill="#5a25eb" />
              <rect x="52" y="32" width="6" height="6" fill="#131317" />
              <rect x="12" y="42" width="6" height="6" fill="#131317" />
              <rect x="24" y="42" width="6" height="6" fill="#5a25eb" />
              <rect x="34" y="42" width="6" height="6" fill="#131317" />
              <rect x="45" y="45" width="10" height="10" fill="#5a25eb" rx="2" />
              <rect x="62" y="42" width="6" height="6" fill="#131317" />
              <rect x="74" y="42" width="6" height="6" fill="#131317" />
              <rect x="84" y="42" width="6" height="6" fill="#5a25eb" />
              <rect x="42" y="62" width="6" height="6" fill="#131317" />
              <rect x="52" y="72" width="6" height="6" fill="#5a25eb" />
              <rect x="65" y="65" width="6" height="6" fill="#131317" />
              <rect x="78" y="65" width="6" height="6" fill="#131317" />
              <rect x="65" y="78" width="6" height="6" fill="#5a25eb" />
              <rect x="78" y="78" width="6" height="6" fill="#131317" />
            </svg>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 dark:text-[#9e9aa8]">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Restricted: Registration Required to Decrypt</span>
            </div>

            {/* Unique Link Box */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-[#181720] border border-zinc-200 dark:border-[#2c2a38]">
              <span className="text-xs font-mono text-zinc-800 dark:text-[#cbbeff] truncate px-2 flex-1 text-left">
                {window.location.origin}/?share={newShareToken}
              </span>
              <button
                onClick={() => copyUrl(newShareToken)}
                className="px-3 py-1.5 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1"
              >
                {copiedToken === newShareToken ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedToken === newShareToken ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => {
                setIsShareSuccessModalOpen(false);
                openShareLinkInNewTab(newShareToken);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Link in New Tab
            </button>
            <button
              onClick={() => setIsShareSuccessModalOpen(false)}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-[#2d2c38] text-zinc-700 dark:text-[#c4bfcf] hover:bg-zinc-100 dark:hover:bg-[#1f1e27] text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* QUICK ADD FIELD MODAL FOR LINK DRAWER */}
      <Modal
        isOpen={!!activeDrawerLinkId}
        onClose={() => setActiveDrawerLinkId(null)}
        title="Disclose Additional Information"
        subtitle="Select any record to add to this active live share link immediately."
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchAddDrawerQuery}
              onChange={(e) => setSearchAddDrawerQuery(e.target.value)}
              placeholder="Search available fields (e.g. Bank, Transcripts, Vaccine)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2b38] bg-zinc-50 dark:bg-[#18171f] text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5a25eb]/50"
            />
          </div>

          <div className="space-y-2">
            {AVAILABLE_FIELDS.filter((f) => {
              const currentLink = sharedLinks.find((l) => l.id === activeDrawerLinkId);
              return !currentLink?.fieldsShared.includes(f.label);
            })
              .filter(
                (f) =>
                  !searchAddDrawerQuery.trim() ||
                  f.label.toLowerCase().includes(searchAddDrawerQuery.toLowerCase()) ||
                  f.category.toLowerCase().includes(searchAddDrawerQuery.toLowerCase())
              )
              .map((field) => (
                <div
                  key={field.id}
                  onClick={() => activeDrawerLinkId && handleAddFieldToLink(activeDrawerLinkId, field.label)}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-[#282733] bg-zinc-50 dark:bg-[#181720] hover:border-[#5a25eb] hover:bg-[#5a25eb]/5 dark:hover:bg-[#1d1c28] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</span>
                    <p className="text-xs text-zinc-500 dark:text-[#8c879a] font-mono">{field.value}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium cursor-pointer">
                    + Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
