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

interface Money {
  amount: number;
  currency: 'NGN';
  formatted: string;
}

interface SellerSeed {
  firstName: string;
  lastName: string;
  email: string;
  storeName: string;
  storeSlug: string;
  storeLogoUrl: string;
  joinedYear: number;
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
}

interface CategorySeedResult {
  parentIds: Map<string, Types.ObjectId>;
  subCategoryIds: Map<string, Types.ObjectId>;
  parentNames: Map<string, string>;
  subCategoryNames: Map<string, string>;
}

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
  },
  {
    firstName: 'Amaka',
    lastName: 'Okafor',
    email: 'seed-seller-02@cadnamart.dev',
    storeName: 'Glow Hub',
    storeSlug: 'glow-hub',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/glow-hub/logo.webp',
    joinedYear: 2022,
  },
  {
    firstName: 'Femi',
    lastName: 'Ajayi',
    email: 'seed-seller-03@cadnamart.dev',
    storeName: 'Home Haven',
    storeSlug: 'home-haven',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/home-haven/logo.webp',
    joinedYear: 2020,
  },
  {
    firstName: 'Nkechi',
    lastName: 'Umeh',
    email: 'seed-seller-04@cadnamart.dev',
    storeName: 'Fresh Basket',
    storeSlug: 'fresh-basket',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/fresh-basket/logo.webp',
    joinedYear: 2023,
  },
  {
    firstName: 'Yusuf',
    lastName: 'Bello',
    email: 'seed-seller-05@cadnamart.dev',
    storeName: 'Tech Harbor',
    storeSlug: 'tech-harbor',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/tech-harbor/logo.webp',
    joinedYear: 2019,
  },
  {
    firstName: 'Zara',
    lastName: 'Daniels',
    email: 'seed-seller-06@cadnamart.dev',
    storeName: 'Style Avenue',
    storeSlug: 'style-avenue',
    storeLogoUrl: 'https://cdn.cadnamart.dev/stores/style-avenue/logo.webp',
    joinedYear: 2021,
  },
];

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    iconUrl: 'https://cdn.cadnamart.dev/categories/electronics.png',
    order: 1,
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    iconUrl: 'https://cdn.cadnamart.dev/categories/home-living.png',
    order: 2,
  },
  {
    name: 'Beauty',
    slug: 'beauty',
    iconUrl: 'https://cdn.cadnamart.dev/categories/beauty.png',
    order: 3,
  },
  {
    name: 'Groceries',
    slug: 'groceries',
    iconUrl: 'https://cdn.cadnamart.dev/categories/groceries.png',
    order: 4,
  },
  {
    name: 'Gadgets',
    slug: 'gadgets',
    iconUrl: 'https://cdn.cadnamart.dev/categories/gadgets.png',
    order: 5,
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    iconUrl: 'https://cdn.cadnamart.dev/categories/fashion.png',
    order: 6,
  },
];

const SUB_CATEGORY_SEEDS: SubCategorySeed[] = [
  {
    name: 'TV & Audio',
    slug: 'tv-audio',
    parentSlug: 'electronics',
    iconUrl: 'https://cdn.cadnamart.dev/categories/tv-audio.png',
    order: 101,
  },
  {
    name: 'Computing',
    slug: 'computing',
    parentSlug: 'electronics',
    iconUrl: 'https://cdn.cadnamart.dev/categories/computing.png',
    order: 102,
  },
  {
    name: 'Kitchen',
    slug: 'kitchen',
    parentSlug: 'home-living',
    iconUrl: 'https://cdn.cadnamart.dev/categories/kitchen.png',
    order: 201,
  },
  {
    name: 'Furniture',
    slug: 'furniture',
    parentSlug: 'home-living',
    iconUrl: 'https://cdn.cadnamart.dev/categories/furniture.png',
    order: 202,
  },
  {
    name: 'Skincare',
    slug: 'skincare',
    parentSlug: 'beauty',
    iconUrl: 'https://cdn.cadnamart.dev/categories/skincare.png',
    order: 301,
  },
  {
    name: 'Haircare',
    slug: 'haircare',
    parentSlug: 'beauty',
    iconUrl: 'https://cdn.cadnamart.dev/categories/haircare.png',
    order: 302,
  },
  {
    name: 'Pantry',
    slug: 'pantry',
    parentSlug: 'groceries',
    iconUrl: 'https://cdn.cadnamart.dev/categories/pantry.png',
    order: 401,
  },
  {
    name: 'Beverages',
    slug: 'beverages',
    parentSlug: 'groceries',
    iconUrl: 'https://cdn.cadnamart.dev/categories/beverages.png',
    order: 402,
  },
  {
    name: 'Smart Devices',
    slug: 'smart-devices',
    parentSlug: 'gadgets',
    iconUrl: 'https://cdn.cadnamart.dev/categories/smart-devices.png',
    order: 501,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    parentSlug: 'gadgets',
    iconUrl: 'https://cdn.cadnamart.dev/categories/accessories.png',
    order: 502,
  },
  {
    name: 'Men',
    slug: 'men-fashion',
    parentSlug: 'fashion',
    iconUrl: 'https://cdn.cadnamart.dev/categories/men-fashion.png',
    order: 601,
  },
  {
    name: 'Women',
    slug: 'women-fashion',
    parentSlug: 'fashion',
    iconUrl: 'https://cdn.cadnamart.dev/categories/women-fashion.png',
    order: 602,
  },
];

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Hisense 50 Smart TV 50A4Q',
    brand: 'Hisense',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 415000,
    badge: 'Best Seller',
  },
  {
    name: 'Anker Soundcore Life Q30 Headphones',
    brand: 'Anker',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 78500,
  },
  {
    name: 'HP Pavilion 14 Laptop',
    brand: 'HP',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 622000,
    badge: 'Top Rated',
  },
  {
    name: 'Lenovo IdeaPad Slim 3',
    brand: 'Lenovo',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 548000,
  },
  {
    name: 'Samsung 32 Smart Monitor',
    brand: 'Samsung',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 233000,
  },
  {
    name: 'LG XBoom Bluetooth Speaker',
    brand: 'LG',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 96500,
  },
  {
    name: 'Dell Inspiron 15 3530',
    brand: 'Dell',
    categorySlug: 'electronics',
    subCategorySlug: 'computing',
    basePrice: 699000,
  },
  {
    name: 'Sony WH-CH720N Wireless Headset',
    brand: 'Sony',
    categorySlug: 'electronics',
    subCategorySlug: 'tv-audio',
    basePrice: 157000,
  },
  {
    name: 'Binatone 2 Burner Gas Cooker',
    brand: 'Binatone',
    categorySlug: 'home-living',
    subCategorySlug: 'kitchen',
    basePrice: 75400,
  },
  {
    name: 'Nexus 1.5HP Split Air Conditioner',
    brand: 'Nexus',
    categorySlug: 'home-living',
    subCategorySlug: 'furniture',
    basePrice: 489000,
  },
  {
    name: 'Kenwood Electric Kettle 1.7L',
    brand: 'Kenwood',
    categorySlug: 'home-living',
    subCategorySlug: 'kitchen',
    basePrice: 32000,
  },
  {
    name: 'Royal Foam Orthopedic Mattress 6x6',
    brand: 'Royal Foam',
    categorySlug: 'home-living',
    subCategorySlug: 'furniture',
    basePrice: 215000,
  },
  {
    name: 'Modern 3-Seater Fabric Sofa',
    brand: 'Casa Nova',
    categorySlug: 'home-living',
    subCategorySlug: 'furniture',
    basePrice: 389000,
  },
  {
    name: 'Philips Air Fryer Essential 4.1L',
    brand: 'Philips',
    categorySlug: 'home-living',
    subCategorySlug: 'kitchen',
    basePrice: 143000,
  },
  {
    name: 'NIVEA Perfect and Radiant Body Lotion',
    brand: 'NIVEA',
    categorySlug: 'beauty',
    subCategorySlug: 'skincare',
    basePrice: 11500,
  },
  {
    name: 'CeraVe Moisturizing Cleanser',
    brand: 'CeraVe',
    categorySlug: 'beauty',
    subCategorySlug: 'skincare',
    basePrice: 28500,
    badge: 'Trending',
  },
  {
    name: 'Maybelline Fit Me Matte Foundation',
    brand: 'Maybelline',
    categorySlug: 'beauty',
    subCategorySlug: 'skincare',
    basePrice: 17800,
  },
  {
    name: 'ORS Olive Oil Hair Relaxer Kit',
    brand: 'ORS',
    categorySlug: 'beauty',
    subCategorySlug: 'haircare',
    basePrice: 9200,
  },
  {
    name: 'Lorys Hair Deep Conditioner',
    brand: 'Lorys',
    categorySlug: 'beauty',
    subCategorySlug: 'haircare',
    basePrice: 7600,
  },
  {
    name: 'Honeywell Wheat Meal Flour 5kg',
    brand: 'Honeywell',
    categorySlug: 'groceries',
    subCategorySlug: 'pantry',
    basePrice: 12900,
  },
  {
    name: 'Golden Morn Cereal 900g',
    brand: 'Golden Morn',
    categorySlug: 'groceries',
    subCategorySlug: 'pantry',
    basePrice: 4900,
  },
  {
    name: 'Bournvita Refill 500g',
    brand: 'Cadbury',
    categorySlug: 'groceries',
    subCategorySlug: 'beverages',
    basePrice: 7200,
  },
  {
    name: 'Milo Activ-Go Refill 450g',
    brand: 'Nestle',
    categorySlug: 'groceries',
    subCategorySlug: 'beverages',
    basePrice: 6800,
  },
  {
    name: 'Power Oil Vegetable Oil 3L',
    brand: 'Power Oil',
    categorySlug: 'groceries',
    subCategorySlug: 'pantry',
    basePrice: 16400,
  },
  {
    name: 'Infinix Smart Watch XW1',
    brand: 'Infinix',
    categorySlug: 'gadgets',
    subCategorySlug: 'smart-devices',
    basePrice: 39800,
  },
  {
    name: 'Oraimo FreePods Pro Plus',
    brand: 'Oraimo',
    categorySlug: 'gadgets',
    subCategorySlug: 'smart-devices',
    basePrice: 43900,
  },
  {
    name: 'Baseus 65W GaN Fast Charger',
    brand: 'Baseus',
    categorySlug: 'gadgets',
    subCategorySlug: 'accessories',
    basePrice: 28400,
  },
  {
    name: 'Anker PowerCore 20000mAh',
    brand: 'Anker',
    categorySlug: 'gadgets',
    subCategorySlug: 'accessories',
    basePrice: 39200,
  },
  {
    name: 'Men Slim Fit Chino Trouser',
    brand: 'Bespoke Man',
    categorySlug: 'fashion',
    subCategorySlug: 'men-fashion',
    basePrice: 18500,
  },
  {
    name: 'Women Pleated Maxi Dress',
    brand: 'Luxe Lady',
    categorySlug: 'fashion',
    subCategorySlug: 'women-fashion',
    basePrice: 24900,
  },
];

const STORE_BY_CATEGORY: Record<string, string> = {
  electronics: 'steppers-store-ng',
  'home-living': 'home-haven',
  beauty: 'glow-hub',
  groceries: 'fresh-basket',
  gadgets: 'tech-harbor',
  fashion: 'style-avenue',
};

function getModel<T>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

function formatMoney(amount: number): Money {
  return {
    amount,
    currency: 'NGN',
    formatted: `NGN ${amount.toLocaleString()}`,
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
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .select('_id')
      .exec();

    if (!user?._id) {
      throw new Error(`Failed to upsert seller user: ${seller.email}`);
    }

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
    if (!ownerId) {
      throw new Error(`Missing owner id for store: ${seller.storeSlug}`);
    }

    const averageRating = clamp(4.2 + (index % 5) * 0.12, 0, 5);
    const store = await storeModel
      .findOneAndUpdate(
        { slug: seller.storeSlug },
        {
          $set: {
            name: seller.storeName,
            slug: seller.storeSlug,
            logoUrl: seller.storeLogoUrl,
            owner: ownerId,
            isVerified: true,
            responseRatePercent: 92 + (index % 6),
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount: 800 + index * 125,
            joinedYear: seller.joinedYear,
            isActive: true,
            deletedAt: null,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .select('_id')
      .exec();

    if (!store?._id) {
      throw new Error(`Failed to upsert store: ${seller.storeSlug}`);
    }

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
    const categoryDoc = await categoryModel
      .findOneAndUpdate(
        { slug: category.slug },
        {
          $set: {
            name: category.name,
            slug: category.slug,
            iconUrl: category.iconUrl,
            parent: null,
            order: category.order,
            isActive: true,
            deletedAt: null,
          },
          $setOnInsert: {
            productCount: 0,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .exec();

    if (!categoryDoc?._id) {
      throw new Error(`Failed to upsert category: ${category.slug}`);
    }

    parentIds.set(category.slug, new Types.ObjectId(String(categoryDoc._id)));
    parentNames.set(category.slug, category.name);
  }

  for (const subCategory of SUB_CATEGORY_SEEDS) {
    const parentId = parentIds.get(subCategory.parentSlug);
    if (!parentId) {
      throw new Error(`Missing parent category: ${subCategory.parentSlug}`);
    }

    const subCategoryDoc = await categoryModel
      .findOneAndUpdate(
        { slug: subCategory.slug },
        {
          $set: {
            name: subCategory.name,
            slug: subCategory.slug,
            iconUrl: subCategory.iconUrl,
            parent: parentId,
            order: subCategory.order,
            isActive: true,
            deletedAt: null,
          },
          $setOnInsert: {
            productCount: 0,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .exec();

    if (!subCategoryDoc?._id) {
      throw new Error(`Failed to upsert sub category: ${subCategory.slug}`);
    }

    subCategoryIds.set(subCategory.slug, new Types.ObjectId(String(subCategoryDoc._id)));
    subCategoryNames.set(subCategory.slug, subCategory.name);
  }

  return { parentIds, subCategoryIds, parentNames, subCategoryNames };
}

function buildSections(index: number): string[] {
  const first = SECTION_KEYS[index % SECTION_KEYS.length];
  const second = SECTION_KEYS[(index + 1) % SECTION_KEYS.length];
  const sections = new Set<string>([first, second]);

  if (index % 5 === 0) {
    sections.add('best_deals');
  }

  if (index % 3 === 0) {
    sections.add('top_sellers');
  }

  return Array.from(sections);
}

function buildVariantData(slug: string, baseAmount: number, index: number): {
  variantAxes: Array<{
    name: string;
    displayName: string;
    options: Array<{ id: string; label: string; swatchHex?: string | null }>;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    attributes: Record<string, string>;
    price: Money;
    stockQty: number;
    isInStock: boolean;
    images: string[];
  }>;
  defaultVariantId: string;
} {
  const colors = [
    { id: 'midnight-black', label: 'Midnight Black', swatchHex: '#1f2d47' },
    { id: 'silver', label: 'Silver', swatchHex: '#b9bec8' },
    { id: 'sunset-red', label: 'Sunset Red', swatchHex: '#d64545' },
  ];

  const sizes = [
    { id: 's', label: 'S', priceDelta: 0 },
    { id: 'm', label: 'M', priceDelta: 2500 },
    { id: 'l', label: 'L', priceDelta: 5000 },
  ];

  const colorStart = index % colors.length;
  const activeColors = [
    colors[colorStart],
    colors[(colorStart + 1) % colors.length],
  ];

  const variantAxes = [
    {
      name: 'colour',
      displayName: 'Colour',
      options: activeColors,
    },
    {
      name: 'size',
      displayName: 'Size',
      options: sizes.map((size) => ({ id: size.id, label: size.label })),
    },
  ];

  const variants = activeColors.flatMap((color, colorIndex) =>
    sizes.map((size, sizeIndex) => {
      const amount = baseAmount + size.priceDelta;
      const stockQty = 9 + ((index + colorIndex + sizeIndex) % 18);
      const variantId = `${slug}-${color.id}-${size.id}`;
      return {
        id: variantId,
        sku: `${slug.toUpperCase()}-${color.id.toUpperCase()}-${size.id.toUpperCase()}`,
        attributes: {
          colour: color.id,
          size: size.id,
        },
        price: formatMoney(amount),
        stockQty,
        isInStock: stockQty > 0,
        images: [`https://cdn.cadnamart.dev/products/${slug}/1.webp`],
      };
    }),
  );

  return {
    variantAxes,
    variants,
    defaultVariantId: variants[0].id,
  };
}

function buildSpecifications(seed: ProductSeed): Array<{ name: string; value: string }> {
  return [
    { name: 'Brand', value: seed.brand },
    { name: 'Warranty', value: '12 Months' },
    { name: 'Condition', value: 'New' },
    { name: 'Availability', value: 'In Stock' },
  ];
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
    const priceAmount = Math.round(originalAmount * (100 - discountPercent) / 100);
    const savingsAmount = originalAmount - priceAmount;
    const sections = buildSections(index);
    const { variantAxes, variants, defaultVariantId } = buildVariantData(slug, priceAmount, index);

    const categoryName = categorySeedResult.parentNames.get(seed.categorySlug) || 'Category';
    const subCategoryName = categorySeedResult.subCategoryNames.get(seed.subCategorySlug) || 'Sub Category';
    const rating = Math.round((4.0 + (index % 8) * 0.12) * 10) / 10;
    const reviewCount = 18 + index * 7;
    const salesCount = 140 + index * 17;

    const updateResult = await productModel.updateOne(
      { slug },
      {
        $set: {
          name: seed.name,
          slug,
          sku: `SD-${String(index + 1).padStart(4, '0')}`,
          brand: seed.brand,
          thumbnailUrl: `https://cdn.cadnamart.dev/products/${slug}/thumbnail.webp`,
          price: formatMoney(priceAmount),
          originalPrice: formatMoney(originalAmount),
          discountPercent,
          savings: formatMoney(savingsAmount),
          gallery: [
            {
              id: 'img-1',
              url: `https://cdn.cadnamart.dev/products/${slug}/1.webp`,
              alt: `${seed.name} front view`,
            },
            {
              id: 'img-2',
              url: `https://cdn.cadnamart.dev/products/${slug}/2.webp`,
              alt: `${seed.name} angle view`,
            },
            {
              id: 'img-3',
              url: `https://cdn.cadnamart.dev/products/${slug}/3.webp`,
              alt: `${seed.name} detail view`,
            },
          ],
          variantAxes,
          variants,
          defaultVariantId,
          descriptionHtml: `<p>${seed.name} is built for everyday reliability and excellent performance.</p>`,
          specifications: buildSpecifications(seed),
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

    if (updateResult.upsertedCount > 0) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { inserted, updated };
}

async function syncCategoryCounts(
  categoryModel: Model<Category>,
  productModel: Model<Product>,
  categorySeedResult: CategorySeedResult,
): Promise<void> {
  const parentTasks = Array.from(categorySeedResult.parentIds.values()).map(async (categoryId) => {
    const productCount = await productModel.countDocuments({
      deletedAt: null,
      isActive: true,
      category: categoryId,
    });

    await categoryModel.updateOne({ _id: categoryId }, { $set: { productCount } });
  });

  const subCategoryTasks = Array.from(categorySeedResult.subCategoryIds.values()).map(async (subCategoryId) => {
    const productCount = await productModel.countDocuments({
      deletedAt: null,
      isActive: true,
      subCategory: subCategoryId,
    });

    await categoryModel.updateOne({ _id: subCategoryId }, { $set: { productCount } });
  });

  await Promise.all([...parentTasks, ...subCategoryTasks]);
}

async function run(): Promise<void> {
  const env = process.env.NODE_ENV || 'dev';
  const envFile = `.env.${env}`;
  dotenvConfig({ path: resolve(process.cwd(), envFile) });

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(`MONGO_URI is not configured in ${envFile}`);
  }

  console.log(`[seed-products] Connecting to MongoDB using ${envFile}...`);
  await mongoose.connect(mongoUri);

  const userModel = getModel<User>(User.name, UserSchema);
  const storeModel = getModel<Store>(Store.name, StoreSchema);
  const categoryModel = getModel<Category>(Category.name, CategorySchema);
  const productModel = getModel<Product>(Product.name, ProductSchema);

  const ownerIds = await seedUsers(userModel);
  const storeIds = await seedStores(storeModel, ownerIds);
  const categorySeedResult = await seedCategories(categoryModel);
  const { inserted, updated } = await seedProducts(productModel, categorySeedResult, storeIds);
  await syncCategoryCounts(categoryModel, productModel, categorySeedResult);

  const totalSeededProducts = await productModel.countDocuments({
    slug: /-seed$/,
    deletedAt: null,
    isActive: true,
  });

  console.log(`[seed-products] Seed complete.`);
  console.log(`[seed-products] Products inserted: ${inserted}`);
  console.log(`[seed-products] Products updated: ${updated}`);
  console.log(`[seed-products] Active seeded products in DB: ${totalSeededProducts}`);
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
