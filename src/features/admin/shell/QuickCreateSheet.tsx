import { db, ui, aud, bump } from '../state/db';
import { can, session } from '../state/access';
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
      ...common, { id: 'service', label: 'Service', type: 'select' as const, options: db.SVC.map((s) => s[0]), required: true, value: 'Goodies' },
      { id: 'funding', label: 'Funding', type: 'select' as const, options: ['Platform', 'Vendor', 'Mixed'], required: true, value: 'Platform' },
      { id: 'incentive', label: 'Incentive', type: 'text' as const, required: true },
      { id: 'budget', label: 'Budget limit (USD)', type: 'number' as const },
      { id: 'from', label: 'Start date', type: 'date' as const, required: true }, { id: 'to', label: 'End date', type: 'date' as const, required: true },
      { id: 'terms', label: 'Terms', type: 'textarea' as const },
    ] : [
      ...common, { id: 'message', label: 'Message', type: 'textarea' as const, required: true },
      { id: 'audience', label: 'Audience', type: 'select' as const, options: ['All customers', 'Businesses and providers', 'One service'], required: true, value: 'All customers' },
      { id: 'when', label: 'Schedule date', type: 'date' as const },
    ];
    form({
      title: 'New ' + kind,
      sub: 'Creates a private CMS draft. It does not publish anything automatically.',
      fields,
      buttons: [{ label: 'Save draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        if (dateError(String(values.from || ''), String(values.to || ''))) return dateError(String(values.from || ''), String(values.to || ''));
        const title = String(values.title || '').trim();
        const key = 'admin.' + kind + '.' + slug(title);
        if (!title || !slug(title)) return 'Enter a valid title.';
        try {
          const payload: Record<string, unknown> = { type: kind, title, status: 'draft', created_from: 'admin-quick-create', ...values };
          delete payload.title;
          await saveCmsVersion({ key, locale: 'en', payload: { title, ...payload }, status: 'draft' });
          aud('CMS draft created · ' + kind + ' · ' + title, session.view);
          bump();
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
      sub: 'An invitation is sent through the protected server workflow. Staff access is not created locally.',
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
      <Txt size={10.6} mut style={{ marginBottom: 10 }}>Create a private draft or invite staff. Publishing and staff provisioning stay server-authorized.</Txt>
      <Card>
        <OutlineBtn primary onPress={() => openCmsForm('banner')}>New banner</OutlineBtn>
        <OutlineBtn onPress={() => openCmsForm('promotion')}>New promotion</OutlineBtn>
        <OutlineBtn onPress={() => openInviteForm()}>Invite staff</OutlineBtn>
        <OutlineBtn onPress={() => openCmsForm('announcement')}>New announcement</OutlineBtn>
      </Card>
      <Txt size={9.5} mut>Banner, promotion and announcement drafts are stored as CMS versions. The HTML prototype's separate publishing/approval tables still need server integration before these drafts can go live.</Txt>
    </DrawerBody>
  );
}
