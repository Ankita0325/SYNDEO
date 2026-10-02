import React, { useState, useEffect } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { initialSharedLinks } from '../../data/mockData';
import { Modal } from '../common/Modal';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SharedFieldData {
  id: string;
  category: 'social' | 'education' | 'finance' | 'health';
  label: string;
  value: string;
  signature: string;
  lastVerified?: string;
}

export interface SharedPacketData {
  id: string;
  creatorName: string;
  creatorEmail: string;
  recipient: string;
  createdAt: string;
  expiry: string;
  token: string;
  status: 'Active' | 'Revoked' | 'Expired';
  fields: SharedFieldData[];
}

const ALL_MASTER_FIELDS: SharedFieldData[] = [
  // Social
  {
    id: 'soc-github',
    category: 'social',
    label: 'GitHub',
    value: 'https://github.com/indresh404/SYNDEO',
    signature: '0x9a8f...4e1',
    lastVerified: '01 Oct 2024',
  },
  {
    id: 'soc-linkedin',
    category: 'social',
    label: 'LinkedIn',
    value: 'https://linkedin.com/in/indresh-suresh-093646399',
    signature: '0x81bd...2c4',
    lastVerified: '01 Oct 2024',
  },
  {
    id: 'soc-email',
    category: 'social',
    label: 'Email',
    value: 'indresh@example.com',
    signature: '0x27fc...88a',
    lastVerified: '02 Oct 2024',
  },
  {
    id: 'soc-twitter',
    category: 'social',
    label: 'Twitter / X',
    value: '@indresh404',
    signature: '0x14ea...559',
    lastVerified: '25 Sep 2024',
  },
  {
    id: 'soc-discord',
    category: 'social',
    label: 'Discord',
    value: '@indresh404#1337',
    signature: '0x5b33...7d1',
    lastVerified: '20 Sep 2024',
  },
  {
    id: 'soc-portfolio',
    category: 'social',
    label: 'Portfolio Website',
    value: 'https://indresh.dev',
    signature: '0x6e9a...3f0',
    lastVerified: '15 Sep 2024',
  },

  // Education
  {
    id: 'edu-school',
    category: 'education',
    label: 'School / College',
    value: 'SLRTCE (Shree L. R. Tiwari College of Engineering)',
    signature: '0xec21...8b7',
    lastVerified: '15 Jul 2024',
  },
  {
    id: 'edu-degree',
    category: 'education',
    label: 'Degree & Major',
    value: 'Bachelor of Engineering in Computer Science',
    signature: '0x77d2...9c1',
    lastVerified: '15 Jul 2024',
  },
  {
    id: 'edu-cgpa',
    category: 'education',
    label: 'GPA / CGPA',
    value: '8.45 / 10.0 (Top 5% Merit)',
    signature: '0x33e1...12a',
    lastVerified: '15 Jul 2024',
  },
  {
    id: 'edu-gradyear',
    category: 'education',
    label: 'Graduation Year',
    value: 'Class of 2024',
    signature: '0x992b...a0f',
    lastVerified: '15 Jul 2024',
  },
  {
    id: 'edu-transcript',
    category: 'education',
    label: 'Official Transcripts',
    value: 'SLRTCE Final Transcript Registrar Record #88219',
    signature: '0xfa11...32d',
    lastVerified: '15 Jul 2024',
  },

  // Finance
  {
    id: 'fin-bank',
    category: 'finance',
    label: 'Bank Account',
    value: 'HDFC Bank (IFSC: HDFC0000128) ****0128',
    signature: '0xbb04...8e2',
    lastVerified: '18 Aug 2024',
  },
  {
    id: 'fin-credit',
    category: 'finance',
    label: 'Credit Score',
    value: '782 (Excellent Tier)',
    signature: '0x12c4...77e',
    lastVerified: '22 Aug 2024',
  },
  {
    id: 'fin-tax',
    category: 'finance',
    label: 'Tax ID / PAN',
    value: 'ABCPS9821K (ITD Verified)',
    signature: '0x88f1...19a',
    lastVerified: '05 Jan 2024',
  },
  {
    id: 'fin-income',
    category: 'finance',
    label: 'Monthly Income',
    value: '₹85,000 / month (Verified Deposit)',
    signature: '0x49a2...61b',
    lastVerified: '01 Oct 2024',
  },
  {
    id: 'fin-crypto',
    category: 'finance',
    label: 'Crypto Wallet',
    value: '0x71C...3a9F (Ethereum Mainnet)',
    signature: '0x00f8...5e9',
    lastVerified: '29 Sep 2024',
  },

  // Health
  {
    id: 'hlth-blood',
    category: 'health',
    label: 'Blood Group',
    value: 'O Positive (O+)',
    signature: '0x32ba...11f',
    lastVerified: '14 Feb 2024',
  },
  {
    id: 'hlth-vaccine',
    category: 'health',
    label: 'Vaccine Records',
    value: 'COVID-19 Booster & MMR Complete',
    signature: '0x99ea...72c',
    lastVerified: '14 Feb 2024',
  },
  {
    id: 'hlth-insurance',
    category: 'health',
    label: 'Medical Insurance',
    value: 'Star Health & Allied — Policy #SH-88921-99',
    signature: '0x66c8...34e',
    lastVerified: '10 Jan 2024',
  },
  {
    id: 'hlth-emergency',
    category: 'health',
    label: 'Emergency Contact',
    value: 'Ankita (+91 98201 55910)',
    signature: '0x18db...44b',
    lastVerified: '14 Feb 2024',
  },
  {
    id: 'hlth-allergies',
    category: 'health',
    label: 'Known Allergies',
    value: 'Penicillin (Severe), Pollen (Mild)',
    signature: '0x70aa...29f',
    lastVerified: '14 Feb 2024',
  },
];

interface SharedLinkViewerProps {
  token?: string;
  packet?: SharedPacketData;
  onBack?: () => void;
}

export const SharedLinkViewer: React.FC<SharedLinkViewerProps> = ({ token: propToken, packet: propPacket, onBack }) => {
  const { isAuthenticated, navigate, userName, userEmail } = useNavigation();

  // Resolve packet data
  const initialPacket = React.useMemo<SharedPacketData>(() => {
    if (propPacket) return propPacket;
    const token = propToken || 'link-1';
    const existing = initialSharedLinks.find((l) => l.id === token);
    const selectedLabels = existing?.fieldsShared || ['GitHub', 'LinkedIn', 'School / College', 'Degree & Major'];
    const matched = ALL_MASTER_FIELDS.filter((f) =>
      selectedLabels.some((label) => f.label.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(f.label.toLowerCase()))
    );

    return {
      id: token,
      creatorName: 'Indresh',
      creatorEmail: 'indresh@example.com',
      recipient: existing?.recipient || 'Verified Partner Review',
      createdAt: existing?.createdAt || 'Recently',
      expiry: existing?.expiry || 'Active (24h)',
      token,
      status: existing?.status || 'Active',
      fields: matched.length > 0 ? matched : ALL_MASTER_FIELDS.slice(0, 4),
    };
  }, [propPacket, propToken]);

  const [packet, setPacket] = useState<SharedPacketData>(initialPacket);
  const [fields, setFields] = useState<SharedFieldData[]>(initialPacket.fields);
  const [copied, setCopied] = useState(false);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [searchAddQuery, setSearchAddQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setFields(packet.fields);
  }, [packet]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Remove field from live link
  const handleRemoveField = (fieldId: string) => {
    const updated = fields.filter((f) => f.id !== fieldId);
    setFields(updated);
    setPacket((prev) => ({ ...prev, fields: updated }));
    showToast('Record removed from this share link.');
  };

  // Add field to live link
  const handleAddField = (fieldToAdd: SharedFieldData) => {
    if (fields.some((f) => f.id === fieldToAdd.id)) return;
    const updated = [...fields, fieldToAdd];
    setFields(updated);
    setPacket((prev) => ({ ...prev, fields: updated }));
    setIsAddFieldModalOpen(false);
    showToast(`Added "${fieldToAdd.label}" to this share link.`);
  };

  const copyShareLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?share=${packet.token}` : `https://syndeo.ai/p/${packet.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Strictly block unauthenticated / unregistered visitors
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full p-8 rounded-3xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-zinc-100 dark:bg-[#1d1c24] text-zinc-700 dark:text-[#a29db0] border border-zinc-200 dark:border-[#2d2c38]">
              Restricted Link • ID: {packet.token}
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#e4e1e8]">
              Platform Member Access Required
            </h2>
            <p className="text-xs text-zinc-500 dark:text-[#8c879a] leading-relaxed">
              This shared link is protected by zero-knowledge envelope encryption. Only registered and logged-in users on the Syndeo platform can decrypt and view these records.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 px-4 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Sign In / Register on Syndeo
              <ExternalLink className="w-4 h-4" />
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-[#2c2a38] text-zinc-600 dark:text-[#c4bfcf] hover:bg-zinc-100 dark:hover:bg-[#1e1d27] text-xs font-medium transition-colors cursor-pointer"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const categoryBadge = (cat: SharedFieldData['category']) => {
    switch (cat) {
      case 'social':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'education':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'finance':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'health':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
  };

  const availableToAdd = ALL_MASTER_FIELDS.filter((m) => !fields.some((f) => f.id === m.id)).filter(
    (m) =>
      !searchAddQuery.trim() ||
      m.label.toLowerCase().includes(searchAddQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchAddQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchAddQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white text-xs font-medium shadow-2xl flex items-center gap-2 border border-emerald-400/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer font-medium self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Share Management
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white">Syndeo Verified Link Viewer</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddFieldModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Record to Link
          </button>

          <button
            onClick={copyShareLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2c38] bg-white dark:bg-[#191920] text-zinc-700 dark:text-[#c4bfcf] hover:bg-zinc-50 dark:hover:bg-[#23222d] text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Main Link Overview Banner */}
      <div className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Decentralized Scoped Packet
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 dark:bg-[#1d1c24] text-zinc-500 dark:text-[#8c879a] border border-zinc-200 dark:border-[#2a2934]">
                TOKEN: {packet.token}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#e4e1e8]">
              Disclosed Records for {packet.creatorName}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
              Shared with <strong className="text-zinc-700 dark:text-[#c4bfcf]">{packet.recipient}</strong> • Created {packet.createdAt} • {packet.expiry}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-mono text-[#cbbeff] bg-[#5a25eb]/10 border border-[#5a25eb]/30 px-3.5 py-2 rounded-xl text-center">
              {fields.length} Disclosed Fields
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#181720] border border-zinc-200 dark:border-[#26252e] text-xs text-zinc-600 dark:text-[#9e9aa8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5a25eb] shrink-0" />
            <span>
              Viewing as authenticated member <strong className="text-zinc-900 dark:text-white">{userName || userEmail || 'Verified User'}</strong>. You can add or remove disclosed records at any time.
            </span>
          </div>
        </div>
      </div>

      {/* Disclosed Records Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8c879a]">
            Records in this Link ({fields.length})
          </h2>
          <button
            onClick={() => setIsAddFieldModalOpen(true)}
            className="text-xs text-[#5a25eb] dark:text-[#cbbeff] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add more data
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-[#2d2b38] bg-zinc-50/50 dark:bg-[#17171e]/50 space-y-3">
            <Info className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-sm font-medium text-zinc-700 dark:text-[#c4bfcf]">
              No records currently disclosed in this link.
            </p>
            <button
              onClick={() => setIsAddFieldModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#5a25eb] text-white text-xs font-semibold cursor-pointer"
            >
              Add Records Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div
                key={field.id}
                className="group relative p-5 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] hover:border-[#5a25eb]/50 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                {/* Field Top Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${categoryBadge(field.category)}`}>
                      {field.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-[#6a6778]">
                        {field.signature}
                      </span>
                      {/* Remove Field Action */}
                      <button
                        onClick={() => handleRemoveField(field.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remove this record from link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 dark:text-[#8c879a] uppercase tracking-wider">
                      {field.label}
                    </h3>
                    <p className="text-base font-semibold text-zinc-900 dark:text-white break-words mt-1">
                      {field.value}
                    </p>
                  </div>
                </div>

                {/* Verification Badge */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-[#201f29] flex items-center justify-between text-xs text-zinc-500 dark:text-[#8c879a]">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cryptographically Sealed
                  </span>
                  {field.lastVerified && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      Verified: {field.lastVerified}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD FIELD MODAL */}
      <Modal
        isOpen={isAddFieldModalOpen}
        onClose={() => setIsAddFieldModalOpen(false)}
        title="Add Information to this Share Link"
        subtitle="Select any verified credential from your vault to disclose in this active link."
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchAddQuery}
              onChange={(e) => setSearchAddQuery(e.target.value)}
              placeholder="Search available fields (e.g. GitHub, Bank, Vaccine)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2b38] bg-zinc-50 dark:bg-[#18171f] text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5a25eb]/50"
            />
          </div>

          <div className="space-y-2">
            {availableToAdd.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">All available fields are already included in this link.</p>
            ) : (
              availableToAdd.map((field) => (
                <div
                  key={field.id}
                  onClick={() => handleAddField(field)}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-[#282733] bg-zinc-50 dark:bg-[#181720] hover:border-[#5a25eb] hover:bg-[#5a25eb]/5 dark:hover:bg-[#1d1c28] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${categoryBadge(field.category)}`}>
                        {field.category}
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-[#8c879a] font-mono">{field.value}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium cursor-pointer">
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
