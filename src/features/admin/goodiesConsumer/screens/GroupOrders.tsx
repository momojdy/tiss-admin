// Generated from the customer components; local adapters prohibit production side effects.
import React,{useState,useEffect,useMemo} from 'react';
import {View,Pressable,ScrollView,Image,useWindowDimensions,PanResponder} from 'react-native';
import {T,Cta,Row,Card,Badge,Input,Radio,Seg,Bar,useTheme} from '../components/ui';
import {Icon} from '../components/Icon';
import {label} from '../content';
import {S,STB,money,emit,save,toast,addr,phoneOK} from '../store';
import * as A from '../actions';
import {previewBackend as supabase,previewShare as Share,previewFriendlyError as friendlyError} from '../previewRuntime';
import {CameraView,useCameraPermissions,Modal} from '../previewNative';
import {syncGroupOrderCartLine,removeGroupOrderCartLine,refreshUserAddresses,clearActiveGroup,validateActiveGroup,previewPaymentOptions} from '../previewGroups';
import QRCode from 'react-native-qrcode-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomSheet} from '../components/Overlays';

export function GroupOrderModal({close, storeId = ''}: {close: () => void; storeId?: string}) {
  const th = useTheme(), insets = useSafeAreaInsets(), {height: windowHeight} = useWindowDimensions();
  const height = Math.round(Math.min(windowHeight - insets.top - 8, windowHeight * 0.94));
  const handlePan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_: any, g: any) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderRelease: (_: any, g: any) => { if (g.dy > 65 || g.vy > 1.1) close(); },
  }), [close]);
  return <BottomSheet visible onClose={close} dismissOnBackdrop={false} keyboardAware maxHeight={height}>
    <View style={{height, backgroundColor: th.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden'}}>
      <Pressable {...handlePan.panHandlers} accessibilityRole="button" accessibilityLabel={label("lbl.page.components.Sheets.956f47dc7b", "Close group order")} onPress={close} hitSlop={{top: 8, bottom: 14, left: 80, right: 80}} style={{alignItems: 'center', paddingTop: 10, paddingBottom: 6}}>
        <View style={{width: 44, height: 5, borderRadius: 3, backgroundColor: th.line}} />
      </Pressable>
      <View style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14}}>
        <T cmsKey={'lbl.sheetGroupTitle'} size={22} weight="800" style={{flex: 1}}>{label('lbl.sheetGroupTitle', 'Group order')}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.page.components.Sheets.7d9eb7acb1", "Close")} onPress={close} hitSlop={12} style={{width: 36, height: 36, borderRadius: 18, backgroundColor: th.soft, alignItems: 'center', justifyContent: 'center'}}><Icon name="x" size={18} color={th.ink} /></Pressable>
      </View>
      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 22, paddingTop: 4, paddingBottom: insets.bottom + 28}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <GroupOrderSheet close={close} showTitle={false} showDone storeId={storeId} />
      </ScrollView>
    </View>
  </BottomSheet>;
}

function GroupOrderSheet({close, showTitle = true, showDone = true, storeId = ''}: {close: () => void; showTitle?: boolean; showDone?: boolean; storeId?: string}) {
  const th = useTheme();
  const incomingInviteCode = String((S as any).pendingGroupInviteCode || '');
  delete (S as any).pendingGroupInviteCode;
  const [inviteCode, setInviteCode] = useState(incomingInviteCode);
  const [groupBusy, setGroupBusy] = useState(false);
  const [sharedItems, setSharedItems] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membershipError, setMembershipError] = useState('');
  const [checkoutPreview, setCheckoutPreview] = useState<any>(null);
  const [checkoutEstimate, setCheckoutEstimate] = useState<any>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [groupCheckoutBusy, setGroupCheckoutBusy] = useState(false);
  const [groupCheckoutType, setGroupCheckoutType] = useState<'pickup'|'delivery'>('pickup');
  const [groupAddressId, setGroupAddressId] = useState<string|number>(()=>addr()?.id ?? '');
  const [groupDeliveryQuote, setGroupDeliveryQuote] = useState<any>(null);
  const [groupQuoteBusy, setGroupQuoteBusy] = useState(false);
  useEffect(() => {
    if(groupCheckoutType!=='delivery') return;
    let active=true;
    void refreshUserAddresses().then((addresses:any[])=>{
      if(!active||!addresses?.length) return;
      setGroupAddressId((current:any)=>addresses.some((item:any)=>String(item.id)===String(current))?current:addresses.find((item:any)=>item.def)?.id??addresses[0].id);
    }).catch((error:any)=>{if(active)toast(friendlyError(error, label("lbl.page.components.Sheets.e3054424ff", "Could not load saved delivery addresses.")));});
    return ()=>{active=false;};
  },[groupCheckoutType]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [group, setGroup] = useState(() => {
    if (incomingInviteCode) return {code: '', host: S.pf.n || label('lbl.groupYou', 'You'), members: [], serverBacked: false};
    const saved = S.groupOrder;
    if (saved && typeof saved.code === 'string' && Array.isArray(saved.members)) return saved;
    const next = {code: '', host: S.pf.n || label('lbl.groupYou', 'You'), members: [], serverBacked: false};
    S.groupOrder = next; save(); return next;
  });
  const saveGroup = (next: any) => { setGroup(next); S.groupOrder = next; save(); emit(); };
  /* Opening the sheet re-checks a saved group; an ended or expired one is dropped instead of lingering. */
  useEffect(() => {
    if (!group.serverBacked) return;
    let alive = true;
    void validateActiveGroup().then(ok => {if (alive && !ok) setGroup({code: '', host: S.pf.n || label('lbl.groupYou', 'You'), members: [], serverBacked: false});});
    return () => {alive = false;};
  }, []);
  const createServerGroup = async () => {
    const targetStoreId = storeId || S.cart.sid || group.storeId || '';
    if (!targetStoreId) {toast(label("lbl.page.components.Sheets.b6d2157f1e", "Open a store first to create its group invitation."));return;}
    if (S.cart.lines.length && S.cart.sid !== targetStoreId) {toast(label("lbl.page.components.Sheets.5e802e59aa", "Your current cart belongs to another store. Clear it before creating this group."));return;}
    setGroupBusy(true);
    try {
      const {data,error}=await supabase.rpc('goodies_group_order_create',{p_store_id:targetStoreId});
      const row=Array.isArray(data)?data[0]:data;
      if(error||!row?.invite_code) throw error || new Error(label("lbl.page.components.Sheets.a686a8f76f", "Could not create the group invitation."));
      saveGroup({...group,code:row.invite_code,groupId:row.group_id,storeId:targetStoreId,expiresAt:row.expires_at,serverBacked:true});
      const synced=await Promise.all((S.cart.sid === targetStoreId ? S.cart.lines : []).map((line:any)=>syncGroupOrderCartLine(row.group_id,line)));
      const failed=synced.find((result:any)=>result.error);
      if(failed)toast(friendlyError(failed.error, label("lbl.page.components.Sheets.90433e8a89", "Group created, but one or more cart items could not be shared.")));
      toast(label("lbl.page.components.Sheets.3b6c997a6c", "A new group invitation is ready."));
    } catch(error:any) {
      toast(friendlyError(error, label("lbl.page.components.Sheets.b6366a98bf", "Could not create the group invitation. Please try again.")));
    } finally {
      setGroupBusy(false);
    }
  };
  const joinServerGroup = async () => {
    const code=inviteCode.trim().toUpperCase();
    if(!code){toast(label("lbl.page.components.Sheets.750142fd7b", "Enter a group invite code."));return;}
    setGroupBusy(true);
    try {
      const {data,error}=await supabase.rpc('goodies_group_order_join',{p_invite_code:code});
      const row=Array.isArray(data)?data[0]:data;
      if(error||!row?.group_id) throw error || new Error(label("lbl.page.components.Sheets.e947050714", "Could not join this group order."));
      saveGroup({code:row.invite_code,groupId:row.group_id,storeId:row.store_id,expiresAt:row.expires_at,host:S.pf.n||label('lbl.groupYou', 'You'),members:group.members||[],serverBacked:true});
      toast(label("lbl.page.components.Sheets.978f65f1a2", "You joined the group order."));
    } catch(error:any) {
      toast(friendlyError(error, label("lbl.page.components.Sheets.f0399558ec", "Could not join this group order. Check the invite code and try again.")));
    } finally {
      setGroupBusy(false);
    }
  };
  useEffect(() => {
    let active=true;
    void supabase.auth.getUser().then(({data})=>{if(active)setCurrentUserId(data.user?.id||'');});
    if (!group.serverBacked || !group.groupId) {setSharedItems([]);setGroupMembers([]);setMembershipError('');return ()=>{active=false;};}
    const loadItems=async () => {
      const {data,error}=await supabase.from('goodies_group_order_items')
        .select('id,user_id,line_key,quantity,options,note,product:goodies_products(name,price,photo_url,emoji)')
        .eq('group_id',group.groupId).order('created_at',{ascending:true});
      if(active){if(error)toast(friendlyError(error, label("lbl.page.components.Sheets.6b56548836", "Could not refresh the shared cart.")));else {setSharedItems(data||[]);setCheckoutPreview(null);setCheckoutEstimate(null);}}
    };
    const loadMembers=async () => {
      const {data,error}=await supabase.rpc('goodies_group_order_list_members',{p_group_id:group.groupId});
      if(active){setMembershipError(friendlyError(error, ''));if(!error)setGroupMembers(data||[]);}
    };
    const refreshGroupStatus=async () => {
      const {data,error}=await supabase.rpc('goodies_group_order_get_status',{p_group_id:group.groupId});
      if(!active||error)return;
      const statusRow=Array.isArray(data)?data[0]:data;
      if(!statusRow||statusRow.status!=='open'||new Date(statusRow.expires_at).getTime()<=Date.now()){
        S.groupOrder=null; save(); emit(); setGroup({code:'',host:S.pf.n||label('lbl.groupYou', 'You'),members:[],serverBacked:false});
        setSharedItems([]);setGroupMembers([]);setCheckoutPreview(null);
        toast(statusRow?.status==='cancelled'?label("lbl.page.components.Sheets.c6c43c2040", "The group host ended this group order."):label("lbl.page.components.Sheets.85aff5963b", "This group order has closed or expired."));
      }
    };
    void loadItems(); void loadMembers(); void refreshGroupStatus();
    const channel=supabase.channel('goodies-group-live-'+group.groupId)
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_group_order_items',filter:'group_id=eq.'+group.groupId},()=>{void loadItems();})
      .on('postgres_changes',{event:'*',schema:'public',table:'goodies_group_order_members',filter:'group_id=eq.'+group.groupId},()=>{void loadMembers();})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'goodies_group_orders',filter:'id=eq.'+group.groupId},()=>{void refreshGroupStatus();})
      .subscribe();
    return ()=>{active=false;void supabase.removeChannel(channel);};
  },[group.serverBacked,group.groupId]);

  /* Friends picker (host) and invitations from friends (guest). */
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [pickedFriends, setPickedFriends] = useState<string[]>([]);
  const [friendsBusy, setFriendsBusy] = useState(false);
  const [myInvites, setMyInvites] = useState<any[]>([]);
  useEffect(() => {
    if (group.serverBacked) return;
    let active = true;
    void supabase.rpc('goodies_group_order_my_invites').then(({data, error}) => {
      if (active && !error) setMyInvites(Array.isArray(data) ? data : []);
      else if (error) console.warn('Group invites could not load', error.message);
    });
    return () => {active = false;};
  }, [group.serverBacked]);
  const openFriends = async () => {
    if (!group.groupId) return;
    setFriendsOpen(true); setFriendsBusy(true);
    const {data, error} = await supabase.rpc('goodies_group_order_list_friends', {p_group_id: group.groupId});
    setFriendsBusy(false);
    if (error) {setFriends([]); toast(friendlyError(error, label("lbl.page.components.Sheets.6fee6a0fc1", "Could not load your friends. Please try again."))); return;}
    setFriends(Array.isArray(data) ? data : []); setPickedFriends([]);
  };
  const sendFriendInvites = async () => {
    if (!group.groupId || !pickedFriends.length) return;
    setFriendsBusy(true);
    const {data, error} = await supabase.rpc('goodies_group_order_invite_friends', {p_group_id: group.groupId, p_user_ids: pickedFriends});
    setFriendsBusy(false);
    if (error) {toast(friendlyError(error, label("lbl.page.components.Sheets.3800ed2d6b", "Could not send the invitations. Please try again."))); return;}
    toast(Number(data) > 0 ? label("lbl.page.components.Sheets.b413595d29", "Invitation sent.") : label("lbl.page.components.Sheets.8270c30be3", "Nothing to send."));
    setFriendsOpen(false); setPickedFriends([]);
  };
  const joinFromInvite = async (code: string) => {
    setInviteCode(code);
    setGroupBusy(true);
    try {
      const {data, error} = await supabase.rpc('goodies_group_order_join', {p_invite_code: code});
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.group_id) throw error || new Error("join failed");
      saveGroup({code: row.invite_code, groupId: row.group_id, storeId: row.store_id, expiresAt: row.expires_at, host: S.pf.n || label('lbl.groupYou', 'You'), members: [], serverBacked: true});
      toast(label("lbl.page.components.Sheets.978f65f1a2", "You joined the group order."));
    } catch (error: any) {
      toast(friendlyError(error, label("lbl.page.components.Sheets.5a41af2061", "Could not join this group order. It may have closed.")));
    } finally {setGroupBusy(false);}
  };
  const declineInvite = async (groupId: string) => {
    setMyInvites(list => list.filter(i => i.group_id !== groupId));
    const {error} = await supabase.rpc('goodies_group_order_decline_invite', {p_group_id: groupId});
    if (error) console.warn('Decline invite failed', error.message);
  };
  const invite = async () => {
    if(!group.serverBacked||!group.code){toast(label("lbl.page.components.Sheets.0811ec1314", "Create a group invitation first."));return;}
    const inviteLink='wantiss://goodies/group?code='+encodeURIComponent(group.code);
    try {await Share.share({message:label("lbl.page.components.Sheets.a54b07b29c", "Join my Wantiss Goodies group order.\n\nOpen this invite in Wantiss: ")+inviteLink+label("lbl.page.components.Sheets.c4af5f55a9", "\n\nOr enter invite code: ")+group.code});}
    catch (_) {toast(label("lbl.page.components.Sheets.4e91232d16", "Invite code: ")+group.code);}
  };
  const calculateGroupDeliveryQuote = async () => {
    let addresses=S.addr||[];
    if(!addresses.length) addresses=await refreshUserAddresses();
    const selected=addresses.find((item:any)=>String(item.id)===String(groupAddressId))||addresses.find((item:any)=>item.id===S.as)||addresses[0];
    if(!selected?.t){toast(label("lbl.page.components.Sheets.643b4b1b09", "Add or select a complete delivery address first."));return;}
    setGroupQuoteBusy(true);
    try {
      const addressPayload={l:selected.l,t:selected.t,apt:selected.apt||'',inst:selected.inst||'',city:selected.city||'',department:selected.department||'',country:selected.country||''};
      const quote=await supabase.functions.invoke('goodies-delivery-quote',{body:{store_id:group.storeId||checkoutPreview?.store_id,address:addressPayload}});
      if(quote.error||!quote.data?.quote_id){setGroupDeliveryQuote(null);toast(friendlyError(quote.data?.error ? {message: quote.data.error} : quote.error, label("lbl.page.components.Sheets.df94e75495", "Could not calculate delivery for this address.")));return;}
      const quoteState={addressId:String(selected.id),quoteId:String(quote.data.quote_id),fee:Number(quote.data.fee||0),distanceKm:Number(quote.data.distance_km||0),expiresAt:Date.now()+4*60*1000};
      setGroupDeliveryQuote(quoteState);
      const estimate=await supabase.rpc('goodies_group_order_checkout_estimate',{p_group_id:group.groupId,p_order_type:'delivery',p_address:{...addressPayload,delivery_quote_id:quoteState.quoteId}});
      if(estimate.error) {setCheckoutEstimate(null);toast(friendlyError(estimate.error, label("lbl.page.components.Sheets.4e14597cc5", "Could not calculate the final estimate.")));}
      else setCheckoutEstimate(estimate.data);
    } catch(e:any) {
      setGroupDeliveryQuote(null);toast(friendlyError(e, label("lbl.page.components.Sheets.2690b0f645", "Could not calculate delivery.")));
    } finally {setGroupQuoteBusy(false);}
  };
  const checkoutGroupOrder = async () => {
    if(!group.serverBacked||!group.groupId){toast(label("lbl.page.components.Sheets.6229019fe3", "Create a group order first."));return;}
    if(!groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host')){toast(label("lbl.page.components.Sheets.193104c5af", "Only the group host can check out."));return;}
    if(!checkoutPreview){toast(label("lbl.page.components.Sheets.de32faa892", "Review and validate the combined cart first."));return;}
    if(!checkoutEstimate || checkoutEstimate.group_id!==group.groupId || checkoutEstimate.order_type!==groupCheckoutType){toast(label("lbl.page.components.Sheets.f7d32cc80e", "Review the current group-order total before placing the order."));return;}
    if(!S.pf.ph||!phoneOK(S.pf.ph)){toast(label("lbl.page.components.Sheets.635efc6be8", "Add a valid contact phone number in your profile before checkout."));return;}
    setGroupCheckoutBusy(true);
    try {
      const walletVerified=await previewPaymentOptions();
      if(!walletVerified){toast(label("lbl.page.components.Sheets.df131bafe6", "Could not verify your live Wantiss Wallet balance. Please retry."));return;}
      if(!S.hasWallet){toast(label("lbl.page.components.Sheets.eeffda6b88", "Your Wantiss Wallet is not available. Create a wallet before placing this group order."));return;}
      const estimatedTotal=Number(checkoutEstimate?.estimated_total||0);
      if(estimatedTotal>0&&S.wallet<estimatedTotal){toast(label("lbl.page.components.Sheets.ec7a80c04e", "Insufficient Wantiss Wallet balance. Add ")+money(estimatedTotal-S.wallet)+label("lbl.page.components.Sheets.e726b3a2e1", " or choose another payment method."));return;}
      let addressPayload:any=null;
      if(groupCheckoutType==='delivery'){
        const selected=(S.addr||[]).find((item:any)=>String(item.id)===String(groupAddressId))||(S.addr||[]).find((item:any)=>item.id===S.as)||(S.addr||[])[0];
        if(!selected?.t){toast(label("lbl.page.components.Sheets.643b4b1b09", "Add or select a complete delivery address first."));return;}
        if(!groupDeliveryQuote||groupDeliveryQuote.addressId!==String(selected.id)||groupDeliveryQuote.expiresAt<=Date.now()){
          toast(label("lbl.page.components.Sheets.abb2ce699c", "Calculate the delivery fee and review it before placing the order."));return;
        }
        addressPayload={l:selected.l,t:selected.t,apt:selected.apt||'',inst:selected.inst||'',city:selected.city||'',department:selected.department||'',country:selected.country||'',delivery_quote_id:groupDeliveryQuote.quoteId};
      }
      const {data,error}=await supabase.rpc('goodies_group_order_checkout',{
        p_idempotency_key:'group-'+group.groupId+'-'+Date.now().toString(36),
        p_group_id:group.groupId,
        p_order_type:groupCheckoutType,
        p_scheduled_for:null,
        p_address:addressPayload,
        p_contact_phone:S.pf.ph,
        p_tip:0,
        p_notes:null
      });
      const order=Array.isArray(data)?data[0]:data;
      if(error||!order?.id){toast(friendlyError(error, label("lbl.page.components.Sheets.8bace9f05d", "Group order checkout failed.")));return;}
      toast(label("lbl.page.components.Sheets.da76e925b9", "Group order placed. Order ")+(order.order_code||order.id)+label("lbl.page.components.Sheets.3aacffa21b", ". Paid with Wantiss Wallet."));
      S.groupOrder=null;save();emit();close();
    } catch(e:any) {
      toast(friendlyError(e, label("lbl.page.components.Sheets.065d351ca1", "Could not complete group order checkout.")));
    } finally {setGroupCheckoutBusy(false);}
  };
  const reviewSharedOrder = async () => {
    if(!group.serverBacked||!group.groupId){toast(label("lbl.page.components.Sheets.59297174fd", "Create or join a group order first."));return;}
    setPreviewBusy(true); setCheckoutPreview(null);
    const {data,error}=await supabase.rpc('goodies_group_order_checkout_preview',{p_group_id:group.groupId});
    setPreviewBusy(false);
    if(error){toast(friendlyError(error, label("lbl.page.components.Sheets.ef2ac87b85", "Could not validate the shared cart.")));return;}
    setCheckoutPreview(data);
    if(groupCheckoutType==='pickup'){
      const estimate=await supabase.rpc('goodies_group_order_checkout_estimate',{p_group_id:group.groupId,p_order_type:'pickup',p_address:{}});
      if(estimate.error){setCheckoutEstimate(null);toast(friendlyError(estimate.error, label("lbl.page.components.Sheets.1829f5ca62", "Could not calculate the payment estimate.")));}
      else setCheckoutEstimate(estimate.data);
    }
  };
  return <>
    {showTitle ? <T cmsKey={'lbl.sheetGroupTitle'} size={19} weight="600">{label('lbl.sheetGroupTitle', 'Group order')}</T> : null}
    {!group.serverBacked ? <View>
      {myInvites.length ? <View style={{marginBottom:22}}>
        <T cmsKey={"lbl.page.components.Sheets.1ee37e2b92"} size={16} weight="800">{label("lbl.page.components.Sheets.1ee37e2b92", "Invitations from friends")}</T>
        {myInvites.map((inv:any)=><Row key={inv.group_id} style={{gap:10,alignItems:'center',marginTop:12,padding:12,borderRadius:14,backgroundColor:th.soft}}>
          <View style={{flex:1}}><T weight="600">{inv.host_name}</T><T cmsKey={"lbl.page.components.Sheets.e9f9b556b3"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.e9f9b556b3", "invited you to a group order")}</T></View>
          <Pressable accessibilityRole="button" onPress={()=>void declineInvite(inv.group_id)} hitSlop={8}><T cmsKey={"lbl.page.components.Sheets.a2d285b352"} size={13} color={th.mut}>{label("lbl.page.components.Sheets.a2d285b352", "Decline")}</T></Pressable>
          <Cta cmsKey={"lbl.page.components.Sheets.fd30fe681b"} small label={label("lbl.page.components.Sheets.fd30fe681b", "Join")} onPress={()=>void joinFromInvite(inv.invite_code)} disabled={groupBusy} />
        </Row>)}
      </View> : null}
      <T cmsKey={'lbl.sheetJoinGroup'} size={16} weight="800">{label('lbl.sheetJoinGroup', 'Join a group order')}</T>
      <T cmsKey={'lbl.sheetJoinGroupHint'} size={13} color={th.mut} style={{marginTop:6,marginBottom:16,lineHeight:19}}>{label('lbl.sheetJoinGroupHint', 'Enter the invite code, or scan the QR code your friend shared.')}</T>
      <Input cmsPlaceholderKey={"lbl.page.components.Sheets.b90c53624b"} value={inviteCode} onChange={setInviteCode} placeholder={label("lbl.page.components.Sheets.b90c53624b", "Enter group invite code")} />
      <Row style={{gap:12,marginTop:16}}>
        <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.page.components.Sheets.0668ef4e17", "Scan group invite QR code")} disabled={groupBusy} onPress={async()=>{
          if(!cameraPermission?.granted){const result=await requestCameraPermission();if(!result.granted){toast(label("lbl.page.components.Sheets.1187d6f386", "Camera permission is needed to scan a group QR code."));return;}}
          setScannerOpen(true);
        }} style={{width:52,height:48,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:th.soft,opacity:groupBusy?0.45:1}}>
          <Icon name="scan" size={22} color={th.ink}/>
        </Pressable>
        <View style={{flex:1}}><Cta cmsKeys={["lbl.page.components.Sheets.6bbb89ee5d","lbl.page.components.Sheets.6969947d59"]} label={groupBusy?label("lbl.page.components.Sheets.6bbb89ee5d", "Joining…"):label("lbl.page.components.Sheets.6969947d59", "Join group order")} onPress={()=>void joinServerGroup()} disabled={groupBusy} /></View>
      </Row>
      <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:30,marginBottom:26}}>
        <View style={{flex:1,height:1,backgroundColor:th.line}} /><T cmsKey={'lbl.sheetGroupOr'} size={12} color={th.mut}>{label('lbl.sheetGroupOr', 'or start your own')}</T><View style={{flex:1,height:1,backgroundColor:th.line}} />
      </View>
      <T cmsKey={'lbl.sheetStartGroupTitle'} size={16} weight="800">{label('lbl.sheetStartGroupTitle', 'Start a group order')}</T>
      <T cmsKey={'lbl.sheetStartGroupHint'} size={13} color={th.mut} style={{marginTop:6,marginBottom:16,lineHeight:19}}>{label('lbl.sheetStartGroupHint', 'You pay for the whole order. Friends add their items from their own phones.')}</T>
      <Cta cmsKeys={["lbl.page.components.Sheets.4660a98336","lbl.page.components.Sheets.2476ffa1fc"]} label={groupBusy?label("lbl.page.components.Sheets.4660a98336", "Please wait…"):label("lbl.page.components.Sheets.2476ffa1fc", "Create group invite")} onPress={()=>void createServerGroup()} disabled={groupBusy} />
    {S.cart.lines.length > 0 && !group.serverBacked ? <View>
      <T cmsKey={'lbl.sheetSharedCart'} size={14} weight="600" style={{marginTop:24}}>{label('lbl.sheetSharedCart', 'Items in this group')}</T>
      {S.cart.lines.length ? S.cart.lines.map((line:any)=><Row key={line.k} sp style={{marginTop:8,alignItems:'flex-start'}}><View style={{flex:1}}><T size={13} weight="600">{line.q}× {line.n}</T>{line.d ? <T size={11.5} color={th.mut}>{line.d}</T> : null}</View><T size={13} weight="600">{money(line.p*line.q)}</T></Row>) : null}
      <Row sp style={{marginTop:12,paddingTop:10,borderTopWidth: 0.5,borderTopColor:th.line}}><T cmsKey={'lbl.sheetSubtotal'} weight="600">{label('lbl.sheetSubtotal', 'Subtotal')}</T><T weight="600">{money(S.cart.lines.reduce((sum:number,line:any)=>sum+line.p*line.q,0))}</T></Row>


    </View> : null}
    </View> : null}
    {group.serverBacked ? <View>
      <Row sp><View style={{flex:1}}><T cmsKey={'lbl.sheetInviteCode'} size={11.5} weight="600" color={th.mut}>{label('lbl.sheetInviteCode', 'GROUP INVITE CODE')}</T><T size={24} weight="800" style={{marginTop:4}}>{group.code}</T></View><Cta cmsKey={'lbl.sheetInvitePeople'} small label={label('lbl.sheetInvitePeople', 'Invite people')} onPress={invite} /></Row>
      {group.code ? <View style={{alignItems:'center',paddingVertical:20,marginTop:18,marginBottom:8,borderRadius:18,backgroundColor:th.soft}}>
        <QRCode value={'wantiss://goodies/group?code='+encodeURIComponent(group.code)} size={168} backgroundColor="#FFFFFF" color="#111111"/>
        <T cmsKey={"lbl.page.components.Sheets.442c2f9f22"} size={12.5} weight="600" style={{marginTop:12}}>{label("lbl.page.components.Sheets.442c2f9f22", "Scan to join this group")}</T>
        <T cmsKey={"lbl.page.components.Sheets.4e91232d16"} size={12} color={th.mut} style={{marginTop:4}}>{label("lbl.page.components.Sheets.4e91232d16", "Invite code: ")}{group.code}</T>
      </View> : null}
      <View style={{height:14}}/>
      <Cta cmsKey={"lbl.page.components.Sheets.e59b319bc6"} small ghost label={label("lbl.page.components.Sheets.e59b319bc6", "Share invite code")} onPress={()=>void invite()} />
      {groupMembers.some((member:any)=>member.user_id===currentUserId) ? <View style={{marginTop:12}}>
        <Cta cmsKeys={["lbl.page.components.Sheets.81c74ad51a","lbl.page.components.Sheets.2614b42d84"]} small ghost label={friendsOpen?label("lbl.page.components.Sheets.81c74ad51a", "Hide friends"):label("lbl.page.components.Sheets.2614b42d84", "Invite friends")} onPress={()=>{if(friendsOpen)setFriendsOpen(false);else void openFriends();}} />
        {friendsOpen ? <View style={{marginTop:10}}>
          {friendsBusy&&!friends.length ? <T cmsKey={"lbl.page.components.Sheets.f988388b0a"} size={13} color={th.mut}>{label("lbl.page.components.Sheets.f988388b0a", "Loading friends…")}</T> : null}
          {!friendsBusy&&!friends.length ? <T cmsKey={"lbl.page.components.Sheets.62341af7ad"} size={13} color={th.mut}>{label("lbl.page.components.Sheets.62341af7ad", "No friends to invite yet.")}</T> : null}
          {friends.map((f:any)=>{
            const uid=String(f.user_id), blocked=!!f.already_member || !!f.already_invited, picked=pickedFriends.includes(uid);
            return <Pressable key={uid} disabled={blocked} accessibilityRole="checkbox" accessibilityState={{checked:picked,disabled:blocked}} onPress={()=>setPickedFriends(list=>picked?list.filter(x=>x!==uid):[...list,uid])} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9,opacity:blocked?0.5:1}}>
              <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>{f.avatar_url?<Image source={{uri:f.avatar_url}} style={{width:38,height:38}} />:<Icon name="user" color={th.mut}/>}</View>
              <View style={{flex:1}}><T weight="600">{f.display_name}</T>{f.already_member?<T cmsKey={"lbl.page.components.Sheets.69318b0c6a"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.69318b0c6a", "Joined")}</T>:f.already_invited?<T cmsKey={"lbl.page.components.Sheets.63b17becd8"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.63b17becd8", "Invited")}</T>:f.invite_status==='declined'?<T cmsKey={"lbl.page.components.Sheets.dce083a2c4"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.dce083a2c4", "Declined")}</T>:null}</View>
              <View style={{width:22,height:22,borderRadius:7,borderWidth:1.5,borderColor:picked?th.br:th.line,backgroundColor:picked?th.br:'transparent',alignItems:'center',justifyContent:'center'}}>{picked?<Icon name="check" size={14} color="#FFF"/>:null}</View>
            </Pressable>;
          })}
          {friends.length ? <View style={{marginTop:10}}><Cta cmsKeys={["lbl.page.components.Sheets.b8ed5279e8","lbl.page.components.Sheets.dba4038b65"]} label={friendsBusy?label("lbl.page.components.Sheets.b8ed5279e8", "Sending…"):label("lbl.page.components.Sheets.dba4038b65", "Send invitation")+(pickedFriends.length?' ('+pickedFriends.length+')':'')} onPress={()=>void sendFriendInvites()} disabled={friendsBusy||!pickedFriends.length} /></View> : null}
        </View> : null}
      </View> : null}
      <View style={{height:24}}/>
    </View> : null}
    {group.serverBacked ? <>
    <T cmsKey={'lbl.sheetGroupMembers'} size={15} weight="600" style={{marginBottom:7}}>{label('lbl.sheetGroupMembers', 'Group members')}</T>
    <View>
      {membershipError ? <T cmsKey={"lbl.page.components.Sheets.41302166cd"} size={12} color={th.red}>{label("lbl.page.components.Sheets.41302166cd", "Could not load group members. Try again.")}</T> : null}
      {groupMembers.map((member:any)=>{
        const uid=String(member.user_id||'');
        const isYou=uid===currentUserId;
        return <Row key={uid} style={{gap:10,alignItems:'center',paddingVertical:9}}>
          <View style={{width:38,height:38,borderRadius:19,backgroundColor:th.soft,alignItems:'center',justifyContent:'center'}}><Icon name="user" color={th.mut}/></View>
          <View style={{flex:1}}><T cmsKey={"lbl.page.components.Sheets.08b0419357"} weight="600">{isYou?label("lbl.page.components.Sheets.08b0419357", "You"):member.display_name}</T><T cmsKeys={["lbl.page.components.Sheets.4a823118b9","lbl.page.components.Sheets.6e9d22d742"]} size={12} color={th.mut}>{member.is_host?label("lbl.page.components.Sheets.4a823118b9", "Host"):label("lbl.page.components.Sheets.6e9d22d742", "Joined group order")}</T></View>
          {isYou?<Badge green label={label("lbl.page.components.Sheets.08b0419357", "You")}/>:null}
        </Row>;
      })}

    </View>
    <View style={{height:12}}/>
    <T cmsKey={"lbl.page.components.Sheets.605489301a"} size={15} weight="600" style={{marginBottom:7}}>{label("lbl.page.components.Sheets.605489301a", "Shared items")}</T>
    <View>
      {sharedItems.length ? sharedItems.map((item:any)=>{
        const product=Array.isArray(item.product)?item.product[0]:item.product;
        return <Row key={item.id} sp style={{paddingVertical:8,alignItems:'flex-start'}}>
          <View style={{flex:1}}><T cmsKey={"lbl.page.components.Sheets.2510c9813e"} weight="600">{item.quantity}× {product?.name || label("lbl.page.components.Sheets.2510c9813e", "Unavailable product")}</T>{item.note ? <T size={11.5} color={th.mut}>{item.note}</T> : null}</View>
          <View style={{alignItems:'flex-end',gap:7}}>
            <T weight="600">{product?.price!=null?money(Number(product.price)*Number(item.quantity)):'—'}</T>
            {group.serverBacked && String(item.user_id)===currentUserId ? <Pressable accessibilityRole="button" accessibilityLabel={label("lbl.page.components.Sheets.6b224fa66b", "Remove my shared cart item")} onPress={async()=>{
              const {error}=await removeGroupOrderCartLine(group.groupId,item.line_key);
              if(error){toast(friendlyError(error, label("lbl.page.components.Sheets.69d011432c", "Could not remove this shared item.")));return;}
              const ownLine=S.cart.lines.find((line:any)=>line.k===item.line_key);
              if(ownLine){S.cart.lines=S.cart.lines.filter((line:any)=>line.k!==item.line_key);if(!S.cart.lines.length)S.cart.sid=null;save();emit();}
            }}><Icon name="trash-2" size={17} color={th.red}/></Pressable> : null}
          </View>
        </Row>;
      }) : null}
      <View style={{borderTopWidth: 0.5,borderTopColor:th.line,marginTop:5,paddingTop:10}}>
        <Row sp><T cmsKey={"lbl.page.components.Sheets.1d4382b0ce"} weight="600">{label("lbl.page.components.Sheets.1d4382b0ce", "Items subtotal")}</T><T weight="600">{money(sharedItems.reduce((sum:number,item:any)=>{const product=Array.isArray(item.product)?item.product[0]:item.product;return sum+Number(product?.price||0)*Number(item.quantity||0);},0))}</T></Row>
       </View>
      <View style={{height:10}}/>
      {groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host')
        ? <Cta cmsKeys={["lbl.page.components.Sheets.006ba8aa66","lbl.page.components.Sheets.13f51efe4a"]} label={previewBusy?label("lbl.page.components.Sheets.006ba8aa66", "Checking shared cart…"):label("lbl.page.components.Sheets.13f51efe4a", "Review combined cart")} onPress={()=>void reviewSharedOrder()} disabled={previewBusy||!group.serverBacked}/>
        : null}
    </View>
    </> : null}
    {checkoutPreview ? <View>
      <T cmsKey={"lbl.page.components.Sheets.32e5ca77d4"} size={15} weight="600">{label("lbl.page.components.Sheets.32e5ca77d4", "Combined cart")}</T>
      <T cmsKey={"lbl.page.components.Sheets.757fe06863"} size={12} color={th.mut} style={{marginTop:4}}>{checkoutPreview.store_name} · {checkoutPreview.item_count} {label("lbl.page.components.Sheets.757fe06863", " items from everyone")}</T>
      
      <Row sp style={{borderTopWidth: 0.5,borderTopColor:th.line,paddingTop:10,marginTop:4}}><T cmsKey={"lbl.page.components.Sheets.1d4382b0ce"} weight="600">{label("lbl.page.components.Sheets.1d4382b0ce", "Items subtotal")}</T><T weight="600">{money(Number(checkoutPreview.subtotal||0))}</T></Row>
 
    </View>:null}
    {checkoutPreview && groupMembers.some((member:any)=>member.user_id===currentUserId&&member.role==='host') ? <View>
      <T cmsKey={"lbl.page.components.Sheets.99e71f48c4"} size={15} weight="600">{label("lbl.page.components.Sheets.99e71f48c4", "Checkout")}</T>

      <View style={{height:10}}/>
      <Seg list={[["pickup",label("lbl.groupPickup", "Pickup")],["delivery",label("lbl.groupDelivery", "Delivery")]]} on={groupCheckoutType} onPick={value=>{setGroupCheckoutType(value as 'pickup'|'delivery');setGroupDeliveryQuote(null);setCheckoutEstimate(null);if(value==='pickup')void supabase.rpc('goodies_group_order_checkout_estimate',{p_group_id:group.groupId,p_order_type:'pickup',p_address:{}}).then(({data,error}:any)=>{if(error){setCheckoutEstimate(null);toast(friendlyError(error, label("lbl.page.components.Sheets.1829f5ca62", "Could not calculate the payment estimate.")));}else setCheckoutEstimate(data);});}} />
      {groupCheckoutType==='delivery' ? <View style={{marginTop:10}}>
        <T cmsKey={"lbl.page.components.Sheets.cf61d62271"} size={12} weight="600" style={{marginBottom:6}}>{label("lbl.page.components.Sheets.cf61d62271", "Deliver to")}</T>
        {S.addr.map((item:any)=><Radio key={String(item.id)} on={String(groupAddressId)===String(item.id)} onPress={()=>{setGroupAddressId(item.id);setGroupDeliveryQuote(null);setCheckoutEstimate(null);}}>
          <View style={{flex:1}}><T cmsKey={"lbl.page.components.Sheets.2a7e0b7b20"} size={13} weight="600">{item.l}{item.def?label("lbl.page.components.Sheets.2a7e0b7b20", " · Default"):''}</T><T size={11.5} color={th.mut}>{item.t}</T></View>
        </Radio>)}
        {!S.addr.length ? <T cmsKey={"lbl.page.components.Sheets.4217c6bd6f"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.4217c6bd6f", "No saved addresses found. Add a delivery address to your profile first.")}</T> : null}
        <Cta cmsKeys={["lbl.page.components.Sheets.e4c3ab5e53","lbl.page.components.Sheets.282141c747"]} ghost small label={groupQuoteBusy?label("lbl.page.components.Sheets.e4c3ab5e53", "Calculating delivery…"):label("lbl.page.components.Sheets.282141c747", "Calculate delivery fee")} onPress={()=>void calculateGroupDeliveryQuote()} disabled={groupQuoteBusy||!S.addr.length}/>
        {groupDeliveryQuote&&groupDeliveryQuote.addressId===String(groupAddressId)&&groupDeliveryQuote.expiresAt>Date.now() ? <View style={{marginTop:8,padding:10,borderRadius:10,backgroundColor:th.soft}}>
          <Row sp><T cmsKey={"lbl.page.components.Sheets.43131a04c8"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.43131a04c8", "Delivery fee")}</T><T size={13} weight="600">{money(groupDeliveryQuote.fee)}</T></Row>


        </View> : null}
        <Cta cmsKey={"lbl.page.components.Sheets.cb0ebdd2b1"} ghost small label={label("lbl.page.components.Sheets.cb0ebdd2b1", "Manage delivery addresses")} onPress={()=>{close();A.go('addresses');}}/>
      </View> : null}
      {checkoutEstimate ? <View style={{marginTop:12,padding:11,borderRadius:11,backgroundColor:th.soft}}>
        <T cmsKey={"lbl.page.components.Sheets.334cde1b42"} size={12} weight="600" style={{marginBottom:7}}>{label("lbl.page.components.Sheets.334cde1b42", "Payment estimate")}</T>
        <Row sp><T cmsKey={"lbl.page.components.Sheets.b0f3f8e79a"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.b0f3f8e79a", "Combined cart subtotal")}</T><T size={12} weight="600">{money(Number(checkoutEstimate.subtotal||0))}</T></Row>
        {groupCheckoutType==='delivery' ? <Row sp style={{marginTop:5}}><T cmsKey={"lbl.page.components.Sheets.43131a04c8"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.43131a04c8", "Delivery fee")}</T><T size={12} weight="600">{money(Number(checkoutEstimate.delivery_fee||0))}</T></Row> : null}
        <Row sp style={{marginTop:5}}><T cmsKey={"lbl.page.components.Sheets.c1f39f767e"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.c1f39f767e", "Service fee")}</T><T size={12} weight="600">{money(Number(checkoutEstimate.service_fee||0))}</T></Row>
        <View style={{height:1,backgroundColor:th.line,marginVertical:8}}/>
        <Row sp><T cmsKey={"lbl.page.components.Sheets.8019400caf"} size={13} weight="600">{label("lbl.page.components.Sheets.8019400caf", "Estimated total")}</T><T size={15} weight="600">{money(Number(checkoutEstimate.estimated_total||0))}</T></Row>


      </View> : null}
      <Row sp style={{marginTop:10}}><T cmsKey={"lbl.page.components.Sheets.ab861d056b"} size={12} color={th.mut}>{label("lbl.page.components.Sheets.ab861d056b", "Host Wallet balance")}</T><T weight="600">{money(Number(S.wallet||0))}</T></Row>

      <View style={{height:9}}/>
      <Cta cmsKeys={["lbl.page.components.Sheets.dd2d63c395","lbl.page.components.Sheets.641ef0cb57"]} label={groupCheckoutBusy?label("lbl.page.components.Sheets.dd2d63c395", "Placing group order…"):label("lbl.page.components.Sheets.641ef0cb57", "Place group order · Wallet")} onPress={()=>void checkoutGroupOrder()} disabled={groupCheckoutBusy||(groupCheckoutType==='delivery'&&(!S.addr.length||!groupDeliveryQuote||groupDeliveryQuote.addressId!==String(groupAddressId)||groupDeliveryQuote.expiresAt<=Date.now()))}/>
    </View> : null}
    {showDone ? <><View style={{height:12}} /><Cta cmsKey={'lbl.sheetDone'} label={label('lbl.sheetDone', 'Done')} onPress={close} /><View style={{height:8}} /></> : null}
    {group.serverBacked && group.groupId ? <Cta cmsKey={'lbl.sheetEndGroup'} ghost label={label('lbl.sheetEndGroup', 'End group order')} onPress={async () => {
      if (!group.serverBacked || !group.groupId) {toast(label("lbl.page.components.Sheets.fdf059eee1", "This group invitation is not server-backed."));return;}
      setGroupBusy(true);
      const {data,error}=await supabase.rpc('goodies_group_order_end',{p_group_id:group.groupId});
      setGroupBusy(false);
      if(error){toast(friendlyError(error, label("lbl.page.components.Sheets.9f49507ffd", "Could not end this group order.")));return;}
      clearActiveGroup(); close();
      toast(label("lbl.page.components.Sheets.9a5aa0d4b6", "Group order ended."));
    }} /> : null}
    <Modal visible={scannerOpen} animationType="slide" onRequestClose={()=>setScannerOpen(false)}>
      <View style={{flex:1,backgroundColor:'#000000'}}>
        <CameraView style={{flex:1}} facing="back" barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>{
          setScannerOpen(false);
          const scanned=String(data||'').trim();
          const linkCode=scanned.match(/[?&]code=([^&]+)/i)?.[1] || scanned.match(/^wantiss:\/\/goodies\/group\/([^/?#]+)/i)?.[1];
          let code=linkCode ? decodeURIComponent(linkCode) : scanned;
          code=code.trim().toUpperCase();
          setInviteCode(code);
          toast(label("lbl.page.components.Sheets.5347926989", "QR code scanned. Tap Join group order to continue."));
        }}/>
        <View style={{padding:18,backgroundColor:'#111111'}}>
          <T cmsKey={"lbl.page.components.Sheets.fbe99c2534"} color="#FFFFFF" weight="600" align="center">{label("lbl.page.components.Sheets.fbe99c2534", "Scan a Wantiss group invite QR code")}</T>
          <Cta cmsKey={"lbl.page.components.Sheets.929d4aafa6"} label={label("lbl.page.components.Sheets.929d4aafa6", "Close scanner")} onPress={()=>setScannerOpen(false)}/>
        </View>
      </View>
    </Modal>
  </>;
}

export function GroupOrderPage({onBack, storeId = ''}: {onBack: () => void; storeId?: string}) {
  const th = useTheme();
  return <View style={{flex: 1, backgroundColor: th.bg}}>
    <Bar cmsKey={'lbl.sheetGroupTitle'} title={label('lbl.sheetGroupTitle', 'Group order')} onBack={onBack} />
    <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32}} keyboardShouldPersistTaps="handled"><GroupOrderSheet close={onBack} showTitle={false} showDone={false} storeId={storeId} /></ScrollView>
  </View>;
}
