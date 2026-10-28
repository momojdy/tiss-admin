import { useState } from 'react';
import { View } from 'react-native';
import { db, dataMode, ui, bump, useDb } from '../../state/db';
import goodiesSeed from '../../data/goodiesSeed.json';
import { can } from '../../state/access';
import { REQ } from '../../state/requirements';
import { saveCmsVersion } from '../../lib/adminBackend';
import { useNav } from '../../shell/Nav';
import { useForm } from '../../ui/FormSheet';
import { useToast } from '../../ui/Toast';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { OutlineBtn, Pill, SelectMenu, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { GOODIES_MODULES } from './modules';

/** Canonical Goodies configuration reference, not a live snapshot; production changes use server-side drafts. */
const data = goodiesSeed as any;
const moduleMap: Record<string, string> = { Overview: 'Overview', 'Products and catalog': 'Library', Categories: 'Categories', Merchants: 'Merchants', 'Product review': 'Product review', Orders: 'Orders', Promotions: 'Promos', Support: 'Support', Analytics: 'Analytics', Settings: 'Settings' };
const modules = GOODIES_MODULES;
const languages = ['en', 'fr', 'ht', 'es', 'zh'];

function englishValue(record: any, field: string) {
  const value = record?.[field];
  if (value && typeof value === 'object' && value.en && typeof value.en.v === 'string') return value.en.v;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}
function localizedStatus(record: any, field: string) {
  const value = record?.[field];
  if (!value || typeof value !== 'object') return '—';
  return languages.map((lang) => value[lang]?.s || 'missing').filter((status) => status === 'missing').length + ' missing locales';
}

export function GoodiesAdminScreen() {
  useDb();
  const { c } = useTheme();
  const { go } = useNav();
  const form = useForm();
  const toast = useToast();
  const [filter, setFilter] = useState('All');
  const moduleLabel = String(ui.gz || 'Overview');
  const moduleName = Object.keys(moduleMap).find((name) => moduleMap[name] === moduleLabel) || 'Overview';
  const setModule = (name: string) => { ui.gz = moduleMap[name] || 'Overview'; ui.wsvc = 'Goodies'; setFilter('All'); bump(); };
  const saveDraft = (key: string, payload: Record<string, unknown>) => saveCmsVersion({ key: 'goodies.' + key, locale: 'en', payload, status: 'draft' });

  const editTextRecord = (record: any, title: string, field: string) => {
    if (!can(...REQ.content)) { toast('You need Content edit access to stage a Goodies draft.'); return; }
    const current = englishValue(record, field);
    form({
      title: 'Edit · ' + title,
      sub: 'Review the proposed change before publishing.',
      fields: [
        { id: 'value', label: 'English text', type: 'textarea', value: current, required: true, maxLength: 1000 },
        { id: 'status', label: 'Draft status', type: 'select', options: ['Draft', 'Needs review'], value: 'Draft', required: true },
        { id: 'reason', label: 'Change reason', type: 'textarea', required: true },
      ],
      buttons: [{ label: 'Save private draft', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        const value = String(values.value || '').trim();
        const reason = String(values.reason || '').trim();
        if (!value) return 'English text cannot be empty.';
        if (!reason) return 'Enter a change reason for the audit trail.';
        const original = JSON.parse(JSON.stringify(record));
        const fieldValue = original[field];
        if (fieldValue && typeof fieldValue === 'object' && fieldValue.en) {
          fieldValue.en.v = value;
          fieldValue.en.s = 'draft';
        } else original[field] = value;
        try {
          await saveDraft(String(record.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '.')), { record: original, change_reason: reason, draft_status: values.status, module: moduleName });
          toast('Goodies draft saved. Live content is unchanged.');
        } catch (error) {
          return error instanceof Error ? error.message : 'Goodies draft could not be saved.';
        }
      },
    });
  };

  const editRecordStatus = (record: any, title: string, statusKey: string, options: string[]) => {
    if (!can(...REQ.content)) { toast('You need Content edit access to stage a Goodies draft.'); return; }
    form({
      title: title,
      sub: 'Stage the proposed status change for review.',
      fields: [
        { id: 'status', label: 'Proposed status', type: 'select', options, value: String(record[statusKey] || options[0]), required: true },
        { id: 'reason', label: 'Reason', type: 'textarea', required: true },
      ],
      buttons: [{ label: 'Save proposed change', key: 'save', primary: true }],
      onSubmit: async (_key, values) => {
        const reason = String(values.reason || '').trim();
        if (!reason) return 'Enter a reason for the audit trail.';
        try {
          await saveDraft(String(record.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '.')), { record: { ...record, [statusKey]: values.status }, change_reason: reason, module: moduleName, proposed_only: true });
          toast('Saved as private draft.');
        } catch (error) {
          return error instanceof Error ? error.message : 'Proposed change could not be saved.';
        }
      },
    });
  };

  const openMerchant = (item: any) => { go('people', { ps: 'Accounts' }); toast('Opened People to review ' + item.n + '.'); };

  const itemsForModule = (): any[] => {
    if (moduleLabel === 'Home') return [
      ...data.modes.map((x: any) => ({ ...x, _kind: 'mode', _field: 'title', _title: x.title?.en?.v || x.id, _sub: x.sub?.en?.v || 'Home mode' })),
      ...data.promos.map((x: any) => ({ ...x, _kind: 'promo', _field: 'title', _title: x.title?.en?.v || x.id, _sub: (x.sub?.en?.v || x.aud || 'Goodies promotion') + (x.target ? ' · Target: ' + x.target : '') })),
    ];
    if (moduleLabel === 'Categories') return data.cats.map((x: any) => ({ ...x, _kind: 'category', _field: 'name', _title: x.name?.en?.v || x.id, _sub: x.st + ' · ' + (x.stores || 0) + ' stores' }));
    if (moduleLabel === 'Library' || moduleLabel === 'Product review') return data.lib.map((x: any) => ({ ...x, _kind: 'library', _field: 'name', _title: x.name?.en?.v || x.id, _sub: (moduleLabel === 'Product review' ? 'Catalog review · ' : '') + x.role + ' · ' + x.b + ' · ' + x.st }));
    if (moduleLabel === 'Requests') return data.reqs.map((x: any) => ({ ...x, _kind: 'request', _field: 'note', _title: x.name, _sub: x.vendor + ' · ' + x.st + ' · ' + x.b }));
    if (moduleLabel === 'Promos') return [...data.promos, ...data.coupons].map((x: any) => ({ ...x, _kind: 'promo', _field: x.title ? 'title' : 'desc', _title: x.title?.en?.v || x.code || x.id, _sub: (x.st || 'Draft') + ' · ' + (x.aud || x.store || 'Goodies') + (x.target ? ' · Target: ' + x.target : '') }));
    if (moduleLabel === 'Merchants') return [];
    if (moduleLabel === 'Orders') return dataMode === 'live' ? db.INV.filter((transaction) => transaction.f.toLowerCase().includes('goodies')).map((transaction: any) => ({ ...transaction, _kind: 'order', _field: '', _title: transaction.id + ' · ' + transaction.f, _sub: transaction.u + ' · ' + transaction.a.toFixed(2) + ' · ' + transaction.s })) : [];
    if (moduleLabel === 'Analytics') return [];
    if (moduleLabel === 'Fees') return Object.entries(data.fees).map(([key, value]) => ({ id: key, _kind: 'fee', _field: 'value', _title: key, _sub: Array.isArray(value) ? value.join(' · ') : String(value), value }));
    if (moduleLabel === 'Restricted') return [
      ...(data.rg.prohibited || []).map((x: any, i: number) => ({ ...x, id: x.id || 'prohibited.' + i, _kind: 'restricted', _field: 'n', _title: x.n || x.id || 'Restricted item', _sub: x.src || 'Platform rule' })),
      ...(data.rg.docs || []).map((x: any, i: number) => ({ ...x, id: x.id || 'document.' + i, _kind: 'restricted', _field: 'doc', _title: x.doc || 'Required document', _sub: x.cat || 'All services' })),
      ...(data.rg.texts || []).map((x: any) => ({ ...x, _kind: 'restricted', _field: 't', _title: x.label || x.id, _sub: englishValue(x, 't'), crit: x.crit })),
    ];
    if (moduleLabel === 'Texts') return [...data.labels, ...data.stages, ...data.notifs].map((x: any) => ({ ...x, _kind: 'text', _field: x.t ? 't' : 'title', _title: x.label || x.id, _sub: englishValue(x, x.t ? 't' : 'title') }));
    if (moduleLabel === 'Support') return [...data.faq, ...data.topics, ...data.legal].map((x: any) => ({ ...x, _kind: 'support', _field: x.q ? 'q' : x.t ? 't' : 'name', _title: x.q?.en?.v || x.t?.en?.v || x.name?.en?.v || x.id, _sub: x.st || 'Support content' }));
    return [];
  };

  const allItems = itemsForModule();
  const visible = filter === 'All' ? allItems : allItems.filter((item) => String(item.st || item.status || '').toLowerCase() === filter.toLowerCase());

  const onItem = (item: any) => {
    const textField = ['mode', 'promo', 'category', 'library', 'text', 'support', 'restricted'].includes(item._kind) ? item._field : '';
    if (textField) editTextRecord(item, item._title, textField);
    else if (item._kind === 'request') editRecordStatus(item, 'Ingredient request · ' + item._title, 'st', ['Submitted', 'Approved', 'Denied', 'Needs info']);
    else if (item._kind === 'fee') {
      form({ title: 'Fee or rule · ' + item._title, sub: 'Stage a proposed change for review.', fields: [{ id: 'value', label: 'Proposed value', type: 'text', value: item._sub, required: true }, { id: 'reason', label: 'Reason', type: 'textarea', required: true }], buttons: [{ label: 'Save draft', key: 'save', primary: true }], onSubmit: async (_key, values) => {
        const reason = String(values.reason || '').trim();
        if (!reason) return 'Enter a reason.';
        try { await saveDraft(String(item.id), { proposed_value: String(values.value), change_reason: reason, module: moduleName, proposed_only: true }); toast('Fee/rule draft saved; no live fee changed.'); }
        catch (error) { return error instanceof Error ? error.message : 'Draft could not be saved.'; }
      } });
    } else if (item._kind === 'merchant') {
      openMerchant(item);
    } else if (item._kind === 'order') {
      go('finance', { fv: 'Transactions' });
      toast('Opened Finance to review the Goodies transaction.');
    } else editRecordStatus(item, item._title, 'st', ['Live', 'Draft', 'Scheduled', 'Archived']);
  };



  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ flex: 1 }}><Heading title="Goodies\nAdmin workspace" /></View>
        <OutlineBtn onPress={() => go('content')}>CMS ›</OutlineBtn>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
        <SelectMenu label="Goodies section" options={modules} value={moduleName} onChange={setModule} />
      </View>

      {moduleLabel === 'Overview' ? (
        <>
          <Heading title="" kpis={[
            { icon: '▥', value: data.cats.length, label: 'Configured categories' },
            { icon: '▤', value: data.lib.length, label: 'Builder definitions' },
            { icon: '◷', value: data.reqs.length, label: 'Request reference entries' },
          ]} />
          <Section title="Goodies health">
            <ListRows rows={[
              { key: 'promos', main: 'Promotion references', sub: 'Not connected yet.', right: String(data.promos.filter((item: any) => item.st === 'Live').length) + ' refs', onPress: () => setModule('Promotions') },
              { key: 'missing', main: 'Missing translations', sub: 'English, French, Haitian Creole, Spanish and Chinese', right: '—', onPress: () => setModule('Products and catalog') },
              { key: 'assets', main: 'Assets without uploaded images', sub: 'Reference catalog definitions', right: String(data.lib.length), onPress: () => setModule('Products and catalog') },
              { key: 'restricted', main: 'Restricted-goods rules', sub: 'Review service requirements', right: '—', onPress: () => setModule('Settings') },
            ]} />
          </Section>
          <Section title="Needs review">
            <ListRows rows={[
              { key: 'req', main: 'Ingredient requests', sub: 'Not connected yet.', right: String(data.reqs.length) + ' refs', onPress: () => setModule('Product review') },
              { key: 'library', main: 'Builder library', sub: 'Manage ingredients, extras and product assets', right: '—', onPress: () => setModule('Products and catalog') },
              { key: 'content', main: 'Customer home content', sub: 'Modes, promotions, labels and category order', right: 'Open ›', onPress: () => setModule('Products and catalog') },
            ]} />
          </Section>
        </>
      ) : moduleLabel === 'Settings' ? (
        <Section title="Goodies settings">
          <Txt size={11} mut lh={1.4}>Read-only until the server connection is ready.</Txt>
          <ListRows rows={[
            { key: 'fees', main: 'Fees and rules', sub: 'Not connected yet.', right: 'Read-only' },
            { key: 'restricted', main: 'Restricted goods', sub: 'Enforcement remains server-side.', right: 'Read-only' },
            { key: 'publish', main: 'Publishing permissions', sub: 'Publishing requires an authorized server action.', right: 'Protected' },
          ]} />
        </Section>
      ) : moduleLabel === 'Analytics' ? (
        <Section title="Goodies analytics">
          <ListRows rows={[
            { key: 'orders', main: 'Goodies transactions', right: dataMode === 'live' ? String(db.INV.filter((tx) => tx.f.toLowerCase().includes('goodies')).length) : '—', onPress: () => go('finance', { fv: 'Transactions' }) },
            { key: 'promos', main: 'Live Goodies promotions', right: '—', onPress: () => setModule('Promotions') },
            { key: 'catalog', main: 'Builder library items', right: '—', onPress: () => setModule('Products and catalog') },
            { key: 'requests', main: 'Ingredient requests awaiting review', right: '—', onPress: () => setModule('Product review') },
          ]} />
          <Txt size={9.5} mut style={{ marginTop: 8 }}>Not connected yet.</Txt>
        </Section>
      ) : moduleLabel === 'Fees' ? (
        <Section title="Fees and rules">
          <Txt size={10.1} mut style={{ marginBottom: 8 }}>Not connected yet.</Txt>
          <ListRows rows={visible.map((item) => ({ key: item.id, main: item._title, sub: item._sub, right: 'Edit ›', onPress: () => onItem(item) }))} />
        </Section>
      ) : (
        <Section title={moduleName} right={<Pill onPress={() => setFilter(filter === 'All' ? 'Live' : 'All')}>{filter === 'All' ? 'Filter live' : 'Show all'}</Pill>}>
          <Txt size={9.5} mut style={{ marginBottom: 8 }}>Configuration is shown for reference. Live merchant, order and request data are not connected.</Txt>
          <ListRows empty="No records in this section." rows={visible.map((item) => ({
            key: String(item.id),
            main: item._title,
            sub: item._sub,
            right: <View style={{ alignItems: 'flex-end', gap: 3 }}>{item.st ? <StatusPill label={String(item.st)} small /> : null}<Txt size={9.5} mut>Open ›</Txt></View>,
            onPress: () => onItem(item),
          }))} />
        </Section>
      )}
      <Card style={{ marginTop: 2 }}>
        <Txt size={10.1} weight={500}>Publishing boundary</Txt>
        <Txt size={9.5} mut lh={1.4}>goodiesSeed.json is retained as Goodies feature configuration and reference metadata, including the builder catalog structure, localization statuses, promotion targets, Wallet links, fee/rule definitions and support copy. It is not treated as authoritative live order, merchant, or analytics data; those records must come from authorized Goodies endpoints.</Txt>
      </Card>
    </View>
  );
}