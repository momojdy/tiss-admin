import {formatCopy} from './cms/model';
import {parseCbm} from './konsolissNumbers';
import {parseKonsolissOccupancy,type KonsolissContainerOccupancy} from './konsolissOccupancyModel';

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
export type KonsolissHomeStatus='nothing_sent'|'label_created'|'inbound_warehouse'|'warehouse'|'warehouse_and_transit'|'preparing'|'incident_review'|'expired';
export type KonsolissHomeContainer={id:string;number:string;status:'filling'|'filled'|'departed'|'arrived';demo:false;occupancy:KonsolissContainerOccupancy|null};
export type KonsolissHomeSnapshot={containers:KonsolissHomeContainer[];statusCode:KonsolissHomeStatus|null;warehouseCbm:number;transitCbm:number};
export type KonsolissLoadProgressState=(
  | {kind:'loading'}
  | {kind:'unrecorded'}
  | {kind:'unavailable'}
  | {kind:'recorded';progress:KonsolissLoadProgress;trackingDueAt?:string}) & {snapshot?:KonsolissHomeSnapshot|null};

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
export function trackingCountdown(deadline:number,now:number,copy:Record<string,string>={}):{seconds:number;label:string}|null{
  if(!Number.isFinite(deadline)||!Number.isFinite(now))return null;
  const seconds=Math.max(0,Math.ceil((deadline-now)/1000));
  const d=Math.floor(seconds/86400),hours=Math.floor(seconds/3600)%24,mins=Math.floor(seconds/60)%60,secs=seconds%60;
  const pad=(n:number)=>String(n).padStart(2,'0');
  const values={hours:pad(hours),minutes:pad(mins),seconds:pad(secs)};
  return {seconds,label:seconds===0?formatCopy(copy,'deadline.reached'):d>0?formatCopy(copy,'deadline.clockDays',{...values,days:formatCopy(copy,'deadline.days',{days:d})}):formatCopy(copy,'deadline.clock',values)};
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


/** The live read model is all-or-nothing. No fallback to separately fetched or demo volumes. */
export function parseKonsolissHomeSnapshot(raw:unknown):KonsolissLoadProgressState{
 const unavailable:KonsolissLoadProgressState={kind:'unavailable',snapshot:null};
 if(!raw||typeof raw!=='object')return unavailable;
 const row=raw as Record<string,unknown>;
 if(!Array.isArray(row.containers))return unavailable;
 if(row.kind==='unavailable')return unavailable;
 if(row.kind==='unrecorded')return row.containers.length===0?{kind:'unrecorded',snapshot:{containers:[],statusCode:null,warehouseCbm:0,transitCbm:0}}:unavailable;
 if(row.kind!=='recorded')return unavailable;
 const progress=parseKonsolissLoadProgress(row.progress);
 const warehouseCbm=parseCbm(row.warehouse_cbm),transitCbm=parseCbm(row.transit_cbm);
 if(!progress||!Number.isFinite(warehouseCbm)||!Number.isFinite(transitCbm)
   ||Math.abs(warehouseCbm+transitCbm-progress.sentCbm)>.0011
   ||Math.round(progress.allocatedCbm*1000)>Math.round(warehouseCbm*1000))return unavailable;
 const validStatuses=['filling','filled','departed','arrived'];
 const validCodes=['nothing_sent','label_created','inbound_warehouse','warehouse','warehouse_and_transit','preparing','incident_review','expired'];
 if(row.status_code!=null&&(typeof row.status_code!=='string'||!validCodes.includes(row.status_code)))return unavailable;
 const statusCode=(row.status_code??null) as KonsolissHomeStatus|null;
 if(statusCode==='expired'&&(progress.reservedCbm!==0||progress.sentCbm!==0||row.containers.length>0))return unavailable;
 if((statusCode==='label_created'||statusCode==='nothing_sent')&&progress.sentCbm!==0)return unavailable;
 const ids=new Set<string>();const containers:KonsolissHomeContainer[]=[];
 for(const item of row.containers){
  if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id||ids.has(item.id)||typeof item.number!=='string'||!item.number||!validStatuses.includes(item.status))return unavailable;
  ids.add(item.id);
  const occupancy=item.occupancy==null?null:parseKonsolissOccupancy(item.occupancy,item.id);
  if(item.occupancy!=null&&!occupancy)return unavailable;
  if(occupancy&&(occupancy.yourAllocatedCbm===null||Math.round(occupancy.yourSpaceCbm*1000)>Math.round(progress.loadedCbm*1000)||Math.round(occupancy.yourAllocatedCbm*1000)>Math.round(progress.allocatedCbm*1000)))return unavailable;
  containers.push({id:item.id,number:item.number,status:item.status,demo:false,occupancy});
 }
 const measured=containers.filter(c=>c.occupancy!==null);
 const sum=(field:'yourSpaceCbm'|'yourAllocatedCbm')=>measured.reduce((n,c)=>n+(c.occupancy?.[field]??0),0);
 const l=sum('yourSpaceCbm'),a=sum('yourAllocatedCbm'),millis=(n:number)=>Math.round(n*1000);
 if(millis(l)>millis(progress.loadedCbm)||millis(a)>millis(progress.allocatedCbm))return unavailable;
 if(measured.length===containers.length&&(millis(l)!==millis(progress.loadedCbm)||millis(a)!==millis(progress.allocatedCbm)))return unavailable;
 if(row.tracking_due_at!=null&&(typeof row.tracking_due_at!=='string'||!Number.isFinite(Date.parse(row.tracking_due_at))||progress.reservedCbm<=0))return unavailable;
 const trackingDueAt=typeof row.tracking_due_at==='string'?row.tracking_due_at:undefined;
 return {kind:'recorded',progress,trackingDueAt,snapshot:{containers,statusCode,warehouseCbm,transitCbm}};
}

export function liveHomeStatus(snapshot:KonsolissHomeSnapshot|null|undefined,copy:Record<string,string>):string{
 if(!snapshot)return '';
 const fmt=(n:number)=>String(Math.round(n*1000)/1000),label=(key:string,values:Record<string,string|number>={})=>formatCopy(copy,key,values);
 switch(snapshot.statusCode){
  case 'nothing_sent':return label('load.nothingSent');
  case 'label_created':return label('load.labelCreated');
  case 'inbound_warehouse':return label('load.warehouseInbound',{volume:fmt(snapshot.transitCbm)});
  case 'warehouse':return label('load.atWarehouse',{volume:fmt(snapshot.warehouseCbm)});
  case 'warehouse_and_transit':return label('load.atWarehouse',{volume:fmt(snapshot.warehouseCbm)})+' • '+label('load.inboundWarehousePart',{volume:fmt(snapshot.transitCbm)});
  case 'preparing':return copy['status.preparing']||label('load.preparingShipment');
  case 'incident_review':return label('load.incident');
  case 'expired':return label('load.expired');
  default:return '';
 }
}
