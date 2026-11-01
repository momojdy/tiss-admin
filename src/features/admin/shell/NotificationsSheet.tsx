import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { bump, useDb } from '../state/db';
import { expireStaff } from '../state/access';
import { isUnread, markAllRead, markRead, myNotices } from '../state/notices';
import { useOpen } from '../overlays/registry';
import { Chips, Dot, OutlineBtn } from '../ui/Controls';
import { DrawerBody } from '../ui/Overlay';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';

const FILTERS = ['All', 'Unread', 'Mine'] as const;

/** Notifications for the current staff identity; selecting one opens its related item. */
export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  useDb();
  expireStaff();
  const open = useOpen();
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const [serverNotices, setServerNotices] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) return;
      const { data } = await supabase.from('notifications').select('id,title,body,read,created_at,destination,metadata').eq('user_id', userId).eq('notification_type', 'goodies_ingredient_request').order('created_at', { ascending: false }).limit(30);
      if (active) setServerNotices((data || []).map((n: any) => ({ ...n, t: n.title || 'Goodies ingredient request', w: n.body || '', f: n.read ? '' : 'unread', d: n.destination || 'goodiesIngredientRequests', v: n.metadata?.request_id, serverId: n.id, read: !!n.read })));
    };
    void load();
    const channel = supabase.channel('admin-goodies-ingredient-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'notification_type=eq.goodies_ingredient_request' }, () => { void load(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);
  const l = [...serverNotices, ...myNotices()].filter((n) => f === 'All' || (f === 'Unread' ? (n.serverId ? !n.read : isUnread(n)) : n.f.includes('mine') || n.to !== undefined || !!n.serverId));
  return (
    <DrawerBody title="Notifications" onClose={onClose} actions={<OutlineBtn onPress={() => { markAllRead(); void supabase.auth.getUser().then(({ data }) => data.user?.id ? supabase.from('notifications').update({ read: true }).eq('user_id', data.user.id).eq('notification_type', 'goodies_ingredient_request') : undefined); setServerNotices((rows) => rows.map((row) => ({ ...row, read: true, f: '' }))); bump(); }}>Mark all read</OutlineBtn>}>
      <Chips options={FILTERS} value={f} onChange={setF} />
      <ListRows empty="Nothing here." rows={l.map((n, i) => ({
        key: String(i) + n.t,
        main: <View style={{ flexDirection: 'row', alignItems: 'center' }}>{isUnread(n) ? <Dot color={n.f.includes('crit') ? 'or' : 'gr'} /> : null}<Txt size={10.1} weight={isUnread(n) ? 600 : 400} style={{ flex: 1 }}>{n.t}</Txt></View>,
        sub: n.w,
        onPress: () => { if (n.serverId) { void supabase.from('notifications').update({ read: true }).eq('id', n.serverId); setServerNotices((rows) => rows.map((row) => row.serverId === n.serverId ? { ...row, read: true, f: '' } : row)); } else markRead(n); bump(); open(n.d, n.v); },
      }))} />
    </DrawerBody>
  );
}
