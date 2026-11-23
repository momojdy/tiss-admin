/** PostgreSQL numeric(10,3): reject coercions (empty strings, booleans, Infinity, NaN). */
export function parseCbm(value:unknown):number {
  if(typeof value!=='number' && (typeof value!=='string'||!/^\d+(\.\d+)?$/.test(value)))return NaN;
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>9999999.999)return NaN;
  return Math.abs(n*1000-Math.round(n*1000))<0.000001?n:NaN;
}
