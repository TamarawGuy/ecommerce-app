import { asc } from "drizzle-orm";

import { db } from "../db/index.js";
import { categories, type Category } from "../db/schema.js";

/**
 * Returns the full flat list of categories. The tree is small and cached
 * client-side, where it is assembled and traversed in memory (see the shared
 * `category-tree` module) — so the API never builds the tree server-side.
 * Ordered by `sortOrder` then `name` so the client renders siblings stably.
 */
export async function listCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}
