// Catalog seed — the catalog is curated and loaded from this script (no admin UI).
// Re-runnable: it clears the catalog and re-inserts it from scratch, so the
// command can be used to re-seed (issue #41). Run with `npm run db:seed`.
//
// #4 seeded the category tree; #5 adds products + variants attached to leaf
// categories. Every product has ≥1 variant; money is integer cents.
import { categories, products, variants } from "./schema.js";
import { db, pool } from "./index.js";

interface SeedNode {
  name: string;
  slug: string;
  children?: SeedNode[];
}

// A multi-level tree (≥3 deep, e.g. Men → Shoes → Sneakers). Products attach to
// the leaves only. Sibling order follows array order via `sortOrder`.
const TREE: SeedNode[] = [
  {
    name: "Men",
    slug: "men",
    children: [
      {
        name: "Shoes",
        slug: "men-shoes",
        children: [
          { name: "Sneakers", slug: "men-sneakers" },
          { name: "Boots", slug: "men-boots" },
          { name: "Sandals", slug: "men-sandals" },
        ],
      },
      {
        name: "Clothing",
        slug: "men-clothing",
        children: [
          { name: "T-Shirts", slug: "men-tshirts" },
          { name: "Jackets", slug: "men-jackets" },
        ],
      },
      {
        name: "Accessories",
        slug: "men-accessories",
        children: [
          { name: "Hats", slug: "men-hats" },
          { name: "Sunglasses", slug: "men-sunglasses" },
        ],
      },
    ],
  },
  {
    name: "Women",
    slug: "women",
    children: [
      {
        name: "Shoes",
        slug: "women-shoes",
        children: [
          { name: "Heels", slug: "women-heels" },
          { name: "Flats", slug: "women-flats" },
          { name: "Sneakers", slug: "women-sneakers" },
        ],
      },
      {
        name: "Clothing",
        slug: "women-clothing",
        children: [
          { name: "Dresses", slug: "women-dresses" },
          { name: "Tops", slug: "women-tops" },
        ],
      },
      {
        name: "Bags",
        slug: "women-bags",
        children: [
          { name: "Totes", slug: "women-totes" },
          { name: "Crossbody", slug: "women-crossbody" },
        ],
      },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    children: [
      { name: "Watches", slug: "watches" },
      { name: "Caps", slug: "caps" },
    ],
  },
];

// Deterministic placeholder imagery keyed by slug (real product photography
// arrives with the catalog in #5).
function imageFor(slug: string): string {
  return `https://picsum.photos/seed/${slug}/600/400`;
}

// Inserts the tree and records each slug → id so products can attach to leaves.
async function insertNodes(
  nodes: SeedNode[],
  parentId: number | null,
  slugToId: Map<string, number>
): Promise<number> {
  let inserted = 0;
  let sortOrder = 0;
  for (const node of nodes) {
    const [created] = await db
      .insert(categories)
      .values({
        parentId,
        name: node.name,
        slug: node.slug,
        imageUrl: imageFor(node.slug),
        sortOrder: sortOrder++,
      })
      .returning({ id: categories.id });
    slugToId.set(node.slug, created!.id);
    inserted += 1;
    if (node.children?.length) {
      inserted += await insertNodes(node.children, created!.id, slugToId);
    }
  }
  return inserted;
}

// ── Products ────────────────────────────────────────────────────────────────
// Product imagery is sourced from Unsplash. We store the bare photo URL (no size
// params); the app appends `?w=…&q=…&auto=format` — small in lists, full on
// detail — so a single source serves both without N+1 image variants.
function unsplash(photo: string): string {
  return `https://images.unsplash.com/${photo}`;
}

interface SeedVariant {
  sku: string;
  size?: string;
  colorName?: string;
  colorHex?: string;
  priceCents: number;
  stock: number;
  photo: string;
}

interface SeedProduct {
  name: string;
  description: string;
  /** Slug of the **leaf** category this product attaches to. */
  categorySlug: string;
  isFeatured?: boolean;
  variants: SeedVariant[];
}

// A t-shirt sold in size × color: every size for every color. One combination
// (M / White) is deliberately out of stock to exercise the unavailable-option
// and resolved-but-OOS paths in the variant resolver and detail UI.
function tshirtVariants(): SeedVariant[] {
  const colors = [
    { name: "Black", hex: "#111111", photo: "photo-1521572163474-6864f9cf17ab" },
    { name: "White", hex: "#f5f5f5", photo: "photo-1583743814966-8936f5b7be1a" },
  ];
  const sizes = ["S", "M", "L"];
  const out: SeedVariant[] = [];
  for (const color of colors) {
    for (const size of sizes) {
      out.push({
        sku: `TEE-${color.name[0]}-${size}`,
        size,
        colorName: color.name,
        colorHex: color.hex,
        priceCents: 2499,
        stock: color.name === "White" && size === "M" ? 0 : 12,
        photo: color.photo,
      });
    }
  }
  return out;
}

// Sneakers in a range of (numeric) sizes, single color. Size 12 is sold out.
function sneakerVariants(): SeedVariant[] {
  const photo = "photo-1542291026-7eec264c27ff";
  return ["8", "9", "10", "11", "12"].map((size) => ({
    sku: `SNK-RED-${size}`,
    size,
    colorName: "Crimson",
    colorHex: "#b3122b",
    priceCents: 8900,
    stock: size === "12" ? 0 : 6,
    photo,
  }));
}

// A single-color item offered across a list of sizes. `soldOut` names any sizes
// that should be out of stock (to exercise the unavailable-option path).
function sizedVariants(
  skuPrefix: string,
  sizes: string[],
  base: {
    colorName?: string;
    colorHex?: string;
    priceCents: number;
    stock: number;
    photo: string;
    soldOut?: string[];
  }
): SeedVariant[] {
  return sizes.map((size) => ({
    sku: `${skuPrefix}-${size}`,
    size,
    colorName: base.colorName,
    colorHex: base.colorHex,
    priceCents: base.priceCents,
    stock: base.soldOut?.includes(size) ? 0 : base.stock,
    photo: base.photo,
  }));
}

const CATALOG: SeedProduct[] = [
  {
    name: "Everyday Cotton Tee",
    description:
      "A heavyweight 100% organic cotton t-shirt with a relaxed fit and a clean, durable crew neck. Pre-shrunk so it keeps its shape wash after wash.",
    categorySlug: "men-tshirts",
    isFeatured: true,
    variants: tshirtVariants(),
  },
  {
    name: "Linen Blend Pocket Tee",
    description:
      "A breathable linen-cotton blend tee with a chest pocket and a slightly longer hem. Lightweight enough for warm days.",
    categorySlug: "men-tshirts",
    variants: sizedVariants("TEE-LIN", ["S", "M", "L", "XL"], {
      colorName: "Sand",
      colorHex: "#d8c4a0",
      priceCents: 2900,
      stock: 9,
      photo: "photo-1622445275576-721325763afe",
      soldOut: ["XL"],
    }),
  },
  {
    name: "Trailblazer Low Sneakers",
    description:
      "Lightweight everyday sneakers with a cushioned footbed and a grippy rubber outsole. Built for long days on your feet.",
    categorySlug: "men-sneakers",
    isFeatured: true,
    variants: sneakerVariants(),
  },
  {
    name: "Court Classic Sneakers",
    description:
      "A clean, low-top leather sneaker with a minimal court silhouette and a vulcanized rubber sole. Goes with everything.",
    categorySlug: "men-sneakers",
    variants: sizedVariants("SNK-CRT", ["8", "9", "10", "11"], {
      colorName: "White",
      colorHex: "#f5f5f5",
      priceCents: 7500,
      stock: 8,
      photo: "photo-1600185365483-26d7a4cc7519",
    }),
  },
  {
    name: "Runner Knit Sneakers",
    description:
      "A breathable engineered-knit upper on a responsive foam midsole. Sock-like fit for everyday miles.",
    categorySlug: "men-sneakers",
    isFeatured: true,
    variants: sizedVariants("SNK-RUN", ["8", "9", "10", "11", "12"], {
      colorName: "Slate",
      colorHex: "#475569",
      priceCents: 9900,
      stock: 5,
      photo: "photo-1539185441755-769473a23570",
      soldOut: ["8"],
    }),
  },
  {
    // Single-variant, one-size item — the picker should collapse away.
    name: "Classic Six-Panel Cap",
    description:
      "An adjustable cotton-twill cap with a curved brim and a brass buckle closure. One size fits most.",
    categorySlug: "caps",
    variants: [
      {
        sku: "CAP-KHA-OS",
        colorName: "Khaki",
        colorHex: "#b3a07a",
        priceCents: 2200,
        stock: 20,
        photo: "photo-1588850561407-ed78c282e89b",
      },
    ],
  },
  {
    name: "Wool Baseball Cap",
    description:
      "A structured wool-blend cap with a flat embroidered crest and an adjustable strapback. Warm, with a vintage feel.",
    categorySlug: "caps",
    variants: [
      {
        sku: "CAP-NVY-OS",
        colorName: "Navy",
        colorHex: "#1f2a44",
        priceCents: 2800,
        stock: 11,
        photo: "photo-1521369909029-2afed882baee",
      },
    ],
  },
  {
    // Single-variant, one-size item — the picker should collapse away.
    name: "Voyager Polarized Sunglasses",
    description:
      "Polarized lenses with full UV400 protection in a lightweight acetate frame. Includes a hard case and cleaning cloth.",
    categorySlug: "men-sunglasses",
    isFeatured: true,
    variants: [
      {
        sku: "SUN-TOR-OS",
        colorName: "Tortoise",
        colorHex: "#5a3a22",
        priceCents: 5900,
        stock: 14,
        photo: "photo-1572635196237-14b3f281503f",
      },
    ],
  },
  {
    name: "Aviator Metal Sunglasses",
    description:
      "Classic teardrop aviators with a thin gold-tone metal frame and gradient lenses. Spring hinges for a comfortable fit.",
    categorySlug: "men-sunglasses",
    variants: [
      {
        sku: "SUN-GLD-OS",
        colorName: "Gold",
        colorHex: "#c9a227",
        priceCents: 6500,
        stock: 7,
        photo: "photo-1511499767150-a48a237f0083",
      },
    ],
  },
  {
    name: "Chelsea Leather Boots",
    description:
      "Sleek pull-on Chelsea boots in full-grain leather with elastic side panels and a stacked heel. Resole-friendly.",
    categorySlug: "men-boots",
    variants: sizedVariants("BOOT-CHE", ["8", "9", "10", "11"], {
      colorName: "Chestnut",
      colorHex: "#6b4326",
      priceCents: 14900,
      stock: 4,
      photo: "photo-1605812860427-4024433a70fd",
      soldOut: ["11"],
    }),
  },
  {
    name: "Summer Wrap Dress",
    description:
      "A flowy viscose wrap dress with a flattering V-neck and a tie waist. Falls just below the knee.",
    categorySlug: "women-dresses",
    isFeatured: true,
    variants: sizedVariants("DRS-WRP", ["XS", "S", "M", "L"], {
      colorName: "Terracotta",
      colorHex: "#c66b4e",
      priceCents: 7900,
      stock: 6,
      photo: "photo-1595777457583-95e059d581b8",
      soldOut: ["XS"],
    }),
  },
  // NOTE: many leaf categories (e.g. "men-sandals", "women-crossbody") are left
  // intentionally without products so the list's empty state is reachable.
  {
    // Single-variant item that is fully out of stock — exercises the card's
    // out-of-stock marker on the list screen.
    name: "Heritage Automatic Watch",
    description:
      "A 40mm stainless-steel automatic watch with a sapphire crystal and a genuine leather strap. Water resistant to 50m.",
    categorySlug: "watches",
    variants: [
      {
        sku: "WCH-SLV-OS",
        colorName: "Silver",
        colorHex: "#c7ccd1",
        priceCents: 18900,
        stock: 0,
        photo: "photo-1523275335684-37898b6baf30",
      },
    ],
  },
];

async function insertCatalog(slugToId: Map<string, number>): Promise<{
  productCount: number;
  variantCount: number;
}> {
  let productCount = 0;
  let variantCount = 0;
  for (const product of CATALOG) {
    const categoryId = slugToId.get(product.categorySlug);
    if (categoryId === undefined) {
      throw new Error(
        `Product "${product.name}" references unknown category slug "${product.categorySlug}"`
      );
    }
    const [created] = await db
      .insert(products)
      .values({
        name: product.name,
        description: product.description,
        categoryId,
        isFeatured: product.isFeatured ?? false,
      })
      .returning({ id: products.id });
    productCount += 1;

    await db.insert(variants).values(
      product.variants.map((v) => ({
        productId: created!.id,
        sku: v.sku,
        size: v.size ?? null,
        colorName: v.colorName ?? null,
        colorHex: v.colorHex ?? null,
        priceCents: v.priceCents,
        stock: v.stock,
        imageUrl: unsplash(v.photo),
      }))
    );
    variantCount += product.variants.length;
  }
  return { productCount, variantCount };
}

async function seed(): Promise<void> {
  // Clear the existing catalog first so the seed is re-runnable. Deleting the
  // category tree cascades to products and then variants (ON DELETE CASCADE), so
  // a single delete clears everything; we order the deletes explicitly anyway.
  await db.delete(variants);
  await db.delete(products);
  await db.delete(categories);

  console.log("Seeding categories…");
  const slugToId = new Map<string, number>();
  const count = await insertNodes(TREE, null, slugToId);
  console.log(`Seeded ${count} categories.`);

  console.log("Seeding products…");
  const { productCount, variantCount } = await insertCatalog(slugToId);
  console.log(`Seeded ${productCount} products (${variantCount} variants).`);
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });
