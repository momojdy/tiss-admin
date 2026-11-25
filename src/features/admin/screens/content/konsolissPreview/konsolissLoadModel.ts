import {parseCbm} from './konsolissNumbers';

/** Only verified, server-written cargo volumes. A missing row is not a zero balance. */
export type KonsolissLoadProgress={
  reservedCbm:number;
  sentCbm:number;
  loadedCbm:number;
  inboundCbm:number;
  allocatedCbm:number;
  atWarehouseOrInTransitCbm:number;
  sentNotLoadedCbm:number;
  reservedNotSentCbm:number;
  loadedPercent:number;
};
export type KonsolissLoadProgressState=
  | {kind:'loading'}
  | {kind:'unrecorded'}
  | {kind:'unavailable'}
  | {kind:'recorded';progress:KonsolissLoadProgress;trackingDueAt?:string};

export function parseKonsolissLoadProgress(row:unknown):KonsolissLoadProgress|null{
  if(!row||typeof row!=='object')return null;
  const data=row as Record<string,unknown>;
  const parse=parseCbm;
  const reservedCbm=parse(data.reserved_cbm);
  const sentCbm=parse(data.sent_cbm);
  const loadedCbm=parse(data.loaded_cbm);
  const inboundCbm=parse(data.inbound_to_container_cbm);
  if(![reservedCbm,sentCbm,loadedCbm,inboundCbm].every(Number.isFinite)
    ||reservedCbm<0||sentCbm<0||loadedCbm<0||inboundCbm<0
    ||Math.round(1000*loadedCbm)+Math.round(1000*inboundCbm)>Math.round(1000*sentCbm)||Math.round(1000*loadedCbm)+Math.round(1000*inboundCbm)>Math.round(1000*reservedCbm))return null;
  const derived=[data.allocated_cbm,data.at_warehouse_or_in_transit_cbm,data.reserved_not_sent_cbm,data.not_allocated_cbm,data.allocated_percent];
  if(derived.some(v=>!Number.isFinite(parseCbm(v))))return null;
  const expected=[
    loadedCbm+inboundCbm,
    Math.max(0,sentCbm-loadedCbm-inboundCbm),
    Math.max(0,reservedCbm-sentCbm),
    Math.max(0,reservedCbm-loadedCbm-inboundCbm),
    reservedCbm>0?Math.round((loadedCbm+inboundCbm)/reservedCbm*10000)/100:0,
  ];
  // Numeric database fields may be serialized as strings; tolerate rounding only.
  if(derived.some((v,i)=>v!==undefined&&v!==null&&Math.abs(Number(v)-expected[i])>(i===4?0.011:0.0001)))return null;
  return {reservedCbm,sentCbm,loadedCbm,inboundCbm,
    allocatedCbm:loadedCbm+inboundCbm,
    atWarehouseOrInTransitCbm:Math.max(0,sentCbm-loadedCbm-inboundCbm),
    sentNotLoadedCbm:Math.max(0,sentCbm-loadedCbm),
    reservedNotSentCbm:Math.max(0,reservedCbm-sentCbm),
    loadedPercent:reservedCbm>0?Math.round((loadedCbm+inboundCbm)/reservedCbm*10000)/100:0};
}

/** Absolute-time countdown; the display never grants or revokes an entitlement. */
export function trackingCountdown(deadline:number,now:number):{seconds:number;label:string}|null{
  if(!Number.isFinite(deadline)||!Number.isFinite(now))return null;
  const seconds=Math.max(0,Math.ceil((deadline-now)/1000));
  const d=Math.floor(seconds/86400),hours=Math.floor(seconds/3600)%24,mins=Math.floor(seconds/60)%60,secs=seconds%60;
  const pad=(n:number)=>String(n).padStart(2,'0');
  return {seconds,label:seconds===0?'Deadline reached':(d>0?d+'d ':'')+pad(hours)+'h '+pad(mins)+'m '+pad(secs)+'s left'};
}

/** Use only the selected container's verified committed and loaded quantities.
 * A null allocation is unknown, not evidence of inbound cargo. */
export function verifiedContainerInbound(occupancy:{yourAllocatedCbm:number|null;yourSpaceCbm:number}|null):number{
  if(!occupancy||occupancy.yourAllocatedCbm===null)return 0;
  return Math.max(0,Math.round((occupancy.yourAllocatedCbm-occupancy.yourSpaceCbm)*1000)/1000);
}
/** Account-wide callout uses the single-container progress only when measurements agree.
 * An open unsent remainder is unassigned, not necessarily unused or abandoned. */
export function liveLoadCallout(progress:KonsolissLoadProgress|null,occupancy:{yourAllocatedCbm:number|null;yourSpaceCbm:number}|null,split:boolean):string{
  if(split)return progress?'My current loaded space '+progress.loadedCbm.toFixed(3)+' CBM':'My current loaded space —';
  if(!progress||!occupancy||occupancy.yourAllocatedCbm===null)return '';
  const r=(n:number)=>Math.round(n*1000)/1000;
  const loaded=r(occupancy.yourSpaceCbm),inbound=verifiedContainerInbound(occupancy),remaining=r(Math.max(0,progress.reservedCbm-loaded-inbound));
  if(loaded!==r(progress.loadedCbm)||inbound!==r(progress.inboundCbm)||loaded<=0)return '';
  const parts=[String(loaded)+' CBM loaded'];
  if(inbound>0)parts.push(String(inbound)+' CBM inbound');
  if(remaining>0)parts.push(String(remaining)+' CBM '+(inbound>0?'remaining':'unassigned'));
  return parts.length>1?parts.join(' • '):'';
}
