import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { bump, useDb } from '../state/db';
import { expireStaff } from '../state/access';
import { isUnread, markAllRead, markRead, myNotices } from '../state/notices';
import { useOpen } from '../overlays/registry';
import { useNav } from './Nav';
import { Chips, Dot, OutlineBtn } from '../ui/Controls';
import { DrawerBody } from '../ui/Overlay';
import { ListRows } from '../ui/Lists';
import { Txt } from '../ui/Txt';

const NOTICE_TYPES = ['goodies_ingredient_request', 'goodies_admin_product_submission'];
const FILTERS = ['All', 'Unread', 'Mine'] as const;

/** Notifications for the current staff identity; selecting one opens its related item. */
export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  useDb();
  expireStaff();
  const open = useOpen();
  const { go } = useNav();
  const [f, setF] = useState<(typeof FILTERS)[number]>('All');
  const [serverNotices, setServerNotices] = useState<any[]>([]);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const load = async (userId: string) => {
      const {data, error} = await supabase.from('notifications').select('id,title,body,read,created_at,destination,metadata')
        .eq('user_id',userId).in('notification_type',NOTICE_TYPES).order('created_at',{ascending:false}).limit(50);
      if (!active) return;
      if (error) {setProblem('Could not refresh Goodies notifications.'); return;}
      setProblem('');
      setServerNotices((data || []).map((n:any) => ({...n,t:n.title || 'Goodies update',w:n.body || '',f:n.read ? '' : 'unread',d:n.destination,v:n.metadata?.request_id,serverId:n.id,read:!!n.read})));
    };
    void (async () => {
      const {data,error} = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {setProblem('Sign in to view notifications.');return;}
      const userId=data.user.id;
      await load(userId);
      if (!active) return;
      channel=supabase.channel('admin-goodies-notifications-'+userId)
        .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>{void load(userId);}).subscribe();
    })().catch(()=>{if(active)setProblem('Could not load Goodies notifications.');});
    return () => {active=false;if(channel)void supabase.removeChannel(channel);};
  }, []);
  const l = [...serverNotices, ...myNotices()].filter((n) => f === 'All' || (f === 'Unread' ? (n.serverId ? !n.read : isUnread(n)) : n.f.includes('mine') || n.to !== undefined || !!n.serverId));
  const markServerAll = async () => {
    const {data} = await supabase.auth.getUser();
    if (!data.user) {setProblem('Sign in to update notifications.');return;}
    const {error} = await supabase.from('notifications').update({read:true}).eq('user_id',data.user.id).in('notification_type',NOTICE_TYPES);
    if (error) {setProblem('Could not mark notifications read.');return;}
    markAllRead();setServerNotices(rows=>rows.map(row=>({...row,read:true,f:''})));setProblem('');bump();
  };
  const openNotice = async (n:any) => {
    if (n.serverId) {
      const {error} = await supabase.from('notifications').update({read:true}).eq('id',n.serverId);
      if (error) {setProblem('Could not mark this notification read.');return;}
      setServerNotices(rows=>rows.map(row=>row.serverId===n.serverId?{...row,read:true,f:''}:row));
    } else markRead(n);
    bump();
    if (n.d==='goodiesIngredientRequests') {onClose();go('goodiesRequests');return;}
    if (n.d==='goodiesProducts') {onClose();go('goodies',{goodiesModule:'Product review'});return;}
    open(n.d,n.v);
  };
  return (
    <DrawerBody title="Notifications" onClose={onClose} actions={<OutlineBtn onPress={()=>{void markServerAll();}}>Mark all read</OutlineBtn>}>
      {problem ? <Txt size={11}>{problem}</Txt> : null}
      <Chips options={FILTERS} value={f} onChange={setF} />
      <ListRows empty="Nothing here." rows={l.map((n, i) => ({
        key: String(i) + n.t,
        main: <View style={{ flexDirection: 'row', alignItems: 'center' }}>{isUnread(n) ? <Dot color={n.f.includes('crit') ? 'or' : 'gr'} /> : null}<Txt size={10.1} weight={isUnread(n) ? 600 : 400} style={{ flex: 1 }}>{n.t}</Txt></View>,
        sub: n.w,
        onPress: () => {void openNotice(n);},
      }))} />
    </DrawerBody>
  );
}
