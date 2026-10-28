import { db, ui, bump } from '../state/db';
import { can } from '../state/access';
import { REQ } from '../state/requirements';
import { inviteStaff, saveCmsVersion } from '../lib/adminBackend';
import { useForm } from '../ui/FormSheet';
import { useToast } from '../ui/Toast';
import { useNav } from './Nav';
import { DrawerBody } from '../ui/Overlay';
import { Card } from '../ui/Card';
import { OutlineBtn } from '../ui/Controls';
import { Txt } from '../ui/Txt';

const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 70);
const dateError = (from: string, to: string) => from && to && to < from ? 'End date cannot be before start date.' : '';

export function QuickCreateSheet({ onClose }: { onClose: () => void }) {
  const form = useForm();
  const toast = useToast();
  const { go } = useNav();

  const openCmsForm = (kind: 'banner' | 'promotion' | 'announcement') => {
    if (!can(...REQ.content)) { toast('You need Content edit access to create a draft.'); return; }
    const common = [{ id: 'title', label: kind === 'promotion' ? 'Campaign name' : 'Title', type: 'text' as const, required: true }];
    const fields = kind === 'banner' ? [
      ...common, { id: 'service', label: 'Service', type: 'select' as const, options: db.SVC.map((s) => s[0]), required: true, value: 'Goodies' },
      { id: 'placement', label: 'Placement', type: 'select' as const, options: ['Home hero', 'Home card', 'Category', 'Wallet card', 'Collection'], required: true, value: 'Home hero' },
      { id: 'from', label: 'Start date', type: 'date' as const }, { id: 'to', label: 'End date', type: 'date' as const },
    ] : kind === 'promotion' ? [
      ...common,
      { id: 'code', label: 'Coupon code', type: 'text' as const, required: true },
      { id: 'service', label: 'Service', type: 'select' as const, options: db.SVC.map((s) => s[0]), required: true, value: 'Goodies' },
      { id: 'funding', label: 'Funding', type: 'select' as const, options: ['Platform', 'Vendor', 'Mixed'], required: true, value: 'Platform' },
      { id: 'discountType', label: 'Discount type', type: 'select' as const, options: ['Percentage off', 'Fixed amount off', 'Free delivery'], required: true, value: 'Percentage off' },
      { id: 'discountValue', label: 'Discount value', type: 'number' as const, required: true },
      { id: 'minimumOrder', label: 'Minimum order amount (USD)', type: 'number' as const, value: '0' },
      { id: 'budget', label: 'Campaign budget limit (USD)', type: 'number' as const },
      { id: 'eligibility', label: 'Who can use this coupon?', type: 'select' as const, options: ['All customers', 'New customers only', 'Returning customers only'], required: true, value: 'All customers' },
      { id: 'from', label: 'Valid from date', type: 'date' as const, required: true },
      { id: 'startTime', label: 'Daily start time (24-hour HH:MM)', type: 'text' as const, value: '00:00', required: true },
      { id: 'to', label: 'Valid until date', type: 'date' as const, required: true },
      { id: 'endTime', label: 'Daily end time (24-hour HH:MM)', type: 'text' as const, value: '23:59', required: true },
      { id: 'validDays', label: 'Days the coupon is valid', type: 'select' as const, options: ['Every day', 'Weekdays only', 'Weekends only', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true, value: 'Every day' },
      { id: 'usageLimit', label: 'Total redemptions allowed (first come, first served)', type: 'number' as const, value: '100' },
      { id: 'perCustomerLimit', label: 'Redemptions per customer', type: 'number' as const, value: '1' },
      { id: 'terms', label: 'Terms and conditions', type: 'textarea' as const },
    ] : [
      ...common, { id: 'message', label: 'Message', type: 'textarea' as const, required: true },
      { id: 'audience', label: 'Audience', type: 'select' as const, options: ['All customers', 'Businesses and providers', 'One service'], required: true, value: 'All customers' },
      { id: 'when', label: 'Schedule date', type: 'date' as const },
    ];
    form({
      title: 'New ' + kind,
      fields,
      buttons: [{ label: 'Save draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        if (dateError(String(values.from || ''), String(values.to || ''))) return dateError(String(values.from || ''), String(values.to || ''));
        if (kind === 'promotion') {
          const code = String(values.code || '').trim();
          const discount = Number(values.discountValue);
          const minimumOrder = Number(values.minimumOrder || 0);
          const usageLimit = Number(values.usageLimit || 0);
          const perCustomerLimit = Number(values.perCustomerLimit || 0);
          const timePattern = /^(?:[01]\\d|2[0-3]):[0-5]\\d$/;
          if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) return 'Coupon codes must be 3 to 32 letters, numbers, underscores or hyphens.';
          if (!Number.isFinite(discount) || discount < 0 || (String(values.discountType) === 'Percentage off' && discount > 100)) return 'Enter a valid discount value. Percentages cannot exceed 100.';
          if (!Number.isFinite(minimumOrder) || minimumOrder < 0) return 'Minimum order amount cannot be negative.';
          if (values.startTime && !timePattern.test(String(values.startTime))) return 'Enter a valid daily start time in HH:MM format.';
          if (values.endTime && !timePattern.test(String(values.endTime))) return 'Enter a valid daily end time in HH:MM format.';
          if (usageLimit < 0 || perCustomerLimit < 0) return 'Redemption limits cannot be negative.';
          values.code = code.toUpperCase();
        }
        const title = String(values.title || '').trim();
        const key = 'admin.' + kind + '.' + slug(title);
        if (!title || !slug(title)) return 'Enter a valid title.';
        try {
          const payload: Record<string, unknown> = { type: kind, title, status: 'draft', created_from: 'admin-quick-create', ...values };
          delete payload.title;
          await saveCmsVersion({ key, locale: 'en', payload: { title, ...payload }, status: 'draft' });
          ui.cs = 'CMS versions';
          bump();
          toast('Draft saved. Open Content to review it before publishing.');
          go('content');
          return;
        } catch (error) {
          return error instanceof Error ? error.message : 'Draft could not be saved.';
        }
      },
    });
    onClose();
  };

  const openInviteForm = () => {
    if (!can(...REQ.permissions)) { toast('You need Manage permissions access to invite staff.'); return; }
    form({
      title: 'Invite staff',
      sub: 'Invitation sent through the protected server workflow.',
      fields: [
        { id: 'name', label: 'Display name', type: 'text', required: true },
        { id: 'email', label: 'Work email', type: 'email', required: true },
        { id: 'reason', label: 'Reason for access (audit log)', type: 'textarea', required: true },
      ],
      buttons: [{ label: 'Send invitation', key: 'send', primary: true }],
      onSubmit: async (_key, values) => {
        const name = String(values.name || '').trim();
        const email = String(values.email || '').trim();
        const reason = String(values.reason || '').trim();
        if (!name) return 'Enter the staff member’s name.';
        if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid work email.';
        if (!reason) return 'Enter a reason for this invitation.';
          try {
          await inviteStaff(email, name, reason);
          toast('Invitation sent to ' + email + '.');
          go('people', { ps: 'Invitations' });
        } catch (error) {
          return error instanceof Error ? error.message : 'Invitation could not be sent.';
        }
      },
    });
    onClose();
  };

  return (
    <DrawerBody title="Quick create" onClose={onClose}>
      <Card>
        <OutlineBtn primary onPress={() => openCmsForm('banner')}>New banner</OutlineBtn>
        <OutlineBtn onPress={() => openCmsForm('promotion')}>New promotion</OutlineBtn>
        <OutlineBtn onPress={() => openInviteForm()}>Invite staff</OutlineBtn>
        <OutlineBtn onPress={() => openCmsForm('announcement')}>New announcement</OutlineBtn>
      </Card>
    </DrawerBody>
  );
}
