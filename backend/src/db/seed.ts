// Catalog seed — the catalog is curated and loaded from this script (no admin UI).
// Re-runnable: it clears the category tree and re-inserts it from scratch, so the
// command can be used to re-seed (issue #41). Run with `npm run db:seed`.
//
// #4 seeds the category tree only; products/variants land with #5.
import { categories } from "./schema.js";
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

async function insertNodes(
  nodes: SeedNode[],
  parentId: number | null
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
    inserted += 1;
    if (node.children?.length) {
      inserted += await insertNodes(node.children, created!.id);
    }
  }
  return inserted;
}

async function seed(): Promise<void> {
  console.log("Seeding categories…");
  // Clear the existing tree first so the seed is re-runnable. The self-referential
  // FK is ON DELETE CASCADE, so a single delete removes the whole tree.
  await db.delete(categories);
  const count = await insertNodes(TREE, null);
  console.log(`Seeded ${count} categories.`);
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
