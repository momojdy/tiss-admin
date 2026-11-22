/** Isolated, read-only scenarios for the Konsoliss content editor phone preview.
 * Never import live customer/session services or write these values to Supabase. */
export const KONSOLISS_PREVIEW_GENERAL = [
  {id:'default',label:'Default'},
  {id:'loading',label:'Loading'},
  {id:'error',label:'Error'},
  {id:'no-container',label:'No container'},
  {id:'booking-success',label:'Booking success'},
  {id:'booking-failed',label:'Booking failed'},
] as const;
export const KONSOLISS_PREVIEW_LIFECYCLE = [
  {id:'filling',label:'Filling'},
  {id:'filled',label:'Filled'},
  {id:'departed',label:'Departed'},
  {id:'arrived',label:'Arrived'},
] as const;
export type KonsolissPreviewScenario =
  | typeof KONSOLISS_PREVIEW_GENERAL[number]['id']
  | typeof KONSOLISS_PREVIEW_LIFECYCLE[number]['id'];

export type KonsolissPreviewFixture = {
  scenario:KonsolissPreviewScenario;
  containerNumber:string|null;
  status:'filling'|'filled'|'departed'|'arrived'|null;
  occupiedCbm:number;
  capacityCbm:number;
  customerCbm:number;
  availableForBooking:boolean;
  message:string;
  warehouseReceived:number;
  warehouseReady:number;
};
const BASE:KonsolissPreviewFixture={
  scenario:'default', containerNumber:'KS-PREVIEW',status:'filling',
  occupiedCbm:51.7,capacityCbm:68,customerCbm:0.5,
  availableForBooking:true,message:'',warehouseReceived:12,warehouseReady:2,
};
export function konsolissPreviewFixture(scenario:KonsolissPreviewScenario):KonsolissPreviewFixture {
  switch(scenario) {
    case 'loading': return {...BASE,scenario,containerNumber:null,status:null,availableForBooking:false,message:'Loading your container information…'};
    case 'error': return {...BASE,scenario,containerNumber:null,status:null,availableForBooking:false,message:'We could not load your container information. Please try again.'};
    case 'no-container': return {...BASE,scenario,containerNumber:null,status:null,occupiedCbm:0,customerCbm:0,availableForBooking:false,message:'No container assigned yet. Your container will appear here once assigned.'};
    case 'filled': return {...BASE,scenario,status:'filled',occupiedCbm:51.7,customerCbm:0.5,availableForBooking:false,message:'Loading is closed. This container is being prepared for departure.'};
    case 'departed': return {...BASE,scenario,status:'departed',occupiedCbm:51.7,customerCbm:0.5,availableForBooking:false,message:'The container has departed. Shipment updates will appear here.'};
    case 'arrived': return {...BASE,scenario,status:'arrived',occupiedCbm:51.7,customerCbm:0.5,availableForBooking:false,message:'The container has arrived. Your packages may still require delivery or pickup.'};
    case 'booking-success':return {...BASE,scenario,message:'Sample booking success: no actual space was reserved.'};
    case 'booking-failed':return {...BASE,scenario,message:'Sample booking failure: no reservation was submitted.'};
    default:return {...BASE,scenario};
  }
}
export const konsolissPreviewNeedsFallback=(f:KonsolissPreviewFixture)=>f.status===null;
export const konsolissPreviewStatusLabel=(f:KonsolissPreviewFixture)=>
  f.containerNumber ? f.containerNumber+' · '+(f.status?.charAt(0).toUpperCase()||'')+f.status!.slice(1) : 'No container assigned';
