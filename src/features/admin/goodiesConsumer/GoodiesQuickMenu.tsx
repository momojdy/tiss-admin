import {Modal} from './previewNative';
import {EditableNativeText as Text} from './EditableNativeText';
import {label} from './content';
import React, {useEffect, useState} from 'react';
import {Image, Modal as UnusedNativeModal, Pressable, ScrollView, Text as UnusedNativeText, View} from 'react-native';
import {ThinMenuIcon} from './previewMenu';
import {useTheme} from './components/ui';
import {S, unread} from './store';
import * as A from './actions';
import {previewBackend as supabase} from './previewRuntime';

export type GoodiesMenuAction = 'home'|'messages'|'notifications'|'wallet'|'saved'|'orders'|'activity'|'help'|'feedback'|'business';
export default function GoodiesQuickMenu({visible, close, onUniversalAction, unreadNotifications = 0, unreadMessages = 0}: {visible:boolean;close:()=>void;onUniversalAction?: (action:GoodiesMenuAction)=>void;unreadNotifications?:number;unreadMessages?:number}) {
  const th = useTheme();
  const [notificationColors, setNotificationColors] = useState<string[]>([]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const palette: Record<string,string> = {goodies:'#FD802E',gatherz:'#A36BE8',flyz:'#4A67B0',wallet:'#81C56C',frenzies:'#B3DF4B',konsoliss:'#DDB52B',woulib:'#FEC509',stayz:'#579BC7',glowz:'#D49E2B'};
    const load = async () => {
      const {data:{user}} = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {setNotificationColors([]);return;}
      const {data,error} = await supabase.from('notifications').select('feature_name').eq('user_id',user.id).eq('read',false);
      if (active) setNotificationColors(error ? [] : Array.from(new Set((data || []).map((n:any) => palette[String(n.feature_name || '').toLowerCase()] || '#BD279F'))));
    };
    void load();
    const channel = supabase.channel('goodies-menu-notification-colors').on('postgres_changes',{event:'*',schema:'public',table:'notifications'},()=>{void load();}).subscribe();
    return () => {active=false;void supabase.removeChannel(channel);};
  },[visible]);

  const top = [{key:'home',label:label('lbl.menu.home','Home'),icon:'home'},{key:'messages',label:label('lbl.menu.messages','Messages'),icon:'message-circle'},{key:'notifications',label:label('lbl.menu.notifications','Notifications'),icon:'bell'},{key:'wallet',label:label('lbl.menu.wallet','Wallet'),icon:'credit-card'},{key:'saved',label:label('lbl.menu.saved','Saved'),icon:'heart'}];
  const bottom = [{key:'orders',label:label('lbl.menu.myorders','My Orders'),icon:'package'},{key:'activity',label:label('lbl.menu.recentactivity','Recent Activity'),icon:'clock'},{key:'help',label:label('lbl.menu.helpcenter','Help Center'),icon:'help-circle'},{key:'feedback',label:label('lbl.menu.feedback','Feedback'),icon:'edit-3'},{key:'business',label:label('lbl.menu.businessspace','Business Space'),icon:'briefcase'},{key:'dark',label:label('lbl.menu.darkmode','Dark Mode'),icon:S.theme==='dark'?'sun':'moon'}];
  const activate = (key:string) => {
    close();
    if(key==='dark'){S.theme=S.theme==='dark'?'light':'dark';require('./store').emit();require('./store').save();return;}
    // Goodies destinations remain inside Goodies, matching Gatherz's local navigation.
    if(key==='saved') { if(onUniversalAction) onUniversalAction('saved'); else A.go('favs'); return; }
    if(key==='orders') { A.tab('orders'); return; }
    if(key==='help') { A.go('help'); return; }
    if(key==='feedback') { A.go('contact'); return; }
    // Shared Wantiss destinations use the host navigation, as in Gatherz.
    if(onUniversalAction){onUniversalAction(key as GoodiesMenuAction);return;}
    if(key==='notifications') A.go('notifs');
  };
  const tile = (item:{key:string;label:string;icon:string}, topRow:boolean) => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} onPress={()=>activate(item.key)} style={{width:topRow?'20%':76,alignItems:'center',minHeight:78,gap:8}}>
    {item.key==='home'?<View style={{width:56,height:56,borderRadius:28,borderWidth:1,borderColor:'#F7C6A1',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><Image source={{uri:'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG'}} style={{width:54,height:54,borderRadius:27}} resizeMode="contain"/></View>:<ThinMenuIcon name={item.icon} color={S.theme==='dark'?'#FFF1E5':'#71340D'}/>}
    {(item.key==='notifications' || item.key==='messages') && (item.key==='notifications' ? unreadNotifications : unreadMessages)>0 ? <View style={{position:'absolute',top:-8,right:2,minWidth:25,height:20,borderRadius:10,paddingHorizontal:5,backgroundColor:item.key==='notifications' ? (notificationColors.includes('#FD802E') ? '#FD802E' : notificationColors[0] || '#FD802E') : '#BD279F',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:11,fontWeight:'700',color:'#FFFFFF'}}>{(item.key==='notifications' ? unreadNotifications : unreadMessages)>99?'99+':(item.key==='notifications' ? unreadNotifications : unreadMessages)}</Text></View>:null}
    {item.key!=='home'?<Text style={{fontSize:10,fontWeight:'600',color:S.theme==='dark'?'#FFF1E5':'#71340D',textAlign:'center'}}>{item.label}</Text>:null}
  </Pressable>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,8,25,0.45)'}}><Pressable accessibilityLabel={label("lbl.cms.ca77e3a6d896", "Close menu")} style={{flex:1}} onPress={close}/><View style={{backgroundColor:S.theme==='dark'?'rgba(85,40,18,0.94)':'rgba(255,225,198,0.94)',borderTopLeftRadius:26,borderTopRightRadius:26,paddingTop:12,paddingBottom:28}}><View style={{width:38,height:4,borderRadius:3,backgroundColor:S.theme==='dark'?'#B97446':'#D69B71',alignSelf:'center',marginBottom:22}}/><View style={{flexDirection:'row',paddingHorizontal:12}}>{top.map(item=>tile(item,true))}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={76} decelerationRate="fast" contentContainerStyle={{paddingLeft:12,paddingRight:12,paddingTop:12}}>{bottom.map(item=>tile(item,false))}</ScrollView><Pressable accessibilityRole="button" onPress={close} style={{marginHorizontal:16,marginTop:14,padding:14,backgroundColor:S.theme==='dark'?'#FFFFFF':'#FFFFFF',borderRadius:14,alignItems:'center',borderWidth:1,borderColor:S.theme==='dark'?'#FFFFFF':'#F7C6A1'}}><Text cmsKey={"lbl.cms.026a331ef469"} style={{color:'#71340D',fontWeight:'700'}}>{label("lbl.cms.026a331ef469", "Cancel")}</Text></Pressable></View></View></Modal>;
}
