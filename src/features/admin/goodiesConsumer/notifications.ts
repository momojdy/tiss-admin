/** Keep customer inboxes separate from vendor/admin events on shared accounts. */
export const CUSTOMER_NOTIFICATION_FILTER = 'and(or(notification_type.is.null,and(notification_type.not.like.goodies_ingredient_%,notification_type.not.like.goodies_vendor_%,notification_type.not.like.goodies_admin_%,notification_type.not.like.goodies_courier_%)),or(destination.is.null,and(destination.not.like.business_%,destination.neq.goodies_courier,destination.neq.goodiesProducts,destination.neq.goodiesIngredientRequests)))';
export type BusinessNotificationTarget = {page: string; arg?: Record<string,string>};
export function goodiesBusinessNotificationTarget(notice: any, businessId: string): BusinessNotificationTarget | null {
  const metadata = notice?.metadata || notice || {};
  if (metadata.business_id && String(metadata.business_id) !== businessId) return null;
  const type = String(notice?.notification_type || '');
  const destination = String(notice?.destination || '');
  if (destination==='business_goodies_payouts'||type.startsWith('goodies_vendor_settlement_')) return {page:'payouts'};
  if (type === 'store_message' && metadata.conversation_id) return {page:'conversation',arg:{id:String(metadata.conversation_id)}};
  if (type.startsWith('goodies_ingredient_')) return {page:'goodiesRequests'};
  if (type.startsWith('goodies_vendor_product_') || destination === 'business_goodies_products' || metadata.page === 'goodiesProducts') return {page:'goodiesProducts'};
  if (destination === 'business_goodies_orders' || (metadata.order_id && (metadata.feature === 'Goodies' || type.startsWith('goodies_vendor_')))) return {page:'goodiesOrders',arg:{focus:String(metadata.order_id || metadata.order || '')}};
  return null;
}

/** Resolve only a workspace the signed-in vendor is already allowed to select. */
export function goodiesNotificationWorkspace(notice:any,currentBusiness:string,ownedBusinessIds:string[]):string|null {const metadata=notice?.metadata||notice||{};const target=String(metadata.business_id||currentBusiness);return target===currentBusiness||ownedBusinessIds.includes(target)?target:null;}
