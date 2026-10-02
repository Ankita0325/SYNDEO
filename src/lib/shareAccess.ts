import type { AccessViewer, AccessRequestItem, OrganizationAccessProfile, OrganizationType, SharePurpose } from '../types';

export interface ShareAccessRow {
  id: string;
  organization_id?: string;
  organization_member_id?: string;
  action?: string;
  accessed_at?: string;
  created_at?: string;
  organizations?: any;
  organization_members?: any;
}

export interface ShareAccessSummary {
  accessCount: number;
  viewers: AccessViewer[];
  accessRequests: AccessRequestItem[];
}

export function mapShareAccessRows(
  rows: any[] = [],
  fallbackRequestedFields: string[] = []
): ShareAccessSummary {
  const viewers: AccessViewer[] = [];
  const accessRequests: AccessRequestItem[] = [];

  for (const row of rows) {
    if (!row) continue;
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    const member = Array.isArray(row.organization_members) ? row.organization_members[0] : row.organization_members;
    const time = row.accessed_at || row.created_at || new Date().toISOString();
    const formattedTime = new Date(time).toLocaleString();

    const orgName = org?.name || 'Authorized Organization';
    const memberName = member?.full_name || 'Organization Reviewer';
    const role = member?.role ? `${member.role} • ${orgName}` : orgName;

    // Map to viewer
    viewers.push({
      id: row.id || `view-${Math.random().toString(36).slice(2, 9)}`,
      userName: memberName,
      roleOrOrg: role,
      viewedAt: formattedTime,
      ipLocation: 'Verified Gateway',
      verificationStatus: 'zk-verified',
      email: member?.work_email,
    });

    // Map to access request
    const profile: OrganizationAccessProfile = {
      fullName: memberName,
      workEmail: member?.work_email || '',
      organizationName: orgName,
      organizationType: (org?.type as OrganizationType) || 'Company',
      role: member?.role || 'Reviewer',
      department: member?.department || '',
      website: org?.website || '',
      purpose: (org?.purpose as SharePurpose) || 'Verification',
    };

    accessRequests.push({
      id: row.id || `req-${Math.random().toString(36).slice(2, 9)}`,
      requesterName: memberName,
      organization: orgName,
      requestedFields: fallbackRequestedFields,
      purpose: org?.purpose || 'Identity & Credential Verification',
      requestedAt: formattedTime,
      status: row.action === 'DECLINED' ? 'declined' : row.action === 'REVOKED' ? 'revoked' : 'approved',
      profile,
      organizationId: row.organization_id,
      organizationMemberId: row.organization_member_id,
    });
  }

  return {
    accessCount: rows.length,
    viewers,
    accessRequests,
  };
}
