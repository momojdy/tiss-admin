/* Types mirror the v24 prototype shapes. PROPOSED contracts: text fields carry five languages (see i18n). */
export type LangCode = 'en' | 'fr' | 'ht' | 'es' | 'zh-Hans';
export type Txt = Partial<Record<LangCode, {v: string; s: 'missing' | 'draft' | 'reviewed'}>> | string;

export interface Category {id: string; name: Txt; emoji: string; art?: string | null; home?: boolean}
export interface Item {
  id: string; s: string; n: string; p: number; e: string; stock: number; oos: number; d: string; al: string; w: boolean;
  restriction?: 'none' | 'otc' | 'alcohol'; photo?: string | null; photos?: string[];
}
export interface Store {
  id: string; businessId?: string; n: string; c: string; e: string; bg: string; r: number; rv: number; ratingsAvailable?: boolean; km: number; eta: string; fee: number; min: number;
  pr: string; k: string; it: Item[]; km0: number; eta0: string; open: number; h: string; nx: string; far?: boolean; live?: boolean;
  logo?: string | null; cover?: string | null; thumbnail?: string | null; acceptScheduledOrders?: boolean; scheduledOrderStartTime?: string; scheduledOrderTimezone?: string; scheduleHours?: Record<string, {open: string; close: string; closed: boolean}>; businessName?: string; businessDescription?: string; businessPhone?: string; businessEmail?: string; businessWebsite?: string; businessAddress?: string; businessCity?: string; businessCountry?: string; businessDeliveryModes?: string[]; businessLogoUrl?: string; acceptCashOnDelivery?: boolean; deliveryPricingMode?: 'fixed' | 'distance'; maxDeliveryDistanceKm?: number | null; distanceReady?: boolean; distanceAddressKey?: string; distanceError?: string; storeLatitude?: number | null; storeLongitude?: number | null;
}
export interface Promo {c: string; t: string; d: string; min: number; ty: 'pct' | 'ship'; v?: number; st?: string}
export interface Address {id: string | number; l: string; t: string; apt: string; inst: string; def: number; goodiesDefault?: number; z: number; cc?: string; city?: string; department?: string; country?: string; phone?: string; latitude?: number | null; longitude?: number | null}
export interface CartLine {k: string; s?: string; id: string; n: string; e: string; photo?: string | null; p: number; q: number; d: string; byo?: any; nt?: string; options?: {size: 'regular' | 'large' | null; drink: boolean; discount_pct: number}}
export interface Order {
  id: string; sid: string; parentId?: string; stop?: number; lines: CartLine[]; t0: number; pk?: boolean; cx?: boolean; st?: number; sch?: number; [k: string]: any;
}
