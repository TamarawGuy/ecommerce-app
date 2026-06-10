import { describe, expect, it } from "vitest";

import {
  filterByPriceAndStock,
  parseProductQuery,
  sortProducts,
  type ProductSort,
} from "./product-query.js";

describe("parseProductQuery", () => {
  it("defaults to the 'featured' sort, no filters, when the query is empty", () => {
    expect(parseProductQuery({})).toEqual({
      sort: "featured",
      inStock: false,
    });
  });

  describe("q", () => {
    it("keeps a non-empty search term, trimmed", () => {
      expect(parseProductQuery({ q: "  sneaker " }).q).toBe("sneaker");
    });

    it("drops an empty/whitespace term to undefined", () => {
      expect(parseProductQuery({ q: "   " }).q).toBeUndefined();
      expect(parseProductQuery({ q: "" }).q).toBeUndefined();
      expect(parseProductQuery({}).q).toBeUndefined();
    });

    it("ignores a non-string term", () => {
      expect(parseProductQuery({ q: ["a", "b"] }).q).toBeUndefined();
    });
  });

  describe("sort", () => {
    it.each<ProductSort>(["price_asc", "price_desc", "newest", "featured"])(
      "accepts the known sort %s",
      (sort) => {
        expect(parseProductQuery({ sort }).sort).toBe(sort);
      }
    );

    it("falls back to 'featured' for an unknown or missing sort", () => {
      expect(parseProductQuery({ sort: "cheapest" }).sort).toBe("featured");
      expect(parseProductQuery({ sort: 123 }).sort).toBe("featured");
      expect(parseProductQuery({}).sort).toBe("featured");
    });
  });

  describe("minPrice / maxPrice (integer cents)", () => {
    it("parses non-negative integer cents", () => {
      const f = parseProductQuery({ minPrice: "1000", maxPrice: "5000" });
      expect(f.minPriceCents).toBe(1000);
      expect(f.maxPriceCents).toBe(5000);
    });

    it("accepts zero as a valid bound", () => {
      expect(parseProductQuery({ minPrice: "0" }).minPriceCents).toBe(0);
    });

    it("rejects negative, fractional, or non-numeric bounds", () => {
      expect(parseProductQuery({ minPrice: "-5" }).minPriceCents).toBeUndefined();
      expect(parseProductQuery({ maxPrice: "abc" }).maxPriceCents).toBeUndefined();
      expect(parseProductQuery({ minPrice: "12.5" }).minPriceCents).toBeUndefined();
      expect(parseProductQuery({ maxPrice: "" }).maxPriceCents).toBeUndefined();
    });
  });

  describe("inStock", () => {
    it("is true only for the literal string 'true'", () => {
      expect(parseProductQuery({ inStock: "true" }).inStock).toBe(true);
      expect(parseProductQuery({ inStock: "false" }).inStock).toBe(false);
      expect(parseProductQuery({ inStock: "1" }).inStock).toBe(false);
      expect(parseProductQuery({}).inStock).toBe(false);
    });
  });

  describe("categoryIds", () => {
    it("parses a comma list of positive integers", () => {
      expect(parseProductQuery({ categoryIds: "3, 4 ,5" }).categoryIds).toEqual([
        3, 4, 5,
      ]);
    });

    it("drops non-positive / non-integer ids and is undefined when none remain", () => {
      expect(parseProductQuery({ categoryIds: "3,-1,x,0" }).categoryIds).toEqual([
        3,
      ]);
      expect(parseProductQuery({ categoryIds: "x,0,-2" }).categoryIds).toBeUndefined();
      expect(parseProductQuery({}).categoryIds).toBeUndefined();
    });
  });

  it("composes every filter together", () => {
    expect(
      parseProductQuery({
        q: "tee",
        sort: "price_asc",
        minPrice: "1000",
        maxPrice: "3000",
        inStock: "true",
        categoryIds: "7,8",
      })
    ).toEqual({
      q: "tee",
      sort: "price_asc",
      minPriceCents: 1000,
      maxPriceCents: 3000,
      inStock: true,
      categoryIds: [7, 8],
    });
  });
});

// A minimal item shape covering both the filter and sort field requirements.
function item(
  partial: Partial<{
    id: number;
    name: string;
    isFeatured: boolean;
    fromPriceCents: number;
    inStock: boolean;
    createdAt: Date;
  }> & { id: number }
) {
  return {
    name: `p-${partial.id}`,
    isFeatured: false,
    fromPriceCents: 1000,
    inStock: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...partial,
  };
}

describe("filterByPriceAndStock", () => {
  const items = [
    item({ id: 1, fromPriceCents: 1000, inStock: true }),
    item({ id: 2, fromPriceCents: 2500, inStock: false }),
    item({ id: 3, fromPriceCents: 5000, inStock: true }),
  ];

  it("returns everything when no price/stock filter is set", () => {
    expect(
      filterByPriceAndStock(items, { inStock: false }).map((i) => i.id)
    ).toEqual([1, 2, 3]);
  });

  it("keeps items whose from-price is >= minPriceCents (inclusive)", () => {
    expect(
      filterByPriceAndStock(items, {
        minPriceCents: 2500,
        inStock: false,
      }).map((i) => i.id)
    ).toEqual([2, 3]);
  });

  it("keeps items whose from-price is <= maxPriceCents (inclusive)", () => {
    expect(
      filterByPriceAndStock(items, {
        maxPriceCents: 2500,
        inStock: false,
      }).map((i) => i.id)
    ).toEqual([1, 2]);
  });

  it("keeps only in-stock items when inStock is set", () => {
    expect(
      filterByPriceAndStock(items, { inStock: true }).map((i) => i.id)
    ).toEqual([1, 3]);
  });

  it("composes price range and in-stock together", () => {
    expect(
      filterByPriceAndStock(items, {
        minPriceCents: 1500,
        maxPriceCents: 6000,
        inStock: true,
      }).map((i) => i.id)
    ).toEqual([3]);
  });

  it("does not mutate the input array", () => {
    const input = [...items];
    filterByPriceAndStock(input, { inStock: true });
    expect(input.map((i) => i.id)).toEqual([1, 2, 3]);
  });
});

describe("sortProducts", () => {
  const a = item({
    id: 1,
    name: "Alpha",
    isFeatured: false,
    fromPriceCents: 3000,
    createdAt: new Date("2024-03-01T00:00:00Z"),
  });
  const b = item({
    id: 2,
    name: "Bravo",
    isFeatured: true,
    fromPriceCents: 1000,
    createdAt: new Date("2024-01-01T00:00:00Z"),
  });
  const c = item({
    id: 3,
    name: "Charlie",
    isFeatured: false,
    fromPriceCents: 2000,
    createdAt: new Date("2024-06-01T00:00:00Z"),
  });
  const items = [a, b, c];

  it("price_asc orders by from-price ascending", () => {
    expect(sortProducts(items, "price_asc").map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it("price_desc orders by from-price descending", () => {
    expect(sortProducts(items, "price_desc").map((i) => i.id)).toEqual([1, 3, 2]);
  });

  it("newest orders by createdAt descending", () => {
    expect(sortProducts(items, "newest").map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it("featured puts featured first, then by name", () => {
    expect(sortProducts(items, "featured").map((i) => i.id)).toEqual([2, 1, 3]);
  });

  it("breaks price ties by name ascending", () => {
    const tie = [
      item({ id: 1, name: "Zed", fromPriceCents: 1000 }),
      item({ id: 2, name: "Ann", fromPriceCents: 1000 }),
    ];
    expect(sortProducts(tie, "price_asc").map((i) => i.id)).toEqual([2, 1]);
  });

  it("does not mutate the input array", () => {
    const input = [...items];
    sortProducts(input, "price_asc");
    expect(input.map((i) => i.id)).toEqual([1, 2, 3]);
  });
});
