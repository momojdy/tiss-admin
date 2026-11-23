import React,{createContext,useContext,useState} from 'react';
import {Text,Pressable,Image,type TextProps,type ImageProps} from 'react-native';
import {contentKeyForText} from './cms/model';
import {KONSOLISS_COPY_DEFAULTS,type KonsolissCopy} from './cms/catalog';
export const KonsolissContentContext=createContext<{copy:KonsolissCopy;images:Record<string,string>;enabled?:boolean;selected?:string;onSelect?:(key:string)=>void}>({copy:KONSOLISS_COPY_DEFAULTS,images:{}});

export function Tx({contentKey,...props}:TextProps&{contentKey?:string}){
 const ctx=useContext(KonsolissContentContext);const key=contentKey??contentKeyForText(ctx.copy,props.children);
 const text=<Text {...props} style={[{includeFontPadding:false},props.style]}/>;
 if(!ctx.enabled||!key)return text;
 return <Pressable accessibilityRole="button" accessibilityLabel={'Edit '+key} onPress={event=>{event.stopPropagation();ctx.onSelect?.(key);}} style={ctx.selected===key?{borderWidth:1,borderStyle:'dotted',borderColor:'#FFD93D'}:undefined}>{text}</Pressable>;
}
export function CmsImage({slot,...props}:ImageProps&{slot:string}){
 const ctx=useContext(KonsolissContentContext);const url=ctx.images[slot];const [failed,setFailed]=useState<string|null>(null);
 const image=<Image {...props} source={url&&failed!==url?{uri:url}:props.source} onError={event=>{if(url)setFailed(url);props.onError?.(event);}}/>;
 if(!ctx.enabled)return image;
 return <Pressable accessibilityLabel={'Edit image '+slot} onPress={event=>{event.stopPropagation();ctx.onSelect?.('image:'+slot);}} style={props.style}>{image}</Pressable>;
}
