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
