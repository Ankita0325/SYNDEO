import React, { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { initialDocuments, initialSharedLinks } from '../../data/mockData';
import type { AccessViewer, DocumentItem, OrganizationAccessProfile, OrganizationType, SharePurpose, SharedLink } from '../../types';
import { loadSharedLinks, saveSharedLinks, subscribeToSharedLinks } from '../../lib/shareStore';
import { supabase } from '../../lib/supabase';
import { hashShareToken } from '../../lib/shareToken';
import { mapShareAccessRows } from '../../lib/shareAccess';
import { Modal } from '../common/Modal';
import {
  FileText,
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
  documents: DocumentItem[];
  documentShare: boolean;
}

const ORGANIZATION_TYPES: OrganizationType[] = [
  'Company',
  'University/College',
  'Hospital/Healthcare',
  'Bank/Financial',
  'Government',
  'NGO',
  'Other',
];

const SHARE_PURPOSES: SharePurpose[] = [
  'Hiring',
  'Verification',
  'Admissions',
  'Healthcare',
  'Financial services',
  'Other',
];

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
  const { isAuthenticated, navigate } = useNavigation();
  // Resolve packet data
  const initialPacket = React.useMemo<SharedPacketData>(() => {
    if (propPacket) return propPacket;
    const token = propToken || 'link-1';
    const existing = loadSharedLinks(initialSharedLinks).find((l) => l.id === token);
    const selectedLabels = existing?.fieldsShared || ['GitHub', 'LinkedIn', 'School / College', 'Degree & Major'];
    const documents = existing?.sharedDocuments || initialDocuments.filter((document) => existing?.sharedDocumentIds?.includes(document.id));
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
      status: existing?.status || 'Expired',
      fields: matched.length > 0 ? matched : existing?.sharedDocumentIds !== undefined ? [] : ALL_MASTER_FIELDS.slice(0, 4),
      documents,
      documentShare: existing?.sharedDocumentIds !== undefined,
    };
  }, [propPacket, propToken]);

  const [packet, setPacket] = useState<SharedPacketData>(initialPacket);
  const [fields, setFields] = useState<SharedFieldData[]>(initialPacket.fields);
  const [shareLinks, setShareLinks] = useState<SharedLink[]>(() => loadSharedLinks(initialSharedLinks));
  const [organizationProfile, setOrganizationProfile] = useState<OrganizationAccessProfile>({
    fullName: '',
    workEmail: '',
    organizationName: '',
    organizationType: 'Company',
    role: '',
    department: '',
    website: '',
    purpose: 'Hiring',
  });
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isSavingRegistration, setIsSavingRegistration] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [shareLookupComplete, setShareLookupComplete] = useState(false);
  const [shareLookupError, setShareLookupError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [searchAddQuery, setSearchAddQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastLoggedRequest = useRef<string | null>(null);

  useEffect(() => subscribeToSharedLinks(setShareLinks), []);

  useEffect(() => {
    let active = true;
    setShareLookupComplete(false);
    setShareLookupError(null);

    void (async () => {
      if (!supabase) {
        if (active) {
          setShareLookupComplete(true);
          setShareLookupError('Supabase is not configured.');
        }
        return;
      }

      const tokenHash = await hashShareToken(packet.token);
      const { data, error } = await supabase
        .from('shares')
        .select('id, profile_id, recipient_name, recipient_organization, allowed_claims, status, expires_at, created_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (!active) return;

      if (error) {
        setShareLookupError(error.message);
      } else if (data) {
        const claims = Array.isArray(data.allowed_claims)
          ? data.allowed_claims as Array<{ document_id?: string; document?: DocumentItem; file_name?: string }>
          : [];
        const selectedDocumentIds = claims.map((claim) => claim.document_id).filter((id): id is string => Boolean(id));
        const documents = claims.flatMap((claim) => claim.document ? [claim.document] : []);
        const expiryDate = new Date(data.expires_at);
        const isExpired = expiryDate.getTime() <= Date.now() || data.status === 'EXPIRED';
        const { data: accessRows } = await supabase
          .from('share_access')
          .select('id, organization_id, organization_member_id, action, accessed_at, created_at, organizations(id, name, type, purpose, website), organization_members(full_name, work_email, role, department)')
          .eq('share_id', data.id)
          .order('created_at', { ascending: true });
        const activity = mapShareAccessRows(accessRows || [], claims.map((claim) => claim.file_name || claim.document?.name || '').filter(Boolean));
        const remoteLink: SharedLink = {
          id: packet.token,
          shareId: data.id,
          recipient: data.recipient_organization || data.recipient_name || 'Shared documents',
          fieldsShared: claims.map((claim) => claim.file_name || claim.document?.name || '').filter(Boolean),
          createdAt: new Date(data.created_at).toLocaleString(),
          expiry: isExpired ? 'Expired' : expiryDate.getFullYear() >= 9999 ? 'Permanent (Until revoked)' : `Expires ${expiryDate.toLocaleString()}`,
          status: data.status === 'REVOKED' ? 'Revoked' : isExpired ? 'Expired' : 'Active',
          accessCount: activity.accessCount,
          viewers: activity.viewers,
          accessRequests: activity.accessRequests,
          sharedDocumentIds: selectedDocumentIds,
          sharedDocuments: documents,
        };
        setShareLinks((previousLinks) => {
          const localLink = previousLinks.find((link) => link.id === remoteLink.id);
          const hydratedLink = {
            ...remoteLink,
            accessCount: localLink?.accessCount ?? remoteLink.accessCount,
            viewers: localLink?.viewers ?? remoteLink.viewers,
            accessRequests: localLink?.accessRequests ?? remoteLink.accessRequests,
            sharedDocuments: localLink?.sharedDocuments ?? remoteLink.sharedDocuments,
          };
          return [hydratedLink, ...previousLinks.filter((link) => link.id !== remoteLink.id)];
        });
        setPacket((current) => ({ ...current, status: remoteLink.status, documents, documentShare: true }));
      }

      setShareLookupComplete(true);
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, packet.token]);

  useEffect(() => {
    const currentLink = shareLinks.find((link) => link.id === packet.token);
    if (currentLink) {
      setPacket((current) => ({
        ...current,
        status: currentLink.status,
        documents: currentLink.sharedDocuments || initialDocuments.filter((document) => currentLink.sharedDocumentIds?.includes(document.id)),
        documentShare: currentLink.sharedDocumentIds !== undefined,
      }));
    }
  }, [packet.token, shareLinks]);

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

  const currentShare = shareLinks.find((link) => link.id === packet.token);
  const currentRequest = currentShare?.accessRequests?.find(
    (request) => request.profile?.workEmail.toLowerCase() === registeredEmail
  );
  const hasApprovedAccess = currentRequest?.status === 'approved' && currentShare?.status === 'Active';

  useEffect(() => {
    const client = supabase;
    if (!client || !currentShare?.shareId || !currentRequest?.organizationMemberId || !registeredEmail) return;

    const refreshAccess = async () => {
      const { data: shareState, error: shareError } = await client
        .from('shares')
        .select('status, expires_at')
        .eq('id', currentShare.shareId)
        .maybeSingle();
      if (!shareError && shareState) {
        const isInactive = shareState.status === 'REVOKED' || shareState.status === 'EXPIRED' || new Date(shareState.expires_at).getTime() <= Date.now();
        if (isInactive) {
          setShareLinks((previous) => previous.map((link) => link.id === packet.token
            ? { ...link, status: shareState.status === 'REVOKED' ? 'Revoked' : 'Expired' }
            : link));
          return;
        }
      }

      const { data, error } = await client
        .from('share_access')
        .select('id, action, created_at')
        .eq('share_id', currentShare.shareId)
        .eq('organization_member_id', currentRequest.organizationMemberId)
        .neq('action', 'VIEWED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return;

      const status = data.action === 'APPROVED' ? 'approved' as const
        : data.action === 'REVOKED' ? 'revoked' as const
        : data.action === 'DENIED' ? 'declined' as const
        : 'pending' as const;
      setShareLinks((previous) => previous.map((link) => link.id !== packet.token ? link : {
        ...link,
        accessRequests: link.accessRequests?.map((request) => request.organizationMemberId === currentRequest.organizationMemberId
          ? { ...request, id: data.id, status, requestedAt: new Date(data.created_at).toLocaleString() }
          : request),
      }));
    };

    void refreshAccess();
    const timer = window.setInterval(() => void refreshAccess(), 5000);
    return () => window.clearInterval(timer);
  }, [currentRequest?.organizationMemberId, currentShare?.shareId, packet.token, registeredEmail]);

  const submitOrganizationRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = organizationProfile.workEmail.trim().toLowerCase();
    const targetLink = shareLinks.find((link) => link.id === packet.token);
    if (!targetLink || targetLink.status !== 'Active') return;

    if (!supabase) {
      setRegistrationError('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsSavingRegistration(true);
    setRegistrationError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Your sign-in session expired. Sign in again to request access.');

      const profile = { ...organizationProfile, workEmail: normalizedEmail };
      const organizationName = profile.organizationName.trim();
      const website = profile.website.trim() || null;
      const officialDomain = website
        ? new URL(website).hostname.toLowerCase().replace(/^www\./, '')
        : null;
      const organizationValues = {
        name: organizationName,
        type: profile.organizationType,
        website,
        official_domain: officialDomain,
        purpose: profile.purpose,
      };

      const { data: existingOrganization, error: lookupError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', organizationName)
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      let organizationId = existingOrganization?.id;
      if (organizationId) {
        const { error } = await supabase
          .from('organizations')
          .update({ ...organizationValues, updated_at: new Date().toISOString() })
          .eq('id', organizationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('organizations')
          .insert(organizationValues)
          .select('id')
          .single();
        if (error) throw error;
        organizationId = data.id;
      }

      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .upsert(
          {
            organization_id: organizationId,
            auth_user_id: user.id,
            full_name: profile.fullName.trim(),
            work_email: normalizedEmail,
            role: profile.role.trim(),
            department: profile.department.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'auth_user_id' }
        )
        .select('id')
        .single();
      if (memberError) throw memberError;
      if (!targetLink.shareId) throw new Error('This link has no saved share record. Generate a fresh share link.');

      const { data: previousAccess, error: accessLookupError } = await supabase
        .from('share_access')
        .select('id, action, created_at')
        .eq('share_id', targetLink.shareId)
        .eq('organization_member_id', member.id)
        .neq('action', 'VIEWED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (accessLookupError) throw accessLookupError;

      let action: string | undefined = previousAccess?.action;
      let accessId = previousAccess?.id;
      if (!action || action === 'DENIED' || action === 'REVOKED') {
        const { data: newAccess, error: requestError } = await supabase
          .from('share_access')
          .insert({
            share_id: targetLink.shareId,
            organization_id: organizationId,
            organization_member_id: member.id,
            action: 'REQUESTED',
          })
          .select('id, action, created_at')
          .single();
        if (requestError) throw requestError;
        action = 'REQUESTED';
        accessId = newAccess.id;
      }

      const requestStatus = action === 'APPROVED' ? 'approved' as const : action === 'REVOKED' ? 'revoked' as const : action === 'DENIED' ? 'declined' as const : 'pending' as const;
      const accessRequest = {
        id: accessId || crypto.randomUUID(),
        requesterName: profile.fullName.trim(),
        organization: organizationName,
        requestedFields: targetLink.fieldsShared,
        purpose: profile.purpose,
        requestedAt: new Date().toLocaleString(),
        status: requestStatus,
        organizationId,
        organizationMemberId: member.id,
        profile,
      };
      const updatedLinks = shareLinks.map((link) => link.id === targetLink.id
        ? {
            ...link,
            accessRequests: [
              ...(link.accessRequests || []).filter((request) => request.organizationMemberId !== member.id),
              accessRequest,
            ],
          }
        : link);

      saveSharedLinks(updatedLinks);
      setShareLinks(updatedLinks);
      setRegisteredEmail(normalizedEmail);
      showToast(requestStatus === 'approved' ? 'Access is approved. Loading shared documents.' : 'Access request saved. Documents stay locked until approval.');
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Could not save organization details.');
    } finally {
      setIsSavingRegistration(false);
    }
  };

  useEffect(() => {
    if (!hasApprovedAccess || !currentRequest?.profile || lastLoggedRequest.current === currentRequest.id) return;
    if (!supabase || !currentShare?.shareId || !currentRequest.organizationId || !currentRequest.organizationMemberId) return;
    lastLoggedRequest.current = currentRequest.id;

    void supabase.from('share_access').insert({
      share_id: currentShare.shareId,
      organization_id: currentRequest.organizationId,
      organization_member_id: currentRequest.organizationMemberId,
      action: 'VIEWED',
      accessed_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) showToast(`Could not record this view: ${error.message}`);
    });

    setShareLinks((previousLinks) => {
      const updatedLinks = previousLinks.map((link) => {
        if (link.id !== packet.token) return link;
        const viewer: AccessViewer = {
          id: crypto.randomUUID(),
          userName: currentRequest.profile!.fullName,
          roleOrOrg: `${currentRequest.profile!.role} · ${currentRequest.profile!.organizationName}`,
          viewedAt: new Date().toLocaleString(),
          ipLocation: 'Organization link access',
          verificationStatus: 'authorized',
          email: currentRequest.profile!.workEmail,
        };
        return { ...link, accessCount: link.accessCount + 1, viewers: [...(link.viewers || []), viewer] };
      });
      saveSharedLinks(updatedLinks);
      return updatedLinks;
    });
  }, [currentRequest?.id, currentRequest?.profile, currentRequest?.organizationId, currentRequest?.organizationMemberId, currentShare?.shareId, hasApprovedAccess, packet.token]);

  if (!shareLookupComplete) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-12">
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-[#8c879a]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600" />
          Loading shared documents...
        </div>
      </div>
    );
  }

  if (isAuthenticated && (packet.status !== 'Active' || !currentShare)) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-12">
        <div className="w-full space-y-3 border-y border-zinc-200 py-8 text-center dark:border-[#26252e]">
          <Lock className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">This share link is unavailable</h1>
          <p className="text-sm text-zinc-500 dark:text-[#8c879a]">
            {shareLookupError || 'The owner revoked this link, or it has expired.'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-12">
        <div className="w-full space-y-4 border-y border-zinc-200 py-8 text-center dark:border-[#26252e]">
          <Lock className="mx-auto h-8 w-8 text-amber-500" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Sign in to request access</h1>
          <p className="text-sm text-zinc-500 dark:text-[#8c879a]">After sign-in, provide your organization details to request these documents.</p>
          <button
            onClick={() => {
              window.sessionStorage.setItem('syndeo.pending-share-token', packet.token);
              navigate('/auth');
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Sign In / Register on SYNDEO
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!registeredEmail || !currentRequest) {
    const inputClass = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-600 dark:border-[#353340] dark:bg-[#18171f] dark:text-white';

    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 border-b border-zinc-200 pb-5 dark:border-[#26252e]">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> Organization access request
          </div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">Tell the owner who is requesting access</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-[#8c879a]">
            The selected documents stay locked until the owner approves your request.
          </p>
        </div>

        <form onSubmit={submitOrganizationRequest} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Full name *
            <input className={inputClass} autoComplete="name" required value={organizationProfile.fullName} onChange={(event) => setOrganizationProfile({ ...organizationProfile, fullName: event.target.value })} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Official / work email *
            <input className={inputClass} type="email" autoComplete="email" required value={organizationProfile.workEmail} onChange={(event) => setOrganizationProfile({ ...organizationProfile, workEmail: event.target.value })} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Organization name *
            <input className={inputClass} autoComplete="organization" required value={organizationProfile.organizationName} onChange={(event) => setOrganizationProfile({ ...organizationProfile, organizationName: event.target.value })} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Organization type *
            <select className={inputClass} required value={organizationProfile.organizationType} onChange={(event) => setOrganizationProfile({ ...organizationProfile, organizationType: event.target.value as OrganizationType })}>
              {ORGANIZATION_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Role / designation *
            <input className={inputClass} autoComplete="organization-title" required value={organizationProfile.role} onChange={(event) => setOrganizationProfile({ ...organizationProfile, role: event.target.value })} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Department / team
            <input className={inputClass} value={organizationProfile.department} onChange={(event) => setOrganizationProfile({ ...organizationProfile, department: event.target.value })} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Organization website
            <input className={inputClass} type="url" placeholder="https://example.org" value={organizationProfile.website} onChange={(event) => setOrganizationProfile({ ...organizationProfile, website: event.target.value })} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-zinc-700 dark:text-[#c4bfcf]">
            Purpose of using SYNDEO *
            <select className={inputClass} required value={organizationProfile.purpose} onChange={(event) => setOrganizationProfile({ ...organizationProfile, purpose: event.target.value as SharePurpose })}>
              {SHARE_PURPOSES.map((purpose) => <option key={purpose}>{purpose}</option>)}
            </select>
          </label>
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-[#26252e] sm:col-span-2">
            <span className="text-xs text-zinc-500">{packet.documents.length} document(s) selected by the owner</span>
            <button disabled={isSavingRegistration} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60" type="submit">
              {isSavingRegistration ? 'Saving...' : 'Save details & request access'}
            </button>
          </div>
          {registrationError && (
            <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2" role="alert">{registrationError}</p>
          )}
        </form>
      </div>
    );
  }

  if (!hasApprovedAccess) {
    const wasDenied = currentRequest.status === 'declined' || currentRequest.status === 'revoked';
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4 py-12">
        <div className="w-full space-y-3 border-y border-zinc-200 py-8 text-center dark:border-[#26252e]">
          <Lock className={`mx-auto h-8 w-8 ${wasDenied ? 'text-red-500' : 'text-amber-500'}`} />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {wasDenied ? 'Access is not available' : 'Waiting for owner approval'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-[#8c879a]">
            {wasDenied ? 'No documents are available to this organization.' : 'Your request was sent. This page will unlock after approval.'}
          </p>
          {wasDenied && (
            <button className="mt-2 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-[#353340] dark:text-[#c4bfcf]" onClick={() => setRegisteredEmail('')}>
              Submit another request
            </button>
          )}
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
              {packet.documentShare ? packet.documents.length : fields.length} {packet.documentShare ? 'Documents' : 'Disclosed Fields'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#181720] border border-zinc-200 dark:border-[#26252e] text-xs text-zinc-600 dark:text-[#9e9aa8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5a25eb] shrink-0" />
            <span>
              Access approved for <strong className="text-zinc-900 dark:text-white">{currentRequest.profile?.organizationName}</strong>. Only documents selected by the owner are available.
            </span>
          </div>
        </div>
      </div>

      {packet.documentShare && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8c879a]">
            Approved Documents ({packet.documents.length})
          </h2>
          <div className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-[#26252e] dark:border-[#26252e]">
            {packet.documents.map((document) => (
              <article key={document.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-zinc-900 dark:text-white">{document.name}</h3>
                    <p className="mt-1 text-xs capitalize text-zinc-500 dark:text-[#8c879a]">
                      {document.category} · {document.fileType} · {document.fileSize} · {document.extractedFieldsCount} extracted records
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400">{document.status}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Legacy record shares */}
      {!packet.documentShare && <>
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
      </>}
    </div>
  );
};
