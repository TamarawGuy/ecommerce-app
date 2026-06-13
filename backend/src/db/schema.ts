// Drizzle schema — tables are introduced per vertical slice.
// #4 adds `categories`; #5 adds `products`/`variants`, etc.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
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
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    // Fuzzy search (`?q=`) matches name/description by substring or trigram
    // similarity; a GIN trigram index accelerates both ILIKE and the `%`
    // operator. Requires the `pg_trgm` extension (created in the migration).
    index("products_search_trgm_idx").using(
      "gin",
      sql`${t.name} gin_trgm_ops`,
      sql`${t.description} gin_trgm_ops`
    ),
  ]
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

/**
 * Application users, keyed by the Clerk `userId` (a string, not a serial). Rows
 * are written by the Clerk webhook (`user.created` / `user.updated`) — Clerk is
 * the source of truth for identity, so there is no local password or signup. The
 * `email` is stored lowercased; a later slice (#12) claims past guest orders by
 * matching this email, so it is indexed.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * Server-side wishlist for signed-in users. Guests keep a device-local list that
 * is union-merged into this table on first login. Like cart and order items, a
 * wishlist row references a **variant** (never a bare product) so every flow has
 * one code path. The unique `(user_id, variant_id)` index makes the data model
 * do the de-duping for us: a repeated add — or a merge that re-sends a variant
 * already saved — is a no-op via `onConflictDoNothing`, so merge-on-login is a
 * true union with no duplicates. That composite index also serves the
 * by-user listing (its leftmost column is `user_id`), so no separate index is
 * needed.
 *
 * `user_id` is the **Clerk** user id taken from the verified session JWT, which
 * is authoritative on its own — so there is deliberately **no** foreign key to
 * the local `users` mirror. That mirror is populated asynchronously by the Clerk
 * webhook (and may lag a freshly signed-up user, or be unreachable in dev), and
 * the rest of the app already treats it as eventual (see `me` returning
 * `synced: false`). Gating wishlist writes on the mirror row existing would make
 * "save to wishlist" fail during the sign-up → first-action race; keying on the
 * JWT subject instead keeps it working immediately. The `variant_id` FK stays —
 * variants are seeded and always present.
 */
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    variantId: integer("variant_id")
      .notNull()
      .references((): AnyPgColumn => variants.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("wishlist_items_user_variant_uq").on(t.userId, t.variantId),
  ]
);

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type NewWishlistItem = typeof wishlistItems.$inferInsert;
