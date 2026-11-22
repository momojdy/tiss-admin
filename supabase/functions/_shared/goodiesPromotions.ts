/** Operational coupon terms always come from the financial catalogue. CMS owns wording. */
export function mergeGoodiesPromotions(content: any[], promotions: any[]) {
  return content.map(record => {
    if (!['goodies.content', 'goodies'].includes(record.content_key) || record.payload?.v !== 5) return record;
    const wording = new Map((record.payload.coupons || []).map((row: any) => [row.code, row]));
    return {...record, payload: {...record.payload, coupons: promotions.map(row => {
      const copy: any = wording.get(row.code);
      return {...row, title: copy?.title || row.code, desc: copy?.desc || ''};
    })}};
  });
}
