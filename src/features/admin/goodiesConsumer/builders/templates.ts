/* Starter templates. Copied from Goodies v24 (tplPizza, tplBurger, tplCustom). Items now reference admin library asset IDs instead of v24's name-matching.
   Bun items reference a pair base (burger.bun_sesame -> _top and _bottom). Sauce items reference a base (burger.sauce_ketchup -> layer, icon, cup).
   PROPOSED contract: assetId values must exist in the Wantiss Admin builder library. */
export type TplItem = {name: string; price: number; free: boolean; assetId: string | null; col: string | null; max?: number};
export type TplGroup = {name: string; kind: 'one' | 'many'; req: boolean; min: number; max: number; inc: number; me: number; items: TplItem[]};
export type TplBuilder = {type: 'pizza' | 'burger' | 'custom'; name: string; desc: string; emoji: string; base: number; sizes: {name: string; add: number}[]; groups: TplGroup[]};
export const TEMPLATES: Record<'pizza' | 'burger' | 'custom', TplBuilder> = {
 "pizza": {
  "type": "pizza",
  "name": "Build Your Pizza",
  "desc": "Pick a size, crust, sauce, cheese and toppings.",
  "emoji": "🍕",
  "base": 8.0,
  "sizes": [
   {
    "name": "Small",
    "add": 0.0
   },
   {
    "name": "Medium",
    "add": 3.0
   },
   {
    "name": "Large",
    "add": 6.0
   }
  ],
  "groups": [
   {
    "name": "Crust",
    "kind": "one",
    "req": true,
    "min": 1,
    "max": 1,
    "inc": 0,
    "me": 1,
    "items": [
     {
      "name": "Classic",
      "price": 0.0,
      "free": true,
      "assetId": "pizza.classic_crust",
      "col": null
     },
     {
      "name": "Thin",
      "price": 0.0,
      "free": true,
      "assetId": "pizza.thin_crust",
      "col": null
     },
     {
      "name": "Stuffed crust",
      "price": 2.5,
      "free": false,
      "assetId": "pizza.stuffed_crust",
      "col": null
     }
    ]
   },
   {
    "name": "Sauce",
    "kind": "one",
    "req": true,
    "min": 1,
    "max": 1,
    "inc": 0,
    "me": 1,
    "items": [
     {
      "name": "Tomato",
      "price": 0.0,
      "free": true,
      "assetId": "pizza.tomato_sauce",
      "col": "#C62E18"
     },
     {
      "name": "BBQ",
      "price": 0.5,
      "free": false,
      "assetId": "pizza.bbq_sauce",
      "col": "#7A2E14"
     },
     {
      "name": "White garlic",
      "price": 0.5,
      "free": false,
      "assetId": "pizza.white_garlic_sauce",
      "col": "#EDE2C2"
     }
    ]
   },
   {
    "name": "Cheese",
    "kind": "many",
    "req": true,
    "min": 1,
    "max": 3,
    "inc": 1,
    "me": 2,
    "items": [
     {
      "name": "Mozzarella",
      "price": 2.6,
      "free": false,
      "assetId": "pizza.mozzarella",
      "col": null
     },
     {
      "name": "Cheddar",
      "price": 1.5,
      "free": false,
      "assetId": "pizza.cheddar",
      "col": "#F2A33A"
     },
     {
      "name": "Parmesan",
      "price": 1.5,
      "free": false,
      "assetId": "pizza.parmesan",
      "col": "#F6E3A1"
     }
    ]
   },
   {
    "name": "Meat",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 5,
    "inc": 1,
    "me": 3,
    "items": [
     {
      "name": "Pepperoni",
      "price": 2.6,
      "free": false,
      "assetId": "pizza.pepperoni",
      "col": null
     },
     {
      "name": "Sausage",
      "price": 2.4,
      "free": false,
      "assetId": "pizza.sausage",
      "col": "#8A4A2B"
     },
     {
      "name": "Bacon",
      "price": 2.2,
      "free": false,
      "assetId": "pizza.bacon",
      "col": "#B5382A"
     }
    ]
   },
   {
    "name": "Vegetables",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 8,
    "inc": 2,
    "me": 2,
    "items": [
     {
      "name": "Mushroom",
      "price": 2.2,
      "free": false,
      "assetId": "pizza.mushroom",
      "col": null
     },
     {
      "name": "Olives",
      "price": 1.8,
      "free": false,
      "assetId": "pizza.olives",
      "col": null
     },
     {
      "name": "Peppers",
      "price": 1.8,
      "free": false,
      "assetId": "pizza.peppers",
      "col": null
     },
     {
      "name": "Red onion",
      "price": 1.2,
      "free": false,
      "assetId": "pizza.red_onion",
      "col": null
     },
     {
      "name": "Tomato",
      "price": 1.6,
      "free": false,
      "assetId": "pizza.tomato",
      "col": "#C62E18"
     },
     {
      "name": "Basil",
      "price": 1.2,
      "free": false,
      "assetId": "pizza.basil",
      "col": null
     }
    ]
   }
  ]
 },
 "burger": {
  "type": "burger",
  "name": "Build Your Burger",
  "desc": "Stack it your way: bun, patties, cheese and toppings.",
  "emoji": "🍔",
  "base": 5.0,
  "sizes": [],
  "groups": [
   {
    "name": "Bun",
    "kind": "one",
    "req": true,
    "min": 1,
    "max": 1,
    "inc": 0,
    "me": 1,
    "items": [
     {
      "name": "Sesame",
      "price": 0.0,
      "free": true,
      "assetId": "burger.bun_sesame",
      "col": "#D9953A"
     },
     {
      "name": "Plain",
      "price": 0.0,
      "free": true,
      "assetId": "burger.bun_plain",
      "col": "#E0A24A"
     },
     {
      "name": "Rustic",
      "price": 0.5,
      "free": false,
      "assetId": "burger.bun_rustic",
      "col": "#C98E4A"
     },
     {
      "name": "Whole wheat",
      "price": 0.5,
      "free": false,
      "assetId": "burger.bun_multigrain",
      "col": "#B9824A"
     },
     {
      "name": "Pretzel",
      "price": 0.8,
      "free": false,
      "assetId": "burger.bun_pretzel",
      "col": "#8A4F24"
     },
     {
      "name": "Lettuce wrap",
      "price": 0.0,
      "free": true,
      "assetId": "burger.lettuce_wrap",
      "col": "#6FAE3C"
     }
    ]
   },
   {
    "name": "Patty",
    "kind": "many",
    "req": true,
    "min": 1,
    "max": 3,
    "inc": 1,
    "me": 3,
    "items": [
     {
      "name": "Beef",
      "price": 2.5,
      "free": false,
      "assetId": "burger.patty_beef_grilled",
      "col": "#5A3220"
     },
     {
      "name": "Smash beef",
      "price": 2.8,
      "free": false,
      "assetId": "burger.patty_beef_smash",
      "col": "#4A2A1A"
     },
     {
      "name": "Double beef",
      "price": 4.0,
      "free": false,
      "assetId": "burger.patty_beef_double",
      "col": "#5A3220"
     },
     {
      "name": "Rare beef",
      "price": 2.5,
      "free": false,
      "assetId": "burger.patty_beef_grilled",
      "col": "#7A3A28"
     },
     {
      "name": "Grilled chicken",
      "price": 2.2,
      "free": false,
      "assetId": "burger.patty_chicken_grilled",
      "col": "#C98A4B"
     },
     {
      "name": "Crispy chicken",
      "price": 2.4,
      "free": false,
      "assetId": "burger.patty_chicken_crispy",
      "col": "#D49A4A"
     },
     {
      "name": "Plant-based",
      "price": 2.6,
      "free": false,
      "assetId": "burger.patty_plant_based",
      "col": "#7A4A3A"
     },
     {
      "name": "Veggie",
      "price": 2.0,
      "free": false,
      "assetId": "burger.patty_veggie",
      "col": "#6B7A3A"
     },
     {
      "name": "Black bean",
      "price": 2.0,
      "free": false,
      "assetId": "burger.patty_black_bean",
      "col": "#4A3A2A"
     }
    ]
   },
   {
    "name": "Cheese",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 2,
    "inc": 1,
    "me": 2,
    "items": [
     {
      "name": "Melted cheddar",
      "price": 1.0,
      "free": false,
      "assetId": "burger.cheese_melted_cheddar",
      "col": "#F4B63A"
     },
     {
      "name": "Melted American",
      "price": 1.0,
      "free": false,
      "assetId": "burger.cheese_melted_american",
      "col": "#F7D060"
     },
     {
      "name": "Melted Swiss",
      "price": 1.2,
      "free": false,
      "assetId": "burger.cheese_melted_swiss",
      "col": "#F7DC8A"
     },
     {
      "name": "Melted pepper jack",
      "price": 1.2,
      "free": false,
      "assetId": "burger.cheese_melted_pepper_jack",
      "col": "#F3E3A0"
     },
     {
      "name": "Melted mozzarella",
      "price": 1.2,
      "free": false,
      "assetId": "burger.cheese_melted_mozzarella",
      "col": "#F5EBCB"
     },
     {
      "name": "Melted blue cheese",
      "price": 1.4,
      "free": false,
      "assetId": "burger.cheese_melted_blue",
      "col": "#E8E0C0"
     }
    ]
   },
   {
    "name": "Vegetables",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 6,
    "inc": 3,
    "me": 1,
    "items": [
     {
      "name": "Lettuce",
      "price": 0.5,
      "free": false,
      "assetId": "burger.lettuce",
      "col": null
     },
     {
      "name": "Tomato",
      "price": 0.5,
      "free": false,
      "assetId": "burger.tomato",
      "col": "#C62E18"
     },
     {
      "name": "Red onion",
      "price": 0.4,
      "free": false,
      "assetId": "burger.onion_red",
      "col": null
     },
     {
      "name": "White onion",
      "price": 0.4,
      "free": false,
      "assetId": "burger.onion_white",
      "col": null
     },
     {
      "name": "Pickles",
      "price": 0.4,
      "free": false,
      "assetId": "burger.pickle",
      "col": null
     },
     {
      "name": "Cucumber",
      "price": 0.4,
      "free": false,
      "assetId": "burger.cucumber",
      "col": null
     },
     {
      "name": "Jalapeno",
      "price": 0.5,
      "free": false,
      "assetId": "burger.jalapeno",
      "col": null
     }
    ]
   },
   {
    "name": "Sauces",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 3,
    "inc": 1,
    "me": 1,
    "items": [
     {
      "name": "Ketchup",
      "price": 0.3,
      "free": false,
      "assetId": "burger.sauce_ketchup",
      "col": "#C9301F"
     },
     {
      "name": "Mustard",
      "price": 0.3,
      "free": false,
      "assetId": "burger.sauce_mustard",
      "col": "#E3B520"
     },
     {
      "name": "Mayo",
      "price": 0.3,
      "free": false,
      "assetId": "burger.sauce_mayo",
      "col": "#F3E9CC"
     },
     {
      "name": "Burger sauce",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_burger",
      "col": "#E0894A"
     },
     {
      "name": "BBQ",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_bbq",
      "col": "#7A2E14"
     },
     {
      "name": "Chipotle",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_chipotle",
      "col": "#9A4A24"
     },
     {
      "name": "Garlic aioli",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_garlic_aioli",
      "col": "#F0E6C8"
     },
     {
      "name": "Ranch",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_ranch",
      "col": "#F4F0E0"
     },
     {
      "name": "Honey mustard",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_honey_mustard",
      "col": "#E0A82A"
     },
     {
      "name": "Hot sauce",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_hot",
      "col": "#C8321E"
     },
     {
      "name": "Sriracha",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_sriracha",
      "col": "#D8341E"
     },
     {
      "name": "Sweet chili",
      "price": 0.4,
      "free": false,
      "assetId": "burger.sauce_sweet_chili",
      "col": "#D8481E"
     }
    ]
   },
   {
    "name": "Extras",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 4,
    "inc": 0,
    "me": 1,
    "items": [
     {
      "name": "Bacon",
      "price": 1.8,
      "free": false,
      "assetId": "burger.bacon",
      "col": "#B5382A"
     },
     {
      "name": "Fried egg",
      "price": 1.2,
      "free": false,
      "assetId": "burger.egg_fried",
      "col": null
     },
     {
      "name": "Avocado",
      "price": 1.5,
      "free": false,
      "assetId": "burger.avocado",
      "col": null
     },
     {
      "name": "Mushrooms",
      "price": 1.0,
      "free": false,
      "assetId": "burger.mushrooms",
      "col": null
     },
     {
      "name": "Caramelized onions",
      "price": 0.9,
      "free": false,
      "assetId": "burger.onions_caramelized",
      "col": null
     },
     {
      "name": "Pineapple",
      "price": 0.6,
      "free": false,
      "assetId": "burger.pineapple",
      "col": null
     }
    ]
   },
   {
    "name": "Peppers",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 3,
    "inc": 3,
    "me": 1,
    "items": [
     {
      "name": "Green pepper",
      "price": 0.0,
      "free": true,
      "assetId": "burger.pepper_green",
      "col": null
     },
     {
      "name": "Yellow pepper",
      "price": 0.0,
      "free": true,
      "assetId": "burger.pepper_yellow",
      "col": null
     },
     {
      "name": "Orange pepper",
      "price": 0.0,
      "free": true,
      "assetId": "burger.pepper_orange",
      "col": null
     },
     {
      "name": "Red pepper",
      "price": 0.0,
      "free": true,
      "assetId": "burger.pepper_red",
      "col": null
     },
     {
      "name": "Extra hot pepper",
      "price": 0.0,
      "free": true,
      "assetId": "burger.pepper_extra_hot",
      "col": null
     }
    ]
   },
   {
    "name": "Seasoning",
    "kind": "many",
    "req": false,
    "min": 0,
    "max": 4,
    "inc": 4,
    "me": 1,
    "items": [
     {
      "name": "Salt",
      "price": 0.0,
      "free": true,
      "assetId": "burger.spice_salt",
      "col": null
     },
     {
      "name": "Black pepper",
      "price": 0.0,
      "free": true,
      "assetId": "burger.spice_black_pepper",
      "col": null
     },
     {
      "name": "Chili flakes",
      "price": 0.0,
      "free": true,
      "assetId": "burger.spice_chili_flakes",
      "col": null
     },
     {
      "name": "Herbs",
      "price": 0.0,
      "free": true,
      "assetId": "burger.spice_herbs",
      "col": null
     }
    ]
   }
  ]
 },
 "custom": {
  "type": "custom",
  "name": "Build Your Own",
  "desc": "Choose what goes in.",
  "emoji": "🍽️",
  "base": 4.0,
  "sizes": [],
  "groups": [
   {
    "name": "Choices",
    "kind": "many",
    "req": true,
    "min": 1,
    "max": 4,
    "inc": 1,
    "me": 1,
    "items": [
     {
      "name": "Option one",
      "price": 1.0,
      "free": false,
      "assetId": null,
      "col": "#D9A441"
     },
     {
      "name": "Option two",
      "price": 1.5,
      "free": false,
      "assetId": null,
      "col": "#6B9B3A"
     }
    ]
   }
  ]
 }
};
