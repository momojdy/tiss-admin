import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { bump, db, mny, ui, useDb } from '../../state/db';
import { can, session } from '../../state/access';
import { REQ, useGuard } from '../../state/requirements';
import { aud } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { useOpen } from '../../overlays/registry';
import { Card, CardTitle, Section } from '../../ui/Card';
import { Btn, Chips, Pill, Row, SearchInput, SelectMenu, StatusPill } from '../../ui/Controls';
import { useForm } from '../../ui/FormSheet';
import { Heading } from '../../ui/Heading';
import { AppIcon } from '../../ui/AppIcon';
import { ListRows, Small, Table } from '../../ui/Lists';
import { LineChart } from '../../ui/Charts';
import { useToast } from '../../ui/Toast';
import { Txt } from '../../ui/Txt';
import { useTheme } from '../../theme/ThemeContext';
import { listFinancialActions, requestFinancialAction, reviewFinancialAction, type AdminFinancialAction } from '../../lib/adminBackend';

const sum = (a: { a: number }[]) => a.reduce((n, x) => n + x.a, 0);

export const txRows = () => {
  const q = String(ui.fq).toLowerCase();
  return db.INV.filter((x) => (ui.fs === 'All' || (ui.fs === 'Refunds' ? x.rq || x.s === 'Refunded' || x.s === 'Refund pending' : x.s === ui.fs)) && (!q || (x.id + x.f + x.u).toLowerCase().includes(q)));
};

export function FinanceScreen() {
  useDb();
  const { go } = useNav();
  const open = useOpen();
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { c } = useTheme();
  const [financialActions, setFinancialActions] = useState<AdminFinancialAction[]>([]);
  const refreshFinancialActions = async () => { try { setFinancialActions(await listFinancialActions()); } catch { setFinancialActions([]); } };
  useEffect(() => { void refreshFinancialActions(); }, [ui.fv]);
  const set = (k: string, v: unknown) => { ui[k] = v; bump(); };
  const cs = db.INV.filter((x) => x.s === 'Completed'), ps = db.INV.filter((x) => x.s === 'Pending'), fl = db.INV.filter((x) => x.s === 'Failed');

  const manual = () => form({ title: 'Manual adjustment', fields: [
    { id: 'l', label: 'Linked transaction', type: 'select', options: db.INV.map((x) => x.id), required: true },
    { id: 't', label: 'Direction', type: 'select', options: ['Credit', 'Debit'], required: true },
    { id: 'a', label: 'Amount ($)', type: 'number', required: true }, { id: 'r', label: 'Reason', type: 'textarea', required: true }],
    buttons: [{ label: 'Record adjustment', key: 's', primary: true }], sub: 'This adds a new entry for review. The original transaction is never edited.',
    onSubmit: async (_k, v) => {
      if (!(+v.a > 0)) return 'Enter an amount above zero.';
      const o = db.INV.find((x) => x.id === v.l);
      if (!o || !o.u) return 'Select a real transaction with a target user.';
      try {
        await requestFinancialAction({
          actionType: 'wallet_adjustment', transactionId: o.id, targetUserId: o.u,
          amount: +v.a, direction: String(v.t).toLowerCase() as 'credit' | 'debit', reason: String(v.r),
        });
        await refreshFinancialActions();
        toast('Adjustment request saved for review. The wallet has not changed yet.');
      } catch (e) { return e instanceof Error ? e.message : 'Adjustment request could not be saved.'; }
    } });

  const reviewAction = (action: AdminFinancialAction) => form({
    title: action.action_type === 'refund_request' ? 'Review refund request' : 'Review wallet adjustment',
    sub: action.action_type === 'refund_request' ? 'Approval queues this request for payment-provider processing. No money moves here.' : 'Approval changes the wallet balance and writes a ledger entry.',
    fields: [{ id: 'reason', label: 'Review reason', type: 'textarea', required: true }],
    buttons: [{ label: 'Approve', key: 'approve', primary: true }, { label: 'Reject', key: 'reject' }],
    onSubmit: async (key, values) => {
      try {
        await reviewFinancialAction(action.id, key === 'approve' ? 'approve' : 'reject', String(values.reason));
        await refreshFinancialActions();
        toast(key === 'approve' ? (action.action_type === 'refund_request' ? 'Refund queued for provider processing.' : 'Wallet adjustment approved.') : 'Financial request rejected.');
      } catch (e) { return e instanceof Error ? e.message : 'Financial action could not be reviewed.'; }
    },
  });
  const actionRows = financialActions.map((action) => ({
    key: action.id,
    main: (action.action_type === 'refund_request' ? 'Refund request' : 'Wallet adjustment') + ' · ' + mny(action.amount),
    sub: action.target_user_id + ' · ' + action.reason,
    right: right(action.status === 'pending_provider' ? 'Provider action required' : action.status, 'navigate'),
    onPress: () => { if (action.status === 'pending') reviewAction(action); },
  }));
  const txTable = () => {
    const r = txRows();
    return r.length ? (
      <Table columns={[{ title: 'Reference', flex: 1.1 }, { title: 'Feature', flex: 1.5 }, { title: 'Date', flex: 1 }, { title: 'Amount', flex: 1 }, { title: 'Status', flex: 1.3 }]}
        rows={r.map((x) => ({ key: x.id, onPress: () => open('inv', x.id), cells: [x.id, <View key="f"><Txt size={9.5}>{x.f}</Txt><Small>{x.u}</Small></View>, <View key="d"><Txt size={9.5}>{x.d}</Txt><Small>{x.n}</Small></View>, <Txt key="a" size={9.5} weight={500}>{mny(x.a)}</Txt>, <StatusPill key="s" label={x.s} small />] }))} />
    ) : <Txt size={12} mut align="center" style={{ paddingVertical: 14 }}>No transactions match these filters.</Txt>;
  };
  const right = (label: string, extra?: string) => (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{extra === 'navigate' ? <AppIcon name="chevron-right" size={12} /> : extra ? <Txt size={10.1}>{extra}</Txt> : null}<StatusPill label={label} /></View>);

  let body;
  if (ui.fv === 'Transactions') {
    body = (
      <>
        <Card>
          <CardTitle title="Financial action requests" right={can(...REQ.money) ? <Btn onPress={() => void refreshFinancialActions()}>Refresh</Btn> : undefined} />
          {actionRows.length ? <ListRows rows={actionRows} /> : <Txt size={12} mut align="center" style={{ paddingVertical: 12 }}>No financial action requests.</Txt>}
        </Card>
        <Card>
          <CardTitle title="Wallet volume" right={['6M', '12M'].map((m) => <Pill key={m} on={ui.fm === m} onPress={() => set('fm', m)}>{m}</Pill>)} />
          <LineChart vals={ui.fm === '6M' ? [30, 60, 45, 12, 5, 35, 125] : [20, 40, 55, 70, 50, 80, 95, 60, 75, 90, 110, 125]} color={c.gr} max={200} dash />
        </Card>
        <Card>
          <CardTitle title="Transactions" right={can(...REQ.money) ? <Btn onPress={guard(REQ.money, manual)}>+ Manual entry</Btn> : undefined} />
          <Chips options={['All', 'Completed', 'Pending', 'Failed', 'Refunds'] as const} value={ui.fs} onChange={(v) => set('fs', v)} />
          <Row><SearchInput value={ui.fq} onChangeText={(v) => set('fq', v)} placeholder="Search reference, feature, user" /></Row>
          {txTable()}
        </Card>
      </>
    );
  } else if (ui.fv === 'Wallet') {
    body = <Section title="Wallet ledger"><ListRows rows={db.INV.filter((x) => /Top up|refund|Adjustment/i.test(x.f)).map((x) => ({ key: x.id, main: x.id + ' · ' + x.f, sub: x.u + ' · ' + x.d, right: right(x.s, (/refund|Debit|Fee/i.test(x.f) ? '−' : '+') + mny(x.a)), onPress: () => open('inv', x.id) }))} /></Section>;
  } else if (ui.fv === 'Refunds') {
    body = <Section title="Refund requests and outcomes"><ListRows rows={db.INV.filter((x) => x.rq || x.s === 'Refunded' || x.s === 'Refund pending' || x.ref).map((x) => ({ key: x.id, main: x.id + ' · ' + x.u, sub: x.rq ? 'Requested ' + mny(x.rq) + ' of ' + mny(x.a) : 'Refunded ' + mny(x.ref || x.a), right: right(x.rq ? 'Pending' : x.s === 'Refunded' ? 'Refunded' : 'Refund pending', 'navigate'), onPress: () => open(x.rq ? 'rfd' : 'inv', x.id) }))} /></Section>;
  } else if (ui.fv === 'Settlements') {
    body = <Section title="Settlements"><ListRows rows={db.SET.map((s, i) => ({ key: s[0], main: s[0], sub: s[1] + ' · ' + s[2], right: right(s[4], mny(s[3])), onPress: () => open('stl', String(i)) }))} /></Section>;
  } else if (ui.fv === 'Payouts') {
    body = <Section title="Payouts"><ListRows rows={db.PAYO.map((s, i) => ({ key: s[0], main: s[0], sub: s[1], right: right(s[3], mny(s[2])), onPress: () => open('pay', String(i)) }))} /></Section>;
  } else {
    body = <Section title="Reconciliation exceptions"><ListRows rows={db.RECO.map((r, i) => ({ key: r.id, main: r.id + ' · ' + r.t, right: right(r.st, 'navigate'), onPress: () => open('rec', String(i)) }))} /></Section>;
  }

  return (
    <View>
      <Heading title="Money & Transactions" kpis={[
        { icon: 'wallet', value: mny(sum(cs)), label: 'Completed', onPress: () => go('finance', { fv: 'Transactions', fs: 'Completed' }) },
        { icon: 'clock-alert', value: mny(sum(ps)), label: 'Pending settlement', onPress: () => go('finance', { fv: 'Transactions', fs: 'Pending' }) },
        { icon: 'shield-alert', value: mny(sum(fl)), label: 'Failed or flagged', tag: fl.length + ' to review', tone: 'r', onPress: () => go('finance', { fv: 'Transactions', fs: 'Failed' }) },
      ]} />
      <SelectMenu label="Financial area" options={['Transactions', 'Wallet', 'Refunds', 'Settlements', 'Payouts', 'Reconciliation'] as const} value={ui.fv} onChange={(v) => set('fv', v)} />
      {body}
    </View>
  );
}
