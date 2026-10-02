import React, { useState, useMemo, useEffect } from 'react';
import { initialDocuments, initialSharedLinks } from '../../data/mockData';
import type { DocumentItem, SharedLink } from '../../types';
import { loadSharedLinks, saveSharedLinks, subscribeToSharedLinks } from '../../lib/shareStore';
import { supabase } from '../../lib/supabase';
import { hashShareToken } from '../../lib/shareToken';
import { mapSupabaseDocument, type SupabaseDocumentRow } from '../../lib/documents';
import { mapShareAccessRows } from '../../lib/shareAccess';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SharePageSkeleton } from '../ui/SkeletonLoader';
import {
  Share2,
  Plus,
  Search,
  Check,
  Copy,
  ExternalLink,
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
import { QRCodeSVG } from 'qrcode.react';

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
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  // Selected State for Creator
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [vaultDocuments, setVaultDocuments] = useState<DocumentItem[]>([]);
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null);
  const [isUsingSampleDocuments, setIsUsingSampleDocuments] = useState(false);
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
  const [shareCreationError, setShareCreationError] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  // Link History - Starts clean with real user shares
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>(() => loadSharedLinks([]));

  useEffect(() => {
    saveSharedLinks(sharedLinks);
  }, [sharedLinks]);

  useEffect(() => subscribeToSharedLinks(setSharedLinks), []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const refreshAccessActivity = async () => {
      const persistedLinks = loadSharedLinks(initialSharedLinks).filter((link) => link.shareId);
      const updates = await Promise.all(persistedLinks.map(async (link) => {
        const { data: share, error: shareError } = await client
          .from('shares')
          .select('status, expires_at')
          .eq('id', link.shareId)
          .maybeSingle();
        if (shareError || !share) return null;

        const { data: events, error: eventsError } = await client
          .from('share_access')
          .select('id, organization_id, organization_member_id, action, accessed_at, created_at, organizations(id, name, type, purpose, website), organization_members(full_name, work_email, role, department)')
          .eq('share_id', link.shareId)
          .order('created_at', { ascending: true });
        if (eventsError || !events) return null;

        const activity = mapShareAccessRows(events, link.fieldsShared);
        const expired = share.status === 'EXPIRED' || new Date(share.expires_at).getTime() <= Date.now();
        return {
          ...link,
          status: share.status === 'REVOKED' ? 'Revoked' as const : expired ? 'Expired' as const : 'Active' as const,
          accessCount: activity.accessCount,
          viewers: activity.viewers,
          accessRequests: activity.accessRequests,
        };
      }));

      if (!active) return;
      const synced = new Map(updates.filter((link): link is NonNullable<typeof link> => link !== null).map((link) => [link.id, link]));
      setSharedLinks((previous) => previous.map((link) => synced.get(link.id) || link));
    };

    void refreshAccessActivity();
    const timer = window.setInterval(() => void refreshAccessActivity(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!supabase) {
        const sampleDocuments = initialDocuments.slice(0, 2);
        setVaultDocuments(sampleDocuments);
        setSelectedFieldIds(new Set(sampleDocuments.map((document) => document.id)));
        setIsUsingSampleDocuments(true);
        setDocumentLoadError('Supabase is not configured.');
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        if (active) {
          const sampleDocuments = initialDocuments.slice(0, 2);
          setVaultDocuments(sampleDocuments);
          setSelectedFieldIds(new Set(sampleDocuments.map((document) => document.id)));
          setIsUsingSampleDocuments(true);
          setDocumentLoadError(userError.message);
        }
        return;
      }
      if (!user) {
        if (active) {
          const sampleDocuments = initialDocuments.slice(0, 2);
          setVaultDocuments(sampleDocuments);
          setSelectedFieldIds(new Set(sampleDocuments.map((document) => document.id)));
          setIsUsingSampleDocuments(true);
          setDocumentLoadError('Sign in to load your vault documents.');
        }
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (profileError) {
        if (active) {
          const sampleDocuments = initialDocuments.slice(0, 2);
          setVaultDocuments(sampleDocuments);
          setSelectedFieldIds(new Set(sampleDocuments.map((document) => document.id)));
          setIsUsingSampleDocuments(true);
          setDocumentLoadError(profileError.message);
        }
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, category, document_type, mime_type, file_size, processing_status, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        setVaultDocuments([]);
        setSelectedFieldIds(new Set());
        setIsUsingSampleDocuments(false);
        setDocumentLoadError(error.message);
        setIsInitialLoading(false);
        return;
      }

      const savedDocuments = (data || []).map((row) => mapSupabaseDocument(row as SupabaseDocumentRow));
      setVaultDocuments(savedDocuments);
      setSelectedFieldIds(new Set(savedDocuments.slice(0, 2).map((document) => document.id)));
      setIsUsingSampleDocuments(false);
      setDocumentLoadError(null);
      setIsInitialLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const client = supabase;
      if (!client) return;
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const { data: profile } = await client.from('profiles').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (!profile) return;

      const { data: shares, error: sharesError } = await client
        .from('shares')
        .select('id, recipient_name, recipient_organization, allowed_claims, status, expires_at, created_at')
        .eq('profile_id', profile.id);
      if (!active || sharesError || !shares?.length) return;

      const knownLinks = loadSharedLinks(initialSharedLinks);
      const syncedLinks = await Promise.all(shares.map(async (share) => {
        const localLink = knownLinks.find((link) => link.shareId === share.id);
        if (!localLink) return null;

        const { data: events, error: eventsError } = await client
          .from('share_access')
          .select('id, organization_id, organization_member_id, action, accessed_at, created_at, organizations(id, name, type, purpose, website), organization_members(full_name, work_email, role, department)')
          .eq('share_id', share.id)
          .order('created_at', { ascending: true });
        const claims = Array.isArray(share.allowed_claims)
          ? share.allowed_claims as Array<{ document_id?: string; file_name?: string; document?: DocumentItem }>
          : [];
        const requestedDocuments = claims.map((claim) => claim.file_name || claim.document_id || '').filter(Boolean);
        const activity = eventsError || !events
          ? { viewers: localLink.viewers || [], accessRequests: localLink.accessRequests || [], accessCount: localLink.accessCount }
          : mapShareAccessRows(events, requestedDocuments);
        const expiresAt = new Date(share.expires_at);
        const expired = expiresAt.getTime() <= Date.now() || share.status === 'EXPIRED';

        return {
          ...localLink,
          recipient: share.recipient_organization || share.recipient_name || localLink.recipient,
          fieldsShared: requestedDocuments,
          sharedDocumentIds: claims.map((claim) => claim.document_id).filter((id): id is string => Boolean(id)),
          sharedDocuments: claims.flatMap((claim) => claim.document ? [claim.document] : []),
          status: share.status === 'REVOKED' ? 'Revoked' as const : expired ? 'Expired' as const : 'Active' as const,
          expiry: share.status === 'REVOKED' ? 'Revoked by user' : expired ? 'Expired' : `Expires ${expiresAt.toLocaleString()}`,
          createdAt: new Date(share.created_at).toLocaleString(),
          viewers: activity.viewers,
          accessRequests: activity.accessRequests,
          accessCount: activity.accessCount,
        };
      }));

      if (!active) return;
      const updates = new Map(syncedLinks.filter((link): link is NonNullable<typeof link> => link !== null).map((link) => [link.shareId, link]));
      setSharedLinks((previous) => previous.map((link) => updates.get(link.shareId) || link));
    })();

    return () => {
      active = false;
    };
  }, [vaultDocuments]);

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
    setSelectedFieldIds(new Set(vaultDocuments.map((document) => document.id)));
  };

  const clearAll = () => {
    setSelectedFieldIds(new Set());
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return vaultDocuments;
    const q = searchQuery.toLowerCase();
    return vaultDocuments.filter(
      (document) =>
        document.name.toLowerCase().includes(q) ||
        document.category.toLowerCase().includes(q) ||
        document.fileType.toLowerCase().includes(q)
    );
  }, [searchQuery, vaultDocuments]);

  const handleGenerateShare = async () => {
    if (selectedFieldIds.size === 0) return;
    setShareCreationError(null);
    if (!supabase) {
      setShareCreationError('Supabase is not configured. Check the VITE Supabase URL and anon key.');
      return;
    }

    const selectedDocuments = vaultDocuments.filter((document) => selectedFieldIds.has(document.id));
    const selectedFieldsList = selectedDocuments.map((document) => document.name);
    setIsCreatingShare(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Sign in before creating a share link.');

      const { data: ownerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (profileError) throw profileError;

      const token = crypto.randomUUID();
      const tokenHash = await hashShareToken(token);
      const expiresAt = expiryOption === 'never'
        ? '9999-12-31T23:59:59.000Z'
        : new Date(Date.now() + (expiryOption === '1h' ? 1 : expiryOption === '24h' ? 24 : 24 * 7) * 60 * 60 * 1000).toISOString();
      const { data: savedShare, error: shareError } = await supabase
        .from('shares')
        .insert({
          profile_id: ownerProfile.id,
          recipient_name: recipientInput || null,
          recipient_organization: recipientInput || null,
          purpose: 'Organization access request',
          allowed_claims: selectedDocuments.map((document) => ({
            document_id: document.id,
            file_name: document.name,
            document,
          })),
          token_hash: tokenHash,
          expires_at: expiresAt,
        })
        .select('id')
        .single();
      if (shareError) throw shareError;

      const newLink: SharedLink = {
        id: token,
        shareId: savedShare.id,
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
        sharedDocumentIds: selectedDocuments.map((document) => document.id),
        sharedDocuments: selectedDocuments,
      };

      setNewShareToken(token);
      setSharedLinks([newLink, ...sharedLinks]);
      setExpandedLinkId(token);
      setIsCreatePanelOpen(false);
      setIsShareSuccessModalOpen(true);
      showToast('New share link saved to Supabase.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create share link.';
      setShareCreationError(message);
      showToast(message);
    } finally {
      setIsCreatingShare(false);
    }
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

  const handleRevoke = async (id: string) => {
    const link = sharedLinks.find((item) => item.id === id);
    if (!link?.shareId || !supabase) return showToast('This share is not connected to Supabase.');
    const { error } = await supabase
      .from('shares')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
      .eq('id', link.shareId);
    if (error) return showToast(error.message);
    setSharedLinks((previous) => previous.map((item) => item.id === id ? { ...item, status: 'Revoked', expiry: 'Revoked by user' } : item));
    showToast('Link access revoked.');
  };

  const handleRestore = async (id: string) => {
    const link = sharedLinks.find((item) => item.id === id);
    if (!link?.shareId || !supabase) return showToast('This share is not connected to Supabase.');
    const { error } = await supabase
      .from('shares')
      .update({ status: 'ACTIVE', revoked_at: null })
      .eq('id', link.shareId);
    if (error) return showToast(error.message);
    setSharedLinks((previous) => previous.map((item) => item.id === id ? { ...item, status: 'Active', expiry: 'Active' } : item));
    showToast('Link reactivated.');
  };

  // Live Field Removal from Link Drawer
  const handleRemoveFieldFromLink = async (linkId: string, fieldName: string) => {
    const link = sharedLinks.find((item) => item.id === linkId);
    const remainingDocumentIds = link?.sharedDocumentIds?.filter(
      (documentId) => vaultDocuments.find((document) => document.id === documentId)?.name !== fieldName
    );
    if (link?.shareId && remainingDocumentIds && supabase) {
      const { error } = await supabase.from('shares').update({
        allowed_claims: vaultDocuments.filter((document) => remainingDocumentIds.includes(document.id)).map((document) => ({
          document_id: document.id,
          file_name: document.name,
          document,
        })),
      }).eq('id', link.shareId);
      if (error) return showToast(error.message);
    }

    setSharedLinks((prev) =>
      prev.map((link) => {
        if (link.id !== linkId) return link;
        return {
          ...link,
          fieldsShared: link.fieldsShared.filter((f) => f !== fieldName),
          sharedDocumentIds: link.sharedDocumentIds?.filter(
            (documentId) => vaultDocuments.find((document) => document.id === documentId)?.name !== fieldName
          ),
          sharedDocuments: link.sharedDocuments?.filter((document) => document.name !== fieldName),
        };
      })
    );
    showToast(`Removed "${fieldName}" from this share.`);
  };

  const handleAddDocumentToLink = async (linkId: string, documentId: string) => {
    const document = vaultDocuments.find((item) => item.id === documentId);
    if (!document) return;
    const link = sharedLinks.find((item) => item.id === linkId);
    const nextDocumentIds = Array.from(new Set([...(link?.sharedDocumentIds || []), document.id]));
    if (link?.shareId && supabase) {
      const { error } = await supabase.from('shares').update({
        allowed_claims: vaultDocuments.filter((item) => nextDocumentIds.includes(item.id)).map((item) => ({
          document_id: item.id,
          file_name: item.name,
          document: item,
        })),
      }).eq('id', link.shareId);
      if (error) return showToast(error.message);
    }

    setSharedLinks((prev) =>
      prev.map((link) => {
        if (link.id !== linkId) return link;
        return {
          ...link,
          fieldsShared: link.fieldsShared.includes(document.name)
            ? link.fieldsShared
            : [...link.fieldsShared, document.name],
          sharedDocumentIds: Array.from(new Set([...(link.sharedDocumentIds || []), document.id])),
          sharedDocuments: [...(link.sharedDocuments || []), document],
        };
      })
    );
    setActiveDrawerLinkId(null);
    showToast(`Added "${document.name}" to this share.`);
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
  const appendAccessEvent = async (
    linkId: string,
    requestId: string,
    action: 'APPROVED' | 'DENIED' | 'REVOKED',
    status: 'approved' | 'declined' | 'revoked',
    successMessage: string,
  ) => {
    const link = sharedLinks.find((item) => item.id === linkId);
    const request = link?.accessRequests?.find((item) => item.id === requestId);
    if (!link?.shareId || !request?.organizationId || !request.organizationMemberId || !supabase) {
      return showToast('This access request is missing its Supabase organization/member link.');
    }

    const { data, error } = await supabase
      .from('share_access')
      .insert({
        share_id: link.shareId,
        organization_id: request.organizationId,
        organization_member_id: request.organizationMemberId,
        action,
      })
      .select('id, created_at')
      .single();
    if (error) return showToast(error.message);

    setSharedLinks((previous) => previous.map((item) => item.id !== linkId ? item : {
      ...item,
      accessRequests: item.accessRequests?.map((entry) => entry.organizationMemberId === request.organizationMemberId
        ? { ...entry, id: data.id, status, requestedAt: new Date(data.created_at).toLocaleString() }
        : entry),
    }));
    showToast(successMessage);
  };

  const handleApproveRequest = (linkId: string, requestId: string) => {
    void appendAccessEvent(linkId, requestId, 'APPROVED', 'approved', 'Organization access approved.');
  };

  const handleDeclineRequest = (linkId: string, requestId: string) => {
    void appendAccessEvent(linkId, requestId, 'DENIED', 'declined', 'Access request declined.');
  };

  const handleRevokeOrganizationAccess = (linkId: string, requestId: string) => {
    void appendAccessEvent(linkId, requestId, 'REVOKED', 'revoked', 'Organization access removed.');
  };

  if (isInitialLoading) {
    return <SharePageSkeleton />;
  }

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
            Choose specific documents, review organization requests, and manage approved access.
          </p>
        </div>

        {/* Top Corner Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (sharedLinks.length > 0) {
                setSharedLinks([]);
                saveSharedLinks([]);
              } else {
                setSharedLinks(initialSharedLinks);
                saveSharedLinks(initialSharedLinks);
              }
            }}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#2b2b3a] bg-zinc-100 dark:bg-[#161622] hover:bg-zinc-200 dark:hover:bg-[#202030] text-zinc-700 dark:text-[#cbbeff] text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{sharedLinks.length > 0 ? 'Clear Demo Shares' : 'Load Demo Shares'}</span>
          </button>

          <button
            onClick={() => {
              setShareCreationError(null);
              setIsCreatePanelOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#5a25eb] hover:bg-[#6b37fa] text-white font-semibold text-sm transition-all shadow-md shadow-[#5a25eb]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Share Link</span>
          </button>
        </div>
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

        {sharedLinks.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#0c0c12] border border-dashed border-zinc-300 dark:border-[#242330] space-y-3">
            <Share2 className="w-8 h-8 text-zinc-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">No active share links</p>
              <p className="text-xs text-zinc-500 dark:text-[#8c879a]">
                You have not shared any credentials yet. Click "Create Share Link" to create a selective disclosure token or "Load Demo Shares" to preview sample shares.
              </p>
            </div>
          </div>
        ) : (
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
                        <span>
                          {link.sharedDocumentIds?.length ?? link.fieldsShared.length}{' '}
                          {link.sharedDocumentIds?.length ? 'Shared Documents' : 'Disclosed Fields'}
                        </span>
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
                                  {req.profile && (
                                    <p className="text-[11px] text-zinc-500 dark:text-[#8c879a]">
                                      {req.profile.workEmail} · {req.profile.organizationType} · {req.profile.role}
                                      {req.profile.department ? ` · ${req.profile.department}` : ''}
                                      {req.profile.website ? ` · ${req.profile.website}` : ''}
                                    </p>
                                  )}
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
                                        onClick={() => handleApproveRequest(link.id, req.id)}
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
                                    <button
                                      onClick={() => handleRevokeOrganizationAccess(link.id, req.id)}
                                      className="px-3.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold cursor-pointer transition-colors hover:bg-red-500/20"
                                    >
                                      Remove Access
                                    </button>
                                  ) : req.status === 'revoked' ? (
                                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                      Access Removed
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
                            <span>
                              {link.sharedDocumentIds ? 'Shared Documents' : 'Currently Disclosed Fields'} ({link.fieldsShared.length})
                            </span>
                          </h4>

                          <button
                            onClick={() => setActiveDrawerLinkId(link.id)}
                            className="text-xs text-[#5a25eb] dark:text-[#cbbeff] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {link.sharedDocumentIds ? 'Add Document' : 'Add Information to this Live Link'}
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
      )}
      </div>

      {/* CREATE SHARE MODAL / SLIDE-OVER PANEL */}
      <Modal
        isOpen={isCreatePanelOpen}
        onClose={() => setIsCreatePanelOpen(false)}
        title="Create Selective Share Link"
        subtitle="Choose the documents this organization may request access to."
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {shareCreationError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {shareCreationError}
            </p>
          )}
          {documentLoadError && (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              Could not load vault documents: {documentLoadError}
            </p>
          )}
          {isUsingSampleDocuments && (
            <p role="status" className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              Showing two sample documents for testing. They are not saved in your Supabase vault.
            </p>
          )}
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name or category..."
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

          <div className="space-y-2">
            {filteredDocuments.map((document) => {
              const isSelected = selectedFieldIds.has(document.id);
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => toggleField(document.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-200 dark:border-[#2d2b38] hover:border-zinc-400 dark:hover:border-[#4b4858]'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-400'}`}>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-zinc-900 dark:text-white">{document.name}</span>
                    <span className="mt-0.5 block text-[11px] capitalize text-zinc-500 dark:text-[#8c879a]">
                      {document.category} · {document.fileType} · {document.fileSize}
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-500">{document.extractedFieldsCount} records</span>
                </button>
              );
            })}
            {filteredDocuments.length === 0 && (
              <p className="py-6 text-center text-xs text-zinc-500">
                {vaultDocuments.length === 0 ? 'No uploaded documents are available in your SYNDEO vault.' : 'No documents match this search.'}
              </p>
            )}
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
              disabled={selectedFieldIds.size === 0 || isCreatingShare}
              className={`px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                selectedFieldIds.size > 0
                  ? 'bg-[#5a25eb] hover:bg-[#6b37fa] text-white shadow-[#5a25eb]/25'
                  : 'bg-zinc-300 dark:bg-[#252430] text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Share2 className="w-4 h-4" />
              {isCreatingShare ? 'Saving share...' : `Generate & Share (${selectedFieldIds.size})`}
            </button>
          </div>
        </div>
      </Modal>

      {/* POPUP MODAL ON CREATION: QR + DIRECT SHARE LINK */}
      <Modal
        isOpen={isShareSuccessModalOpen}
        onClose={() => setIsShareSuccessModalOpen(false)}
        title="Share Link & QR Code Generated"
        subtitle="The selected documents remain locked until the requesting organization is approved."
      >
        <div className="space-y-6 text-center py-2">
          <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl border border-zinc-200 bg-white p-4">
            <QRCodeSVG value={`${window.location.origin}/?share=${encodeURIComponent(newShareToken)}`} size={192} level="H" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 dark:text-[#9e9aa8]">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Documents unlock after organization approval</span>
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
        title={sharedLinks.find((link) => link.id === activeDrawerLinkId)?.sharedDocumentIds ? 'Add a Document' : 'Disclose Additional Information'}
        subtitle={sharedLinks.find((link) => link.id === activeDrawerLinkId)?.sharedDocumentIds ? 'Add a document to this share. Approved organizations will see the updated selection.' : 'Select a record to add to this active share link.'}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchAddDrawerQuery}
              onChange={(e) => setSearchAddDrawerQuery(e.target.value)}
              placeholder="Search documents or information..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-[#2d2b38] bg-zinc-50 dark:bg-[#18171f] text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#5a25eb]/50"
            />
          </div>

          <div className="space-y-2">
            {sharedLinks.find((link) => link.id === activeDrawerLinkId)?.sharedDocumentIds !== undefined ? (
              vaultDocuments
                .filter((document) => !sharedLinks.find((link) => link.id === activeDrawerLinkId)?.sharedDocumentIds?.includes(document.id))
                .filter((document) => !searchAddDrawerQuery.trim() || document.name.toLowerCase().includes(searchAddDrawerQuery.toLowerCase()) || document.category.includes(searchAddDrawerQuery.toLowerCase()))
                .map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => activeDrawerLinkId && handleAddDocumentToLink(activeDrawerLinkId, document.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 p-3 text-left hover:border-emerald-500 dark:border-[#282733]"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-white">{document.name}</span>
                      <span className="mt-1 block text-[11px] capitalize text-zinc-500">{document.category} · {document.fileSize}</span>
                    </span>
                    <Plus className="h-4 w-4 text-emerald-600" />
                  </button>
                ))
            ) : (
              AVAILABLE_FIELDS.filter((field) => !sharedLinks.find((link) => link.id === activeDrawerLinkId)?.fieldsShared.includes(field.label))
                .filter((field) => !searchAddDrawerQuery.trim() || field.label.toLowerCase().includes(searchAddDrawerQuery.toLowerCase()) || field.category.toLowerCase().includes(searchAddDrawerQuery.toLowerCase()))
                .map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => activeDrawerLinkId && handleAddFieldToLink(activeDrawerLinkId, field.label)}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 p-3 text-left hover:border-emerald-500 dark:border-[#282733]"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-zinc-900 dark:text-white">{field.label}</span>
                      <span className="mt-1 block text-[11px] text-zinc-500">{field.value}</span>
                    </span>
                    <Plus className="h-4 w-4 text-emerald-600" />
                  </button>
                ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
