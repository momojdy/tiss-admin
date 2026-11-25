import React from 'react';
import Homepage from './konsolissPreview/konsolissHomeScreen';
import {PreviewData,type Scenario} from './konsolissPreview/previewData';
import {KonsolissContentContext} from './konsolissPreview/KonsolissContent';
import type {KonsolissCopy} from './konsolissPreview/cms/catalog';
/** Source-generated consumer screen with fixture-only providers; no live auth/data writes. */
export default function KonsolissConsumerPreviewScreen({copy,images={},scenario='default',dark=false,editMode=false,selected='',previewIndex,onSelect,onAction}:{copy:KonsolissCopy;images?:Record<string,string>;scenario?:Scenario;dark?:boolean;editMode?:boolean;selected?:string;previewIndex?:number;onSelect?:(id:string)=>void;onAction?:(id:string)=>void}){
 return <PreviewData.Provider value={{copy,images,scenario,dark}}><KonsolissContentContext.Provider value={{copy,images,enabled:editMode,previewIndex,selected,onSelect}}><Homepage onBack={()=>onAction?.('home')} onUniversalAction={action=>onAction?.(action)}/></KonsolissContentContext.Provider></PreviewData.Provider>;
}
