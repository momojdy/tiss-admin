import React, {forwardRef, useEffect, useImperativeHandle, useSyncExternalStore} from 'react';
import {ActivityIndicator, TextInput, View, Text} from 'react-native';
import {EditableNativeText} from './EditableNativeText';
import {label} from './content';
import {getPreviewScenario, subscribePreview} from './previewRuntime';
export const usePreviewScenario=()=>useSyncExternalStore(subscribePreview,getPreviewScenario,getPreviewScenario);
export type WebViewMessageEvent={nativeEvent:{data:string}};
export type WebView={injectJavaScript:(script:string)=>void;postMessage:(message:string)=>void};
/** Never evaluates HTML, opens a provider, or handles real card details. */
export const WebView=forwardRef<WebView,any>(function PreviewWebView(props,ref){
 const scenario=usePreviewScenario(),card=String(props.source?.html||'').includes('id="b-num"');
 useImperativeHandle(ref,()=>({injectJavaScript:()=>{},postMessage:()=>{props.onMessage?.({nativeEvent:{data:JSON.stringify({type:'result',error:'Payments are disabled in the CMS preview.'})}});}}),[]);
 useEffect(()=>{
  props.onLoadStart?.();
  if(scenario==='error'){props.onError?.();return;}
  if(scenario!=='loading')props.onLoadEnd?.();
 },[scenario]);
 if(scenario==='loading')return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator /></View>;
 if(scenario==='error')return <View style={{flex:1}} />;
 const field=(id:string,fallback:string,placeholder:string)=> <View style={{flex:1}}><EditableNativeText cmsKey={id} style={{fontFamily:'Manrope_600SemiBold',fontSize:13,color:'#5C6B57',marginLeft:2,marginBottom:7}}>{label(id,fallback)}</EditableNativeText><TextInput editable={false} placeholder={placeholder} placeholderTextColor="#9AA595" style={{height:54,borderRadius:15,backgroundColor:'#DCE8D2',paddingHorizontal:16,fontFamily:'Manrope_600SemiBold',fontSize:16,color:'#1A2517'}} /></View>;
 return card?<View style={{height:176}}>{field('lbl.addcard.cardNumber','Card Number','1234 5678 9012 3456')}<View style={{flexDirection:'row',gap:14,marginTop:16}}>{field('lbl.addcard.expiryDate','Expiry Date','MM/YY')}{field('lbl.addcard.securityCode','CVV','CVC')}</View></View>:<View style={{flex:1,padding:18}}><EditableNativeText cmsKey="lbl.cardVerifying" style={{textAlign:'center',fontFamily:'Arial',fontSize:16}}>{label('lbl.cardVerifying','Securely verifying your card…')}</EditableNativeText><Text style={{marginTop:20,fontSize:12,color:'#74747C',textAlign:'center'}}>Bank verification is disabled in this CMS preview.</Text></View>;
});
export function CameraView({style}:{style?:any;facing?:string;barcodeScannerSettings?:any;onBarcodeScanned?:(event:{data:string})=>void}){return <View style={[style,{alignItems:'center',justifyContent:'center'}]}><Text style={{color:'#fff',textAlign:'center',padding:20}}>Camera access is disabled in this CMS preview.</Text></View>;}
export const useCameraPermissions=()=>[{granted:true},async()=>({granted:true})] as const;

export function Modal({visible=true,children}:any){return visible?<View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:1000}}>{children}</View>:null;}

export {previewShare} from './previewRuntime';
export const previewLinking={getInitialURL:async()=>null,addEventListener:(_event:string,_callback:(event:{url:string})=>void)=>({remove(){}}),openURL:async(_url:string)=>{}};
export const previewClipboard={setStringAsync:async(_value:string)=>{}};
export const previewLocation={Accuracy:{High:1},requestForegroundPermissionsAsync:async()=>({granted:false,status:'denied'}),getCurrentPositionAsync:async(_options?:any):Promise<any>=>{throw Error('Location is disabled in the CMS preview.');},reverseGeocodeAsync:async(_coords:any):Promise<any[]>=>[]};
export default function PreviewMap({style,children}:any){return <View style={[style,{backgroundColor:'#F1F2EF',overflow:'hidden'}]}><Text style={{padding:10,color:'#74747C'}}>Map preview · no live GPS is requested.</Text>{children}</View>;}
export const Marker=(_props:any)=>null;
export const Polyline=(_props:any)=>null;

export function PreviewDateTimePicker(_props:{value:Date;onChange?:(event:any,date?:Date)=>void;[key:string]:any}){return <View><Text>Date picker preview</Text></View>;}
export const PreviewDateTimePickerAndroid={open:(_props:{value:Date;[key:string]:any})=>{}};
