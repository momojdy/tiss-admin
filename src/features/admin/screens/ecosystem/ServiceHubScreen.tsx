import { View } from 'react-native';
import { can } from '../../state/access';
import { REQ, useGuard } from '../../state/requirements';
import { useForm } from '../../ui/FormSheet';
import { useToast } from '../../ui/Toast';
import { setBusinessVerification, type BusinessVerification } from '../../lib/adminBackend';
import { hydrateAdminState } from '../../lib/hydrateAdminState';
import { db, ui, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { Section } from '../../ui/Card';
import { Card } from '../../ui/Card';
import { ButtonRow, OutlineBtn, Pill, Row, StatusPill } from '../../ui/Controls';
import { Heading } from '../../ui/Heading';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { useOpenModule } from './useOpenModule';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERIFY_COPY: Record<BusinessVerification, string> = {
  pending: 'Not verified. Its Goodies store cannot go live.',
  verified: 'Verified. The owner can publish its Goodies store.',
  restricted: 'Restricted. Its Goodies store is unpublished and cannot go live.',
};

export function ServiceHubScreen() {
  useDb();
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { go } = useNav();
  const open = useOpen();
  const openModule = useOpenModule();
  const c = db.SVC.find((x) => x[0] === ui.hub) ?? db.SVC[0];
  const mods = (db.MOD[c[0]] || 'Overview').split('|');
  const pre = c[5] === 'Pre-order';
  const banners = db.BN.filter((b) => b.svc === c[0]);
  const bizId = UUID.test(String(c[7])) ? String(c[7]) : '';
  const verification: BusinessVerification = c[1] === 'verified' || c[1] === 'restricted' ? c[1] : 'pending';
  const changeVerification = (next: BusinessVerification, title: string, verb: string) => form({
    title: title + ' ' + c[0],
    fields: [{ id: 'r', label: 'Reason (saved in the audit log)', type: 'textarea', required: true, maxLength: 500 }],
    buttons: [{ label: verb, key: 's', primary: true }],
    sub: next === 'verified' ? 'Confirm you checked the business registration and any licence its category needs.' : 'This unpublishes its Goodies store immediately.',
    onSubmit: async (_k, v) => {
      await setBusinessVerification(bizId, next, String(v.r));
      await hydrateAdminState().catch(() => undefined);
      toast(c[0] + ': ' + next);
    },
  });
  return (
    <View>
      <Row style={{ marginBottom: 4 }}>
        <Pill onPress={() => go('ecosystem')}>‹ Back</Pill>
        <Txt size={10.6} mut>{'Ecosystem › ' + c[0]}</Txt>
      </Row>
      <Heading title={c[0] + '\nService hub'} kpis={bizId ? [
        { icon: '▥', value: c[2] === '1' ? 'Live' : 'Not live', label: 'Goodies store' },
        { icon: '▤', value: verification === 'verified' ? 'Verified' : verification === 'restricted' ? 'Restricted' : 'Pending', label: 'Verification' },
        { icon: '◔', value: c[6] ? 'Ready' : 'Not set up', label: 'Payouts' },
      ] : [
        { icon: '▥', value: c[2], label: pre ? 'Status' : 'Orders today', onPress: () => openModule(c[0], 'Overview') },
        { icon: '▤', value: c[3], label: pre ? 'Phase' : 'Pending items', onPress: () => openModule(c[0], 'Overview') },
        { icon: '◔', value: c[4] + '%', label: pre ? 'Launch readiness' : 'Health score', onPress: () => openModule(c[0], 'Overview') },
      ]} />
      {pre ? <Card><Txt size={12} mut>Prezo is in pre-order. It stays separate from active services until its launch state changes.</Txt></Card> : null}
      {bizId ? (
        <Section title="Business verification" right={<StatusPill label={verification} />}>
          <Txt size={12} mut lh={1.4}>{VERIFY_COPY[verification]}</Txt>
          {can(...REQ.ecosystem) ? (
            <ButtonRow>
              {verification !== 'verified' ? <OutlineBtn primary onPress={guard(REQ.ecosystem, () => changeVerification('verified', 'Verify', 'Verify business'))}>Verify business</OutlineBtn> : null}
              {verification === 'verified' ? <OutlineBtn onPress={guard(REQ.ecosystem, () => changeVerification('pending', 'Withdraw verification for', 'Withdraw'))}>Withdraw verification</OutlineBtn> : null}
              {verification !== 'restricted' ? <OutlineBtn onPress={guard(REQ.ecosystem, () => changeVerification('restricted', 'Restrict', 'Restrict'))}>Restrict business</OutlineBtn> : null}
            </ButtonRow>
          ) : null}
        </Section>
      ) : null}
      <Section title="Modules"><ListRows rows={mods.map((m) => ({ key: m, main: m, right: '›', onPress: () => openModule(c[0], m) }))} /></Section>
      <Section title="Content for this service">
        <ListRows empty="No content assigned." rows={banners.map((b) => ({ key: b.id, main: b.t, right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={b.st} /><Txt size={10.1}>›</Txt></View>, onPress: () => open('ban', b.id) }))} />
      </Section>
    </View>
  );
}
