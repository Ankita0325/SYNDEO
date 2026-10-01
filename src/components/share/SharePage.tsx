import React, { useState } from 'react';
import { sampleShareRequest, initialSharedLinks } from '../../data/mockData';
import type { SharedLink } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  Share2,
  QrCode,
  CheckCircle2,
  Copy,
  Building,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SharePage: React.FC = () => {
  // Selected fields for Acme University request
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    fullName: true,
    email: true,
    college: true,
    degree: true,
    cgpa: false,
    address: false,
  });

  const [expiryOption, setExpiryOption] = useState<'1h' | '24h' | '7d' | 'never'>('24h');
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>(initialSharedLinks);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const generatedLinkUrl = 'https://syndeo.ai/p/share-78b10f2c';
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedCount = Object.values(selectedFields).filter(Boolean).length;

  const handleGenerateShareLink = () => {
    const selectedFieldNames = sampleShareRequest.requestedFields
      .filter((f) => selectedFields[f.key])
      .map((f) => f.label);

    const newLink: SharedLink = {
      id: `link-${Date.now()}`,
      recipient: 'Acme University (Selective)',
      fieldsShared: selectedFieldNames,
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
    };

    setSharedLinks([newLink, ...sharedLinks]);
    setShareSuccessNotice('Encrypted selective share link generated successfully.');
    setTimeout(() => setShareSuccessNotice(null), 4000);
  };

  const handleRevoke = (id: string) => {
    setSharedLinks((prev) =>
      prev.map((link) => (link.id === id ? { ...link, status: 'Revoked', expiry: 'Revoked by user' } : link))
    );
  };

  const copyToClipboard = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-[#23222a] pb-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#e4e1e8]">
            Share Information
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            Zero-Knowledge Scoping
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-[#8c879a] mt-1">
          Share only what is needed. You maintain cryptographic control over disclosures and revocations.
        </p>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {shareSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{shareSuccessNotice}</span>
            </div>
            <span className="font-mono text-[11px]">ACCESS_TOKEN: READY</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Request & Live Disclosure Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Requester & Field Checkbox Selection */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-5 shadow-sm dark:shadow-none">
            {/* Requester Identity Banner */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-[#23222a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-[#201f2c] border border-zinc-200 dark:border-[#2d2b38] flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff]">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-[#e4e1e8]">
                    {sampleShareRequest.requesterName}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                    {sampleShareRequest.requesterType} • {sampleShareRequest.purpose}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] border border-[#5a25eb]/30 shrink-0">
                Inbound Request
              </span>
            </div>

            {/* Field Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-[#a29db0] uppercase tracking-wider">
                  Select Requested Fields
                </span>
                <span className="text-xs text-zinc-500 dark:text-[#8c879a] font-mono">
                  {selectedCount} of {sampleShareRequest.requestedFields.length} selected
                </span>
              </div>

              <div className="space-y-2">
                {sampleShareRequest.requestedFields.map((field) => {
                  const isChecked = !!selectedFields[field.key];
                  return (
                    <div
                      key={field.key}
                      onClick={() => toggleField(field.key)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'border-[#5a25eb]/60 bg-[#5a25eb]/5 dark:bg-[#171722]'
                          : 'border-zinc-200 dark:border-[#23222a] bg-zinc-50/70 dark:bg-[#17171c]/60 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded text-[#5a25eb] focus:ring-[#5a25eb] bg-white dark:bg-[#24232a] border-zinc-300 dark:border-[#383644] cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-[#e4e1e8]">{field.label}</p>
                          <p className="text-[11px] text-zinc-500 dark:text-[#8c879a] font-mono">{field.defaultValue}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {field.isEvidenceBacked ? (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Evidence backed
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#5a25eb] dark:text-[#cbbeff] bg-[#5a25eb]/10 px-2 py-0.5 rounded border border-[#5a25eb]/20">
                            User confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expiry Options */}
            <div className="pt-3 border-t border-zinc-200 dark:border-[#23222a] space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-[#a29db0] uppercase tracking-wider">
                Expires in
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { key: '1h', label: '1 hour' },
                    { key: '24h', label: '24 hours' },
                    { key: '7d', label: '7 days' },
                    { key: 'never', label: 'Never' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setExpiryOption(opt.key)}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      expiryOption === opt.key
                        ? 'border-[#5a25eb] bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff] font-semibold'
                        : 'border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] text-zinc-500 dark:text-[#8c879a] hover:text-zinc-900 dark:hover:text-[#e4e1e8]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sharing Action Controls */}
            <div className="pt-4 border-t border-zinc-200 dark:border-[#23222a] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateShareLink}
                disabled={selectedCount === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-all shadow-md shadow-[#5a25eb]/20 cursor-pointer disabled:opacity-40"
              >
                <Share2 className="w-4 h-4" />
                <span>Create Share Link</span>
              </button>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-100 dark:bg-[#1b1b21] hover:bg-zinc-200 dark:hover:bg-[#24232a] border border-zinc-200 dark:border-[#2d2b38] text-xs font-medium text-zinc-800 dark:text-[#e4e1e8] transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
                <span>Generate QR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Live Preview Card (What will be shared) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-4 sticky top-6 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-[#23222a] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-[#e4e1e8]">
                  What will be shared
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live Disclosure Preview
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
              The recipient will only see the fields listed below. Non-selected fields remain unshared and hidden.
            </p>

            {/* Preview Box */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#0e0e12] border border-zinc-200 dark:border-[#23222a] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-[#1f1e26]">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-[#8c879a]">RECIPIENT: Acme University</span>
                <span className="text-[10px] font-mono text-[#5a25eb] dark:text-[#cbbeff]">SCOPED_PAYLOAD</span>
              </div>

              {selectedCount === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400 dark:text-[#63637e]">
                  No fields selected for sharing.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sampleShareRequest.requestedFields
                    .filter((f) => selectedFields[f.key])
                    .map((f) => (
                      <div
                        key={f.key}
                        className="flex items-center justify-between text-xs py-1 border-b border-zinc-200 dark:border-[#1a1922] last:border-none"
                      >
                        <span className="text-zinc-500 dark:text-[#8c879a]">{f.label}:</span>
                        <span className="font-semibold text-zinc-900 dark:text-[#e4e1e8] text-right font-mono truncate max-w-[160px]">
                          {f.defaultValue}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Share Link URL snippet */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#17171c] border border-zinc-200 dark:border-[#26252e] space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-[#8c879a] block">
                Direct Endpoint
              </span>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLinkUrl}
                  className="bg-transparent text-xs font-mono text-[#5a25eb] dark:text-[#cbbeff] w-full focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-1.5 rounded bg-zinc-200 dark:bg-[#24232a] hover:bg-zinc-300 dark:hover:bg-[#2d2b38] text-zinc-700 dark:text-[#e4e1e8] text-xs transition-colors shrink-0 cursor-pointer"
                  title="Copy link"
                >
                  {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Privacy callout */}
            <div className="text-[11px] text-zinc-500 dark:text-[#8c879a] flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-[#34d399]" />
              <span>You can revoke this link anytime from your active list below.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Links History & Revocation Section */}
      <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-[#23222a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-[#e4e1e8] tracking-tight">Active & Historical Shared Links</h2>
            <p className="text-xs text-zinc-500 dark:text-[#8c879a]">Audit trails of all selective access grants and revocations.</p>
          </div>
          <span className="text-xs font-mono text-zinc-500 dark:text-[#8c879a]">{sharedLinks.length} total issued</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-zinc-200 dark:border-[#23222a] rounded-xl overflow-hidden bg-white dark:bg-[#131317]">
            <thead className="bg-zinc-50 dark:bg-[#17171c] text-zinc-500 dark:text-[#8c879a] uppercase tracking-wider text-[10px] border-b border-zinc-200 dark:border-[#23222a]">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Information Shared</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-[#1f1e26] text-zinc-900 dark:text-[#e4e1e8]">
              {sharedLinks.map((link) => (
                <tr key={link.id} className="hover:bg-zinc-50 dark:hover:bg-[#17171f] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-[#e4e1e8]">
                    {link.recipient}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500 dark:text-[#8c879a]">
                    <span className="font-mono text-[#5a25eb] dark:text-[#cbbeff]">{link.fieldsShared.length} fields</span>{' '}
                    ({link.fieldsShared.join(', ')})
                  </td>
                  <td className="py-3.5 px-4 text-zinc-500 dark:text-[#8c879a] whitespace-nowrap">{link.createdAt}</td>
                  <td className="py-3.5 px-4 text-zinc-500 dark:text-[#8c879a] whitespace-nowrap font-mono">{link.expiry}</td>
                  <td className="py-3.5 px-4">
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
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {link.status === 'Active' ? (
                      <button
                        onClick={() => handleRevoke(link.id)}
                        className="px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400 dark:text-[#63637e]">Access Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Selective Access QR Code"
        subtitle="Point physical camera to view only the approved fields."
      >
        <div className="space-y-5 text-center py-2">
          {/* Static SVG QR Code Visual */}
          <div className="p-6 bg-white rounded-2xl w-56 h-56 mx-auto flex items-center justify-center shadow-lg">
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

          <div>
            <p className="text-xs font-mono text-[#cbbeff]">
              PAYLOAD: {selectedCount} SELECTED FIELDS
            </p>
            <p className="text-xs text-[#8c879a] mt-1">
              Valid for {expiryOption.toUpperCase()} • Bound to recipient session
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="px-5 py-2 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
