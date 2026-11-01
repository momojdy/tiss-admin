import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { aud, bump, db, useDb } from '../state/db';
import { can, session } from '../state/access';
import { REQ, useGuard } from '../state/requirements';
import { Card, Section } from '../ui/Card';
import { ButtonRow, OutlineBtn, Pill, Row, StatusPill } from '../ui/Controls';
import { useForm } from '../ui/FormSheet';
import { KeyValue, ListRows } from '../ui/Lists';
import { DrawerBody, useOverlay } from '../ui/Overlay';
import { useToast } from '../ui/Toast';
import { Txt } from '../ui/Txt';
import { AppIcon } from '../ui/AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { shareText } from '../lib/csv';
import { assignApplicationBusiness, getBusinessApplicationDocumentUrl, listApplicationBusinesses, listBusinessApplicationDocuments, reviewBusinessApplication, setBusinessApplicationDocumentStatus, type ApplicantBusiness, type BusinessApplicationDocument } from '../lib/adminBackend';
import { hydrateAdminState } from '../lib/hydrateAdminState';
import { drawers, useOpen } from './registry';
import { useNav } from '../shell/Nav';
import { STATUS_TONE } from '../theme/tokens';
import { findById } from '../lib/findById';

const NM = ['Business licence', 'Tax ID', 'Owner ID'];
export const docsText = (a: { d: [string, string][] }) => a.d.filter((x) => x[1] === 'verified').length + ' of 3 docs';

/** Shared by the application and document drawers: log, audit, close drawers, refresh, confirm. */
function useFinish() {
  const { closeAll } = useOverlay();
  const toast = useToast();
  return (a: (typeof db.APPS)[number], msg: string, t?: string) => {
    a.log.push(['Today', msg]); aud(msg + ' · ' + a.n, session.view); closeAll(); bump(); toast(t || msg);
  };
}

export function ApplicationDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const a = findById(db.APPS, id);
  const form = useForm();
  const open = useOpen();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const nav = useNav();
  const [serverDocs, setServerDocs] = useState<BusinessApplicationDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState('');
  const [businessCandidates, setBusinessCandidates] = useState<ApplicantBusiness[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(false);
  const [businessesError, setBusinessesError] = useState('');
  useEffect(() => {
    let alive = true;
    setDocsLoading(true); setDocsError('');
    listBusinessApplicationDocuments(id).then((docs) => { if (alive) setServerDocs(docs); })
      .catch((error) => { if (alive) setDocsError(error instanceof Error ? error.message : 'Documents could not be loaded.'); })
      .finally(() => { if (alive) setDocsLoading(false); });
    return () => { alive = false; };
  }, [id]);
  useEffect(() => {
    let alive = true;
    if (!a?.userId || a.businessId) { setBusinessCandidates([]); setBusinessesLoading(false); return; }
    setBusinessesLoading(true); setBusinessesError('');
    listApplicationBusinesses(id).then((items) => { if (alive) setBusinessCandidates(items); })
      .catch((error) => { if (alive) setBusinessesError(error instanceof Error ? error.message : 'Applicant businesses could not be loaded.'); })
      .finally(() => { if (alive) setBusinessesLoading(false); });
    return () => { alive = false; };
  }, [id, a?.userId, a?.businessId]);
  const reloadServerDocs = async () => {
    setDocsLoading(true); setDocsError('');
    try { setServerDocs(await listBusinessApplicationDocuments(id)); }
    catch (error) { setDocsError(error instanceof Error ? error.message : 'Documents could not be loaded.'); }
    finally { setDocsLoading(false); }
  };
  if (!a) return null;
  const closed = a.st >= 3;
  const status = db.STG[a.st] || a.s || 'Pending review';

  const chooseBusiness = () => {
    if (!can(...REQ.review)) { toast('You do not have permission to link applications.'); return; }
    const options = businessCandidates.map((b) => `${b.business_name} · ${b.business_id}`);
    if (!options.length) return;
    form({ title: 'Link application to business', fields: [{ id: 'business', label: 'Applicant-owned business', type: 'select', options, required: true, value: options[0] }], buttons: [{ label: 'Link business', key: 's', primary: true }],
      sub: 'Choose the exact business this application belongs to. The system will not guess from the applicant’s other memberships.',
      onSubmit: async (_k, v) => {
        const selected = businessCandidates.find((b) => `${b.business_name} · ${b.business_id}` === String(v.business));
        if (!selected) return 'Choose a valid business workspace.';
        try { await assignApplicationBusiness(id, selected.business_id); await hydrateAdminState(); closeAll(); open('app', id); toast('Application linked to ' + selected.business_name); }
        catch (error) { return error instanceof Error ? error.message : 'The business could not be linked.'; }
      } });
  };
  const approve = () => {
    if (!a.businessId && businessCandidates.length) { form({ title: 'Business link required', fields: [], buttons: [], sub: 'This applicant has multiple business memberships. Link this application to the correct business before approving it.' }); return; }
    const requiredDocs: [BusinessApplicationDocument['document_type'], string][] = [
      ['business_licence', 'Business licence'], ['tax_id', 'Tax ID'], ['owner_id', 'Owner ID'],
    ];
    const bad = requiredDocs.filter(([type]) => !serverDocs.some((doc) => doc.document_type === type && doc.status === 'verified'));
    if (docsLoading || docsError || bad.length) { form({ title: 'Cannot approve yet', fields: [], buttons: [], sub: docsLoading ? 'Loading server documents. Try again in a moment.' : docsError ? 'The server document list could not be verified. Approval is blocked until the server can be checked.' : 'Upload and verify these required documents first: ' + bad.map((x) => x[1]).join(', ') + '.' }); return; }
    form({ title: 'Approve ' + a.n, fields: [{ id: 'n', label: 'Note (optional)', type: 'textarea' }], buttons: [{ label: 'Approve', key: 's', primary: true }],
      sub: `Service: ${a.s}. Result: Approved. The business can publish listings in this service.`,
      onSubmit: async (_k, v) => { await reviewBusinessApplication(a.id, 'approved', String(v.n || '')); await hydrateAdminState(); closeAll(); toast('Approved · ' + a.n); } });
  };
  const reject = () => form({ title: 'Reject ' + a.n, fields: [
    { id: 'r', label: 'Reason', type: 'select', options: ['Documents invalid', 'Out of scope', 'Fraud risk', 'Other'], required: true },
    { id: 'm', label: 'Message to applicant', type: 'textarea', required: true },
    { id: 'f', label: 'Final rejection (applicant cannot resubmit)', type: 'check' }],
    buttons: [{ label: 'Reject', key: 's', primary: true }], sub: 'The applicant is notified with your message.',
    onSubmit: async (_k, v) => { await reviewBusinessApplication(a.id, 'rejected', String(v.r) + ': ' + String(v.m), !!v.f); await hydrateAdminState(); closeAll(); toast((v.f ? 'Rejected permanently · ' : 'Rejected · ') + a.n); } });


  const edit = can(...REQ.review), approveOk = can(...REQ.approve);
  const actions = closed ? null : (
    <>
      {!a.businessId && businessCandidates.length && edit ? <OutlineBtn onPress={guard(REQ.review, chooseBusiness)}>Link business</OutlineBtn> : null}
      {approveOk ? <OutlineBtn primary onPress={guard(REQ.approve, approve)}>Approve</OutlineBtn> : null}
      {approveOk ? <OutlineBtn onPress={guard(REQ.approve, reject)}>Reject</OutlineBtn> : null}
    </>
  );
  return (
    <DrawerBody title={a.n} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <StatusPill label={status} tone={STATUS_TONE[db.STG[a.st] || a.s] || STATUS_TONE.pending} />
        <Txt size={10.6} mut>{a.id + ' · ' + a.s}</Txt>
      </View>
      <KeyValue rows={[['Waiting', a.age + ' day' + (a.age === 1 ? '' : 's')], ['Documents', docsText(a) + ' verified'], ...(a.businessId ? [['Business ID', a.businessId] as [string,string]] : [])]} />
      <Section title="Business link">
        {a.businessId ? <Txt size={12} mut>Linked to the applicant-owned business shown above.</Txt> : businessesLoading ? <Txt size={12} mut>Loading applicant businesses…</Txt> : businessesError ? <Txt size={12} mut>{businessesError}</Txt> : businessCandidates.length ? <><Txt size={12} mut>Choose the exact business this application belongs to before approval.</Txt><ListRows rows={businessCandidates.map((b) => ({ key: b.business_id, main: b.business_name, sub: b.member_role, right: <AppIcon name="chevron-right" size={12} />, onPress: chooseBusiness }))} /></> : <Txt size={12} mut>No existing business membership was found. A new business workspace will be created only if this application is approved.</Txt>}
      </Section>
      <Section title="Requirements">
        <ListRows empty={a.d.length === 0 ? "No document records are available from the server yet. Approval stays blocked until the required documents are submitted and verified." : "No documents."} rows={a.d.map((x) => ({ main: x[0], right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={x[1]} /></View> }))} />
      </Section>
      <Section title="Server-submitted documents">
        {docsLoading ? <Txt size={12} mut>Loading application documents…</Txt> : docsError ? <Txt size={12} color="#B42318">{docsError}</Txt> : serverDocs.length ? serverDocs.map((doc) => (
          <Card key={doc.id} style={{ marginBottom: 8 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Txt size={12.5} weight={600}>{doc.document_type === 'business_licence' ? 'Business licence' : doc.document_type === 'tax_id' ? 'Tax ID' : 'Owner ID'}</Txt>
                <Txt size={10.5} mut>Submitted {new Date(doc.submitted_at).toLocaleDateString()}</Txt>
                {doc.review_note ? <Txt size={11} mut>{doc.review_note}</Txt> : null}
              </View>
              <StatusPill label={doc.status} />
            </Row>
            <ButtonRow>
              <OutlineBtn onPress={async () => {
                try { const url = await getBusinessApplicationDocumentUrl(doc.storage_path); await Linking.openURL(url); }
                catch (error) { toast(error instanceof Error ? error.message : 'Could not open document.'); }
              }}>View file</OutlineBtn>
              {edit && doc.status !== 'verified' ? <OutlineBtn primary onPress={async () => {
                try { await setBusinessApplicationDocumentStatus(doc.id, 'verified'); await reloadServerDocs(); toast('Document verified'); }
                catch (error) { toast(error instanceof Error ? error.message : 'Could not verify document.'); }
              }}>Verify</OutlineBtn> : null}
              {edit ? <OutlineBtn onPress={() => form({
                title: 'Request replacement document',
                fields: [{ id: 'r', label: 'Reason (required)', type: 'textarea', required: true, maxLength: 1000 }],
                buttons: [{ label: 'Request replacement', key: 's', primary: true }],
                onSubmit: async (_k, v) => {
                  await setBusinessApplicationDocumentStatus(doc.id, 'rejected', String(v.r));
                  await reloadServerDocs(); toast('Replacement requested');
                },
              })}>Request replacement</OutlineBtn> : null}
            </ButtonRow>
          </Card>
        )) : <Txt size={12} mut>No application documents have been submitted. Approval remains blocked until the business licence, tax ID, and owner ID are uploaded and verified.</Txt>}
      </Section>
      <Card style={{ marginVertical: 8 }}>
        <ListRows rows={[{ main: 'Open business profile', right: <AppIcon name="chevron-right" size={12} />, onPress: () => { closeAll(); nav.go('business'); } }]} />
      </Card>
    </DrawerBody>
  );
}

export function DocumentDrawer({ id: v, close }: { id: string; close: () => void }) {
  useDb();
  const [id, i] = v.split(':');
  const a = findById(db.APPS, id)!;
  const d = a.d[+i];
  const form = useForm();
  const open = useOpen();
  const guard = useGuard();
  const toast = useToast();
  const { c } = useTheme();
  const { closeAll } = useOverlay();
  const [zoom, setZoom] = useState(1);
  const res = (st: string, msg: string) => { d[1] = st as never; a.log.push(['Today', msg + ' · ' + d[0]]); aud(msg + ' · ' + a.n, session.view); closeAll(); bump(); open('app', id); open('doc', v); toast(msg); };
  const reject = () => form({ title: 'Reject ' + d[0], fields: [{ id: 'r', label: 'Reason', type: 'textarea', required: true }], buttons: [{ label: 'Reject document', key: 's', primary: true }], sub: 'The applicant sees this reason.', onSubmit: () => res('rejected', 'Document rejected') });
  const download = async () => {
    const ok = await shareText(`${a.id}-${d[0].replace(/ /g, '-')}.txt`, `Document: ${d[0]}\nBusiness: ${a.n}\nStatus: ${d[1]}\n`);
    toast(ok ? 'Document summary ready to share' : 'Sharing is not available on this device');
  };
  const edit = can(...REQ.review);
  const actions = (
    <>
      {edit ? <OutlineBtn primary onPress={guard(REQ.review, () => res('verified', 'Document verified'))}>Verify</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, reject)}>Reject</OutlineBtn> : null}
      {edit ? <OutlineBtn onPress={guard(REQ.review, () => res('missing', 'Replacement requested'))}>Request replacement</OutlineBtn> : null}
      <OutlineBtn onPress={() => { closeAll(); open('app', id); }}>Open application</OutlineBtn>
    </>
  );
  return (
    <DrawerBody title={d[0] + ' · ' + a.n} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8 }}><StatusPill label={d[1]} /><Txt size={10.6} mut>{a.id}</Txt></View>
      <View style={{ height: 150, overflow: 'hidden', borderRadius: 12, backgroundColor: c.inset, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 96, height: 128, backgroundColor: '#fff', borderRadius: 6, alignItems: 'center', justifyContent: 'center', transform: [{ scale: zoom }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <Txt size={10} color="#8b8d85" align="center">{d[0] + '\npreview'}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginVertical: 8 }}>
        <Pill onPress={() => setZoom((z) => Math.max(0.5, z - 0.25))}>− Zoom</Pill>
        <Pill onPress={() => setZoom((z) => Math.min(2, z + 0.25))}>+ Zoom</Pill>
        <Pill onPress={download}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><AppIcon name="download" size={12} />Download</View></Pill>
      </View>
      <KeyValue rows={[['Version', 'v1'], ['Uploaded', a.log[0][0]], ['Expiry', d[1] === 'expired' ? 'Expired Oct 1' : 'Oct 2027'], ['Reviewer notes', d[1] === 'rejected' ? 'Rejected earlier' : 'None']]} />
    </DrawerBody>
  );
}

export function CaseDrawer({ id, close }: { id: string; close: () => void }) {
  useDb();
  const cs = db.CASES.find((x) => x.id === id)!;
  const form = useForm();
  const guard = useGuard();
  const toast = useToast();
  const { closeAll } = useOverlay();
  const assignMe = () => { cs.o = session.view; aud('Case assigned · ' + id, session.view); closeAll(); bump(); toast('Case ' + id + ' assigned to you'); };
  const resolve = () => form({ title: 'Resolve ' + id, fields: [{ id: 'r', label: 'Resolution summary', type: 'textarea', required: true }], buttons: [{ label: 'Resolve', key: 's', primary: true }],
    onSubmit: () => { cs.st = 'Resolved'; aud('Case resolved · ' + id, session.view); closeAll(); bump(); toast('Case ' + id + ' resolved'); } });
  const actions = cs.st === 'Resolved' || !can(...REQ.review) ? null : (<><OutlineBtn onPress={guard(REQ.review, assignMe)}>Assign to me</OutlineBtn><OutlineBtn primary onPress={guard(REQ.review, resolve)}>Resolve</OutlineBtn></>);
  return (
    <DrawerBody title={'Case ' + cs.id + ' · ' + cs.t} onClose={close} actions={actions}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 8 }}><StatusPill label={cs.st} /><Txt size={10.6} mut>{cs.svc + ' · ' + cs.pri + ' priority'}</Txt></View>
      <KeyValue rows={[['Owner', cs.o], ['Service', cs.svc]]} />
      <Section title="Messages"><ListRows rows={cs.msgs.map((m) => ({ main: <Txt size={10.1}><Txt size={10.1} weight={600}>{m[0]}</Txt>{' · ' + m[1]}</Txt> }))} /></Section>
      <Section title="Internal notes"><Txt size={12} mut>Staff only. Not visible to the customer.</Txt></Section>
    </DrawerBody>
  );
}

/** `+ Assign` on the Operations page: pick an application and a reviewer. */
export function useAssignWork() {
  const form = useForm();
  const finish = useFinish();
  return () => {
    const waiting = db.APPS.filter((a) => a.st < 3).sort((x, y) => (x.o === 'Unassigned' ? 0 : 1) - (y.o === 'Unassigned' ? 0 : 1));
    form({ title: 'Assign work', fields: [
      { id: 'a', label: 'Application', type: 'select', options: waiting.map((a) => a.id + ' · ' + a.n), required: true },
      { id: 'o', label: 'Reviewer', type: 'select', options: db.STAFF.map((s) => s.n), required: true },
      { id: 'due', label: 'Due date', type: 'date' }],
      buttons: [{ label: 'Assign', key: 's', primary: true }], sub: 'Reassignment keeps the earlier history.',
      onSubmit: (_k, v) => { const a = findById(db.APPS, String(v.a).split(' ')[0]); if (!a) return 'Choose an application.'; a.o = String(v.o); a.due = String(v.due || a.due); finish(a, 'Assigned to ' + v.o); } });
  };
}

drawers.app = (id, close) => <ApplicationDrawer id={id} close={close} />;
drawers.doc = (id, close) => <DocumentDrawer id={id} close={close} />;
drawers.case = (id, close) => <CaseDrawer id={id} close={close} />;
