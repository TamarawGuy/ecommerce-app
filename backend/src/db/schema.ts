// Drizzle schema — tables are introduced per vertical slice.
// #4 adds `categories`; #5 adds `products`/`variants`, etc.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
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

/**
 * Saved shipping addresses for signed-in users. Like the wishlist, `user_id` is
 * the **Clerk** user id from the verified session JWT — authoritative on its own
 * — so there is deliberately **no** foreign key to the local `users` mirror
 * (which is populated asynchronously by the webhook and may lag or be absent in
 * dev). Every read/write is scoped by `user_id`, so a user only ever sees and
 * mutates their own rows.
 *
 * `line2` and `phone` are optional; the rest of the postal fields are required.
 * `isDefault` carries the "exactly one default" invariant: at most one row per
 * user is default at a time, enforced in a row-locked transaction by the service
 * (set-default unsets the previous). A partial unique index makes the database
 * the final backstop — at most one `is_default = true` row can exist per user.
 */
export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postal: text("postal").notNull(),
    country: text("country").notNull(),
    phone: text("phone"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("addresses_user_id_idx").on(t.userId),
    uniqueIndex("addresses_one_default_per_user_uq")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ]
);

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

/**
 * The shipping address snapshotted onto an order. Unlike `addresses` (mutable,
 * per-user, and only for signed-in users), this is a frozen copy captured at
 * checkout — guests have no saved address, and even a signed-in buyer may later
 * edit or delete the saved address the order shipped to, so the order keeps its
 * own immutable copy. Stored as `jsonb` rather than columns because it is never
 * queried, only read back whole.
 */
export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string | null;
}

/**
 * An order. Guest-first, so `userId` is nullable — a guest checks out with just
 * an email + shipping address; #12 later claims unclaimed orders onto an account
 * by matching this (lowercased) email, which is why it is indexed. `status` is
 * the lifecycle: `pending` at creation (PaymentIntent not yet succeeded), then
 * `paid` (the `payment_intent.succeeded` webhook is the **sole** authority on
 * this) or `cancelled` (stock ran out at fulfillment).
 *
 * `totalCents` is the server-recomputed authoritative total (the client never
 * sends prices), and equals the amount charged on the PaymentIntent. The unique
 * index on `stripePaymentIntentId` is the **idempotency key**: a re-delivered
 * webhook resolves to the same order row, and fulfillment runs under a row lock
 * + status check so it decrements stock exactly once. `needsRefund` flags the
 * rare oversell case — payment succeeded but stock was gone, so the order is
 * `cancelled` and owes the buyer a refund.
 */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    email: text("email").notNull(),
    shippingAddress: jsonb("shipping_address")
      .$type<ShippingAddress>()
      .notNull(),
    status: text("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    needsRefund: boolean("needs_refund").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_user_id_idx").on(t.userId),
    index("orders_email_idx").on(t.email),
    // Idempotency key for the Stripe webhook. A unique index allows many NULLs
    // (Postgres treats NULLs as distinct), so an order can exist briefly before
    // its PaymentIntent id is set, while any real id can map to only one order.
    uniqueIndex("orders_stripe_payment_intent_id_uq").on(
      t.stripePaymentIntentId
    ),
  ]
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

/**
 * A line on an order, referencing a **variant** (never a bare product) like
 * cart and wishlist, so every flow has one code path. `unitPriceCents` is a
 * snapshot of the variant's price at purchase: re-pricing the catalog later
 * never alters a historical order's total. `qty` is the quantity bought.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references((): AnyPgColumn => orders.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references((): AnyPgColumn => variants.id),
    qty: integer("qty").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)]
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
