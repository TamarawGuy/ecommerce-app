// Drizzle schema — tables are introduced per vertical slice.
// #4 adds `categories`; #5 adds `products`/`variants`, etc.
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Categories form an adjacency list (`parentId` self-reference), arbitrary depth.
 * Roots have a null `parentId`. The tree is small, so the whole flat list is
 * fetched and assembled/traversed in memory (see `lib/category-tree`) — no
 * recursive SQL or ltree. Products (added later) attach to leaf categories only.
 */
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id").references(
      (): AnyPgColumn => categories.id,
      { onDelete: "cascade" }
    ),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("categories_parent_id_idx").on(t.parentId)]
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

/**
 * Products attach to a **leaf** category only (enforced by the seed, not the DB —
 * the tree is in-memory; see `lib/category-tree`). Every product is sold through
 * one or more `variants`; there is no price/stock on the product itself — those
 * live per variant so a one-size item is just a single-variant product.
 */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    categoryId: integer("category_id")
      .notNull()
      .references((): AnyPgColumn => categories.id, { onDelete: "cascade" }),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("products_category_id_idx").on(t.categoryId)]
);

/**
 * A purchasable variant of a product. `size` / `colorName` / `colorHex` are
 * nullable so a one-size, single-color item simply leaves them null. Money is
 * integer **cents** (single currency, USD). Cart, wishlist, and order items all
 * reference `variant_id` — never a bare product — so every flow has one path.
 */
export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references((): AnyPgColumn => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    size: text("size"),
    colorName: text("color_name"),
    colorHex: text("color_hex"),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    imageUrl: text("image_url"),
  },
  (t) => [index("variants_product_id_idx").on(t.productId)]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Variant = typeof variants.$inferSelect;
export type NewVariant = typeof variants.$inferInsert;
