// VibeCart — mock commerce store (in-memory + JSON persistence)
// Amazon-scale catalog: 8 departments, brands, ratings, reviews, stock,
// inventory, carts, discounts, orders, user context, learned preferences.
// User data (orders, reviews, learned prefs) persists to data/state.json.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CATALOG = [
  // ---------- GROCERY & GOURMET ----------
  { id: "gr01", name: "Atlantic Salmon Fillet 300g", brand: "SeaFresh", category: "grocery", dept: "Grocery & Gourmet", price: 549, carbs: 0, protein: 34, stock: 12, tags: ["keto", "high-protein", "seafood"], rating: 4.6, reviews: 2310, desc: "Freshly cut Norwegian salmon, flash-frozen for freshness" },
  { id: "gr02", name: "Zucchini Noodles (Zoodles) 400g", brand: "GreenCrate", category: "grocery", dept: "Grocery & Gourmet", price: 149, carbs: 6, protein: 3, stock: 30, tags: ["keto", "low-carb", "vegan"], rating: 4.3, reviews: 890, desc: "Spiralized fresh zucchini, ready to sauté" },
  { id: "gr03", name: "Avocado Pack (3 pcs)", brand: "TropiCo", category: "grocery", dept: "Grocery & Gourmet", price: 199, carbs: 12, protein: 6, stock: 25, tags: ["keto", "healthy-fats", "vegan"], rating: 4.5, reviews: 1520, desc: "Creamy Hass avocados, perfectly ripe" },
  { id: "gr04", name: "Grass-fed Butter 500g", brand: "PureVeda", category: "grocery", dept: "Grocery & Gourmet", price: 299, carbs: 1, protein: 4, stock: 18, tags: ["keto", "dairy"], rating: 4.4, reviews: 640, desc: "A2 grass-fed cow butter, rich and golden" },
  { id: "gr05", name: "Extra Virgin Olive Oil 1L", brand: "Olivara", category: "grocery", dept: "Grocery & Gourmet", price: 899, carbs: 0, protein: 0, stock: 40, tags: ["keto", "cooking", "vegan"], rating: 4.7, reviews: 3100, desc: "Cold-pressed Spanish EVOO, robust flavour" },
  { id: "gr06", name: "Chicken Breast 500g", brand: "FarmCluck", category: "grocery", dept: "Grocery & Gourmet", price: 329, carbs: 0, protein: 52, stock: 22, tags: ["keto", "high-protein", "meat"], rating: 4.5, reviews: 1980, desc: "Antibiotic-free boneless chicken breast" },
  { id: "gr07", name: "Basmati Rice 5kg", brand: "Daawat Gold", category: "grocery", dept: "Grocery & Gourmet", price: 649, carbs: 380, protein: 40, stock: 15, tags: ["staple", "rice"], rating: 4.4, reviews: 5400, desc: "Aged long-grain basmati, extra fluffy" },
  { id: "gr08", name: "Almond Flour 1kg", brand: "NutriNuts", category: "grocery", dept: "Grocery & Gourmet", price: 749, carbs: 21, protein: 60, stock: 9, tags: ["keto", "baking", "gluten-free"], rating: 4.6, reviews: 720, desc: "Fine-ground blanched almond flour" },
  { id: "gr09", name: "Cheddar Cheese 250g", brand: "CheeseCraft", category: "grocery", dept: "Grocery & Gourmet", price: 279, carbs: 3, protein: 62, stock: 20, tags: ["keto", "dairy", "high-protein"], rating: 4.5, reviews: 1130, desc: "Aged 12 months, sharp cheddar block" },
  { id: "gr10", name: "Baby Spinach 250g", brand: "GreenCrate", category: "grocery", dept: "Grocery & Gourmet", price: 89, carbs: 4, protein: 7, stock: 35, tags: ["keto", "greens", "vegan"], rating: 4.2, reviews: 560, desc: "Triple-washed tender baby spinach" },
  { id: "gr11", name: "Dark Chocolate 85% 100g", brand: "CocoaLuxe", category: "grocery", dept: "Grocery & Gourmet", price: 199, carbs: 19, protein: 10, stock: 28, tags: ["keto", "snack", "dessert"], rating: 4.3, reviews: 2010, desc: "Single-origin Ecuadorian dark chocolate" },
  { id: "gr12", name: "Free-range Eggs (12)", brand: "FarmCluck", category: "grocery", dept: "Grocery & Gourmet", price: 129, carbs: 2, protein: 78, stock: 50, tags: ["keto", "high-protein", "breakfast"], rating: 4.8, reviews: 8700, desc: "Free-range brown eggs, farm fresh" },
  { id: "gr13", name: "Cold-pressed Coconut Oil 500ml", brand: "TropiCo", category: "grocery", dept: "Grocery & Gourmet", price: 449, carbs: 0, protein: 0, stock: 26, tags: ["keto", "cooking", "vegan"], rating: 4.4, reviews: 980, desc: "Virgin coconut oil for cooking and coffee" },
  { id: "gr14", name: "Quinoa 1kg", brand: "NutriNuts", category: "grocery", dept: "Grocery & Gourmet", price: 599, carbs: 120, protein: 44, stock: 17, tags: ["vegan", "high-protein", "superfood"], rating: 4.3, reviews: 1340, desc: "Organic white quinoa, pre-washed" },
  { id: "gr15", name: "Whey Protein Isolate 1kg — Chocolate", brand: "MuscleFuel", category: "grocery", dept: "Grocery & Gourmet", price: 2499, carbs: 12, protein: 800, stock: 14, tags: ["high-protein", "fitness"], rating: 4.5, reviews: 4200, desc: "27g protein per scoop, zero added sugar" },
  { id: "gr16", name: "Organic Green Tea 100 bags", brand: "Leaf&Co", category: "grocery", dept: "Grocery & Gourmet", price: 349, carbs: 0, protein: 0, stock: 33, tags: ["vegan", "wellness"], rating: 4.2, reviews: 1750, desc: "Smooth, whole-leaf green tea bags" },
  { id: "gr17", name: "Peanut Butter Creamy 1kg", brand: "NutriNuts", category: "grocery", dept: "Grocery & Gourmet", price: 499, carbs: 60, protein: 100, stock: 21, tags: ["high-protein", "vegan"], rating: 4.4, reviews: 2650, desc: "Slow-roasted peanuts, no palm oil" },
  { id: "gr18", name: "Sourdough Bread Loaf 500g", brand: "Baker's Yard", category: "grocery", dept: "Grocery & Gourmet", price: 220, carbs: 210, protein: 30, stock: 10, tags: ["bakery", "breakfast"], rating: 4.6, reviews: 880, desc: "48-hour fermented artisan sourdough" },
  { id: "gr19", name: "Greek Yogurt 1kg", brand: "PureVeda", category: "grocery", dept: "Grocery & Gourmet", price: 289, carbs: 40, protein: 100, stock: 19, tags: ["high-protein", "dairy"], rating: 4.5, reviews: 1500, desc: "Strained thick Greek yogurt, 10% fat" },
  { id: "gr20", name: "Himalayan Pink Salt 1kg", brand: "Spice Route", category: "grocery", dept: "Grocery & Gourmet", price: 149, carbs: 0, protein: 0, stock: 44, tags: ["cooking"], rating: 4.4, reviews: 3300, desc: "Mineral-rich pink salt, coarse grind" },
  { id: "gr21", name: "Mixed Nuts & Berries 500g", brand: "NutriNuts", category: "grocery", dept: "Grocery & Gourmet", price: 649, carbs: 45, protein: 60, stock: 23, tags: ["keto", "snack"], rating: 4.5, reviews: 1210, desc: "Almonds, walnuts, pecans, cranberries" },
  { id: "gr22", name: "Instant Ramen — Spicy Miso (5 pack)", brand: "SlurpHouse", category: "grocery", dept: "Grocery & Gourmet", price: 399, carbs: 250, protein: 40, stock: 31, tags: ["snack", "comfort-food"], rating: 4.2, reviews: 2900, desc: "Restaurant-style ramen, 4 min cook" },
  { id: "gr23", name: "Cold Brew Coffee Concentrate 1L", brand: "Brewhaus", category: "grocery", dept: "Grocery & Gourmet", price: 799, carbs: 6, protein: 4, stock: 12, tags: ["coffee", "keto"], rating: 4.6, reviews: 1440, desc: "24-hour steeped, 8x strength concentrate" },
  { id: "gr24", name: "Paneer 400g", brand: "PureVeda", category: "grocery", dept: "Grocery & Gourmet", price: 219, carbs: 10, protein: 76, stock: 27, tags: ["high-protein", "dairy", "indian"], rating: 4.3, reviews: 1620, desc: "Soft fresh cottage cheese blocks" },
  { id: "gr25", name: "Tri-Colour Bell Peppers (6 pcs)", brand: "GreenCrate", category: "grocery", dept: "Grocery & Gourmet", price: 189, carbs: 18, protein: 6, stock: 29, tags: ["keto", "vegetables"], rating: 4.1, reviews: 430, desc: "Crunchy red, yellow, green peppers" },

  // ---------- ELECTRONICS ----------
  { id: "el01", name: "Noise Buds VS104 Pro TWS Earbuds", brand: "Noise", category: "electronics", dept: "Electronics", price: 1499, stock: 45, tags: ["audio", "trending", "budget"], rating: 4.2, reviews: 18400, desc: "50h playtime, quad mic ENC, low-latency gaming mode" },
  { id: "el02", name: "boAt Airdopes 311 Pro", brand: "boAt", category: "electronics", dept: "Electronics", price: 1099, stock: 60, tags: ["audio", "budget"], rating: 4.1, reviews: 22300, desc: "40h playback, ENx tech, beast mode" },
  { id: "el03", name: "Sony WH-CH720N Noise Cancelling Headphones", brand: "Sony", category: "electronics", dept: "Electronics", price: 8990, stock: 8, tags: ["audio", "premium", "anc"], rating: 4.5, reviews: 5600, desc: "Lightweight ANC headphones, 35h battery" },
  { id: "el04", name: "JBL Flip 6 Bluetooth Speaker", brand: "JBL", category: "electronics", dept: "Electronics", price: 9999, stock: 11, tags: ["audio", "premium", "party"], rating: 4.6, reviews: 7800, desc: "IP67 waterproof, 12h playtime, bold sound" },
  { id: "el05", name: "Redmi Note 14 5G (8GB/128GB)", brand: "Xiaomi", category: "electronics", dept: "Electronics", price: 16999, stock: 20, tags: ["smartphone", "trending"], rating: 4.3, reviews: 9100, desc: "108MP camera, 5110mAh battery, AMOLED 120Hz" },
  { id: "el06", name: "Nothing Phone (3a) 5G", brand: "Nothing", category: "electronics", dept: "Electronics", price: 24999, stock: 9, tags: ["smartphone", "premium"], rating: 4.4, reviews: 3200, desc: "Glyph interface, clean Nothing OS, 50MP dual cam" },
  { id: "el07", name: "Apple AirPods (3rd Gen) with MagSafe", brand: "Apple", category: "electronics", dept: "Electronics", price: 16900, stock: 6, tags: ["audio", "premium", "apple"], rating: 4.7, reviews: 12700, desc: "Spatial audio, sweat resistant, 30h with case" },
  { id: "el08", name: "Samsung Galaxy Watch7 44mm", brand: "Samsung", category: "electronics", dept: "Electronics", price: 29999, stock: 5, tags: ["wearable", "premium", "fitness"], rating: 4.4, reviews: 2100, desc: "BioActive sensor, sleep coaching, dual GPS" },
  { id: "el09", name: "Mi Smart Band 9", brand: "Xiaomi", category: "electronics", dept: "Electronics", price: 2999, stock: 40, tags: ["wearable", "fitness", "budget"], rating: 4.2, reviews: 15600, desc: "21-day battery, 150+ sports modes, AMOLED" },
  { id: "el10", name: "Amazon Basics 65W GaN Fast Charger", brand: "Amazon Basics", category: "electronics", dept: "Electronics", price: 1499, stock: 55, tags: ["accessory", "budget"], rating: 4.3, reviews: 4400, desc: "Dual USB-C PD 3.0, compact travel charger" },
  { id: "el11", name: "Logitech MX Master 3S Wireless Mouse", brand: "Logitech", category: "electronics", dept: "Electronics", price: 9950, stock: 15, tags: ["accessory", "premium", "work"], rating: 4.7, reviews: 8900, desc: "8K DPI sensor, silent clicks, USB-C" },
  { id: "el12", name: "Keychron K2 Wireless Mechanical Keyboard", brand: "Keychron", category: "electronics", dept: "Electronics", price: 7299, stock: 7, tags: ["accessory", "work", "premium"], rating: 4.6, reviews: 2300, desc: "Hot-swappable brown switches, 75% layout" },
  { id: "el13", name: "SanDisk Extreme 1TB Portable SSD", brand: "SanDisk", category: "electronics", dept: "Electronics", price: 9499, stock: 18, tags: ["storage", "work"], rating: 4.6, reviews: 6700, desc: "1050MB/s read, IP55 rugged, USB 3.2" },
  { id: "el14", name: "Philips HD9218 Air Fryer 4.1L", brand: "Philips", category: "electronics", dept: "Electronics", price: 8499, stock: 13, tags: ["kitchen", "trending", "keto"], rating: 4.4, reviews: 10300, desc: "Rapid Air tech, 90% less oil, dishwasher safe" },
  { id: "el15", name: "Dyson V8 Absolute Cordless Vacuum", brand: "Dyson", category: "electronics", dept: "Electronics", price: 32900, stock: 3, tags: ["home", "premium"], rating: 4.5, reviews: 1800, desc: "40min runtime, whole-machine filtration" },
  { id: "el16", name: "Fire TV Stick 4K Max (2nd Gen)", brand: "Amazon", category: "electronics", dept: "Electronics", price: 6499, stock: 34, tags: ["streaming", "trending"], rating: 4.4, reviews: 28900, desc: "Wi-Fi 6, Dolby Vision, Alexa voice remote" },
  { id: "el17", name: "Zebronics Zeb-Power 20000mAh Power Bank", brand: "Zebronics", category: "electronics", dept: "Electronics", price: 1799, stock: 48, tags: ["accessory", "budget"], rating: 4.0, reviews: 5100, desc: "22.5W fast charge, dual USB-A + USB-C" },
  { id: "el18", name: "HP Pavilion 15 (i5 13th Gen, 16GB)", brand: "HP", category: "electronics", dept: "Electronics", price: 58990, stock: 4, tags: ["laptop", "work", "premium"], rating: 4.3, reviews: 1200, desc: "16GB RAM, 512GB SSD, FHD IPS anti-glare" },
  { id: "el19", name: "Sony Alpha ZV-E10 Vlogging Camera", brand: "Sony", category: "electronics", dept: "Electronics", price: 67990, stock: 2, tags: ["camera", "premium", "creator"], rating: 4.6, reviews: 640, desc: "APS-C 24MP, 4K video, product showcase AF" },
  { id: "el20", name: "TP-Link Archer AX55 WiFi 6 Router", brand: "TP-Link", category: "electronics", dept: "Electronics", price: 5999, stock: 16, tags: ["network", "work"], rating: 4.4, reviews: 5300, desc: "AX3000 speeds, OFDMA, OneMesh support" },

  // ---------- HOME & KITCHEN ----------
  { id: "hk01", name: "Milton Thermosteel Flip Lid Flask 1L", brand: "Milton", category: "home", dept: "Home & Kitchen", price: 1149, stock: 36, tags: ["kitchen", "travel"], rating: 4.4, reviews: 11400, desc: "24h hot/cold, 18/8 stainless steel" },
  { id: "hk02", name: "Prestige Omega Granite Non-stick Set (4 pc)", brand: "Prestige", category: "home", dept: "Home & Kitchen", price: 3299, stock: 14, tags: ["kitchen", "cooking"], rating: 4.3, reviews: 3600, desc: "Induction base, PFOA-free granite coating" },
  { id: "hk03", name: "Solimo Microfibre Bed Sheets (Queen, Grey)", brand: "Solimo", category: "home", dept: "Home & Kitchen", price: 899, stock: 25, tags: ["bedding", "budget"], rating: 4.1, reviews: 8200, desc: "Brushed microfibre, wrinkle resistant" },
  { id: "hk04", name: "Wakefit Orthopaedic Memory Foam Pillow (2 pc)", brand: "Wakefit", category: "home", dept: "Home & Kitchen", price: 1999, stock: 19, tags: ["bedding", "wellness"], rating: 4.3, reviews: 9400, desc: "Medium-firm support, washable cover" },
  { id: "hk05", name: " borosil Vision Glass Storage Set (6 pc)", brand: "Borosil", category: "home", dept: "Home & Kitchen", price: 1245, stock: 22, tags: ["kitchen", "storage"], rating: 4.2, reviews: 4700, desc: "Microwave & oven safe glass containers" },
  { id: "hk06", name: "Butterfly Spectra 750W Mixer Grinder", brand: "Butterfly", category: "home", dept: "Home & Kitchen", price: 2499, stock: 17, tags: ["kitchen", "cooking"], rating: 4.1, reviews: 6900, desc: "3 stainless jars, 3-speed control" },
  { id: "hk07", name: "Amazon Brand - Solimo LED Bulb 9W (4 pack)", brand: "Solimo", category: "home", dept: "Home & Kitchen", price: 399, stock: 65, tags: ["lighting", "budget"], rating: 4.2, reviews: 19300, desc: "B22 warm white, 810 lumens each" },
  { id: "hk08", name: "Home Centre Ceramic Vase Set (3 pc)", brand: "Home Centre", category: "home", dept: "Home & Kitchen", price: 1699, stock: 11, tags: ["decor", "gifting"], rating: 4.0, reviews: 380, desc: "Minimalist matte glaze, modern shapes" },

  // ---------- BEAUTY & PERSONAL CARE ----------
  { id: "bt01", name: "The Ordinary Niacinamide 10% + Zinc 30ml", brand: "The Ordinary", category: "beauty", dept: "Beauty & Personal Care", price: 950, stock: 28, tags: ["skincare", "trending", "vegan"], rating: 4.5, reviews: 8600, desc: "Blemish control serum, oily skin favourite" },
  { id: "bt02", name: "Cetaphil Gentle Skin Cleanser 250ml", brand: "Cetaphil", category: "beauty", dept: "Beauty & Personal Care", price: 546, stock: 42, tags: ["skincare", "sensitive"], rating: 4.6, reviews: 15200, desc: "Soap-free, dermatologist recommended" },
  { id: "bt03", name: "Minimalist Sunscreen SPF 50 PA++++ 50g", brand: "Minimalist", category: "beauty", dept: "Beauty & Personal Care", price: 399, stock: 37, tags: ["skincare", "summer"], rating: 4.5, reviews: 10800, desc: "No white cast, lightweight gel formula" },
  { id: "bt04", name: "Beardo Beard & Hair Growth Oil 100ml", brand: "Beardo", category: "beauty", dept: "Beauty & Personal Care", price: 599, stock: 24, tags: ["grooming"], rating: 4.1, reviews: 3300, desc: "Redensyl + argan oil blend" },
  { id: "bt05", name: "Philips BT1232 Trimmer", brand: "Philips", category: "beauty", dept: "Beauty & Personal Care", price: 1149, stock: 31, tags: ["grooming", "budget"], rating: 4.3, reviews: 12700, desc: "DuraPower battery, 60min runtime, 10 length settings" },
  { id: "bt06", name: "Lakme 9to5 Primer + Matte Lipstick", brand: "Lakme", category: "beauty", dept: "Beauty & Personal Care", price: 549, stock: 33, tags: ["makeup", "gifting"], rating: 4.3, reviews: 9200, desc: "Transfer-proof matte, 12h wear" },
  { id: "bt07", name: "Mamaearth Vitamin C Face Wash 100ml", brand: "Mamaearth", category: "beauty", dept: "Beauty & Personal Care", price: 299, stock: 39, tags: ["skincare", "vegan"], rating: 4.2, reviews: 11600, desc: "Turmeric + vitamin C brightening foam" },

  // ---------- FASHION ----------
  { id: "fa01", name: "Peter England Slim Fit Formal Shirt (Blue)", brand: "Peter England", category: "fashion", dept: "Fashion", price: 1449, stock: 20, sizes: ["S", "M", "L", "XL"], tags: ["formal", "work"], rating: 4.2, reviews: 2100, desc: "Easy-care cotton, slim fit" },
  { id: "fa02", name: "Levi's 511 Slim Fit Jeans", brand: "Levi's", category: "fashion", dept: "Fashion", price: 2999, stock: 15, sizes: ["28", "30", "32", "34", "36"], tags: ["casual", "trending"], rating: 4.5, reviews: 5600, desc: "Classic 511 slim, stretch denim" },
  { id: "fa03", name: "Nike Revolution 7 Running Shoes", brand: "Nike", category: "fashion", dept: "Fashion", price: 3695, stock: 26, sizes: ["7", "8", "9", "10", "11"], tags: ["fitness", "casual"], rating: 4.4, reviews: 7300, desc: "Soft foam midsole, breathable mesh" },
  { id: "fa04", name: "US Polo Assn. Cotton Polo T-Shirt", brand: "US Polo", category: "fashion", dept: "Fashion", price: 1299, stock: 30, sizes: ["S", "M", "L", "XL"], tags: ["casual"], rating: 4.3, reviews: 4100, desc: "Pique cotton, classic collar" },
  { id: "fa05", name: "Wildhorn Black Leather Wallet", brand: "Wildhorn", category: "fashion", dept: "Fashion", price: 599, stock: 44, tags: ["accessory", "gifting", "budget"], rating: 4.2, reviews: 8800, desc: "Genuine leather, 8 card slots, RFID" },
  { id: "fa06", name: "Fastrack Analog Watch — Minimalist", brand: "Fastrack", category: "fashion", dept: "Fashion", price: 2295, stock: 18, tags: ["accessory", "gifting"], rating: 4.3, reviews: 3100, desc: "Stainless steel strap, 30m water resistance" },

  // ---------- SPORTS & FITNESS ----------
  { id: "sp01", name: "Boldfit Resistance Bands Set (5 levels)", brand: "Boldfit", category: "sports", dept: "Sports & Fitness", price: 549, stock: 41, tags: ["fitness", "budget"], rating: 4.3, reviews: 9900, desc: "Latex loop bands with carry pouch" },
  { id: "sp02", name: "Killing It Adjustable Dumbbell 20kg Pair", brand: "Kore", category: "sports", dept: "Sports & Fitness", price: 3499, stock: 8, tags: ["fitness", "home-gym"], rating: 4.2, reviews: 5400, desc: "Anti-slip rods, PVC coated plates" },
  { id: "sp03", name: "Nivia Panther Football Size 5", brand: "Nivia", category: "sports", dept: "Sports & Fitness", price: 899, stock: 23, tags: ["outdoor"], rating: 4.3, reviews: 2700, desc: "Machine-stitched TPU cover" },
  { id: "sp04", name: "Yoga Design Pro TPE Mat 6mm", brand: "Boldfit", category: "sports", dept: "Sports & Fitness", price: 999, stock: 29, tags: ["fitness", "wellness"], rating: 4.4, reviews: 3600, desc: "Non-slip TPE, alignment lines" },
  { id: "sp05", name: "Cosco Excel Tennis Racket", brand: "Cosco", category: "sports", dept: "Sports & Fitness", price: 1899, stock: 12, tags: ["outdoor"], rating: 4.1, reviews: 840, desc: "Aluminium head, pre-strung with cover" },

  // ---------- BOOKS ----------
  { id: "bk01", name: "Atomic Habits — James Clear (Paperback)", brand: "Penguin", category: "books", dept: "Books", price: 449, stock: 50, tags: ["self-help", "bestseller"], rating: 4.7, reviews: 96000, desc: "Tiny changes, remarkable results" },
  { id: "bk02", name: "The Psychology of Money — Morgan Housel", brand: "Jaico", category: "books", dept: "Books", price: 299, stock: 46, tags: ["finance", "bestseller"], rating: 4.6, reviews: 64000, desc: "Timeless lessons on wealth and greed" },
  { id: "bk03", name: "Clean Code — Robert C. Martin", brand: "Pearson", category: "books", dept: "Books", price: 649, stock: 21, tags: ["tech", "work"], rating: 4.5, reviews: 12000, desc: "A handbook of agile software craftsmanship" },
  { id: "bk04", name: "Designing Data-Intensive Applications", brand: "O'Reilly", category: "books", dept: "Books", price: 899, stock: 14, tags: ["tech", "work"], rating: 4.8, reviews: 18000, desc: "The big ideas behind reliable, scalable systems" },
  { id: "bk05", name: "Ikigai — Hector Garcia (Hardcover)", brand: "Penguin", category: "books", dept: "Books", price: 399, stock: 39, tags: ["wellness", "gifting"], rating: 4.4, reviews: 41000, desc: "The Japanese secret to a long and happy life" },

  // ---------- TOYS & GAMES ----------
  { id: "ty01", name: "Lego Classic Creative Bricks 484 pcs", brand: "LEGO", category: "toys", dept: "Toys & Games", price: 2599, stock: 16, tags: ["kids", "gifting", "creative"], rating: 4.8, reviews: 7800, desc: "Open-ended building set, ages 4+" },
  { id: "ty02", name: "Catan Board Game 5th Edition", brand: "Catan Studio", category: "toys", dept: "Toys & Games", price: 3299, stock: 9, tags: ["family", "strategy"], rating: 4.7, reviews: 5200, desc: "Trade, build, settle — 3-4 players" },
  { id: "ty03", name: "Funskool Rubik's Cube 3x3", brand: "Funskool", category: "toys", dept: "Toys & Games", price: 349, stock: 34, tags: ["puzzle", "budget"], rating: 4.3, reviews: 6100, desc: "Smooth turning original cube" },
  { id: "ty04", name: "Hot Wheels 20-Car Gift Pack", brand: "Hot Wheels", category: "toys", dept: "Toys & Games", price: 799, stock: 27, tags: ["kids", "gifting"], rating: 4.5, reviews: 11300, desc: "20 die-cast vehicles in one pack" },

  // ---------- GROCERY MEAT & SEAFOOD (extra) ----------
  { id: "mt01", name: "Prawns Cleaned 250g", brand: "SeaFresh", category: "grocery", dept: "Grocery & Gourmet", price: 449, carbs: 0, protein: 46, stock: 13, tags: ["keto", "high-protein", "seafood"], rating: 4.3, reviews: 760, desc: "Deveined & deshelled, IQF frozen" },
  { id: "mt02", name: "Mutton Curry Cut 500g", brand: "FarmCluck", category: "grocery", dept: "Grocery & Gourmet", price: 749, carbs: 0, protein: 90, stock: 8, tags: ["high-protein", "meat", "indian"], rating: 4.2, reviews: 1200, desc: "Fresh halal-cut, bone-in pieces" },
  { id: "mt03", name: "Pomfret Fish Whole 400g", brand: "SeaFresh", category: "grocery", dept: "Grocery & Gourmet", price: 599, carbs: 0, protein: 52, stock: 10, tags: ["keto", "seafood"], rating: 4.4, reviews: 540, desc: "Cleaned & gutted silver pomfret" }
];

const DISCOUNTS = {
  KETO10: { type: "percent", value: 10, minTotal: 500, desc: "10% off keto orders above ₹500" },
  VIBE50: { type: "flat", value: 50, minTotal: 300, desc: "₹50 off above ₹300" },
  FIRST100: { type: "flat", value: 100, minTotal: 600, desc: "₹100 off first order above ₹600" },
  BIGSAVE15: { type: "percent", value: 15, minTotal: 2000, desc: "15% off orders above ₹2000" },
  FREESHIP: { type: "flat", value: 40, minTotal: 199, desc: "₹40 delivery credit above ₹199" }
};

const USER = {
  id: "u1",
  name: "Rizabul",
  prefs: { diet: "keto", budget: 800, allergies: [] },
  history: ["gr06", "gr12", "gr05"], // seeded sample history
  offers: ["KETO10", "VIBE50", "FIRST100"],
  learned: [] // facts the agent learns mid-conversation
};

const db = {
  carts: new Map(),
  orders: new Map(),
  reviews: new Map(),
  orderSeq: 1000
};

// ---- Persistence: user data survives restarts ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "../data/state.json");

function persist() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      user: USER,
      profiles: PROFILES,
      orders: [...db.orders.values()],
      reviews: [...db.reviews.entries()],
      orderSeq: db.orderSeq
    }, null, 2));
  } catch (e) { console.warn("persist failed:", e.message); }
}

function restore() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (s.user) Object.assign(USER, s.user);
    if (s.profiles) Object.assign(PROFILES, s.profiles);
    if (s.orders) s.orders.forEach(o => db.orders.set(o.id, o));
    if (s.reviews) s.reviews.forEach(([k, v]) => db.reviews.set(k, v));
    if (s.orderSeq) db.orderSeq = s.orderSeq;
    console.log(`[store] restored user data: ${db.orders.size} orders, ${db.reviews.size} reviews, prefs: ${JSON.stringify(USER.prefs)}`);
  } catch (e) { console.warn("restore failed:", e.message); }
}
restore();

// ---- Per-user profiles (Google-signed-in users; guests fall back to USER) ----
const PROFILES = {}; // userId -> {id, name, prefs, history, offers, learned}

function profileFor(userId) {
  if (!userId) return USER;
  if (!PROFILES[userId]) {
    PROFILES[userId] = {
      id: userId,
      name: "Shopper",
      prefs: { diet: "", budget: 0, allergies: [] },
      history: [],
      offers: USER.offers,
      learned: []
    };
    persist();
  }
  return PROFILES[userId];
}

export function setUserProfile(userId, patch) {
  const prof = profileFor(userId);
  Object.assign(prof, patch);
  persist();
  return prof;
}
export function getProfile(userId) { return userId ? profileFor(userId) : USER; }

function newCart() {
  const cart = { id: "c" + Date.now(), items: [], discount: null, totals: { subtotal: 0, discount: 0, total: 0 } };
  db.carts.set(cart.id, cart);
  return cart;
}

function recalcTotals(cart) {
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  let discount = 0;
  if (cart.discount) {
    const d = DISCOUNTS[cart.discount];
    if (d && subtotal >= d.minTotal) {
      discount = d.type === "percent" ? Math.round(subtotal * d.value / 100) : d.value;
    }
  }
  cart.totals = { subtotal, discount, total: subtotal - discount };
  return cart;
}

// ---- Search: tokenized, multi-field, relevance-ranked (Amazon-like) ----
function scoreProduct(p, tokens) {
  let score = 0;
  const name = p.name.toLowerCase();
  const brand = (p.brand || "").toLowerCase();
  const desc = (p.desc || "").toLowerCase();
  const tags = (p.tags || []).join(" ").toLowerCase();
  const dept = (p.dept || "").toLowerCase();

  for (const t of tokens) {
    if (name.includes(t)) score += 10;
    if (brand.includes(t)) score += 6;
    if (tags.includes(t)) score += 5;
    if (dept.includes(t)) score += 4;
    if (p.category.includes(t)) score += 4;
    if (desc.includes(t)) score += 2;
  }
  // popularity tiebreaker, weighted by how much actually matched (≤9 raw)
  const matched = Math.min(score, 100);
  score += matched * ((p.rating || 4) / 5 + Math.min((p.reviews || 0) / 10000, 1));
  // personalization boost: previously purchased categories & products rank higher
  const hist = purchaseAffinity();
  if (hist.categories.has(p.category)) score += 3;
  if (hist.products.has(p.id)) score += 6;
  return score;
}

// purchase affinity from ACTUAL stored orders
function purchaseAffinity() {
  const categories = new Set();
  const products = new Set();
  for (const o of db.orders.values()) {
    if (o.status === "pending_payment") continue;
    for (const i of o.items) {
      products.add(i.productId);
      const p = CATALOG.find(c => c.id === i.productId);
      if (p) categories.add(p.category);
    }
  }
  return { categories, products };
}

export const store = {
  CATALOG,
  DISCOUNTS,
  USER,

  getUserContext(userId) {
    const prof = profileFor(userId);
    // Real personalization: derived from ACTUAL stored orders (fall back to seeded history)
    const realOrders = [...db.orders.values()].filter(o => o.status !== "pending_payment");
    const purchasedIds = [...new Set(realOrders.flatMap(o => o.items.map(i => i.productId)))];
    const history = purchasedIds.length ? purchasedIds.slice(-6) : prof.history;
    const depts = {};
    realOrders.flatMap(o => o.items).forEach(i => {
      const p = CATALOG.find(c => c.id === i.productId);
      if (p) depts[p.category] = (depts[p.category] || 0) + i.qty;
    });
    const topCategories = Object.entries(depts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
    return {
      user: { ...prof, history },
      orderCount: realOrders.length,
      lastOrderId: realOrders[realOrders.length - 1]?.id,
      favoriteCategories: topCategories,
      activeOffers: prof.offers.map(c => ({ code: c, ...DISCOUNTS[c] }))
    };
  },

  updatePreferences({ user: userId, diet = "", budget = 0, allergies = "", likes = "", dislikes = "", note = "" }) {
    const prof = profileFor(userId);
    if (diet) prof.prefs.diet = diet;
    if (budget) prof.prefs.budget = Number(budget);
    if (allergies) {
      const list = String(allergies).split(/[, ]+/).filter(Boolean);
      for (const a of list) if (!prof.prefs.allergies.includes(a)) prof.prefs.allergies.push(a);
    }
    const fact = note || [likes && `likes ${likes}`, dislikes && `dislikes ${dislikes}`].filter(Boolean).join("; ");
    if (fact && !prof.learned.includes(fact)) prof.learned.push(fact);
    persist();
    return { prefs: prof.prefs, learned: prof.learned, message: "Preferences saved. I'll remember that." };
  },

  searchCatalog({ query = "", category = "", maxPrice = 0, minPrice = 0, tags = [], dept = "", limit = 8 } = {}) {
    let items = [...CATALOG];
    const tokens = String(query).toLowerCase().split(/\s+/).filter(t =>
      t && !/^\d+$/.test(t) &&
      !["under", "below", "above", "rs", "rupees", "for", "a", "an", "the", "me", "some", "with", "and", "my", "i", "need", "want", "show", "find", "buy", "get"].includes(t)
    );

    if (tokens.length) {
      const scored = items.map(p => ({ p, s: scoreProduct(p, tokens) })).filter(x => x.s > 5); // require ≥1 real keyword hit
      items = scored.length ? scored.sort((a, b) => b.s - a.s).map(x => x.p) : items;
    }
    if (category) items = items.filter(p => p.category === category || p.dept.toLowerCase().includes(String(category).toLowerCase()));
    if (dept) items = items.filter(p => p.dept.toLowerCase().includes(String(dept).toLowerCase()));
    if (tags.length) items = items.filter(p => tags.every(t => p.tags.includes(t)));
    if (minPrice) items = items.filter(p => p.price >= minPrice);
    if (maxPrice) items = items.filter(p => p.price <= maxPrice);

    return items.slice(0, limit).map(({ stock, ...rest }) => rest);
  },

  checkInventory(productIds) {
    return productIds.map(id => {
      const p = CATALOG.find(x => x.id === id);
      return p ? { id, name: p.name, inStock: p.stock > 0, stock: p.stock, price: p.price }
               : { id, inStock: false, error: "not_found" };
    });
  },

  compareProducts(productIds) {
    const items = productIds.map(id => CATALOG.find(x => x.id === id)).filter(Boolean);
    return items.map(({ name, price, rating, reviews, stock, carbs, protein, brand, desc }) => ({ name, brand, price, rating, reviews, stock, carbs, protein, desc }));
  },

  addToCart({ productId, qty = 1, cartId }) {
    const p = CATALOG.find(x => x.id === productId);
    if (!p) return { error: "product_not_found" };
    if (p.stock < qty) return { error: "out_of_stock", stock: p.stock };
    let cart = cartId ? db.carts.get(cartId) : null;
    if (!cart) { cart = newCart(); }
    const existing = cart.items.find(i => i.productId === productId);
    if (existing) existing.qty += qty;
    else cart.items.push({ productId, name: p.name, price: p.price, qty });
    p.stock -= qty;
    recalcTotals(cart);
    return { cartId: cart.id, cart: cart, message: `${qty}x ${p.name} added` };
  },

  removeFromCart({ cartId, productId }) {
    const cart = db.carts.get(cartId);
    if (!cart) return { error: "cart_not_found" };
    const idx = cart.items.findIndex(i => i.productId === productId);
    if (idx === -1) return { error: "item_not_found" };
    const [removed] = cart.items.splice(idx, 1);
    CATALOG.find(x => x.id === productId).stock += removed.qty;
    recalcTotals(cart);
    return { cart, message: `${removed.name} removed` };
  },

  applyDiscount({ cartId, code }) {
    const cart = db.carts.get(cartId);
    if (!cart) return { error: "cart_not_found" };
    const d = DISCOUNTS[code];
    if (!d) return { error: "invalid_code", availableCodes: Object.keys(DISCOUNTS) };
    cart.discount = code;
    recalcTotals(cart);
    if (cart.totals.discount === 0) return { error: "min_total_not_met", minTotal: d.minTotal, message: `${code} requires ₹${d.minTotal}+ subtotal` };
    return { cart, message: `${code} applied: -₹${cart.totals.discount}` };
  },

  initiateCheckout({ cartId, paymentMethod = "saved_card", paymentPending = false }) {
    const cart = db.carts.get(cartId);
    if (!cart) return { error: "cart_not_found" };
    if (!cart.items.length) return { error: "empty_cart" };
    recalcTotals(cart);
    const order = {
      id: "ORD-" + (++db.orderSeq),
      cartId,
      items: cart.items.map(i => ({ ...i })),
      totals: cart.totals,
      paymentMethod,
      status: paymentPending ? "pending_payment" : "confirmed",
      eta: "45-60 min",
      placedAt: new Date().toISOString()
    };
    db.orders.set(order.id, order);
    persist();
    db.carts.delete(cartId);
    return { order, message: paymentPending
      ? `Order ${order.id} created. Total ₹${order.totals.total}. A payment link is on your screen — pay and I'll confirm.`
      : `Order ${order.id} confirmed. Total ₹${order.totals.total}. ETA ${order.eta}.` };
  },

  markOrderPaid(orderId) {
    const o = db.orders.get(orderId);
    if (!o) return { error: "order_not_found" };
    o.status = "confirmed";
    return { order: o, message: `Payment received. Order ${o.id} confirmed. ETA ${o.eta}.` };
  },

  getOrderStatus(orderId) {
    const o = db.orders.get(orderId);
    if (!o) return { error: "order_not_found" };
    // Journey simulation: each tracking ask advances the delivery one stage
    const STAGES = ["pending_payment", "confirmed", "preparing", "out_for_delivery", "delivered"];
    if (o.status !== "delivered") {
      const idx = STAGES.indexOf(o.status);
      if (idx >= 0) o.status = STAGES[Math.min(idx + 1, STAGES.length - 1)];
    }
    o.statusHistory = o.statusHistory || [o.status];
    if (o.statusHistory[o.statusHistory.length - 1] !== o.status) o.statusHistory.push(o.status);
    const etaByStage = { confirmed: "45-60 min", preparing: "30-45 min", out_for_delivery: "10-15 min", delivered: "delivered" };
    return { orderId: o.id, status: o.status, eta: etaByStage[o.status] || o.eta, total: o.totals.total, history: o.statusHistory };
  },

  submitReview({ orderId, productId, rating = 5, comment = "" }) {
    const key = productId || orderId;
    const review = { orderId, productId: productId || null, rating, comment, at: new Date().toISOString() };
    db.reviews.set(key, review);
    persist();
    return { review, message: `Thanks! ${"⭐".repeat(Math.min(rating, 5))} review${comment ? ` — "${comment}"` : ""} recorded.` };
  },

  getReviews() { return Object.fromEntries(db.reviews); },

  initiateReturn({ orderId, reason = "not specified" }) {
    const o = db.orders.get(orderId);
    if (!o) return { error: "order_not_found" };
    o.status = "return_initiated";
    return { orderId: o.id, returnId: "RET-" + o.id, message: `Return initiated for ${o.id}. Pickup scheduled in 24h. Refund in 3-5 days.` };
  },

  newCart
};
