import { View } from 'react-native';
import { db, bump, useDb } from '../state/db';
import { can, me, realMe, session, setView } from '../state/access';
import { REQ } from '../state/requirements';
import { leaveApp } from '../auth/authLogic';
import { useOverlay } from '../ui/Overlay';
import { DrawerBody } from '../ui/Overlay';
import { Card, CardTitle } from '../ui/Card';
import { Chips, OutlineBtn, Seg } from '../ui/Controls';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { MyAccessCard } from '../overlays/GrantDrawers';

export function AccountSheet({ onClose }: { onClose: () => void }) {
  useDb();
  const { mode, setMode } = useTheme();
  const { closeAll } = useOverlay();
  const mine = realMe() ?? me();
  const mineLog = db.AUD.filter((a) => a[1] === mine.n).slice(0, 5);
  return (
    <DrawerBody title="Account" onClose={onClose}>
      <Card>
        <Txt size={13} weight={500}>{mine.n}</Txt>
        <Txt size={10.1} mut>{mine.role} · {mine.st}</Txt>
      </Card>
      <Card>
        <CardTitle title="Appearance" />
        <Seg<ThemeMode> options={['light', 'dark', 'system']} value={mode} onChange={setMode} labels={(v) => v[0].toUpperCase() + v.slice(1)} />
      </Card>
      <MyAccessCard />
      {can(...REQ.permissions) ? (
        <Card>
          <CardTitle title="Preview as" />
          <Txt size={10.1} mut style={{ marginBottom: 6 }}>See the admin the way another person sees it. Nothing is changed.</Txt>
          <Chips options={db.STAFF.filter((s) => s.st === 'Active').map((s) => s.n)} value={session.view} onChange={(n) => { setView(n); closeAll(); }} />
        </Card>
      ) : null}
      <Card>
        <CardTitle title="My activity" />
        <ListRows empty="No activity yet." rows={mineLog.map((a, i) => ({ key: String(i), main: a[0], sub: a[2] }))} />
      </Card>
      <OutlineBtn onPress={() => { closeAll(); leaveApp(); bump(); }}>Sign out</OutlineBtn>
    </DrawerBody>
  );
}
