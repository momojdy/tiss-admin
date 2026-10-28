import { useCallback, useEffect, useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { session } from '../../state/access';
import { Card, Section } from '../../ui/Card';
import { Heading } from '../../ui/Heading';
import { OutlineBtn } from '../../ui/Controls';
import { Txt } from '../../ui/Txt';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../ui/Toast';
import { notifyBrandingChanged } from '../../lib/wantissCms';

type Brand = { brand_name: string; logo_storage_path: string | null; wordmark_storage_path: string | null; updated_at: string | null };
type Picked = { uri: string; path: string };
type SelectedAsset = { uri: string; name?: string | null; size?: number | null; mimeType?: string | null };
const maxBytes = 10 * 1024 * 1024;
const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif'];

function mimeFor(asset: SelectedAsset) {
  if (asset.mimeType && allowedTypes.includes(asset.mimeType.toLowerCase())) return asset.mimeType.toLowerCase();
  const file = (asset.name || asset.uri).split('?')[0].toLowerCase();
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.webp')) return 'image/webp';
  if (file.endsWith('.heic')) return 'image/heic';
  if (file.endsWith('.heif')) return 'image/heif';
  if (file.endsWith('.avif')) return 'image/avif';
  if (file.endsWith('.gif')) return 'image/gif';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

export function BrandingScreen() {
 const { c } = useTheme(); const toast = useToast();
 const [record,setRecord]=useState<Brand>({brand_name:'Wantiss',logo_storage_path:null,wordmark_storage_path:null,updated_at:null});
 const [name,setName]=useState('Wantiss'),[logo,setLogo]=useState<Picked|null>(null),[wordmark,setWordmark]=useState<Picked|null>(null);
 const [logoUrl,setLogoUrl]=useState<string|null>(null),[wordmarkUrl,setWordmarkUrl]=useState<string|null>(null);
 const [removeLogo,setRemoveLogo]=useState(false),[removeWordmark,setRemoveWordmark]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const reload=useCallback(async()=>{const {data,error:e}=await supabase.rpc('wantiss_admin_get_branding');if(e){setError(e.message);return;}const b=data as Brand;setRecord(b);setName(b.brand_name||'Wantiss');const sign=async(p:string|null)=>{if(!p)return null;const {data:d,error:se}=await supabase.storage.from('wantiss-cms-assets').createSignedUrl(p,300);return se?null:d?.signedUrl||null;};const [l,w]=await Promise.all([sign(b.logo_storage_path),sign(b.wordmark_storage_path)]);setLogoUrl(l);setWordmarkUrl(w);setLogo(null);setWordmark(null);setRemoveLogo(false);setRemoveWordmark(false);setError('');},[]);
 useEffect(()=>{if(session.role==='super_admin'&&session.status==='active')void reload();},[reload]);

 const uploadAsset = async (kind:'logo'|'wordmark', file:SelectedAsset) => {
  try {
   const mimeType=mimeFor(file);
   if(!mimeType)throw new Error('Choose an image file (PNG, JPEG, WebP, HEIC/HEIF, AVIF or GIF).');
   if(file.size!=null&&file.size>maxBytes)throw new Error('Choose an image smaller than 10 MB.');
   const {data:a,error:ae}=await supabase.auth.getUser();
   if(ae||!a.user)throw new Error('Please sign in again.');
   setBusy(true);setError('');
   const response=await fetch(file.uri);
   if(!response.ok)throw new Error('Could not read the selected image.');
   const blob=await response.blob();
   if(blob.size>maxBytes)throw new Error('Choose an image smaller than 10 MB.');
   const safe=(file.name||'brand-image').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-70)||'brand-image';
   const path=a.user.id+'/branding-'+kind+'-'+crypto.randomUUID()+'-'+safe;
   const {error:ue}=await supabase.storage.from('wantiss-cms-assets').upload(path,blob,{contentType:mimeType,upsert:false});
   if(ue)throw new Error(ue.message);
   if(kind==='logo'){setLogo({uri:file.uri,path});setLogoUrl(file.uri);setRemoveLogo(false);}
   else{setWordmark({uri:file.uri,path});setWordmarkUrl(file.uri);setRemoveWordmark(false);}
   toast('Image uploaded privately. Review the preview, then publish.');
  }catch(e){setError(e instanceof Error?e.message:'Image upload failed.');}
  finally{setBusy(false);}
 };
 const pickFromFiles=async(kind:'logo'|'wordmark')=>{
  try{
   const result=await DocumentPicker.getDocumentAsync({type:'image/*',copyToCacheDirectory:true,multiple:false});
   if(result.canceled||!result.assets?.[0])return;
   const file=result.assets[0];
   await uploadAsset(kind,{uri:file.uri,name:file.name,size:file.size,mimeType:file.mimeType});
  }catch(e){setError(e instanceof Error?e.message:'Could not open Files.');}
 };
 const pickFromPhotos=async(kind:'logo'|'wordmark')=>{
  try{
   const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
   if(!permission.granted){setError('Allow Photos access in your device settings to choose an image.');return;}
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images','livePhotos'],allowsEditing:false,quality:1});
   if(result.canceled||!result.assets?.[0])return;
   const file=result.assets[0];
   // Live Photos provide their still-image URI here; branding uses the still image, not the motion clip.
   await uploadAsset(kind,{uri:file.uri,name:file.fileName,size:file.fileSize,mimeType:file.mimeType});
  }catch(e){setError(e instanceof Error?e.message:'Could not open Photos.');}
 };
 const publish=async()=>{if(session.role!=='super_admin'||session.status!=='active'){setError('Only an active Super Admin can publish branding.');return;}if(!name.trim()||name.trim().length>60){setError('Brand name must be between 1 and 60 characters.');return;}setBusy(true);setError('');try{const {error:e}=await supabase.rpc('wantiss_admin_save_branding',{p_brand_name:name.trim(),p_logo_storage_path:removeLogo?null:(logo?.path??record.logo_storage_path),p_wordmark_storage_path:removeWordmark?null:(wordmark?.path??record.wordmark_storage_path),p_reason:'Brand identity published from Branding & Identity settings'});if(e)throw new Error(e.message);notifyBrandingChanged();await reload();toast('Brand identity published.');}catch(e){setError(e instanceof Error?e.message:'Could not publish branding.');}finally{setBusy(false);}};
 if(session.role!=='super_admin'||session.status!=='active')return <Card><Txt size={14} weight={500}>Super Admin access required</Txt><Txt size={11} mut style={{marginTop:6}}>Only an active Super Admin can change branding. The server enforces this too.</Txt></Card>;
 const uploadButtons=(kind:'logo'|'wordmark',hasImage:boolean)=> <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}><OutlineBtn primary onPress={()=>{void pickFromPhotos(kind);}} disabled={busy}>Choose from Photos</OutlineBtn><OutlineBtn onPress={()=>{void pickFromFiles(kind);}} disabled={busy}>Choose from Files</OutlineBtn>{hasImage?<OutlineBtn onPress={()=>{if(kind==='logo'){setLogo(null);setLogoUrl(null);setRemoveLogo(true);}else{setWordmark(null);setWordmarkUrl(null);setRemoveWordmark(true);}}} disabled={busy}>Remove</OutlineBtn>:null}</View>;
 return <View><Heading title="Branding & Identity" sub="Change the logo and wordmark shown in the admin header."/>
 {error?<Card><Txt size={11} color={c.or}>{error}</Txt><OutlineBtn onPress={()=>{void reload();}} disabled={busy}>Retry</OutlineBtn></Card>:null}
 <Section title="Brand name"><Txt size={10.5} mut style={{marginBottom:7}}>Used when no wordmark image is set.</Txt><TextInput value={name} onChangeText={setName} maxLength={60} placeholder="Wantiss" accessibilityLabel="Brand name" style={{color:c.ink,backgroundColor:c.inset,borderColor:c.bd,borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:10,fontSize:14}}/></Section>
 <Section title="Logo image"><Txt size={10.5} mut style={{marginBottom:8}}>Choose from Photos or Files · maximum 10 MB. Live Photos use their still image.</Txt><View style={{minHeight:84,alignItems:'center',justifyContent:'center',padding:12,marginBottom:8,borderRadius:14,backgroundColor:c.inset}}>{removeLogo?<Txt size={11} mut>Logo will be removed on publish.</Txt>:logoUrl?<Image source={{uri:logoUrl}} resizeMode="contain" style={{width:76,height:76}}/>:<Txt size={11} mut>No logo uploaded</Txt>}</View>{uploadButtons('logo',!!record.logo_storage_path||!!logo)}</Section>
 <Section title="Wordmark image"><Txt size={10.5} mut style={{marginBottom:8}}>Transparent brand-name image displayed instead of text.</Txt><View style={{minHeight:72,alignItems:'center',justifyContent:'center',padding:12,marginBottom:8,borderRadius:14,backgroundColor:c.inset}}>{removeWordmark?<Txt size={11} mut>Wordmark will be removed on publish.</Txt>:wordmarkUrl?<Image source={{uri:wordmarkUrl}} resizeMode="contain" style={{width:210,height:52}}/>:<Txt size={12} mut>{name||'Wantiss'}</Txt>}</View>{uploadButtons('wordmark',!!record.wordmark_storage_path||!!wordmark)}</Section>
 <Section title="Header preview"><View style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:56,padding:12,borderRadius:14,backgroundColor:c.card,borderWidth:1,borderColor:c.bd}}>{removeLogo?null:logoUrl?<Image source={{uri:logoUrl}} resizeMode="contain" style={{width:28,height:28}}/>:<View style={{width:28,height:28,borderRadius:8,backgroundColor:c.ink,alignItems:'center',justifyContent:'center'}}><Txt size={15} color={c.on}>{(name.trim()[0]||'W').toUpperCase()}</Txt></View>}{!removeWordmark&&wordmarkUrl?<Image source={{uri:wordmarkUrl}} resizeMode="contain" accessibilityLabel={name} style={{width:132,height:34}}/>:<Txt size={16} weight={500}>{name.trim()||'Wantiss'}</Txt>}</View><Txt size={10} mut style={{marginTop:8}}>Preview only; publish to make it live.</Txt></Section>
 <Section title="Publish changes">{record.updated_at?<Txt size={10} mut style={{marginBottom:8}}>Last published: {new Date(record.updated_at).toLocaleString()}</Txt>:<Txt size={10} mut style={{marginBottom:8}}>No brand identity has been published yet.</Txt>}<OutlineBtn primary onPress={()=>{void publish();}} disabled={busy}>{busy?'Please wait…':'Publish brand identity'}</OutlineBtn></Section></View>;
}
