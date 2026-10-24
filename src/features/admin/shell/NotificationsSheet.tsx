import { useState } from 'react';
import { View } from 'react-native';
import { bump, useDb } from '../state/db';
import { expireStaff } from '../state/access';
import { isUnread, markAllRead, markRead, myNotices } from '../state/notices';
import { useOpen } from '../overlays/registry';
import { Chips, Dot, OutlineBtn } from '../ui/Controls';
import { DrawerBody } from '../ui/Overlay';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';

const FILTERS = ['All', 'Unread', 'Mine'] as const;

/** The bell: notices for the person the interface follows (access decisions, escalations, expiries). Tap one to open what it is about. */
export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  useDb();
  expireStaff();
  const open = useOpen();
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const l = myNotices().filter((n) => f === 'All' || (f === 'Unread' ? isUnread(n) : n.f.includes('mine') || n.to !== undefined));
  return (
    <DrawerBody title="Notifications" onClose={onClose} actions={<OutlineBtn onPress={() => { markAllRead(); bump(); }}>Mark all read</OutlineBtn>}>
      <Chips options={FILTERS} value={f} onChange={setF} />
      <ListRows empty="Nothing here." rows={l.map((n, i) => ({
        key: String(i) + n.t,
        main: <View style={{ flexDirection: 'row', alignItems: 'center' }}>{isUnread(n) ? <Dot color={n.f.includes('crit') ? 'or' : 'gr'} /> : null}<Txt size={10.1} weight={isUnread(n) ? 600 : 400} style={{ flex: 1 }}>{n.t}</Txt></View>,
        sub: n.w,
        onPress: () => { markRead(n); bump(); open(n.d, n.v); },
      }))} />
    </DrawerBody>
  );
}
