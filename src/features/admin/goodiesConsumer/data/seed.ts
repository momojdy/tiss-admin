/* Seed data copied from Goodies v24 (RAW, CATS, DEALS, PR, SEED). Used by the demo provider only. */
import type {Category, Promo} from './types';

export const CATS: Category[] = [
 {
  "id": "restaurants",
  "name": "Restaurant",
  "emoji": "🍽️",
  "home": true
 },
 {
  "id": "produce",
  "name": "Fresh produce",
  "emoji": "🥭",
  "home": true
 },
 {
  "id": "beverages",
  "name": "Beverages",
  "emoji": "🥤",
  "home": true
 },
 {
  "id": "bakery",
  "name": "Bakery & desserts",
  "emoji": "🥐",
  "home": true
 },
 {
  "id": "meat",
  "name": "Meat & seafood",
  "emoji": "🥩",
  "home": true
 },
 {
  "id": "groceries",
  "name": "Groceries",
  "emoji": "🛒",
  "home": true
 },
 {
  "id": "haitian",
  "name": "Haitian products",
  "emoji": "🇭🇹",
  "home": true
 },
 {
  "id": "care",
  "name": "Personal care",
  "emoji": "🧴",
  "home": true
 },
 {
  "id": "drugstore",
  "name": "Drugstore",
  "emoji": "💊",
  "home": true
 }
];

export interface RawStore {id: string; n: string; c: string; e: string; bg: string; r: number; rv: number; km: number; eta: string; fee: number; min: number; pr: string; k: string; items: {n: string; p: number; e: string}[]}
export const RAW_STORES: RawStore[] = [
 {
  "id": "s1",
  "n": "Chez Marjorie",
  "c": "restaurants",
  "e": "🍛",
  "bg": "bg0",
  "r": 4.8,
  "rv": 124,
  "km": 0.8,
  "eta": "20–30",
  "fee": 0,
  "min": 5,
  "pr": "20% off",
  "k": "Haitian food",
  "items": [
   {
    "n": "Plat Haïtien combo",
    "p": 10.0,
    "e": "🍛"
   },
   {
    "n": "Poulet frit",
    "p": 6.5,
    "e": "🍗"
   },
   {
    "n": "Soup joumou",
    "p": 4.5,
    "e": "🍲"
   },
   {
    "n": "Griot plate",
    "p": 8.0,
    "e": "🥩"
   }
  ]
 },
 {
  "id": "s2",
  "n": "Ti Krik",
  "c": "meat",
  "e": "🦐",
  "bg": "bg1",
  "r": 4.6,
  "rv": 87,
  "km": 1.4,
  "eta": "25–35",
  "fee": 1.5,
  "min": 8,
  "pr": "",
  "k": "Seafood",
  "items": [
   {
    "n": "Grilled shrimp plate",
    "p": 12.0,
    "e": "🦐"
   },
   {
    "n": "Fried fish",
    "p": 9.0,
    "e": "🐟"
   },
   {
    "n": "Lambi stew",
    "p": 14.0,
    "e": "🐚"
   },
   {
    "n": "Crab rice",
    "p": 10.0,
    "e": "🦀"
   }
  ]
 },
 {
  "id": "s3",
  "n": "Nature & Bien",
  "c": "produce",
  "e": "🥭",
  "bg": "bg2",
  "r": 4.2,
  "rv": 63,
  "km": 1.9,
  "eta": "30–40",
  "fee": 1.5,
  "min": 6,
  "pr": "Buy 2 get 1",
  "k": "Fresh produce",
  "items": [
   {
    "n": "Mango box, 5 lb",
    "p": 7.5,
    "e": "🥭"
   },
   {
    "n": "Avocados, 4 pcs",
    "p": 3.0,
    "e": "🥑"
   },
   {
    "n": "Plantains, bunch",
    "p": 4.0,
    "e": "🍌"
   },
   {
    "n": "Tomatoes, 2 lb",
    "p": 3.5,
    "e": "🍅"
   }
  ]
 },
 {
  "id": "s4",
  "n": "Boulangerie Delmas",
  "c": "bakery",
  "e": "🥐",
  "bg": "bg3",
  "r": 4.6,
  "rv": 52,
  "km": 2,
  "eta": "15–25",
  "fee": 0,
  "min": 4,
  "pr": "",
  "k": "Bakery",
  "items": [
   {
    "n": "Pain patate",
    "p": 2.75,
    "e": "🍞"
   },
   {
    "n": "Croissant",
    "p": 1.75,
    "e": "🥐"
   },
   {
    "n": "Gâteau chocolat",
    "p": 12.0,
    "e": "🍰"
   },
   {
    "n": "Beignets, 6 pcs",
    "p": 3.5,
    "e": "🍩"
   }
  ]
 },
 {
  "id": "s5",
  "n": "Jus Naturel",
  "c": "beverages",
  "e": "🥤",
  "bg": "bg4",
  "r": 4.6,
  "rv": 76,
  "km": 1.5,
  "eta": "20–30",
  "fee": 1,
  "min": 3,
  "pr": "Free cup",
  "k": "Beverages",
  "items": [
   {
    "n": "Jus naturel, 1 L",
    "p": 3.25,
    "e": "🥤"
   },
   {
    "n": "Coconut water",
    "p": 2.5,
    "e": "🥥"
   },
   {
    "n": "Cola, 6 pack",
    "p": 5.0,
    "e": "🥫"
   },
   {
    "n": "Water, 12 pack",
    "p": 4.0,
    "e": "💧"
   }
  ]
 },
 {
  "id": "s6",
  "n": "Lakay Market",
  "c": "groceries",
  "e": "🛒",
  "bg": "bg2",
  "r": 4.7,
  "rv": 98,
  "km": 1.2,
  "eta": "30–45",
  "fee": 1.5,
  "min": 10,
  "pr": "",
  "k": "Groceries",
  "items": [
   {
    "n": "Riz local, 10 lb",
    "p": 12.99,
    "e": "🍚"
   },
   {
    "n": "Cooking oil, 1 L",
    "p": 4.5,
    "e": "🫗"
   },
   {
    "n": "Black beans, 2 lb",
    "p": 3.5,
    "e": "🫘"
   },
   {
    "n": "Sugar, 5 lb",
    "p": 4.0,
    "e": "🍬"
   }
  ]
 },
 {
  "id": "s7",
  "n": "Kay Atizan",
  "c": "haitian",
  "e": "🇭🇹",
  "bg": "bg0",
  "r": 4.5,
  "rv": 41,
  "km": 2.6,
  "eta": "35–50",
  "fee": 2,
  "min": 10,
  "pr": "",
  "k": "Haitian products",
  "items": [
   {
    "n": "Café Haïtien, 1 lb",
    "p": 8.0,
    "e": "☕"
   },
   {
    "n": "Epis jar",
    "p": 3.0,
    "e": "🫙"
   },
   {
    "n": "Pikliz jar",
    "p": 3.5,
    "e": "🌶️"
   },
   {
    "n": "Clairin bottle",
    "p": 15.0,
    "e": "🍾"
   }
  ]
 },
 {
  "id": "s8",
  "n": "Pharmacie Delmas",
  "c": "drugstore",
  "e": "💊",
  "bg": "bg1",
  "r": 4.7,
  "rv": 58,
  "km": 1.1,
  "eta": "15–25",
  "fee": 1,
  "min": 3,
  "pr": "",
  "k": "Pharmacy",
  "items": [
   {
    "n": "Paracetamol, 20 tabs",
    "p": 2.5,
    "e": "💊"
   },
   {
    "n": "Vitamin C",
    "p": 6.0,
    "e": "🍊"
   },
   {
    "n": "Bandages",
    "p": 2.0,
    "e": "🩹"
   },
   {
    "n": "Hand sanitizer",
    "p": 3.0,
    "e": "🧴"
   }
  ]
 },
 {
  "id": "s9",
  "n": "Beauté Lokalité",
  "c": "care",
  "e": "🧴",
  "bg": "bg4",
  "r": 4.4,
  "rv": 33,
  "km": 3,
  "eta": "40–55",
  "fee": 2,
  "min": 8,
  "pr": "",
  "k": "Personal care",
  "items": [
   {
    "n": "Shea body butter",
    "p": 9.0,
    "e": "🧴"
   },
   {
    "n": "Soap, 3 pack",
    "p": 4.0,
    "e": "🧼"
   },
   {
    "n": "Toothpaste",
    "p": 2.5,
    "e": "🪥"
   },
   {
    "n": "Shampoo",
    "p": 6.0,
    "e": "🧴"
   }
  ]
 },
 {
  "id": "s10",
  "n": "Resto Kreyòl",
  "c": "restaurants",
  "e": "🍲",
  "bg": "bg3",
  "r": 4.4,
  "rv": 71,
  "km": 1.7,
  "eta": "25–40",
  "fee": 1.5,
  "min": 7,
  "pr": "10% off",
  "k": "Creole cuisine",
  "items": [
   {
    "n": "Diri ak djon djon",
    "p": 9.0,
    "e": "🍚"
   },
   {
    "n": "Tasso kabrit",
    "p": 11.0,
    "e": "🍖"
   },
   {
    "n": "Akra, 8 pcs",
    "p": 4.0,
    "e": "🧆"
   },
   {
    "n": "Lalo stew",
    "p": 10.0,
    "e": "🥘"
   }
  ]
 },
 {
  "id": "s11",
  "n": "Boucherie Central",
  "c": "meat",
  "e": "🥩",
  "bg": "bg0",
  "r": 4.5,
  "rv": 49,
  "km": 2.2,
  "eta": "30–45",
  "fee": 2,
  "min": 10,
  "pr": "",
  "k": "Meat",
  "items": [
   {
    "n": "Chicken, whole",
    "p": 4.5,
    "e": "🍗"
   },
   {
    "n": "Goat meat, 2 lb",
    "p": 14.0,
    "e": "🐐"
   },
   {
    "n": "Pork, 2 lb",
    "p": 9.0,
    "e": "🥓"
   },
   {
    "n": "Beef cuts, 2 lb",
    "p": 12.0,
    "e": "🥩"
   }
  ]
 },
 {
  "id": "s12",
  "n": "Pizza Corner",
  "c": "restaurants",
  "e": "🍕",
  "bg": "bg2",
  "r": 4.7,
  "rv": 102,
  "km": 1,
  "eta": "20–35",
  "fee": 1,
  "min": 8,
  "pr": "",
  "k": "Pizza and burgers",
  "items": [
   {
    "n": "Margherita pizza",
    "p": 9.0,
    "e": "🍕"
   },
   {
    "n": "Pepperoni pizza",
    "p": 11.0,
    "e": "🍕"
   },
   {
    "n": "Classic burger",
    "p": 7.0,
    "e": "🍔"
   },
   {
    "n": "Fries",
    "p": 3.0,
    "e": "🍟"
   }
  ]
 }
];

/* [itemId, percentOff, unitsLeft] */
export const DEALS: [string, number, number][] = [['s1_0', 30, 4], ['s3_0', 20, 7], ['s2_0', 25, 7], ['s4_2', 15, 5]];
/* Store s7 is closed in v24 */
export const STX: Record<string, {open: number; h: string; nx: string; scheduled?: boolean; scheduledStartMinutes?: number}> = {s7: {open: 0, h: '9am–6pm', nx: 'Opens 9am tomorrow', scheduled: true, scheduledStartMinutes: 60}};
export const PROMOS: Promo[] = [
  {c: 'GOODIES10', t: '10% off your order', d: '10% off the subtotal. Minimum spend $8.', min: 8, ty: 'pct', v: 10},
  {c: 'FREESHIP', t: 'Free delivery', d: 'Delivery fee waived. Minimum spend $5.', min: 5, ty: 'ship'},
  {c: 'CHEZ15', t: '15% off at Chez Marjorie', d: 'Only valid at Chez Marjorie. Minimum spend $10.', min: 10, ty: 'pct', v: 15, st: 's1'},
];
export const SEED_REVIEWS = [
  {n: 'Marie J.', r: 5, t: 'Fresh and fast, will order again.', d: '2 days ago'},
  {n: 'Jean R.', r: 4, t: 'Good portions, delivery a bit slow.', d: '1 week ago'},
  {n: 'Sophia L.', r: 5, t: 'Friendly service and great prices.', d: '2 weeks ago'},
];
export const STAGES_DELIVERY = ['Order placed', 'Vendor confirmed', 'Preparing order', 'Ready for courier pickup', 'Courier assigned', 'On the way', 'Delivered'];
export const STAGES_PICKUP = ['Order placed', 'Vendor confirmed', 'Preparing order', 'Ready for pickup', 'Picked up'];
