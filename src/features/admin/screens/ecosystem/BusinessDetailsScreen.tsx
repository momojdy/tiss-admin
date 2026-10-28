import { View } from 'react-native';
import { db, dataMode, ui, useDb } from '../../state/db';
import { useNav } from '../../shell/Nav';
import { can } from '../../state/access';
import { REQ, useGuard } from '../../state/requirements';
import { useForm } from '../../ui/FormSheet';
import { useToast } from '../../ui/Toast';
import { setBusinessVerification, type BusinessVerification } from '../../lib/adminBackend';
import { hydrateAdminState } from '../../lib/hydrateAdminState';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { ButtonRow, OutlineBtn, Pill, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';

/** Business details intentionally render only fields supplied by the authorized ecosystem snapshot. */
export function BusinessDetailsScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const id = String(ui.businessId || '');
  const business = db.BIZ.find((row) => row.id === id);
  const applications = business ? db.APPS.filter((row) => row.n === business.name) : [];
  const hasEdit = can(...REQ.ecosystem);
  const verification: BusinessVerification = business?.verification?.toLowerCase() === 'verified' || business?.verification?.toLowerCase() === 'restricted'
    ? business.verification.toLowerCase() as BusinessVerification : 'pending';
  const changeVerification = (next: BusinessVerification, title: string, verb: string) => form({
    title: title + ' ' + (business?.name || 'business'),
    sub: next === 'verified'
      ? 'Confirm that the business registration and any category-specific licences have been checked.'
      : next === 'restricted'
        ? 'This changes the business verification state through the protected server action.'
        : 'Return the business to pending verification through the protected server action.',
    fields: [{ id: 'reason', label: 'Reason (saved in the audit log)', type: 'textarea', required: true, maxLength: 500 }],
    buttons: [{ label: verb, key: 'save', primary: true }],
    onSubmit: async (_key, values) => {
      if (!business) return 'The business record is no longer available.';
      const reason = String(values.reason || '').trim();
      if (!reason) return 'Enter a reason for the audit log.';
      try {
        await setBusinessVerification(business.id, next, reason);
        await hydrateAdminState();
        toast(business.name + ': ' + next);
      } catch (error) {
        return error instanceof Error ? error.message : 'Business verification could not be updated.';
      }
    },
  });

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <OutlineBtn onPress={() => go('ecosystem')}>‹ Ecosystem</OutlineBtn>
        <Pill>Business details</Pill>
      </View>
      {!id ? (
        <Section title={'Business records · ' + db.BIZ.length}>
          <ListRows empty={dataMode === 'prototype' ? 'Not connected yet.' : 'No business records loaded.'} rows={db.BIZ.map((row) => ({
            key: row.id,
            main: row.name || 'Unnamed business',
            sub: [row.city, row.country].filter(Boolean).join(' · ') || 'Location not supplied',
            right: <StatusPill label={row.verification || 'Unknown'} small />,
            onPress: () => go('business', { businessId: row.id }),
          }))} />
        </Section>
      ) : !business ? (
        <Card>
          <Txt size={13} weight={500}>Business record unavailable</Txt>
          <Txt size={11} mut lh={1.4} style={{ marginTop: 6 }}>This business record is unavailable. Refresh the source record before taking action.</Txt>
          <View style={{ marginTop: 8 }}><OutlineBtn onPress={() => go('business', { businessId: '' })}>Back to businesses</OutlineBtn></View>
        </Card>
      ) : (
        <>
          <Heading title={business.name} kpis={[
            { icon: 'building-2', value: business.is_live ? 'Live' : 'Not live', label: 'Customer visibility' },
            { icon: 'check-circle', value: business.verification || 'Unknown', label: 'Verification status' },
            { icon: 'pie-chart', value: business.payout_ready ? 'Ready' : 'Not ready', label: 'Payout readiness' },
          ]} />
          <Section title="Business profile" right={<StatusPill label={business.verification || 'Unknown'} small />}>
            <ListRows rows={[
              { key: 'id', main: 'Business ID', sub: business.id, right: 'Record' },
              { key: 'location', main: 'Location', sub: [business.city, business.country].filter(Boolean).join(' · ') || 'Not supplied by the current endpoint', right: 'Snapshot' },
              { key: 'visibility', main: 'Live status', sub: business.is_live ? 'Marked live' : 'Not marked live', right: 'Snapshot' },
              { key: 'payout', main: 'Payout readiness', sub: business.payout_ready ? 'Ready' : 'Not ready or not reported', right: 'Snapshot' },
            ]} />
          </Section>
          <Section title="Verification and access" right={<StatusPill label={verification} small />}>
            <Txt size={10.1} mut lh={1.4}>Changes are processed by the server and recorded with a reason.</Txt>
            {hasEdit ? (
              <ButtonRow>
                {verification !== 'verified' ? <OutlineBtn primary onPress={guard(REQ.ecosystem, () => changeVerification('verified', 'Verify', 'Verify business'))}>Verify business</OutlineBtn> : null}
                {verification === 'verified' ? <OutlineBtn onPress={guard(REQ.ecosystem, () => changeVerification('pending', 'Withdraw verification for', 'Withdraw verification'))}>Withdraw verification</OutlineBtn> : null}
                {verification !== 'restricted' ? <OutlineBtn onPress={guard(REQ.ecosystem, () => changeVerification('restricted', 'Restrict', 'Restrict business'))}>Restrict business</OutlineBtn> : null}
              </ButtonRow>
            ) : <Txt size={10.1} color={c.or} style={{ marginTop: 6 }}>You have view-only or no ecosystem edit access.</Txt>}
          </Section>
          <Section title="Applications and review history">
            <ListRows empty={dataMode === 'prototype' ? 'Not connected yet.' : 'No applications for this business.'} rows={applications.map((row) => ({
              key: row.id,
              main: row.id,
              sub: row.s + ' · ' + row.age + ' days waiting',
              right: row.o || 'Unassigned',
              onPress: () => go('operations', { oq: row.n }),
            }))} />
          </Section>
          <Card>
            <Txt size={11} weight={500}>Protected actions</Txt>
            <Txt size={10.1} mut lh={1.4} style={{ marginTop: 5 }}>Verification and restriction changes use the server-authorized workflow.</Txt>
            {!hasEdit ? <Txt size={10.1} color={c.or} style={{ marginTop: 6 }}>You have view-only or no ecosystem edit access.</Txt> : null}
          </Card>
        </>
      )}
    </View>
  );
}
