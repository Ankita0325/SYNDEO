import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  User,
  Shield,
  KeyRound,
  Database,
  Moon,
  Sun,
  Laptop,
  CheckCircle2,
  Trash2,
  Download,
  Smartphone,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { userName, userEmail } = useNavigation();

  // Settings states
  const [profileName, setProfileName] = useState(userName);
  const [profileEmail, setProfileEmail] = useState(userEmail);
  const [bio, setBio] = useState('Systems Engineer & Digital Identity Architect');

  // Privacy toggles
  const [autoMaskSensitive, setAutoMaskSensitive] = useState(true);
  const [requireExplicitConsent, setRequireExplicitConsent] = useState(true);
  const [defaultExpiry, setDefaultExpiry] = useState('24h');

  // Export / Delete status
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice('Profile preferences saved successfully.');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const handleExportData = () => {
    setExportNotice('Export archive generated (ZIP containing JSON envelope & signed files).');
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-[#23222a] pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-[#e4e1e8]">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-[#8c879a] mt-1">
          Manage your personal vault configuration, privacy boundaries, security credentials, and data exports.
        </p>
      </div>

      {saveNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveNotice}</span>
        </div>
      )}

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 border border-[#5a25eb]/30 dark:border-[#5a25eb]/40 text-[#5a25eb] dark:text-[#cbbeff] text-xs flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>{exportNotice}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Profile */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200 dark:border-[#23222a]">
            <div className="w-8 h-8 rounded-lg bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-[#e4e1e8]">Profile Information</h2>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">Your personal identifier attributes</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-[#a29db0] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#17171c] border border-zinc-300 dark:border-[#2d2b38] text-xs text-zinc-900 dark:text-[#e4e1e8] focus:outline-none focus:border-[#5a25eb]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-[#a29db0] mb-1.5">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#17171c] border border-zinc-300 dark:border-[#2d2b38] text-xs text-zinc-900 dark:text-[#e4e1e8] focus:outline-none focus:border-[#5a25eb]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-[#a29db0] mb-1.5">
                Profile Title / Bio
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-[#17171c] border border-zinc-300 dark:border-[#2d2b38] text-xs text-zinc-900 dark:text-[#e4e1e8] focus:outline-none focus:border-[#5a25eb]"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#5a25eb] hover:bg-[#6b37fa] text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </section>

        {/* Section 2: Privacy */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200 dark:border-[#23222a]">
            <div className="w-8 h-8 rounded-lg bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-[#e4e1e8]">Privacy & Sharing Policies</h2>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                Granular control over disclosure rules and sensitive fields
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c]">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-[#e4e1e8]">
                  Sensitive Information Protection (PAN, Financial, Health)
                </p>
                <p className="text-zinc-500 dark:text-[#8c879a] mt-0.5">
                  Always require explicit per-share opt-in before revealing sensitive identifiers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoMaskSensitive(!autoMaskSensitive)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoMaskSensitive ? 'bg-[#5a25eb]' : 'bg-zinc-300 dark:bg-[#24232a]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                    autoMaskSensitive ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c]">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-[#e4e1e8]">Zero-Log Assistant Memory Queries</p>
                <p className="text-zinc-500 dark:text-[#8c879a] mt-0.5">
                  Do not store chat assistant queries on external servers. Keep all embeddings purely in local envelope.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequireExplicitConsent(!requireExplicitConsent)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  requireExplicitConsent ? 'bg-[#5a25eb]' : 'bg-zinc-300 dark:bg-[#24232a]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                    requireExplicitConsent ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-zinc-900 dark:text-[#e4e1e8]">Default Share Expiration Policy</p>
                <span className="font-mono text-[#5a25eb] dark:text-[#cbbeff]">{defaultExpiry.toUpperCase()}</span>
              </div>
              <p className="text-zinc-500 dark:text-[#8c879a]">
                New outbound sharing links will default to this timeframe unless overridden.
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {(['1h', '24h', '7d', 'never'] as const).map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setDefaultExpiry(exp)}
                    className={`py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                      defaultExpiry === exp
                        ? 'border-[#5a25eb] bg-[#5a25eb]/10 dark:bg-[#5a25eb]/20 text-[#5a25eb] dark:text-[#cbbeff]'
                        : 'border-zinc-200 dark:border-[#23222a] bg-white dark:bg-[#141419] text-zinc-600 dark:text-[#8c879a]'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Security */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200 dark:border-[#23222a]">
            <div className="w-8 h-8 rounded-lg bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-[#e4e1e8]">Security & Devices</h2>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">Active authorization keys and trusted sessions</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="w-5 h-5 text-[#5a25eb] dark:text-[#cbbeff]" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-[#e4e1e8]">MacBook Pro — Chrome 128 (This Device)</p>
                  <p className="text-zinc-500 dark:text-[#8c879a]">Mumbai, India • Active Now</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                CURRENT SESSION
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-zinc-400 dark:text-[#8c879a]" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-[#e4e1e8]">iPhone 15 Pro — Mobile App</p>
                  <p className="text-zinc-500 dark:text-[#8c879a]">Mumbai, India • Last active 4 hours ago</p>
                </div>
              </div>
              <button
                type="button"
                className="text-[11px] text-red-500 hover:underline cursor-pointer"
              >
                Terminate
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Data Management (Export / Delete) */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200 dark:border-[#23222a]">
            <div className="w-8 h-8 rounded-lg bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-[#e4e1e8]">Data Sovereignty & Portability</h2>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">Complete user ownership of records</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-[#e4e1e8]">Export Complete Data Vault</p>
                <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                  Download all verified records, source document proofs, and cryptographic signatures in a single portable bundle.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-200 dark:bg-[#1f1e29] hover:bg-zinc-300 dark:hover:bg-[#282736] border border-zinc-300 dark:border-[#353444] text-xs font-medium text-zinc-900 dark:text-[#e4e1e8] transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 text-[#5a25eb] dark:text-[#cbbeff]" />
                <span>Export Vault (JSON+PDF)</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-red-500 dark:text-red-400">Purge & Delete Account</p>
                <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                  Permanently destroy all memory keys, documents, and active share links. This action is irreversible.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Purge Vault</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Appearance */}
        <section className="p-6 rounded-2xl border border-zinc-200 dark:border-[#26252e] bg-white dark:bg-[#131317] space-y-5 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-200 dark:border-[#23222a]">
            <div className="w-8 h-8 rounded-lg bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 flex items-center justify-center text-[#5a25eb] dark:text-[#cbbeff]">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-[#e4e1e8]">Appearance</h2>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">Select your visual interface theme</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-[#5a25eb] bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 text-zinc-900 dark:text-[#e4e1e8]'
                  : 'border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] text-zinc-500 dark:text-[#8c879a]'
              }`}
            >
              <Moon className="w-5 h-5 text-[#5a25eb] dark:text-[#cbbeff]" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-[#e4e1e8]">Obsidian Dark (Default)</p>
              <p className="text-[11px] text-zinc-500 dark:text-[#8c879a]">Deep void blacks with ultraviolet accents</p>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-[#5a25eb] bg-[#5a25eb]/10 dark:bg-[#5a25eb]/15 text-zinc-900 dark:text-[#e4e1e8]'
                  : 'border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] text-zinc-500 dark:text-[#8c879a]'
              }`}
            >
              <Sun className="w-5 h-5 text-[#5a25eb] dark:text-[#cbbeff]" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-[#e4e1e8]">Clean Light</p>
              <p className="text-[11px] text-zinc-500 dark:text-[#8c879a]">High-contrast daylight clarity</p>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="p-4 rounded-xl border border-zinc-200 dark:border-[#23222a] bg-zinc-50 dark:bg-[#17171c] text-left space-y-2 hover:border-zinc-300 dark:hover:border-[#35343f] text-zinc-500 dark:text-[#8c879a] cursor-pointer"
            >
              <Laptop className="w-5 h-5 text-zinc-400 dark:text-[#8c879a]" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-[#e4e1e8]">System Sync</p>
              <p className="text-[11px] text-zinc-500 dark:text-[#8c879a]">Follow operating system preference</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
