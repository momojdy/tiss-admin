import React,{createContext,useContext,useState} from 'react';
import {KONSOLISS_COPY_DEFAULTS,type KonsolissCopy} from './cms/catalog';
import {parseKonsolissLoadProgress,type KonsolissLoadProgressState} from './konsolissLoadModel';
export type {KonsolissLoadProgress} from './konsolissLoadModel';
export type {KonsolissContainerOccupancy} from './konsolissOccupancyModel';
import type {KonsolissContainerOccupancy} from './konsolissOccupancyModel';
export type {KonsolissCopy} from './cms/catalog';
export type KonsolissContainerStatus='filling'|'filled'|'departed'|'arrived';
export type KonsolissSelectableContainer={id:string;number:string;status:KonsolissContainerStatus;demo:boolean};
export type Scenario='default'|'loading'|'error'|'no-container'|'unverified'|'tiny'|'filling'|'filled'|'departed'|'arrived';
export const PreviewData=createContext<{copy:KonsolissCopy;images:Record<string,string>;scenario:Scenario;dark:boolean}>({copy:KONSOLISS_COPY_DEFAULTS,images:{},scenario:'default',dark:false});
export function useKonsolissHomepageContent(){const data=useContext(PreviewData);return {...data,accountId:'preview',locale:'en',status:'ready'};}
export function useFeatureTheme(_key:string){const ctx=useContext(PreviewData);const [override,setOverride]=useState<boolean|null>(null);const dark=override??ctx.dark;return {dark,toggle:()=>setOverride(!dark),error:null};}
export function useCurrentKonsolissContainer():{kind:'loading'|'unavailable'|'unassigned'}|{kind:'assigned';number:string;status:KonsolissContainerStatus}{
 const {scenario}=useContext(PreviewData);
 if(scenario==='loading')return {kind:'loading'};if(scenario==='error')return {kind:'unavailable'};if(scenario==='no-container')return {kind:'unassigned'};
 return {kind:'assigned',number:'KS-PREVIEW',status:['filled','departed','arrived'].includes(scenario)?scenario as KonsolissContainerStatus:'filling'};
}
export function currentKonsolissContainerLabel(value:ReturnType<typeof useCurrentKonsolissContainer>,copy:KonsolissCopy){return value.kind==='assigned'?value.number+' · '+copy['status.'+value.status]:copy['status.'+value.kind];}
export function useKonsolissAssignedContainers(){const value=useCurrentKonsolissContainer();return {containers:value.kind==='assigned'?[{id:'preview-container',number:value.number,status:value.status,demo:false}]:[],state:value.kind==='loading'?'loading':value.kind==='unavailable'?'unavailable':'ready',refresh:async()=>{}};}
export function useKonsolissLoadProgress():KonsolissLoadProgressState{const {scenario}=useContext(PreviewData);if(scenario==='loading')return {kind:'loading'} as const;if(scenario==='error')return {kind:'unavailable'} as const;if(scenario==='no-container')return {kind:'unrecorded'} as const;
 const tiny=scenario==='tiny';const progress=parseKonsolissLoadProgress({reserved_cbm:tiny?0.02:2,sent_cbm:tiny?0.02:1,loaded_cbm:tiny?0.02:0.5,inbound_to_container_cbm:tiny?0:0.3,allocated_cbm:tiny?0.02:0.8,at_warehouse_or_in_transit_cbm:tiny?0:0.2,reserved_not_sent_cbm:tiny?0:1,not_allocated_cbm:tiny?0:1.2,allocated_percent:tiny?100:40});return progress?{kind:'recorded',progress} as const:{kind:'unavailable'} as const;
}
export function useKonsolissContainerOccupancy(id:string|null):KonsolissContainerOccupancy|null{const {scenario}=useContext(PreviewData);if(!id||['loading','error','no-container','unverified'].includes(scenario))return null;const tiny=scenario==='tiny';return {containerType:'40HQ',capacityCbm:68,loadedCbm:tiny?0.02:51.7,otherCargoCbm:tiny?0:51.2,yourSpaceCbm:tiny?0.02:0.5,yourAllocatedCbm:tiny?0.02:0.8,freeCbm:tiny?67.98:16.3};}
export const supportRequestId=()=> '00000000-0000-4000-8000-000000000001';
export async function sendKonsolissSupport(_id:string,_subject:string,_message:string):Promise<string>{throw new Error('Preview never sends support requests');}
