import { supabase } from './supabase';

export type AccessLevel = 'view' | 'edit' | 'manage';
export type StaffStatus = 'active' | 'suspended' | 'revoked';
export type CmsStatus = 'draft' | 'published' | 'archived';
export type AdminDomain = 'operations' | 'ecosystem' | 'finance' | 'people' | 'support';

export interface AdminStaffRecord {
  user_id: string;
  display_name: string;
  status: StaffStatus;
  role: 'super_admin' | 'staff';
  created_at: string;
}
export interface PermissionGrant {
  id: string;
  staff_user_id: string;
  permission_key: string;
  access_level: AccessLevel;
  expires_at: string | null;
  revoked_at: string | null;
  reason: string;
  created_at: string;
}
export interface CmsContentRecord {
  id: string;
  content_key: string;
  locale: string;
  version: number;
  status: CmsStatus;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message || 'The server operation failed.');
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function inviteStaff(email: string, displayName: string, reason: string) {
  return invoke<{ ok: true; user_id: string; message: string }>('wantiss-admin-staff', {
    action: 'invite', email, display_name: displayName, reason,
  });
}
export async function setStaffStatus(userId: string, status: StaffStatus, reason: string) {
  return invoke<{ ok: true }>('wantiss-admin-staff', { action: 'status', user_id: userId, status, reason });
}
export async function grantStaffPermission(input: {
  userId: string; permissionKey: string; level: AccessLevel; reason: string; expiresAt?: string | null;
}) {
  return invoke<{ ok: true; grant_id: string }>('wantiss-admin-staff', {
    action: 'grant', user_id: input.userId, permission_key: input.permissionKey,
    access_level: input.level, reason: input.reason, expires_at: input.expiresAt || null,
  });
}
export async function revokeStaffPermission(grantId: string, reason: string) {
  return invoke<{ ok: true }>('wantiss-admin-staff', { action: 'revoke', grant_id: grantId, reason });
}
export async function listStaff(): Promise<AdminStaffRecord[]> {
  const { data, error } = await supabase.from('wantiss_admin_staff')
    .select('user_id,display_name,status,role,created_at').order('created_at', { ascending: false });
  if (error) throw new Error('Staff list is unavailable.');
  return data || [];
}
export async function listPermissionGrants(userId?: string): Promise<PermissionGrant[]> {
  let query = supabase.from('wantiss_admin_permission_grants')
    .select('id,staff_user_id,permission_key,access_level,expires_at,revoked_at,reason,created_at')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('staff_user_id', userId);
  const { data, error } = await query;
  if (error) throw new Error('Permission grants are unavailable.');
  return data || [];
}
export async function loadAdminDomain(domain: AdminDomain): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('wantiss_admin_dashboard_snapshot', { p_domain: domain });
  if (error) throw new Error(error.code === '42501' ? 'You do not have permission to view this data.' : 'Admin data is unavailable.');
  return Array.isArray(data?.items) ? data.items : [];
}
export async function reviewBusinessApplication(id: string, status: 'approved' | 'rejected' | 'pending', note: string) {
  const { error } = await supabase.rpc('wantiss_admin_review_business_application', {
    p_application_id: id, p_status: status, p_review_note: note,
  });
  if (error) throw new Error(error.code === '42501' ? 'You do not have permission to review applications.' : error.message);
}
export async function saveCmsVersion(input: {
  key: string; locale: string; payload: Record<string, unknown>; status?: CmsStatus;
}) {
  const { data, error } = await supabase.rpc('wantiss_admin_save_cms_draft', {
    p_content_key: input.key, p_locale: input.locale, p_payload: input.payload,
  });
  if (error) throw new Error(error.code === '42501' ? 'You do not have permission to save this content state.' : error.message);
  return String(data);
}
export async function uploadCmsAsset(input: {
  key: string; uri: string; fileName: string; contentType: string; byteSize: number;
  altText?: Record<string, string>; status?: 'draft';
}) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'].includes(input.contentType)) {
    throw new Error('This asset type is not supported.');
  }
  if (input.byteSize < 1 || input.byteSize > 10 * 1024 * 1024) throw new Error('Assets must be 10 MB or smaller.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in before uploading assets.');
  const response = await fetch(input.uri);
  if (!response.ok) throw new Error('The selected asset could not be read.');
  const blob = await response.blob();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'asset';
  const path = user.id + '/' + crypto.randomUUID() + '-' + safeName;
  const { error: uploadError } = await supabase.storage.from('wantiss-cms-assets').upload(path, blob, {
    contentType: input.contentType, upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);
  const { data, error } = await supabase.rpc('wantiss_admin_upsert_asset', {
    p_asset_key: input.key, p_storage_path: path, p_content_type: input.contentType,
    p_byte_size: input.byteSize, p_alt_text: input.altText || {}, p_status: 'draft',
  });
  if (error) {
    await supabase.storage.from('wantiss-cms-assets').remove([path]);
    throw new Error(error.code === '42501' ? 'You do not have permission to publish or upload this asset.' : error.message);
  }
  return String(data);
}

export async function listCmsAssets() {
  const { data, error } = await supabase.rpc('wantiss_admin_list_cms_assets');
  if (error) throw new Error(error.code === '42501' ? 'You do not have permission to view assets.' : 'Assets are unavailable.');
  return data || [];
}
export async function publishCmsVersion(id: string) {
  const { error } = await supabase.rpc('wantiss_admin_publish_cms_version', { p_content_id: id });
  if (error) throw new Error(error.code === '42501' ? 'Publishing requires content.publish manage permission.' : error.message);
}
export async function archiveCmsVersion(id: string) {
  const { error } = await supabase.rpc('wantiss_admin_archive_cms_version', { p_content_id: id });
  if (error) throw new Error(error.code === '42501' ? 'Archiving requires content.archive manage permission.' : error.message);
}
export async function publishCmsAsset(id: string) {
  const { error } = await supabase.rpc('wantiss_admin_set_cms_asset_status', { p_asset_id: id, p_status: 'published' });
  if (error) throw new Error(error.code === '42501' ? 'Publishing requires content.assets manage permission.' : error.message);
}
export async function archiveCmsAsset(id: string) {
  const { error } = await supabase.rpc('wantiss_admin_set_cms_asset_status', { p_asset_id: id, p_status: 'archived' });
  if (error) throw new Error(error.code === '42501' ? 'Archiving requires content.archive manage permission.' : error.message);
}
