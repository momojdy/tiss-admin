import {Modal} from './PreviewModal';
import React, {useContext,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {ThinMenuIcon} from './ThinMenuIcon';
import {KonsolissContentContext,Tx,CmsImage} from './KonsolissContent';

export type KonsolissMenuAction='home'|'messages'|'notifications'|'wallet'|'saved'|'orders'|'activity'|'help'|'feedback'|'business'|'dark';
export type MenuProps={visible:boolean;close:()=>void;onAction:(action:KonsolissMenuAction)=>void;dark:boolean;unreadNotifications?:number;unreadMessages?:number};
export default function KonsolissQuickMenu({visible,close,onAction,dark,unreadNotifications=0,unreadMessages=0,inbox}:MenuProps & {inbox:{notifications:number;messages:number;notificationColor:string;messageColor:string;status:string;retry:()=>void}}){
 const [logoFailed,setLogoFailed]=useState(false);
 const {copy,images}=useContext(KonsolissContentContext);
 unreadNotifications=inbox.notifications;
 unreadMessages=inbox.messages;
 const accent=dark?'#FF5B4A':'#A90E02',text=dark?'#FFFBD4':'#2B1210',surface=dark?'#241A18':'#FFFBD4';
 const top=[['home','Home','home'],['messages','Messages','message-circle'],['notifications','Notifications','bell'],['wallet','Wallet','credit-card'],['saved','Saved','heart']] as const;
 const bottom=[['orders','My Orders','package'],['activity','Recent Activity','clock'],['help','Help Center','help-circle'],['feedback','Feedback','edit-3'],['business','Business Space','briefcase'],['dark','Dark Mode',dark?'sun':'moon']] as const;
 const tile=(item:readonly [KonsolissMenuAction,string,string],primary:boolean)=>{
  const [key,,icon]=item;const count=key==='messages'?unreadMessages:key==='notifications'?unreadNotifications:0;
  return <Pressable key={key} accessibilityRole="button" accessibilityLabel={copy['menu.'+key]} onPress={()=>{close();onAction(key);}} style={{width:primary?'20%':76,alignItems:'center',minHeight:78,gap:8}}>
    {key==='home'?<View style={{width:56,height:56,borderRadius:28,borderWidth:1,borderColor:dark?'#6B4B38':'#DDB52B',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{logoFailed?<Text style={{fontSize:22,fontWeight:'800',color:accent}}>W</Text>:<CmsImage slot="menu.logo" source={{uri:images['menu.logo']??'https://raw.githubusercontent.com/momojdy/tiss_icons_assets/refs/heads/main/WantisslogoOuterless.PNG'}} onError={()=>setLogoFailed(true)} style={{width:54,height:54,borderRadius:27}} resizeMode="contain"/>}</View>:<ThinMenuIcon name={icon} color={accent}/>}
    {count>0?<View style={{position:'absolute',top:-8,right:2,minWidth:25,height:20,borderRadius:10,backgroundColor:key==='notifications'?inbox.notificationColor:inbox.messageColor,alignItems:'center',justifyContent:'center',paddingHorizontal:5}}><Text style={{color:'#FFFFFF',fontSize:11,fontWeight:'700'}}>{count>99?'99+':count}</Text></View>:null}
    <Tx contentKey={'menu.'+key} style={{fontSize:10,fontWeight:'600',color:text,textAlign:'center'}}>{copy['menu.'+key]}</Tx>
  </Pressable>;
 };
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
  <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,8,25,0.45)'}}>
   <Pressable accessibilityRole="button" accessibilityLabel={copy['a11y.closeMenu']} onPress={close} style={{flex:1}}/>
   <View style={{backgroundColor:surface,borderTopLeftRadius:26,borderTopRightRadius:26,paddingTop:12,paddingBottom:28}}>
    <View style={{width:38,height:4,borderRadius:3,backgroundColor:accent,alignSelf:'center',marginBottom:22}}/>
    <View style={{flexDirection:'row',paddingHorizontal:12}}>{top.map(x=>tile(x,true))}</View>
{inbox.status==='unavailable'?<Pressable accessibilityRole="button" onPress={inbox.retry} style={{paddingHorizontal:16,paddingVertical:8}}><Tx contentKey="menu.unreadUnavailable" style={{color:accent,fontSize:11}}>{copy['menu.unreadUnavailable']}</Tx></Pressable>:null}    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12,paddingTop:12}}>{bottom.map(x=>tile(x,false))}</ScrollView>
    <Pressable accessibilityRole="button" onPress={close} style={{marginHorizontal:16,marginTop:14,padding:14,backgroundColor:dark?'#342522':'#FFFFFF',borderRadius:14,alignItems:'center',borderWidth:1,borderColor:accent+'35'}}><Tx style={{color:accent,fontWeight:'700'}}>{copy['common.cancel']}</Tx></Pressable>
   </View>
  </View>
 </Modal>;
}
