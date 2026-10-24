import { View } from 'react-native';
import { bump, ui } from '../../state/db';
import {
  grantLabel, grantsByPerson, grantsByTarget, grantStats, grantStatus, GRANTS, isLive, REQ_TONE, requestLabel, REQUESTS,
} from '../../state/grants';
import { useOpen } from '../../overlays/registry';
import { GrantList } from '../../overlays/GrantDrawers';
import { Section } from '../../ui/Card';
import { Chips, StatusPill } from '../../ui/Controls';
import { ListRows } from '../../ui/Lists';
import { Txt } from '../../ui/Txt';
import { useTheme } from '../../theme/ThemeContext';

const set = (k: string, v: unknown) => { ui[k] = v; bump(); };
const Chev = () => <Txt size={10.1}>›</Txt>;
const REQUEST_FILTERS = ['Pending', 'Approved', 'Declined', 'Cancelled', 'All'] as const;
const GRANT_FILTERS = ['All', 'Active', 'Expired', 'Revoked'] as const;

/** People > Requests: the queue a Super Admin works through. */
export function RequestsBody() {
  const open = useOpen();
  const q = String(ui.pq).toLowerCase();
  const f: string = ui.rqf;
  const l = REQUESTS.filter((r) => (f === 'All' || r.st === f) && (!q || (r.by + ' ' + requestLabel(r) + ' ' + r.item).toLowerCase().includes(q)));
  // the pending queue is worked oldest first; the other lists show the newest first
  const rows = f === 'Pending' ? l : l.slice().reverse();
  return (
    <View>
      <Chips options={REQUEST_FILTERS} value={(f as (typeof REQUEST_FILTERS)[number])} onChange={(v) => set('rqf', v)} />
      <ListRows empty={f === 'Pending' ? 'No requests are waiting.' : 'No requests match.'} rows={rows.map((r) => ({
        key: r.id, main: r.by + ' · ' + requestLabel(r), sub: r.item + ' · asked ' + r.when + ' · suggests ' + r.ask,
        right: <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><StatusPill label={r.st} tone={REQ_TONE[r.st]} small /><Chev /></View>,
        onPress: () => open('req', r.id),
      }))} />
    </View>
  );
}

function Tile({ value, label, tone }: { value: number; label: string; tone?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ width: '48.5%', backgroundColor: c.card, borderColor: c.bd, borderWidth: 1, borderRadius: 18, padding: 12 }}>
      <Txt size={20} weight={500} color={tone === 'r' && value ? c.or : undefined}>{String(value)}</Txt>
      <Txt size={9.5} mut>{label}</Txt>
    </View>
  );
}

/** People > Permissions: what is running, who has what and until when, history, and the way to revoke. */
export function PermissionsBody() {
  const open = useOpen();
  const { c } = useTheme();
  const q = String(ui.pq).toLowerCase();
  const st = grantStats();
  const match = (who: string, g: (typeof GRANTS)[number]) => !q || (who + ' ' + grantLabel(g) + ' ' + g.item).toLowerCase().includes(q);
  const running = GRANTS.filter((g) => isLive(g) && match(g.who, g)).sort((a, b) => (a.end || '9999-12-31').localeCompare(b.end || '9999-12-31'));
  const gf: string = ui.grf;
  const history = GRANTS.filter((g) => (gf === 'All' || grantStatus(g) === gf) && match(g.who, g)).slice().reverse();
  const people = grantsByPerson().filter((p) => !q || p.n.toLowerCase().includes(q));
  const targets = grantsByTarget();
  const max = Math.max(1, ...targets.map((t) => t[1]));
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <Tile value={st.live} label="Running grants" />
        <Tile value={st.permanent} label="Permanent (no end date)" />
        <Tile value={st.soon} label="Ending within 3 days" />
        <Tile value={st.pending} label="Requests waiting" tone="r" />
      </View>
      <Txt size={9.5} mut style={{ marginBottom: 4 }}>{'All time: ' + st.approved + ' approved · ' + st.declined + ' declined · ' + st.expired + ' ran to the end · ' + st.revoked + ' revoked early'}</Txt>

      <Section title={'Running now · ' + running.length}>
        <GrantList grants={running} showWho empty="No grants are running." onPress={(g) => open('grant', g.id)} />
        <Txt size={9.5} mut style={{ marginTop: 6 }}>Soonest to end first. Tap a grant to see its details or revoke it before the end date.</Txt>
      </Section>

      <Section title="By person">
        <ListRows empty="Nobody has had a grant yet." rows={people.map((p) => ({
          key: p.n, main: p.n,
          sub: p.live + ' running · ' + p.total + ' in total' + (p.next ? ' · next ends ' + p.next : p.permanent ? ' · has a permanent grant' : ''),
          right: <Chev />, onPress: () => open('staff', p.n),
        }))} />
      </Section>

      <Section title="Most granted">
        {targets.length ? targets.map(([name, n]) => (
          <View key={name} style={{ marginBottom: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt size={10.1}>{name}</Txt><Txt size={10.1} mut>{String(n)}</Txt></View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: c.inset, marginTop: 3, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round((n / max) * 100)}%`, height: 5, backgroundColor: c.gr }} />
            </View>
          </View>
        )) : <Txt size={12} mut>Nothing granted yet.</Txt>}
      </Section>

      <Section title="Grant history">
        <Chips options={GRANT_FILTERS} value={(gf as (typeof GRANT_FILTERS)[number])} onChange={(v) => set('grf', v)} />
        <GrantList grants={history} showWho empty="No grants match." onPress={(g) => open('grant', g.id)} />
      </Section>
    </View>
  );
}
