/* Seed data for the Goodies demo provider. */
import type {Category} from './types';

export const CATS: Category[] = [
 {
  "id": "restaurants",
  "name": "Restaurant",
  "emoji": "food",
  "home": true
 },
 {
  "id": "produce",
  "name": "Fresh produce",
  "emoji": "produce",
  "home": true
 },
 {
  "id": "beverages",
  "name": "Beverages",
  "emoji": "beverage",
  "home": true
 },
 {
  "id": "bakery",
  "name": "Bakery & desserts",
  "emoji": "bakery",
  "home": true
 },
 {
  "id": "meat",
  "name": "Meat & seafood",
  "emoji": "meat",
  "home": true
 },
 {
  "id": "groceries",
  "name": "Groceries",
  "emoji": "groceries",
  "home": true
 },
 {
  "id": "haitian",
  "name": "Haitian products",
  "emoji": "haiti",
  "home": true
 },
 {
  "id": "care",
  "name": "Personal care",
  "emoji": "care",
  "home": true
 },
 {
  "id": "drugstore",
  "name": "Drugstore",
  "emoji": "medicine",
  "home": true
 }
];

/* [itemId, percentOff, unitsLeft] */
export const DEALS: [string, number, number][] = [['s1_0', 30, 4], ['s3_0', 20, 7], ['s2_0', 25, 7], ['s4_2', 15, 5]];
export const SEED_REVIEWS = [
  {n: 'Marie J.', r: 5, t: 'Fresh and fast, will order again.', d: '2 days ago'},
  {n: 'Jean R.', r: 4, t: 'Good portions, delivery a bit slow.', d: '1 week ago'},
  {n: 'Sophia L.', r: 5, t: 'Friendly service and great prices.', d: '2 weeks ago'},
];
export const STAGES_DELIVERY = ['Order placed', 'Vendor confirmed', 'Preparing order', 'Ready for courier pickup', 'Courier assigned', 'On the way', 'Delivered'];
export const STAGES_PICKUP = ['Order placed', 'Vendor confirmed', 'Preparing order', 'Ready for pickup', 'Picked up'];
