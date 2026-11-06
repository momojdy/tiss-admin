/** Keep UI labels aligned with the keys and minimum levels enforced by RPCs. */
const keys: Record<string, {key: string; minimum: number}> = {
  'Content': {key: 'content.manage', minimum: 1},
  'Manage content': {key: 'content.manage', minimum: 2},
  'Publish content': {key: 'content.publish', minimum: 3},
  'Archive content': {key: 'content.archive', minimum: 3},
  'Manage assets': {key: 'content.assets', minimum: 2},
  'Manage permissions': {key: 'staff.manage', minimum: 3},
  'Pause accounts': {key: 'accounts.restrict', minimum: 3},
  'Issue refunds': {key: 'finance.refund', minimum: 3},
  'Read audit log': {key: 'audit.read', minimum: 1},
};
export const permissionKey = (label: string) => keys[label]?.key || label.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
export const requiredPermissionLevel = (label: string) => keys[label]?.minimum || 1;
export const superAdminOnlyRight = (label: string) => label === 'Ban accounts';
