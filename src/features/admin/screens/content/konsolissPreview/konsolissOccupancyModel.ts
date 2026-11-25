import {parseCbm} from './konsolissNumbers';
export type KonsolissContainerOccupancy = {
  containerType:'40HQ';
  capacityCbm:number;
  loadedCbm:number;
  otherCargoCbm:number;
  yourSpaceCbm:number; // physically loaded customer cargo, not reserved space
  yourAllocatedCbm:number|null;
  freeCbm:number;
};

export function parseKonsolissOccupancy(data:unknown,containerId:string):KonsolissContainerOccupancy|null {
 if(!data||typeof data!=='object')return null;
      const row=data as Record<string,unknown>;
      const parse=parseCbm;
      const capacityCbm=parse(row.capacity_cbm),loadedCbm=parse(row.loaded_cbm);
      const otherCargoCbm=parse(row.other_cargo_cbm),yourSpaceCbm=parse(row.your_loaded_cbm);
      const freeCbm=parse(row.free_cbm),allocated=parse(row.your_allocated_cbm);
      const valid=[capacityCbm,loadedCbm,otherCargoCbm,yourSpaceCbm,freeCbm].every(Number.isFinite)
        &&row.container_id===containerId&&row.container_type==='40HQ'&&capacityCbm===68
        &&loadedCbm>=0&&loadedCbm<=capacityCbm
        &&yourSpaceCbm>=0&&yourSpaceCbm<=loadedCbm
        &&otherCargoCbm>=0&&freeCbm>=0
        &&Math.round(otherCargoCbm*1000)+Math.round(yourSpaceCbm*1000)===Math.round(loadedCbm*1000)
        &&Math.round(loadedCbm*1000)+Math.round(freeCbm*1000)===Math.round(capacityCbm*1000)
        &&(row.your_allocated_cbm==null||(Number.isFinite(allocated)&&allocated>=yourSpaceCbm&&allocated<=capacityCbm));
  return valid?{containerType:'40HQ',capacityCbm,loadedCbm,otherCargoCbm,yourSpaceCbm,yourAllocatedCbm:Number.isNaN(allocated)?null:allocated,freeCbm}:null;
}

/** Three decimal percentage places distinguish every 0.001 CBM step of a 68 CBM 40HQ.
 * Zero and 100% are reserved for exact physical endpoints. Never use purchased or inbound CBM.
 */
export function formatContainerFillPercent(loadedCbm:number,capacityCbm:number):string {
 const loaded=parseCbm(loadedCbm);
 if(capacityCbm!==68||!Number.isFinite(loaded)||loaded>68)return '—';
 const milliCbm=Math.round(loaded*1000);
 // Integer inputs avoid binary floating-point tie errors. SQL uses round(numeric,3).
 const thousandthsOfPercent=Math.floor((milliCbm*100000+34000)/68000);
 return String(thousandthsOfPercent/1000)+'%';
}
