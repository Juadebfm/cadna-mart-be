import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import mongoose, { Model, Schema, Types } from 'mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Store, StoreSchema } from '../stores/schemas/store.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AccountType } from '../users/enums/account-type.enum';
import { AuthProvider } from '../users/enums/auth-provider.enum';

// ─── Types ─────────────────────────────────────────────────────

interface Money {
  amount: number;
  currency: 'NGN';
  formatted: string;
}

interface VariantOption {
  id: string;
  label: string;
  swatchHex?: string | null;
}

interface VariantAxis {
  name: string;
  displayName: string;
  options: VariantOption[];
}

interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: Money;
  stockQty: number;
  isInStock: boolean;
  images: string[];
}

interface ProductTab {
  label: string;
  contentHtml: string;
}

type VariantType = 'none' | 'colour' | 'size' | 'colour_size' | 'storage' | 'weight';
type TabType = 'default' | 'skincare' | 'haircare' | 'grocery' | 'furniture' | 'fashion';

interface SellerSeed {
  firstName: string;
  lastName: string;
  email: string;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string;
  joinedYear: number;
  location: string;
  deliveryTimeRange: string;
}

interface CategorySeed {
  name: string;
  slug: string;
  iconUrl: string;
  order: number;
}

interface SubCategorySeed extends CategorySeed {
  parentSlug: string;
}

interface ProductSeed {
  name: string;
  brand: string;
  categorySlug: string;
  subCategorySlug: string;
  basePrice: number;
  badge?: string;
  skuCode: string;
  descriptionHtml: string;
  variantType: VariantType;
  tabType: TabType;
}

interface CategorySeedResult {
  parentIds: Map<string, Types.ObjectId>;
  subCategoryIds: Map<string, Types.ObjectId>;
  parentNames: Map<string, string>;
  subCategoryNames: Map<string, string>;
}

// ─── Seed Data ─────────────────────────────────────────────────

const SECTION_KEYS = ['best_deals', 'recommended', 'top_sellers', 'new_arrivals'] as const;

const SELLERS: SellerSeed[] = [
  {
    firstName: 'Tolu',
    lastName: 'Adebayo',
    email: 'seed-seller-01@cadnamart.dev',
    storeName: 'Steppers Store NG',
    storeSlug: 'steppers-store-ng',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/steppers-store-ng/logo.webp',
    joinedYear: 2021,
    location: 'Balogun Market, Lagos Island',
    deliveryTimeRange: '25-40 min',
  },
  {
    firstName: 'Amaka',
    lastName: 'Okafor',
    email: 'seed-seller-02@cadnamart.dev',
    storeName: 'Glow Hub',
    storeSlug: 'glow-hub',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/glow-hub/logo.webp',
    joinedYear: 2022,
    location: 'Victoria Island, Lagos',
    deliveryTimeRange: '30-45 min',
  },
  {
    firstName: 'Femi',
    lastName: 'Ajayi',
    email: 'seed-seller-03@cadnamart.dev',
    storeName: 'Home Haven',
    storeSlug: 'home-haven',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/home-haven/logo.webp',
    joinedYear: 2020,
    location: 'Yaba, Lagos',
    deliveryTimeRange: '35-55 min',
  },
  {
    firstName: 'Nkechi',
    lastName: 'Umeh',
    email: 'seed-seller-04@cadnamart.dev',
    storeName: 'Fresh Basket',
    storeSlug: 'fresh-basket',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/fresh-basket/logo.webp',
    joinedYear: 2023,
    location: 'Lekki Phase 1, Lagos',
    deliveryTimeRange: '20-35 min',
  },
  {
    firstName: 'Yusuf',
    lastName: 'Bello',
    email: 'seed-seller-05@cadnamart.dev',
    storeName: 'Tech Harbor',
    storeSlug: 'tech-harbor',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/tech-harbor/logo.webp',
    joinedYear: 2019,
    location: 'Computer Village, Ikeja',
    deliveryTimeRange: '40-60 min',
  },
  {
    firstName: 'Zara',
    lastName: 'Daniels',
    email: 'seed-seller-06@cadnamart.dev',
    storeName: 'Style Avenue',
    storeSlug: 'style-avenue',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/style-avenue/logo.webp',
    joinedYear: 2021,
    location: 'Surulere, Lagos',
    deliveryTimeRange: '25-40 min',
  },
];

const CATEGORY_SEEDS: CategorySeed[] = [
  { name: 'Electronics', slug: 'electronics', iconUrl: 'https://cdn.cadnamart.dev/categories/electronics.png', order: 1 },
  { name: 'Home & Living', slug: 'home-living', iconUrl: 'https://cdn.cadnamart.dev/categories/home-living.png', order: 2 },
  { name: 'Beauty', slug: 'beauty', iconUrl: 'https://cdn.cadnamart.dev/categories/beauty.png', order: 3 },
  { name: 'Groceries', slug: 'groceries', iconUrl: 'https://cdn.cadnamart.dev/categories/groceries.png', order: 4 },
  { name: 'Gadgets', slug: 'gadgets', iconUrl: 'https://cdn.cadnamart.dev/categories/gadgets.png', order: 5 },
  { name: 'Fashion', slug: 'fashion', iconUrl: 'https://cdn.cadnamart.dev/categories/fashion.png', order: 6 },
];

const SUB_CATEGORY_SEEDS: SubCategorySeed[] = [
  { name: 'TV & Audio', slug: 'tv-audio', parentSlug: 'electronics', iconUrl: 'https://cdn.cadnamart.dev/categories/tv-audio.png', order: 101 },
  { name: 'Computing', slug: 'computing', parentSlug: 'electronics', iconUrl: 'https://cdn.cadnamart.dev/categories/computing.png', order: 102 },
  { name: 'Kitchen', slug: 'kitchen', parentSlug: 'home-living', iconUrl: 'https://cdn.cadnamart.dev/categories/kitchen.png', order: 201 },
  { name: 'Furniture', slug: 'furniture', parentSlug: 'home-living', iconUrl: 'https://cdn.cadnamart.dev/categories/furniture.png', order: 202 },
  { name: 'Skincare', slug: 'skincare', parentSlug: 'beauty', iconUrl: 'https://cdn.cadnamart.dev/categories/skincare.png', order: 301 },
  { name: 'Haircare', slug: 'haircare', parentSlug: 'beauty', iconUrl: 'https://cdn.cadnamart.dev/categories/haircare.png', order: 302 },
  { name: 'Pantry', slug: 'pantry', parentSlug: 'groceries', iconUrl: 'https://cdn.cadnamart.dev/categories/pantry.png', order: 401 },
  { name: 'Beverages', slug: 'beverages', parentSlug: 'groceries', iconUrl: 'https://cdn.cadnamart.dev/categories/beverages.png', order: 402 },
  { name: 'Smart Devices', slug: 'smart-devices', parentSlug: 'gadgets', iconUrl: 'https://cdn.cadnamart.dev/categories/smart-devices.png', order: 501 },
  { name: 'Accessories', slug: 'accessories', parentSlug: 'gadgets', iconUrl: 'https://cdn.cadnamart.dev/categories/accessories.png', order: 502 },
  { name: 'Men', slug: 'men-fashion', parentSlug: 'fashion', iconUrl: 'https://cdn.cadnamart.dev/categories/men-fashion.png', order: 601 },
  { name: 'Women', slug: 'women-fashion', parentSlug: 'fashion', iconUrl: 'https://cdn.cadnamart.dev/categories/women-fashion.png', order: 602 },
];

const STORE_BY_CATEGORY: Record<string, string> = {
  electronics: 'steppers-store-ng',
  'home-living': 'home-haven',
  beauty: 'glow-hub',
  groceries: 'fresh-basket',
  gadgets: 'tech-harbor',
  fashion: 'style-avenue',
};

const PRODUCTS: ProductSeed[] = [
  // ─── Electronics / TV & Audio ────────────────────────────────
  {
    name: 'Hisense 50" Smart TV 50A4Q',
    brand: 'Hisense',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 415000,
    badge: 'Best Seller',
    skuCode: '6940586',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Hisense 50" 50A4Q Smart TV</strong> delivers a vibrant 4K UHD experience with Dolby Vision and HDR10 support, bringing every scene to life with stunning contrast and colour accuracy.</p>
      <p>Powered by the VIDAA U6 smart TV platform, you get instant access to Netflix, YouTube, Prime Video, and dozens of other streaming services directly from the home screen. The built-in Bluetooth and dual-band Wi-Fi ensure a seamless connected experience.</p>
      <ul>
        <li>50-inch 4K UHD LED Display (3840 × 2160)</li>
        <li>Dolby Vision | HDR10 | HLG support</li>
        <li>VIDAA U6 Smart TV OS</li>
        <li>Bluetooth 5.0 + Dual-band Wi-Fi</li>
        <li>3× HDMI, 2× USB, 1× Ethernet, AV In</li>
        <li>Alexa Built-in and Far-field Voice Control</li>
        <li>Auto Low Latency Mode (ALLM) for gaming</li>
      </ul>
    `,
  },
  {
    name: 'Anker Soundcore Life Q30 Headphones',
    brand: 'Anker',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 78500,
    skuCode: '7823014',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Anker Soundcore Life Q30</strong> delivers premium Active Noise Cancellation in three customisable modes: Transport, Outdoor, and Indoor — so you can block out the world no matter where you are.</p>
      <p>With 40-hour battery life and Hi-Res Audio certification (40 kHz), every note is reproduced with exceptional clarity. The over-ear design with soft, breathable ear cushions ensures long-session comfort.</p>
      <ul>
        <li>Hybrid Active Noise Cancellation (3 modes)</li>
        <li>Hi-Res Audio certified (40 kHz)</li>
        <li>Up to 40 hours playtime (ANC off)</li>
        <li>Multi-point connection (2 devices)</li>
        <li>Fast charging — 5 min = 4 hrs playback</li>
        <li>Foldable design with carrying pouch</li>
      </ul>
    `,
  },
  {
    name: 'LG XBOOM Go XG2 Portable Speaker',
    brand: 'LG',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 96500,
    skuCode: '5541823',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>LG XBOOM Go XG2</strong> is a rugged portable speaker built to go wherever you do. With IP67 dust and waterproof rating, it handles the beach, pool, or rainstorm without missing a beat.</p>
      <p>Dual passive radiators deliver a deep, resonant bass response, while the 360° sound projection fills any room. Meridian Audio technology ensures precise, natural sound tuning across all frequencies.</p>
      <ul>
        <li>Meridian-tuned audio with dual passive radiators</li>
        <li>IP67 dust and water resistance</li>
        <li>Up to 18 hours playtime</li>
        <li>Bluetooth 5.1 with 10m range</li>
        <li>USB-C fast charging</li>
        <li>Party Boost: link two XG2 speakers</li>
      </ul>
    `,
  },
  {
    name: 'Sony WH-CH720N Wireless Headphones',
    brand: 'Sony',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 157000,
    badge: 'Top Rated',
    skuCode: '3301548',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Sony WH-CH720N</strong> combines Sony's industry-leading noise cancelling technology with an ultra-lightweight 192 g frame — making it one of the lightest ANC headphones in its class.</p>
      <p>Dual Noise Sensor Technology captures noise from two directions for precise cancellation, while the Precise Voice Pickup technology ensures clear hands-free calls. Up to 35 hours of battery life keeps you listening all day and night.</p>
      <ul>
        <li>Sony Dual Noise Sensor ANC technology</li>
        <li>Ultra-lightweight: 192 g</li>
        <li>Up to 35 hours battery (ANC on)</li>
        <li>Quick Charge: 3 min = 1 hr playback</li>
        <li>Bluetooth 5.2 | Multipoint connection</li>
        <li>360 Reality Audio compatible</li>
        <li>Speak-to-Chat auto pause</li>
      </ul>
    `,
  },

  // ─── Electronics / Computing ────────────────────────────────
  {
    name: 'HP Pavilion 14 Laptop (i5, 8GB, 512GB)',
    brand: 'HP',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 622000,
    badge: 'Top Rated',
    skuCode: '8821047',
    variantType: 'storage',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>HP Pavilion 14</strong> is a versatile everyday laptop powered by the 13th Gen Intel® Core™ i5-1335U processor, delivering responsive multitasking and reliable performance for work, school, and entertainment.</p>
      <p>The 14-inch FHD IPS display with micro-edge bezels provides an immersive viewing experience, while the Intel Iris Xᵉ Graphics handles light creative tasks and video streaming with ease.</p>
      <ul>
        <li>13th Gen Intel® Core™ i5-1335U (up to 4.6 GHz)</li>
        <li>8 GB DDR4 RAM | Up to 512 GB PCIe NVMe SSD</li>
        <li>14" FHD IPS Anti-glare (1920 × 1080)</li>
        <li>Intel Iris Xᵉ Graphics</li>
        <li>Backlit keyboard | Windows 11 Home</li>
        <li>Wi-Fi 6 | Bluetooth 5.3 | USB-C (Power Delivery)</li>
        <li>Up to 8.5 hours battery life</li>
      </ul>
    `,
  },
  {
    name: 'Lenovo IdeaPad Slim 3 (Ryzen 5, 8GB, 512GB)',
    brand: 'Lenovo',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 548000,
    skuCode: '9204731',
    variantType: 'storage',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Lenovo IdeaPad Slim 3</strong> packs the AMD Ryzen™ 5 7520U processor and Radeon™ 610M integrated graphics into a slim, portable 15.6" chassis — delivering fast, efficient performance for everyday computing tasks.</p>
      <p>With a Full HD display, backlit keyboard, and up to 10 hours of battery life, the IdeaPad Slim 3 is the ideal companion for students and professionals on the go.</p>
      <ul>
        <li>AMD Ryzen™ 5 7520U (up to 4.5 GHz)</li>
        <li>8 GB LPDDR5 RAM | Up to 512 GB PCIe NVMe SSD</li>
        <li>15.6" FHD IPS Anti-glare (1920 × 1080)</li>
        <li>AMD Radeon™ 610M Graphics</li>
        <li>Backlit keyboard | Windows 11 Home</li>
        <li>Wi-Fi 6 | Bluetooth 5.1</li>
        <li>Up to 10 hours battery life</li>
      </ul>
    `,
  },
  {
    name: 'Samsung 32" Smart Monitor M5',
    brand: 'Samsung',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 233000,
    skuCode: '4412980',
    variantType: 'none',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Samsung Smart Monitor M5</strong> is more than just a display — it's a full Smart TV and PC monitor in one. Run Netflix, YouTube, and other streaming apps without connecting a PC, thanks to the built-in Tizen Smart TV platform.</p>
      <p>The 32" Full HD VA panel delivers deep blacks and wide viewing angles, while the 3-sided bezel-less design maximises screen real estate. Works wirelessly with Samsung DeX for a desktop experience from your Galaxy phone.</p>
      <ul>
        <li>32" Full HD VA Panel (1920 × 1080, 60 Hz)</li>
        <li>Samsung Tizen Smart TV OS built-in</li>
        <li>Netflix, YouTube, Prime Video — no PC needed</li>
        <li>Samsung DeX and AirPlay 2 support</li>
        <li>USB-C (65W charging) | HDMI | USB | Wi-Fi</li>
        <li>Eye Saver Mode and Flicker-Free Technology</li>
      </ul>
    `,
  },
  {
    name: 'Dell Inspiron 15 3530 (i5, 16GB, 512GB)',
    brand: 'Dell',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 699000,
    badge: 'New Arrival',
    skuCode: '6073156',
    variantType: 'storage',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Dell Inspiron 15 3530</strong> is powered by the 13th Gen Intel® Core™ i5-1334U processor — offering smooth, responsive performance for productivity, content creation, and casual gaming alike.</p>
      <p>The 15.6" FHD ComfortView Plus display reduces harmful blue light without compromising colour quality, making it ideal for long work sessions. With Windows 11 and 16 GB RAM, multitasking is effortless.</p>
      <ul>
        <li>13th Gen Intel® Core™ i5-1334U (up to 4.6 GHz)</li>
        <li>16 GB DDR5 RAM | Up to 512 GB PCIe NVMe SSD</li>
        <li>15.6" FHD ComfortView Plus (1920 × 1080)</li>
        <li>Intel Iris Xᵉ Graphics</li>
        <li>Windows 11 Home | Backlit keyboard</li>
        <li>Wi-Fi 6 | Bluetooth 5.3 | Thunderbolt 4</li>
        <li>54 WHr battery — up to 9 hours</li>
      </ul>
    `,
  },

  // ─── Home & Living / Kitchen ─────────────────────────────────
  {
    name: 'Binatone 2-Burner Table Top Gas Cooker',
    brand: 'Binatone',
    categorySlug: 'home-living',
    subCategorySlug: 'kitchen',
    basePrice: 75400,
    skuCode: '2203847',
    variantType: 'none',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Binatone 2-Burner Table Top Gas Cooker</strong> is a compact, efficient cooker designed for everyday Nigerian cooking. Fitted with two high-efficiency cast iron burners, it delivers even heat distribution for faster cooking times.</p>
      <p>The stainless steel body resists rust and is easy to wipe clean. The automatic ignition system eliminates the need for a lighter, making cooking safer and more convenient.</p>
      <ul>
        <li>2 high-efficiency cast iron burners</li>
        <li>Automatic piezo ignition</li>
        <li>Stainless steel body — rust resistant</li>
        <li>Removable pan supports for easy cleaning</li>
        <li>Compatible with both butane and propane gas</li>
        <li>Safety valve auto-shutoff on gas leak</li>
      </ul>
    `,
  },
  {
    name: 'Kenwood Electric Kettle 1.7L ZJP01',
    brand: 'Kenwood',
    categorySlug: 'home-living',
    subCategorySlug: 'kitchen',
    basePrice: 32000,
    skuCode: '1187463',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Kenwood ZJP01 Electric Kettle</strong> boils 1.7 litres of water in under 3 minutes with its 2200 W heating element — perfect for tea, coffee, instant noodles, or any hot beverage preparation.</p>
      <p>The 360° cordless swivel base, concealed heating element, and automatic shut-off with boil-dry protection make this a safe and practical kitchen essential for every Nigerian home.</p>
      <ul>
        <li>1.7 L capacity | 2200 W rapid boil</li>
        <li>360° cordless swivel base</li>
        <li>Auto shut-off and boil-dry protection</li>
        <li>Concealed stainless steel heating element</li>
        <li>Water level indicator window</li>
        <li>Removable limescale filter</li>
      </ul>
    `,
  },
  {
    name: 'Philips Air Fryer Essential HD9200',
    brand: 'Philips',
    categorySlug: 'home-living',
    subCategorySlug: 'kitchen',
    basePrice: 143000,
    badge: 'Trending',
    skuCode: '3358201',
    variantType: 'none',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Philips Essential Air Fryer HD9200</strong> lets you fry, grill, roast, and bake with up to 90% less fat than traditional deep frying — without sacrificing that satisfying crunch.</p>
      <p>Rapid Air Technology circulates superheated air around the food for fast, even cooking with no preheating needed. The 4.1 L non-stick basket is dishwasher safe and fits a whole chicken or up to 1.2 kg of fries.</p>
      <ul>
        <li>4.1 L non-stick drawer and basket (feeds 3–4)</li>
        <li>1400 W | Temperature: 80–200°C</li>
        <li>Rapid Air Technology — up to 90% less fat</li>
        <li>No preheating required</li>
        <li>Dishwasher-safe basket and drawer</li>
        <li>Keeps Food Warm feature</li>
        <li>Includes recipe booklet</li>
      </ul>
    `,
  },

  // ─── Home & Living / Furniture ───────────────────────────────
  {
    name: 'Nexus 1.5HP Split Air Conditioner',
    brand: 'Nexus',
    categorySlug: 'home-living',
    subCategorySlug: 'furniture',
    basePrice: 489000,
    skuCode: '9901234',
    variantType: 'none',
    tabType: 'furniture',
    descriptionHtml: `
      <p>The <strong>Nexus 1.5HP Split Air Conditioner</strong> delivers powerful, quiet cooling for rooms up to 25 m². With an inverter compressor, it adjusts its speed to maintain the set temperature without switching on and off — saving up to 60% on electricity compared to non-inverter models.</p>
      <p>The R32 refrigerant is eco-friendly with low global warming potential, and the built-in air purifier with anti-bacterial filter keeps the air in your room fresh and clean.</p>
      <ul>
        <li>1.5 HP (12,000 BTU) cooling capacity</li>
        <li>Inverter compressor — energy-saving A++ rating</li>
        <li>R32 eco-friendly refrigerant</li>
        <li>Built-in anti-bacterial air purifier</li>
        <li>Self-cleaning mode</li>
        <li>Auto restart after power outage</li>
        <li>Sleep mode and 24-hour timer</li>
        <li>Wi-Fi control via mobile app</li>
      </ul>
    `,
  },
  {
    name: 'Royal Foam Orthopedic Mattress 6×6',
    brand: 'Royal Foam',
    categorySlug: 'home-living',
    subCategorySlug: 'furniture',
    basePrice: 215000,
    skuCode: '7721503',
    variantType: 'size',
    tabType: 'furniture',
    descriptionHtml: `
      <p>The <strong>Royal Foam Orthopedic Mattress</strong> is engineered with high-resilience foam layers to provide firm, targeted support for your spine and pressure points — reducing aches and improving sleep quality night after night.</p>
      <p>The quilted jacquard fabric cover is breathable and hypoallergenic, ensuring a cool, clean sleeping surface. Manufactured in Nigeria to meet international foam density standards.</p>
      <ul>
        <li>High-resilience orthopedic foam (40 kg/m³ density)</li>
        <li>Quilted jacquard hypoallergenic cover</li>
        <li>Breathable open-cell foam structure</li>
        <li>Available in 4×6, 6×6, and 6×7 sizes</li>
        <li>10-year manufacturer warranty</li>
        <li>Made in Nigeria | NAFDAC approved</li>
      </ul>
    `,
  },
  {
    name: 'Modern 3-Seater Fabric Sofa',
    brand: 'Casa Nova',
    categorySlug: 'home-living',
    subCategorySlug: 'furniture',
    basePrice: 389000,
    badge: 'Best Seller',
    skuCode: '4430912',
    variantType: 'colour',
    tabType: 'furniture',
    descriptionHtml: `
      <p>The <strong>Casa Nova Modern 3-Seater Sofa</strong> blends contemporary design with exceptional everyday comfort. The solid eucalyptus wood frame is built to last, supporting up to 350 kg and backed by a 3-year structural warranty.</p>
      <p>High-density foam seat cushions and plush back cushions provide superior comfort that holds its shape over years of use. The tightly woven performance fabric resists stains, pilling, and pet hair.</p>
      <ul>
        <li>Solid eucalyptus hardwood frame (3-year warranty)</li>
        <li>High-density foam cushions (28 kg/m³)</li>
        <li>Performance stain-resistant fabric</li>
        <li>Available in 3 colourways</li>
        <li>Dimensions: W220 × D90 × H85 cm</li>
        <li>Seat height: 44 cm | Weight capacity: 350 kg</li>
        <li>Removable and washable cushion covers</li>
      </ul>
    `,
  },

  // ─── Beauty / Skincare ───────────────────────────────────────
  {
    name: 'NIVEA Perfect & Radiant Body Lotion 400ml',
    brand: 'NIVEA',
    categorySlug: 'beauty',
    subCategorySlug: 'skincare',
    basePrice: 11500,
    skuCode: '2987034',
    variantType: 'size',
    tabType: 'skincare',
    descriptionHtml: `
      <p><strong>NIVEA Perfect &amp; Radiant Body Lotion</strong> is specially formulated with Luminous630®, Vitamin C, and SPF 15 to visibly reduce dark marks and even out skin tone with regular use.</p>
      <p>The lightweight, non-greasy formula absorbs quickly, leaving skin feeling soft, smooth, and deeply moisturised for up to 48 hours. Dermatologically tested and suitable for all skin types.</p>
    `,
  },
  {
    name: 'CeraVe Hydrating Facial Cleanser 236ml',
    brand: 'CeraVe',
    categorySlug: 'beauty',
    subCategorySlug: 'skincare',
    basePrice: 28500,
    badge: 'Trending',
    skuCode: '5528901',
    variantType: 'size',
    tabType: 'skincare',
    descriptionHtml: `
      <p>The <strong>CeraVe Hydrating Facial Cleanser</strong> gently removes dirt, oil, and makeup without disrupting the skin's protective barrier. Developed with dermatologists and enriched with 3 essential ceramides and hyaluronic acid.</p>
      <p>Its non-foaming formula is suitable for normal to dry skin, and the patented MVE technology continuously releases ceramides throughout the day to maintain skin's natural moisture levels.</p>
    `,
  },
  {
    name: 'Maybelline Fit Me Matte + Poreless Foundation',
    brand: 'Maybelline',
    categorySlug: 'beauty',
    subCategorySlug: 'skincare',
    basePrice: 17800,
    skuCode: '6640218',
    variantType: 'colour',
    tabType: 'skincare',
    descriptionHtml: `
      <p>The <strong>Maybelline Fit Me Matte + Poreless Foundation</strong> blurs pores and controls oil for a natural, shine-free finish that lasts up to 12 hours. With 40 shades available, there's a perfect match for every skin tone.</p>
      <p>The lightweight formula contains micro-powders that absorb excess oil throughout the day, giving a smooth, airbrushed look. Dermatologist tested and non-comedogenic (won't clog pores).</p>
    `,
  },

  // ─── Beauty / Haircare ───────────────────────────────────────
  {
    name: 'ORS Olive Oil Relaxer Kit — Normal',
    brand: 'ORS',
    categorySlug: 'beauty',
    subCategorySlug: 'haircare',
    basePrice: 9200,
    skuCode: '3345092',
    variantType: 'colour',
    tabType: 'haircare',
    descriptionHtml: `
      <p>The <strong>ORS Olive Oil Relaxer Kit</strong> is enriched with olive oil, sunflower seed oil, and protein to relax tightly coiled hair while conditioning and strengthening each strand from within.</p>
      <p>Available in Normal and Super strengths to suit different hair textures. The complete kit includes relaxer crème, neutralising shampoo, and conditioning treatment for a full at-home salon experience.</p>
    `,
  },
  {
    name: 'Lorys Hair Deep Conditioner 240g',
    brand: 'Lorys',
    categorySlug: 'beauty',
    subCategorySlug: 'haircare',
    basePrice: 7600,
    skuCode: '1123876',
    variantType: 'none',
    tabType: 'haircare',
    descriptionHtml: `
      <p>The <strong>Lorys Deep Conditioner</strong> penetrates deep into the hair cortex to repair, nourish, and restore shine to damaged, dry, or chemically treated hair. Enriched with keratin, argan oil, and panthenol.</p>
      <p>Suitable for all hair types, including relaxed, natural, and colour-treated hair. Use once a week as a deep conditioning treatment for visibly healthier, more manageable hair in just 4 weeks.</p>
    `,
  },

  // ─── Groceries / Pantry ──────────────────────────────────────
  {
    name: 'Honeywell Wheat Meal Flour',
    brand: 'Honeywell',
    categorySlug: 'groceries',
    subCategorySlug: 'pantry',
    basePrice: 12900,
    skuCode: '8834512',
    variantType: 'weight',
    tabType: 'grocery',
    descriptionHtml: `
      <p><strong>Honeywell Wheat Meal Flour</strong> is made from 100% premium whole wheat, lightly processed to retain natural fibre, vitamins, and minerals. Perfect for making swallow (tuwo shinkafa-style), pancakes, and other Nigerian staples.</p>
      <p>Fortified with Vitamin A, Iron, and Zinc in line with NAFDAC standards. Free from artificial preservatives and colourants.</p>
    `,
  },
  {
    name: 'Golden Morn Maize Cereal',
    brand: 'Golden Morn',
    categorySlug: 'groceries',
    subCategorySlug: 'pantry',
    basePrice: 4900,
    skuCode: '7720341',
    variantType: 'weight',
    tabType: 'grocery',
    descriptionHtml: `
      <p><strong>Golden Morn Maize Cereal</strong> is a wholesome, quick-cook breakfast cereal made from maize and soya, fortified with 8 essential vitamins and minerals. A favourite Nigerian breakfast loved by adults and children alike.</p>
      <p>Prepare in minutes with hot water or warm milk. One serving provides 25% of the recommended daily intake of Iron, Vitamin A, and Zinc.</p>
    `,
  },
  {
    name: 'Power Oil Vegetable Oil',
    brand: 'Power Oil',
    categorySlug: 'groceries',
    subCategorySlug: 'pantry',
    basePrice: 16400,
    badge: 'Best Seller',
    skuCode: '9012567',
    variantType: 'weight',
    tabType: 'grocery',
    descriptionHtml: `
      <p><strong>Power Oil Vegetable Oil</strong> is made from 100% refined sunflower seed oil — light in colour, neutral in taste, and high in Vitamin E. With a high smoke point of 232°C, it's ideal for deep frying, stir-frying, sautéing, and baking.</p>
      <p>Cholesterol-free and low in saturated fats. Available in 1 L, 3 L, and 5 L sizes to suit every household.</p>
    `,
  },

  // ─── Groceries / Beverages ───────────────────────────────────
  {
    name: 'Cadbury Bournvita Refill',
    brand: 'Cadbury',
    categorySlug: 'groceries',
    subCategorySlug: 'beverages',
    basePrice: 7200,
    skuCode: '6611203',
    variantType: 'weight',
    tabType: 'grocery',
    descriptionHtml: `
      <p><strong>Cadbury Bournvita</strong> is a rich cocoa-based malt drink packed with essential vitamins and minerals to support your child's development and active lifestyle. The Original formula contains 13 vitamins and minerals including Vitamin C, D, and Iron.</p>
      <p>Simply mix 3 heaped teaspoons with warm or cold milk and stir to enjoy a delicious, nutritious drink anytime of day.</p>
    `,
  },
  {
    name: 'Nestlé Milo Activ-Go Refill',
    brand: 'Nestle',
    categorySlug: 'groceries',
    subCategorySlug: 'beverages',
    basePrice: 6800,
    skuCode: '5502984',
    variantType: 'weight',
    tabType: 'grocery',
    descriptionHtml: `
      <p><strong>Nestlé MILO Activ-Go</strong> is a chocolate malt beverage fortified with ACTIGEN-E — a unique combination of 8 B vitamins and 4 minerals to support the release of energy from food to fuel active kids and teens.</p>
      <p>Ready in under a minute with hot or cold milk. The PROTOMALT extract provides slow-release energy to keep children energised throughout the school day.</p>
    `,
  },

  // ─── Gadgets / Smart Devices ─────────────────────────────────
  {
    name: 'Infinix XW1 Smart Watch',
    brand: 'Infinix',
    categorySlug: 'gadgets',
    subCategorySlug: 'smart-devices',
    basePrice: 39800,
    skuCode: '4490123',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Infinix XW1 Smart Watch</strong> is a feature-packed fitness tracker designed for the modern, active Nigerian lifestyle. Track your steps, heart rate, blood oxygen, sleep patterns, and over 100 sports modes from your wrist.</p>
      <p>The 1.85" HD colour display with customisable watch faces keeps you informed and on-trend, while the 7-day battery life ensures you stay connected all week without charging.</p>
      <ul>
        <li>1.85" HD IPS display (240 × 284 px)</li>
        <li>Heart rate, SpO2, and sleep monitoring</li>
        <li>100+ sport modes | 5 ATM water resistance</li>
        <li>7-day battery life | Bluetooth 5.0</li>
        <li>Call and message notifications</li>
        <li>Compatible with Android 5.0+ and iOS 9.0+</li>
      </ul>
    `,
  },
  {
    name: 'Oraimo FreePods Pro Plus TWS Earbuds',
    brand: 'Oraimo',
    categorySlug: 'gadgets',
    subCategorySlug: 'smart-devices',
    basePrice: 43900,
    badge: 'Trending',
    skuCode: '3371845',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Oraimo FreePods Pro Plus</strong> delivers active noise cancellation and rich Hi-Fi sound in a compact true wireless form factor — at a price that makes premium audio accessible to everyone.</p>
      <p>With 13 mm composite dynamic drivers, 40 dB ANC depth, and 8 hours of single-charge playtime (32 hours total with the charging case), these earbuds are built for all-day listening.</p>
      <ul>
        <li>13 mm composite dynamic drivers</li>
        <li>Active Noise Cancellation up to 40 dB</li>
        <li>8 hrs playtime + 32 hrs with case</li>
        <li>ENC microphone for clear calls</li>
        <li>Bluetooth 5.3 | AAC audio codec</li>
        <li>IPX5 sweat and splash resistance</li>
        <li>Touch controls with custom gestures</li>
      </ul>
    `,
  },

  // ─── Gadgets / Accessories ───────────────────────────────────
  {
    name: 'Baseus 65W GaN USB-C Fast Charger',
    brand: 'Baseus',
    categorySlug: 'gadgets',
    subCategorySlug: 'accessories',
    basePrice: 28400,
    skuCode: '2265019',
    variantType: 'none',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Baseus 65W GaN Fast Charger</strong> uses Gallium Nitride semiconductor technology to pack laptop-level charging power into a compact plug the size of a phone charger. Charge a MacBook, iPad, and iPhone simultaneously from a single socket.</p>
      <p>Smart Power Allocator automatically distributes power across connected devices for optimal charging speed. Universal compatibility with all USB-C Power Delivery and QC 3.0/4.0 devices.</p>
      <ul>
        <li>65W USB-C Power Delivery 3.0</li>
        <li>1× USB-C (65W) + 1× USB-A (18W)</li>
        <li>GaN technology — 40% smaller than conventional chargers</li>
        <li>Multi-protect safety shield (over-voltage, short-circuit, over-temperature)</li>
        <li>Compatible with MacBook, iPad, Galaxy, iPhone, and more</li>
      </ul>
    `,
  },
  {
    name: 'Anker PowerCore 20000mAh Power Bank',
    brand: 'Anker',
    categorySlug: 'gadgets',
    subCategorySlug: 'accessories',
    basePrice: 39200,
    skuCode: '8890341',
    variantType: 'colour',
    tabType: 'default',
    descriptionHtml: `
      <p>The <strong>Anker PowerCore 20000mAh</strong> is a high-capacity portable charger that keeps your devices powered wherever you go. With dual USB-A outputs and a USB-C port, it can charge 3 devices simultaneously.</p>
      <p>The proprietary PowerIQ and VoltageBoost technologies ensure the fastest possible charge for any connected device. A massive 20,000 mAh capacity provides approximately 5 full charges for a smartphone.</p>
      <ul>
        <li>20,000 mAh capacity — ~5 phone charges</li>
        <li>2× USB-A (12W each) + 1× USB-C (15W)</li>
        <li>PowerIQ and VoltageBoost fast charging</li>
        <li>Recharges via USB-C in ~5 hours</li>
        <li>MultiProtect safety system</li>
        <li>High-density Li-Po battery cells</li>
      </ul>
    `,
  },

  // ─── Fashion / Men ───────────────────────────────────────────
  {
    name: 'Men Slim Fit Stretch Chino Trouser',
    brand: 'Bespoke Man',
    categorySlug: 'fashion',
    subCategorySlug: 'men-fashion',
    basePrice: 18500,
    skuCode: '6623401',
    variantType: 'colour_size',
    tabType: 'fashion',
    descriptionHtml: `
      <p>The <strong>Bespoke Man Slim Fit Stretch Chino</strong> is crafted from a premium 98% cotton / 2% elastane blend — giving you the clean tailored look of chinos with the freedom of movement you need for an active day.</p>
      <p>The slim-fit cut skims the thigh and tapers to the ankle for a modern, contemporary silhouette. Reinforced stitching at stress points ensures long-lasting durability even with regular wear.</p>
    `,
  },

  // ─── Fashion / Women ─────────────────────────────────────────
  {
    name: 'Women Pleated Chiffon Maxi Dress',
    brand: 'Luxe Lady',
    categorySlug: 'fashion',
    subCategorySlug: 'women-fashion',
    basePrice: 24900,
    badge: 'Trending',
    skuCode: '9941028',
    variantType: 'colour_size',
    tabType: 'fashion',
    descriptionHtml: `
      <p>The <strong>Luxe Lady Pleated Chiffon Maxi Dress</strong> combines effortless elegance with all-day comfort. The flowing pleated chiffon fabric drapes beautifully and moves gracefully with every step — perfect for occasions from brunch to beach.</p>
      <p>The adjustable spaghetti straps and elasticated smocked waist ensure a flattering fit across a range of body shapes. Fully lined for opacity and comfort.</p>
    `,
  },
];

// ─── Utility Functions ─────────────────────────────────────────

function getModel<T>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

function formatMoney(amount: number): Money {
  return {
    amount,
    currency: 'NGN',
    formatted: `₦${amount.toLocaleString('en-NG')}`,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function placeholderUrl(label: string, w = 600, h = 600): string {
  const clean = label.replace(/['"]/g, '').replace(/\s+/g, '+');
  return `https://placehold.co/${w}x${h}/e2e8f0/475569?text=${clean}`;
}

// ─── Variant Builders ──────────────────────────────────────────

const COLOUR_PALETTES: Record<string, VariantOption[]> = {
  neutral: [
    { id: 'midnight-black', label: 'Midnight Black', swatchHex: '#1f2d47' },
    { id: 'silver', label: 'Silver', swatchHex: '#b9bec8' },
    { id: 'white', label: 'Pearl White', swatchHex: '#f4f4f4' },
  ],
  audio: [
    { id: 'midnight-black', label: 'Midnight Black', swatchHex: '#1f2d47' },
    { id: 'navy-blue', label: 'Navy Blue', swatchHex: '#1a3a5c' },
    { id: 'white', label: 'Pearl White', swatchHex: '#f4f4f4' },
  ],
  speaker: [
    { id: 'charcoal', label: 'Charcoal Grey', swatchHex: '#3d3d3d' },
    { id: 'white', label: 'White', swatchHex: '#f4f4f4' },
    { id: 'blue', label: 'Blue', swatchHex: '#1a6eb5' },
  ],
  home: [
    { id: 'white', label: 'White', swatchHex: '#f4f4f4' },
    { id: 'silver', label: 'Silver', swatchHex: '#b9bec8' },
    { id: 'black', label: 'Black', swatchHex: '#1f1f1f' },
  ],
  sofa: [
    { id: 'charcoal-grey', label: 'Charcoal Grey', swatchHex: '#4a4a4a' },
    { id: 'dusty-rose', label: 'Dusty Rose', swatchHex: '#c9846d' },
    { id: 'sage-green', label: 'Sage Green', swatchHex: '#7a9e7e' },
  ],
  foundation: [
    { id: 'natural-ivory', label: 'Natural Ivory', swatchHex: '#f5e6c8' },
    { id: 'honey-beige', label: 'Honey Beige', swatchHex: '#c8956c' },
    { id: 'warm-caramel', label: 'Warm Caramel', swatchHex: '#9b5e3c' },
  ],
  relaxer: [
    { id: 'normal', label: 'Normal', swatchHex: null },
    { id: 'super', label: 'Super', swatchHex: null },
  ],
  gadget: [
    { id: 'midnight-black', label: 'Midnight Black', swatchHex: '#1f2d47' },
    { id: 'rose-gold', label: 'Rose Gold', swatchHex: '#c7a186' },
    { id: 'silver', label: 'Silver', swatchHex: '#b9bec8' },
  ],
  powerbank: [
    { id: 'black', label: 'Black', swatchHex: '#1f1f1f' },
    { id: 'white', label: 'White', swatchHex: '#f4f4f4' },
  ],
  tv: [
    { id: 'midnight-black', label: 'Midnight Black', swatchHex: '#1f2d47' },
    { id: 'silver', label: 'Silver', swatchHex: '#b9bec8' },
    { id: 'sunset-red', label: 'Sunset Red', swatchHex: '#d64545' },
    { id: 'navy', label: 'Navy', swatchHex: '#1a3a5c' },
  ],
  'men-fashion': [
    { id: 'navy-blue', label: 'Navy Blue', swatchHex: '#1a3a5c' },
    { id: 'khaki', label: 'Khaki', swatchHex: '#c3a882' },
    { id: 'olive-green', label: 'Olive Green', swatchHex: '#6b7c45' },
    { id: 'charcoal-grey', label: 'Charcoal Grey', swatchHex: '#4a4a4a' },
  ],
  'women-fashion': [
    { id: 'blush-pink', label: 'Blush Pink', swatchHex: '#e8a5a5' },
    { id: 'midnight-blue', label: 'Midnight Blue', swatchHex: '#1a3a5c' },
    { id: 'emerald-green', label: 'Emerald Green', swatchHex: '#1e7c4e' },
    { id: 'burnt-orange', label: 'Burnt Orange', swatchHex: '#cc5500' },
  ],
};

function getColourPalette(productName: string, subCategorySlug: string): VariantOption[] {
  const name = productName.toLowerCase();
  if (subCategorySlug === 'men-fashion') return COLOUR_PALETTES['men-fashion'];
  if (subCategorySlug === 'women-fashion') return COLOUR_PALETTES['women-fashion'];
  if (name.includes('speaker') || name.includes('xboom')) return COLOUR_PALETTES.speaker;
  if (name.includes('headphone') || name.includes('earphone') || name.includes('earbuds') || name.includes('soundcore') || name.includes('wh-')) return COLOUR_PALETTES.audio;
  if (name.includes('foundation')) return COLOUR_PALETTES.foundation;
  if (name.includes('relaxer') || name.includes('ors')) return COLOUR_PALETTES.relaxer;
  if (name.includes('sofa')) return COLOUR_PALETTES.sofa;
  if (name.includes('watch') || name.includes('freepod') || name.includes('powercore')) return COLOUR_PALETTES.gadget;
  if (name.includes('power bank') || name.includes('powercore')) return COLOUR_PALETTES.powerbank;
  if (subCategorySlug === 'kitchen') return COLOUR_PALETTES.home;
  return COLOUR_PALETTES.neutral;
}

function buildVariants(
  seed: ProductSeed,
  baseSlug: string,
  baseAmount: number,
  index: number,
): { variantAxes: VariantAxis[]; variants: ProductVariant[]; defaultVariantId: string } {
  const img1 = placeholderUrl(seed.name, 800, 800);

  if (seed.variantType === 'none') {
    const variantId = `${baseSlug}-default`;
    return {
      variantAxes: [],
      variants: [
        {
          id: variantId,
          sku: seed.skuCode,
          attributes: {},
          price: formatMoney(baseAmount),
          stockQty: 15 + (index % 20),
          isInStock: true,
          images: [img1],
        },
      ],
      defaultVariantId: variantId,
    };
  }

  if (seed.variantType === 'storage') {
    const storageOptions = [
      { id: '8gb-256gb', label: '8 GB / 256 GB SSD', priceDelta: 0 },
      { id: '8gb-512gb', label: '8 GB / 512 GB SSD', priceDelta: 50000 },
      { id: '16gb-512gb', label: '16 GB / 512 GB SSD', priceDelta: 100000 },
    ];
    const axis: VariantAxis = {
      name: 'storage',
      displayName: 'RAM / Storage',
      options: storageOptions.map(({ id, label }) => ({ id, label, swatchHex: null })),
    };
    const variants: ProductVariant[] = storageOptions.map((opt, i) => ({
      id: `${baseSlug}-${opt.id}`,
      sku: `${seed.skuCode}-${opt.id.toUpperCase()}`,
      attributes: { storage: opt.id },
      price: formatMoney(baseAmount + opt.priceDelta),
      stockQty: 5 + ((index + i) % 12),
      isInStock: true,
      images: [img1],
    }));
    return { variantAxes: [axis], variants, defaultVariantId: variants[0].id };
  }

  if (seed.variantType === 'size') {
    const sizeOptions =
      seed.subCategorySlug === 'furniture'
        ? [
            { id: '4x6', label: '4×6 ft', priceDelta: -40000 },
            { id: '6x6', label: '6×6 ft', priceDelta: 0 },
            { id: '6x7', label: '6×7 ft', priceDelta: 45000 },
          ]
        : seed.subCategorySlug === 'skincare'
        ? [
            { id: '200ml', label: '200 ml', priceDelta: -4000 },
            { id: '400ml', label: '400 ml', priceDelta: 0 },
          ]
        : [
            { id: 'small', label: 'Small', priceDelta: -3000 },
            { id: 'medium', label: 'Medium', priceDelta: 0 },
            { id: 'large', label: 'Large', priceDelta: 4000 },
          ];
    const axis: VariantAxis = {
      name: 'size',
      displayName: 'Size',
      options: sizeOptions.map(({ id, label }) => ({ id, label, swatchHex: null })),
    };
    const variants: ProductVariant[] = sizeOptions.map((opt, i) => ({
      id: `${baseSlug}-${opt.id}`,
      sku: `${seed.skuCode}-${opt.id.toUpperCase()}`,
      attributes: { size: opt.id },
      price: formatMoney(baseAmount + opt.priceDelta),
      stockQty: 20 + ((index + i) % 30),
      isInStock: true,
      images: [img1],
    }));
    return { variantAxes: [axis], variants, defaultVariantId: variants[0].id };
  }

  if (seed.variantType === 'weight') {
    const name = seed.name.toLowerCase();
    const weightOptions =
      name.includes('flour')
        ? [
            { id: '2kg', label: '2 kg', priceDelta: -5000 },
            { id: '5kg', label: '5 kg', priceDelta: 0 },
            { id: '10kg', label: '10 kg', priceDelta: 10000 },
          ]
        : name.includes('oil')
        ? [
            { id: '1l', label: '1 litre', priceDelta: -7000 },
            { id: '3l', label: '3 litres', priceDelta: 0 },
            { id: '5l', label: '5 litres', priceDelta: 12000 },
          ]
        : name.includes('cereal') || name.includes('morn')
        ? [
            { id: '450g', label: '450 g', priceDelta: -1500 },
            { id: '900g', label: '900 g', priceDelta: 0 },
          ]
        : [
            { id: '400g', label: '400 g', priceDelta: -2000 },
            { id: '500g', label: '500 g', priceDelta: 0 },
            { id: '1kg', label: '1 kg', priceDelta: 6000 },
          ];
    const axis: VariantAxis = {
      name: 'size',
      displayName: 'Pack Size',
      options: weightOptions.map(({ id, label }) => ({ id, label, swatchHex: null })),
    };
    const variants: ProductVariant[] = weightOptions.map((opt, i) => ({
      id: `${baseSlug}-${opt.id}`,
      sku: `${seed.skuCode}-${opt.id.toUpperCase()}`,
      attributes: { size: opt.id },
      price: formatMoney(baseAmount + opt.priceDelta),
      stockQty: 50 + ((index + i) % 80),
      isInStock: true,
      images: [img1],
    }));
    return { variantAxes: [axis], variants, defaultVariantId: variants[0].id };
  }

  if (seed.variantType === 'colour') {
    const colours = getColourPalette(seed.name, seed.subCategorySlug).slice(0, 3);
    const axis: VariantAxis = { name: 'colour', displayName: 'Colour', options: colours };
    const variants: ProductVariant[] = colours.map((c, i) => ({
      id: `${baseSlug}-${c.id}`,
      sku: `${seed.skuCode}-${c.id.toUpperCase().replace(/-/g, '')}`,
      attributes: { colour: c.id },
      price: formatMoney(baseAmount),
      stockQty: 8 + ((index + i) % 20),
      isInStock: true,
      images: [placeholderUrl(`${seed.name} - ${c.label}`, 800, 800)],
    }));
    return { variantAxes: [axis], variants, defaultVariantId: variants[0].id };
  }

  if (seed.variantType === 'colour_size') {
    const colours = getColourPalette(seed.name, seed.subCategorySlug).slice(0, 3);
    const sizes =
      seed.subCategorySlug === 'men-fashion'
        ? [
            { id: 's', label: 'S', priceDelta: 0 },
            { id: 'm', label: 'M', priceDelta: 0 },
            { id: 'l', label: 'L', priceDelta: 0 },
            { id: 'xl', label: 'XL', priceDelta: 1000 },
            { id: 'xxl', label: 'XXL', priceDelta: 1500 },
          ]
        : [
            { id: 'xs', label: 'XS', priceDelta: 0 },
            { id: 's', label: 'S', priceDelta: 0 },
            { id: 'm', label: 'M', priceDelta: 0 },
            { id: 'l', label: 'L', priceDelta: 1000 },
            { id: 'xl', label: 'XL', priceDelta: 1500 },
          ];

    const colourAxis: VariantAxis = { name: 'colour', displayName: 'Colour', options: colours };
    const sizeAxis: VariantAxis = {
      name: 'size',
      displayName: 'Size',
      options: sizes.map(({ id, label }) => ({ id, label, swatchHex: null })),
    };

    const variants: ProductVariant[] = colours.flatMap((colour, ci) =>
      sizes.map((size, si) => ({
        id: `${baseSlug}-${colour.id}-${size.id}`,
        sku: `${seed.skuCode}-${colour.id.toUpperCase().replace(/-/g, '').slice(0, 4)}-${size.id.toUpperCase()}`,
        attributes: { colour: colour.id, size: size.id },
        price: formatMoney(baseAmount + size.priceDelta),
        stockQty: 6 + ((index + ci + si) % 15),
        isInStock: true,
        images: [placeholderUrl(`${seed.name} - ${colour.label}`, 800, 800)],
      })),
    );

    return { variantAxes: [colourAxis, sizeAxis], variants, defaultVariantId: variants[0].id };
  }

  // Fallback — single variant
  return {
    variantAxes: [],
    variants: [
      {
        id: `${baseSlug}-default`,
        sku: seed.skuCode,
        attributes: {},
        price: formatMoney(baseAmount),
        stockQty: 15,
        isInStock: true,
        images: [placeholderUrl(seed.name, 800, 800)],
      },
    ],
    defaultVariantId: `${baseSlug}-default`,
  };
}

// ─── Tab Builder ───────────────────────────────────────────────

function buildTabs(seed: ProductSeed): ProductTab[] {
  switch (seed.tabType) {
    case 'skincare':
      return [
        {
          label: 'How to Use',
          contentHtml: `<p>Apply generously to clean, dry skin. Massage in circular motions until fully absorbed. For best results, use daily after bathing. Avoid contact with eyes; if contact occurs, rinse thoroughly with water.</p>`,
        },
        {
          label: 'Key Ingredients',
          contentHtml: `<ul><li><strong>Luminous630®</strong> — targets dark spots and uneven skin tone</li><li><strong>Vitamin C</strong> — antioxidant that brightens and protects skin</li><li><strong>Hyaluronic Acid</strong> — binds moisture to the skin surface</li><li><strong>Ceramides</strong> — restore and reinforce the skin barrier</li></ul>`,
        },
      ];

    case 'haircare':
      return [
        {
          label: 'How to Use',
          contentHtml: `<ol><li>Shampoo hair thoroughly and rinse.</li><li>Apply product generously from mid-length to ends, avoiding the scalp.</li><li>Leave on for 5–15 minutes (or use heat cap for deeper penetration).</li><li>Rinse out thoroughly with cool water to seal the cuticle.</li><li>Style as desired.</li></ol><p><strong>Tip:</strong> Use weekly for best results.</p>`,
        },
      ];

    case 'grocery':
      return [
        {
          label: 'Nutritional Info',
          contentHtml: `<p><strong>Nutrition Facts</strong> — Per 100 g serving:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td><strong>Energy</strong></td><td>352 kcal</td></tr>
            <tr><td><strong>Protein</strong></td><td>12 g</td></tr>
            <tr><td><strong>Total Fat</strong></td><td>2.5 g</td></tr>
            <tr><td><strong>Carbohydrates</strong></td><td>68 g</td></tr>
            <tr><td><strong>Dietary Fibre</strong></td><td>4.2 g</td></tr>
            <tr><td><strong>Sugar</strong></td><td>3.1 g</td></tr>
            <tr><td><strong>Sodium</strong></td><td>10 mg</td></tr>
          </table>
          <p style="margin-top:8px;font-size:0.85em;color:#666">* Percent Daily Values are based on a 2,000 kcal diet.</p>`,
        },
      ];

    case 'furniture':
      return [
        {
          label: 'Care Instructions',
          contentHtml: `<ul>
            <li>Spot clean with a damp, lint-free cloth and mild soap solution.</li>
            <li>Do not use bleach, abrasive cleaners, or solvent-based products.</li>
            <li>Keep away from direct sunlight to prevent fading.</li>
            <li>For foam products, allow adequate ventilation — do not cover with airtight plastic.</li>
            <li>Rotate mattress 180° every 3 months to maintain even support.</li>
          </ul>`,
        },
      ];

    case 'fashion':
      return [
        {
          label: 'Size Guide',
          contentHtml: `<table style="width:100%;border-collapse:collapse;font-size:0.9em">
            <thead><tr style="background:#f5f5f5"><th>Size</th><th>Chest (cm)</th><th>Waist (cm)</th><th>Hip (cm)</th></tr></thead>
            <tbody>
              <tr><td>XS</td><td>76–81</td><td>61–66</td><td>84–89</td></tr>
              <tr><td>S</td><td>82–87</td><td>67–72</td><td>90–95</td></tr>
              <tr><td>M</td><td>88–93</td><td>73–78</td><td>96–101</td></tr>
              <tr><td>L</td><td>94–99</td><td>79–84</td><td>102–107</td></tr>
              <tr><td>XL</td><td>100–106</td><td>85–91</td><td>108–114</td></tr>
              <tr><td>XXL</td><td>107–113</td><td>92–98</td><td>115–121</td></tr>
            </tbody>
          </table>
          <p style="margin-top:8px;font-size:0.85em;color:#666">Measurements are body measurements in centimetres. If between sizes, size up.</p>`,
        },
        {
          label: 'Care Instructions',
          contentHtml: `<ul>
            <li>Machine wash cold (30°C) on gentle cycle.</li>
            <li>Wash with similar colours; do not bleach.</li>
            <li>Tumble dry on low or lay flat to dry.</li>
            <li>Iron on low heat if needed; do not iron on prints.</li>
            <li>Dry clean optional.</li>
          </ul>`,
        },
      ];

    default:
      return [];
  }
}

// ─── Specifications Builder ────────────────────────────────────

function buildSpecifications(seed: ProductSeed): Array<{ name: string; value: string }> {
  const base = [
    { name: 'Brand', value: seed.brand },
    { name: 'Product Code', value: seed.skuCode },
    { name: 'Condition', value: 'Brand New' },
  ];

  if (['electronics', 'gadgets'].includes(seed.categorySlug)) {
    return [...base, { name: 'Warranty', value: '12 Months' }, { name: 'Country of Origin', value: 'Imported' }];
  }
  if (seed.categorySlug === 'home-living') {
    return [...base, { name: 'Warranty', value: '12 Months' }];
  }
  if (seed.categorySlug === 'beauty') {
    return [...base, { name: 'Country of Origin', value: 'Imported' }, { name: 'Shelf Life', value: '24 months' }];
  }
  if (seed.categorySlug === 'groceries') {
    return [...base, { name: 'Country of Origin', value: 'Made in Nigeria' }, { name: 'NAFDAC No.', value: `A7-${seed.skuCode.slice(0, 4)}` }];
  }
  if (seed.categorySlug === 'fashion') {
    return [...base, { name: 'Material', value: '98% Cotton, 2% Elastane' }, { name: 'Country of Origin', value: 'Made in Nigeria' }];
  }

  return base;
}

// ─── Sections Builder ──────────────────────────────────────────

function buildSections(index: number): string[] {
  const first = SECTION_KEYS[index % SECTION_KEYS.length];
  const second = SECTION_KEYS[(index + 1) % SECTION_KEYS.length];
  const sections = new Set<string>([first, second]);
  if (index % 5 === 0) sections.add('best_deals');
  if (index % 3 === 0) sections.add('top_sellers');
  return Array.from(sections);
}

// ─── Seed Functions ────────────────────────────────────────────

async function seedUsers(userModel: Model<User>): Promise<Map<string, Types.ObjectId>> {
  const ownerIds = new Map<string, Types.ObjectId>();

  for (const [index, seller] of SELLERS.entries()) {
    const user = await userModel
      .findOneAndUpdate(
        { email: seller.email.toLowerCase() },
        {
          $set: {
            firstName: seller.firstName,
            lastName: seller.lastName,
            accountType: AccountType.SELLER,
            isVerified: true,
            isActive: true,
            phoneNumber: `+2348000000${String(index + 1).padStart(2, '0')}`,
            termsAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          $setOnInsert: {
            email: seller.email.toLowerCase(),
            password: null,
            authProvider: AuthProvider.LOCAL,
            deletedAt: null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .exec();

    if (!user?._id) throw new Error(`Failed to upsert seller user: ${seller.email}`);
    ownerIds.set(seller.storeSlug, new Types.ObjectId(String(user._id)));
  }

  return ownerIds;
}

async function seedStores(
  storeModel: Model<Store>,
  ownerIdsByStoreSlug: Map<string, Types.ObjectId>,
): Promise<Map<string, Types.ObjectId>> {
  const storeIds = new Map<string, Types.ObjectId>();

  for (const [index, seller] of SELLERS.entries()) {
    const ownerId = ownerIdsByStoreSlug.get(seller.storeSlug);
    if (!ownerId) throw new Error(`Missing owner id for store: ${seller.storeSlug}`);

    const averageRating = clamp(4.2 + (index % 5) * 0.12, 0, 5);
    const store = await storeModel
      .findOneAndUpdate(
        { slug: seller.storeSlug },
        {
          $set: {
            name: seller.storeName,
            slug: seller.storeSlug,
            logoUrl: placeholderUrl(seller.storeName, 200, 200),
            owner: ownerId,
            isVerified: true,
            responseRatePercent: 92 + (index % 6),
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount: 800 + index * 125,
            joinedYear: seller.joinedYear,
            location: seller.location,
            deliveryTimeRange: seller.deliveryTimeRange,
            isActive: true,
            deletedAt: null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .exec();

    if (!store?._id) throw new Error(`Failed to upsert store: ${seller.storeSlug}`);
    storeIds.set(seller.storeSlug, new Types.ObjectId(String(store._id)));
  }

  return storeIds;
}

async function seedCategories(categoryModel: Model<Category>): Promise<CategorySeedResult> {
  const parentIds = new Map<string, Types.ObjectId>();
  const subCategoryIds = new Map<string, Types.ObjectId>();
  const parentNames = new Map<string, string>();
  const subCategoryNames = new Map<string, string>();

  for (const category of CATEGORY_SEEDS) {
    const doc = await categoryModel
      .findOneAndUpdate(
        { slug: category.slug },
        {
          $set: { name: category.name, slug: category.slug, iconUrl: placeholderUrl(category.name, 80, 80), parent: null, order: category.order, isActive: true, deletedAt: null },
          $setOnInsert: { productCount: 0 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .exec();

    if (!doc?._id) throw new Error(`Failed to upsert category: ${category.slug}`);
    parentIds.set(category.slug, new Types.ObjectId(String(doc._id)));
    parentNames.set(category.slug, category.name);
  }

  for (const subCategory of SUB_CATEGORY_SEEDS) {
    const parentId = parentIds.get(subCategory.parentSlug);
    if (!parentId) throw new Error(`Missing parent category: ${subCategory.parentSlug}`);

    const doc = await categoryModel
      .findOneAndUpdate(
        { slug: subCategory.slug },
        {
          $set: { name: subCategory.name, slug: subCategory.slug, iconUrl: placeholderUrl(subCategory.name, 80, 80), parent: parentId, order: subCategory.order, isActive: true, deletedAt: null },
          $setOnInsert: { productCount: 0 },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .exec();

    if (!doc?._id) throw new Error(`Failed to upsert sub category: ${subCategory.slug}`);
    subCategoryIds.set(subCategory.slug, new Types.ObjectId(String(doc._id)));
    subCategoryNames.set(subCategory.slug, subCategory.name);
  }

  return { parentIds, subCategoryIds, parentNames, subCategoryNames };
}

async function seedProducts(
  productModel: Model<Product>,
  categorySeedResult: CategorySeedResult,
  storeIdsBySlug: Map<string, Types.ObjectId>,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const [index, seed] of PRODUCTS.entries()) {
    const categoryId = categorySeedResult.parentIds.get(seed.categorySlug);
    const subCategoryId = categorySeedResult.subCategoryIds.get(seed.subCategorySlug);
    const storeSlug = STORE_BY_CATEGORY[seed.categorySlug];
    const storeId = storeIdsBySlug.get(storeSlug);

    if (!categoryId || !subCategoryId || !storeId) {
      throw new Error(`Missing relation for product seed "${seed.name}"`);
    }

    const slug = `${slugify(seed.name)}-seed`;
    const discountPercent = 10 + (index % 5) * 5;
    const originalAmount = seed.basePrice;
    const priceAmount = Math.round((originalAmount * (100 - discountPercent)) / 100);
    const savingsAmount = originalAmount - priceAmount;
    const sections = buildSections(index);

    const { variantAxes, variants, defaultVariantId } = buildVariants(seed, slug, priceAmount, index);
    const tabs = buildTabs(seed);
    const specifications = buildSpecifications(seed);

    const categoryName = categorySeedResult.parentNames.get(seed.categorySlug) ?? 'Category';
    const subCategoryName = categorySeedResult.subCategoryNames.get(seed.subCategorySlug) ?? 'Sub Category';
    const rating = Math.round((4.0 + (index % 8) * 0.12) * 10) / 10;
    const reviewCount = 18 + index * 7;
    const salesCount = 140 + index * 17;

    const result = await productModel.updateOne(
      { slug },
      {
        $set: {
          name: seed.name,
          slug,
          sku: seed.skuCode,
          brand: seed.brand,
          thumbnailUrl: placeholderUrl(seed.name, 400, 400),
          price: formatMoney(priceAmount),
          originalPrice: formatMoney(originalAmount),
          discountPercent,
          savings: formatMoney(savingsAmount),
          gallery: [
            { id: 'img-1', url: placeholderUrl(`${seed.name} 1`, 800, 800), alt: `${seed.name} — front view` },
            { id: 'img-2', url: placeholderUrl(`${seed.name} 2`, 800, 800), alt: `${seed.name} — angle view` },
            { id: 'img-3', url: placeholderUrl(`${seed.name} 3`, 800, 800), alt: `${seed.name} — detail view` },
          ],
          variantAxes,
          variants,
          defaultVariantId,
          descriptionHtml: seed.descriptionHtml.trim(),
          tabs,
          specifications,
          breadcrumbs: [
            { label: 'Home', url: '/' },
            { label: categoryName, url: `/category/${seed.categorySlug}` },
            { label: subCategoryName, url: `/category/${seed.categorySlug}/${seed.subCategorySlug}` },
            { label: seed.name, url: null },
          ],
          rating,
          reviewCount,
          inventoryStatus: 'in_stock',
          badge: seed.badge ?? null,
          category: categoryId,
          subCategory: subCategoryId,
          store: storeId,
          sections,
          isActive: true,
          salesCount,
          deletedAt: null,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

async function syncCategoryCounts(
  categoryModel: Model<Category>,
  productModel: Model<Product>,
  categorySeedResult: CategorySeedResult,
): Promise<void> {
  const tasks = [
    ...Array.from(categorySeedResult.parentIds.values()).map(async (id) => {
      const count = await productModel.countDocuments({ deletedAt: null, isActive: true, category: id });
      await categoryModel.updateOne({ _id: id }, { $set: { productCount: count } });
    }),
    ...Array.from(categorySeedResult.subCategoryIds.values()).map(async (id) => {
      const count = await productModel.countDocuments({ deletedAt: null, isActive: true, subCategory: id });
      await categoryModel.updateOne({ _id: id }, { $set: { productCount: count } });
    }),
  ];
  await Promise.all(tasks);
}

// ─── Entry Point ───────────────────────────────────────────────

async function run(): Promise<void> {
  const env = process.env.NODE_ENV || 'dev';
  const envFile = `.env.${env}`;
  const fallbackEnvFile = '.env';
  dotenvConfig({ path: resolve(process.cwd(), envFile) });
  if (!process.env.MONGO_URI) {
    dotenvConfig({ path: resolve(process.cwd(), fallbackEnvFile) });
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error(`MONGO_URI is not configured in ${envFile}`);

  console.log(`[seed-products] Connecting to MongoDB using ${envFile}...`);
  await mongoose.connect(mongoUri);

  const userModel = getModel<User>(User.name, UserSchema);
  const storeModel = getModel<Store>(Store.name, StoreSchema);
  const categoryModel = getModel<Category>(Category.name, CategorySchema);
  const productModel = getModel<Product>(Product.name, ProductSchema);

  console.log('[seed-products] Seeding users and stores...');
  const ownerIds = await seedUsers(userModel);
  const storeIds = await seedStores(storeModel, ownerIds);

  console.log('[seed-products] Seeding categories...');
  const categorySeedResult = await seedCategories(categoryModel);

  console.log(`[seed-products] Seeding ${PRODUCTS.length} products...`);
  const { inserted, updated } = await seedProducts(productModel, categorySeedResult, storeIds);

  console.log('[seed-products] Syncing category product counts...');
  await syncCategoryCounts(categoryModel, productModel, categorySeedResult);

  const totalActive = await productModel.countDocuments({ slug: /-seed$/, deletedAt: null, isActive: true });

  console.log('\n[seed-products] ✓ Seed complete');
  console.log(`  Products inserted : ${inserted}`);
  console.log(`  Products updated  : ${updated}`);
  console.log(`  Active seeded     : ${totalActive}`);
  console.log(`  Stores seeded     : ${SELLERS.length}`);
  console.log(`  Categories seeded : ${CATEGORY_SEEDS.length} parent + ${SUB_CATEGORY_SEEDS.length} sub`);
}

run()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(`[seed-products] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
