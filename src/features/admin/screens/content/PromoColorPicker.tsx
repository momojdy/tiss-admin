import React, {useEffect, useMemo, useRef, useState} from 'react';
import {PanResponder, View, StyleSheet} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Txt} from '../../ui/Txt';

const PRESETS: Record<string,string> = {plum:'#7B3FE4',orange:'#FD802E',green:'#1F7A5A'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function hexToRgb(hex:string){const h=hex.replace('#','');return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function rgbToHex(r:number,g:number,b:number){return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();}
function hsvToHex(h:number,s:number,v:number){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255);}
function hexToHsv(hex:string){const {r:rr,g:gg,b:bb}=hexToRgb(hex);const r=rr/255,g=gg/255,b=bb/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);}if(h<0)h+=360;return {h,s:max===0?0:d/max,v:max};}
function validHex(value:string){return /^#[0-9a-fA-F]{6}$/.test(value);}
export function PromoColorPicker({value,onChange,disabled=false}:{value:string;onChange:(hex:string)=>void;disabled?:boolean}){
  const initial=validHex(value)?value:(PRESETS[value]||PRESETS.plum);
  const [hsv,setHsv]=useState(()=>hexToHsv(initial));
  const [size,setSize]=useState({w:280,h:150});
  const [hueWidth,setHueWidth]=useState(280);
  const hsvRef=useRef(hsv); hsvRef.current=hsv;
  const onChangeRef=useRef(onChange); onChangeRef.current=onChange;
  useEffect(()=>{setHsv(hexToHsv(validHex(value)?value:(PRESETS[value]||PRESETS.plum)));},[value]);
  const hex=hsvToHex(hsv.h,hsv.s,hsv.v);
  const areaResponder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>!disabled,onMoveShouldSetPanResponder:()=>!disabled,onPanResponderGrant:e=>pickArea(e.nativeEvent.locationX,e.nativeEvent.locationY),onPanResponderMove:e=>pickArea(e.nativeEvent.locationX,e.nativeEvent.locationY)}),[disabled,size]);
  const hueResponder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>!disabled,onMoveShouldSetPanResponder:()=>!disabled,onPanResponderGrant:e=>pickHue(e.nativeEvent.locationX),onPanResponderMove:e=>pickHue(e.nativeEvent.locationX)}),[disabled,hueWidth]);
  function pickArea(x:number,y:number){const saturation=clamp(x/Math.max(1,size.w)),brightness=1-clamp(y/Math.max(1,size.h));const next={...hsvRef.current,s:saturation,v:brightness};hsvRef.current=next;setHsv(next);onChangeRef.current(hsvToHex(next.h,next.s,next.v));}
  function pickHue(x:number){const hue=clamp(x/Math.max(1,hueWidth))*360;const next={...hsvRef.current,h:hue};hsvRef.current=next;setHsv(next);onChangeRef.current(hsvToHex(next.h,next.s,next.v));}
  return <View style={{marginTop:8}}>
    <Txt size={9.5} mut>Drag to choose any color</Txt>
    <View onLayout={e=>setSize({w:e.nativeEvent.layout.width,h:e.nativeEvent.layout.height})} {...areaResponder.panHandlers} style={{height:150,borderRadius:10,overflow:'hidden',marginTop:6,backgroundColor:hsvToHex(hsv.h,1,1)}}>
      <LinearGradient colors={['#FFFFFF','#FFFFFF00']} start={{x:0,y:0}} end={{x:1,y:0}} style={{...StyleSheet.absoluteFillObject}} />
      <LinearGradient colors={['#00000000','#000000']} start={{x:0,y:0}} end={{x:0,y:1}} style={{...StyleSheet.absoluteFillObject}} />
      <View pointerEvents="none" style={{position:'absolute',left:hsv.s*size.w-9,top:(1-hsv.v)*size.h-9,width:18,height:18,borderRadius:9,borderWidth:2,borderColor:'#fff',backgroundColor:hex,shadowColor:'#000',shadowOpacity:0.45,shadowRadius:2}} />
    </View>
    <View onLayout={e=>setHueWidth(e.nativeEvent.layout.width)} {...hueResponder.panHandlers} style={{height:22,borderRadius:11,overflow:'hidden',marginTop:10,justifyContent:'center'}}>
      <LinearGradient colors={['#FF0000','#FFFF00','#00FF00','#00FFFF','#0000FF','#FF00FF','#FF0000']} start={{x:0,y:0}} end={{x:1,y:0}} style={{...StyleSheet.absoluteFillObject}} />
      <View pointerEvents="none" style={{position:'absolute',left:clamp(hsv.h/360)*hueWidth-7,width:14,height:22,borderRadius:7,borderWidth:2,borderColor:'#fff',backgroundColor:hsvToHex(hsv.h,1,1)}} />
    </View>
    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:9}}>
      <View style={{width:28,height:24,borderRadius:6,backgroundColor:hex,borderWidth:1,borderColor:'#999'}} />
      <Txt size={10} weight={600}>{hex}</Txt>
      <Txt size={9.5} mut>Selected color</Txt>
    </View>
  </View>;
}
