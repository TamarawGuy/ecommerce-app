// Drizzle schema — tables are introduced per vertical slice.
// #4 adds `categories`; #5 adds `products`/`variants`, etc.
import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  serial,
  text,
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
