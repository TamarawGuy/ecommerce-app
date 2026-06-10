// Pure query logic for the product list/discovery endpoint — no SQL, no I/O.
//
// `GET /products` accepts text search (`q`), a `sort`, a price range, an
// `inStock` flag, and a leaf-category restriction. The raw query string is
// parsed/validated here, and the per-product aggregates (the "from" price and
// the in-stock flag, computed in the service without an N+1) are filtered and
// sorted here. Keeping this pure makes the easy-to-get-wrong bits — parsing,
// how the filters compose, and the sort mapping — unit-testable in isolation.

/** The supported sort orders. `featured` is the default catalog ordering. */
export type ProductSort = "featured" | "price_asc" | "price_desc" | "newest";

const SORTS: readonly ProductSort[] = [
  "featured",
  "price_asc",
  "price_desc",
  "newest",
];

/** A parsed, validated product query. Absent filters are simply `undefined`. */
export interface ProductQuery {
  /** Restrict to these leaf category ids (products attach to leaves only). */
  categoryIds?: number[];
  /** Fuzzy text search over name/description (trigram-matched in SQL). */
  q?: string;
  sort: ProductSort;
  /** Inclusive price bounds on the product's "from" (cheapest variant) price. */
  minPriceCents?: number;
  maxPriceCents?: number;
  /** When true, hide products with no in-stock variant. */
  inStock: boolean;
}

/** Parses `?categoryIds=1,2,3` into positive integers, or `undefined` if none. */
function parseCategoryIds(raw: unknown): number[] | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : undefined;
}

/** Parses a non-negative integer cents bound, or `undefined` if invalid. */
function parsePriceCents(raw: unknown): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/**
 * Normalizes a raw Express `req.query` object into a {@link ProductQuery}.
 * Unknown/invalid values fall back to sensible defaults (no filter, `featured`
 * sort) rather than erroring, so a malformed query still returns the catalog.
 */
export function parseProductQuery(raw: Record<string, unknown>): ProductQuery {
  const q =
    typeof raw.q === "string" && raw.q.trim() !== "" ? raw.q.trim() : undefined;

  const sort: ProductSort =
    typeof raw.sort === "string" && (SORTS as string[]).includes(raw.sort)
      ? (raw.sort as ProductSort)
      : "featured";

  return {
    categoryIds: parseCategoryIds(raw.categoryIds),
    q,
    sort,
    minPriceCents: parsePriceCents(raw.minPrice),
    maxPriceCents: parsePriceCents(raw.maxPrice),
    inStock: raw.inStock === "true",
  };
}

/** The aggregate fields the price/stock filter reads. */
interface Priceable {
  fromPriceCents: number;
  inStock: boolean;
}

/**
 * Filters products by the price range (inclusive, against the "from" price) and
 * the in-stock flag. Returns a new array; both bounds and the flag compose.
 */
export function filterByPriceAndStock<T extends Priceable>(
  items: T[],
  filter: Pick<ProductQuery, "minPriceCents" | "maxPriceCents" | "inStock">
): T[] {
  return items.filter((item) => {
    if (filter.minPriceCents != null && item.fromPriceCents < filter.minPriceCents)
      return false;
    if (filter.maxPriceCents != null && item.fromPriceCents > filter.maxPriceCents)
      return false;
    if (filter.inStock && !item.inStock) return false;
    return true;
  });
}

/** The fields each sort order reads. */
interface Sortable {
  name: string;
  isFeatured: boolean;
  fromPriceCents: number;
  createdAt: Date;
}

const byName = (a: Sortable, b: Sortable) => a.name.localeCompare(b.name);

/**
 * Returns a new array sorted by the given order. `name` ascending is the stable
 * tiebreaker throughout; `featured` (the default) lists featured products first.
 */
export function sortProducts<T extends Sortable>(
  items: T[],
  sort: ProductSort
): T[] {
  const sorted = [...items];
  switch (sort) {
    case "price_asc":
      sorted.sort((a, b) => a.fromPriceCents - b.fromPriceCents || byName(a, b));
      break;
    case "price_desc":
      sorted.sort((a, b) => b.fromPriceCents - a.fromPriceCents || byName(a, b));
      break;
    case "newest":
      sorted.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || byName(a, b)
      );
      break;
    case "featured":
      sorted.sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || byName(a, b)
      );
      break;
  }
  return sorted;
}
