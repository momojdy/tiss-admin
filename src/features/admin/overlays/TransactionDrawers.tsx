import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { aud, bump, db, mny, useDb } from '../state/db';
import { can, session } from '../state/access';
import { REQ, useGuard } from '../state/requirements';
import { Section } from '../ui/Card';
import { OutlineBtn, StatusPill } from '../ui/Controls';
import { useForm } from '../ui/FormSheet';
import { KeyValue, ListRows } from '../ui/Lists';
import { DrawerBody, useOverlay } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Txt } from '../ui/Txt';
import { useTheme } from '../theme/ThemeContext';
import { shareCsv } from '../lib/csv';
import { drawers, useOpen } from './registry';
import { useNav } from '../shell/Nav';
import { findById } from '../lib/findById';


function Receipt({ id }: { id: string }) {
  const { c } = useTheme();
  const x = findById(db.INV, id)!;
  const pd = x.s === 'Completed';
  const note = x.s === 'Failed' ? 'This payment failed and was not charged.' : x.s === 'Refund pending' ? `A refund of ${mny(x.ref)} is pending. The original payment is unchanged.` : x.s === 'Pending' ? 'Awaiting settlement.' : '';
  const Cell = ({ k, v, sub }: { k: string; v: string; sub?: string }) => (
    <View style={{ flex: 1 }}><Txt size={9.5} mut>{k}</Txt><Txt size={10.1} weight={600}>{v}</Txt>{sub ? <Txt size={10.1}>{sub}</Txt> : null}</View>
  );
  const Line = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, ...(strong ? { borderTopWidth: 2, borderTopColor: c.ink, marginTop: 4, paddingTop: 6 } : null) }}>
      <Txt size={10.1} weight={strong ? 600 : 400}>{k}</Txt><Txt size={10.1} weight={strong ? 600 : 400}>{v}</Txt>
    </View>
  );
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 18, padding: 14, marginVertical: 10, shadowColor: '#3c321e', shadowOpacity: 0.08, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 25, height: 25, borderRadius: 8, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}><Txt size={15.8} weight={500} color={c.on}>W</Txt></View>
          <Txt size={16.8} weight={500}>wantiss</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}><Txt size={9.5} mut>RECEIPT</Txt><Txt size={10.1} weight={600}>{id}</Txt></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}><Cell k="USER" v={x.u} sub="Wantiss customer" /><Cell k="FEATURE" v={x.f} sub={'Linked record ' + id.slice(-4)} /></View>
      <View style={{ flexDirection: 'row', gap: 18, marginVertical: 10 }}><Cell k="Created" v={x.d + ', 2026'} /><Cell k="Currency" v="USD" /><Cell k="Method" v="Wallet" /></View>
      <View style={{ borderTopWidth: 1, borderTopColor: c.bd }}>
        <Line k={x.f} v={mny(x.a)} /><Line k="Platform fee" v="$0" /><Line k="Refunded so far" v={mny(x.ref)} /><Line k={pd ? 'Total paid' : 'Total'} v={mny(x.a)} strong />
      </View>
      {pd && !x.ref ? (
        <View style={{ position: 'absolute', left: 14, bottom: 58, transform: [{ rotate: '-8deg' }], borderRadius: 8, borderWidth: 2, borderColor: c.gr, paddingHorizontal: 12, paddingVertical: 2, opacity: 0.85 }}>
          <Txt size={21} weight={600} ls={2} color={c.gr}>PAID</Txt>
        </View>
      ) : null}
      {note ? <Txt size={9.5} mut style={{ marginTop: 8 }}>{note}</Txt> : null}
    </View>
  );
}

export function TransactionDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const x = findById(db.INV, id)!;
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const nav = useNav();
  const mx = x.a - x.ref;

  const refund = () => {
    if (x.s !== 'Completed' || mx <= 0) { toast('Only completed payments with a refundable balance can be refunded'); return; }
    form({ title: 'Refund review · ' + id, fields: [
      { id: 'a', label: 'Refund amount ($)', type: 'number', required: true, value: x.rq || mx },
      { id: 'r', label: 'Reason', type: 'select', options: ['Customer request', 'Service not delivered', 'Duplicate payment', 'Other'], required: true },
      { id: 'n', label: 'Internal notes', type: 'textarea' }],
      buttons: [{ label: 'Submit refund', key: 's', primary: true }],
      sub: `Paid ${mny(x.a)} · refunded ${mny(x.ref)} · maximum ${mny(mx)}. The refund is recorded as a new linked entry.`,
      onSubmit: (_k, v) => {
        const am = +v.a;
        if (!(am > 0)) return 'Enter an amount above zero.';
        if (am > mx) return 'The amount cannot exceed ' + mny(mx) + '.';
        x.ref += am; x.rq = 0; x.s = x.ref >= x.a ? 'Refund pending' : 'Completed';
        x.log.push(['Today', 'Refund of ' + mny(am) + ' submitted · pending']);
        if (x.s !== 'Refund pending') x.s = 'Completed';
        aud('Refund submitted · ' + id + ' · ' + mny(am), session.view); closeAll(); bump(); toast('Refund of ' + mny(am) + ' submitted. Status: pending.');
      } });
  };
  const copy = async (text: string, msg: string) => { await Clipboard.setStringAsync(text); toast(msg); };
  const receipt = async () => {
    const ok = await shareCsv(id + '-receipt.csv', [['Reference', id], ['Feature', x.f], ['User', x.u], ['Date', x.d + ', 2026'], ['Amount', x.a], ['Status', x.s]]);
    toast(ok ? 'Receipt ready to share' : 'Sharing is not available on this device');
  };
  const svcName = x.f.split(' ')[0] === 'Top' ? 'Top up' : x.f.split(' ')[0];
  const actions = (
    <>
      {x.s === 'Completed' && mx > 0 && can(...REQ.refund) ? <OutlineBtn primary onPress={guard(REQ.refund, refund)}>{x.rq ? 'Review refund request' : 'Refund'}</OutlineBtn> : null}
      <OutlineBtn onPress={() => copy(id, 'Reference copied')}>Copy reference</OutlineBtn>
      <OutlineBtn onPress={receipt}>⇩ Receipt</OutlineBtn>
    </>
  );
  return (
    <DrawerBody title={id} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <StatusPill label={x.s} /><Txt size={10.6}>{x.f}</Txt><Txt size={10.6} mut>{mny(x.a)}</Txt>
      </View>
      <Receipt id={id} />
      <Section title="Timeline"><ListRows rows={x.log.slice().reverse().map((l) => ({ main: l[1], right: l[0] }))} /></Section>
      <ListRows rows={[{ main: 'Open related service', right: '›', onPress: () => { closeAll(); nav.go('hub', { hub: svcName }); } }]} />
    </DrawerBody>
  );
}

function RecordDrawer({ title, status, rows, extra, actions, close }: { title: string; status: string; rows: [string, string][]; extra?: React.ReactNode; actions?: React.ReactNode; close: () => void }) {
  return (
    <DrawerBody title={title} onClose={close} actions={actions}>
      <View style={{ marginTop: 4, marginBottom: 8, flexDirection: 'row' }}><StatusPill label={status} /></View>
      <KeyValue rows={rows} />
      {extra}
    </DrawerBody>
  );
}

export function SettlementDrawer({ id, close }: { id: string; close: () => void }) {
  const s = db.SET[+id];
  const open = useOpen();
  const nav = useNav();
  const { closeAll } = useOverlay();
  return (
    <RecordDrawer title={s[0]} status={s[4]} close={close} rows={[['Provider group', s[1]], ['Period', s[2]], ['Amount', mny(s[3])]]}
      extra={<Section title="Included transactions"><ListRows rows={db.INV.filter((x) => x.s === 'Completed').slice(0, 3).map((x) => ({ main: x.id + ' · ' + x.f, right: mny(x.a) + ' ›', onPress: () => open('inv', x.id) }))} /></Section>}
      actions={s[4] === 'Discrepancy' ? <OutlineBtn onPress={() => { closeAll(); nav.go('finance', { fv: 'Reconciliation' }); }}>Open reconciliation</OutlineBtn> : null} />
  );
}

export function PayoutDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const p = db.PAYO[+id];
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const review = () => form({ title: 'Review payout', fields: [{ id: 'n', label: 'Decision note', type: 'textarea', required: true }], buttons: [{ label: 'Approve payout', key: 's', primary: true }],
    sub: p[1] + ' · ' + mny(p[2]) + '. The result shows once the payment provider confirms.',
    onSubmit: () => { closeAll(); aud('Payout approved for processing · ' + p[0], session.view); toast('Sent for processing. Status stays pending until confirmed.'); } });
  return (
    <RecordDrawer title={p[0]} status={p[3]} close={close} rows={[['Recipient', p[1]], ['Amount', mny(p[2])]]}
      extra={p[3] === 'Failed' ? <Section title="Failure reason"><Txt size={12}>The payout account was rejected. Ask the business to update payout details.</Txt></Section> : null}
      actions={p[3] === 'Pending' && can(...REQ.money) ? <OutlineBtn primary onPress={guard(REQ.money, review)}>Review payout</OutlineBtn> : null} />
  );
}

export function ReconciliationDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const r = db.RECO[+id];
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const resolve = () => form({ title: 'Resolve ' + r.id, fields: [{ id: 'n', label: 'Resolution note', type: 'textarea', required: true }], buttons: [{ label: 'Resolve', key: 's', primary: true }], sub: 'The resolution is recorded.',
    onSubmit: () => { r.st = 'Resolved'; aud('Reconciliation resolved · ' + r.id, session.view); closeAll(); bump(); toast('Exception resolved'); } });
  return (
    <RecordDrawer title={r.id + ' · ' + r.t} status={r.st} close={close} rows={[['Wantiss record', mny(r.a)], ['Other side', mny(r.b)], ['Difference', mny(r.a - r.b)]]}
      actions={r.st === 'Open' && can(...REQ.money) ? <OutlineBtn primary onPress={guard(REQ.money, resolve)}>Mark resolved</OutlineBtn> : null} />
  );
}

drawers.inv = (id, close) => <TransactionDrawer id={id} close={close} />;
drawers.stl = (id, close) => <SettlementDrawer id={id} close={close} />;
drawers.pay = (id, close) => <PayoutDrawer id={id} close={close} />;
drawers.rec = (id, close) => <ReconciliationDrawer id={id} close={close} />;
drawers.rfd = (id, close) => <TransactionDrawer id={id} close={close} />;
