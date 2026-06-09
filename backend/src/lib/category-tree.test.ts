import { describe, expect, it } from "vitest";

import {
  buildTree,
  descendantLeafIds,
  findNode,
  type CategoryRow,
} from "./category-tree.js";

/** Build a row with sensible defaults so tests only specify what matters. */
function row(partial: Partial<CategoryRow> & { id: number }): CategoryRow {
  return {
    parentId: null,
    name: `cat-${partial.id}`,
    slug: `cat-${partial.id}`,
    imageUrl: null,
    sortOrder: 0,
    ...partial,
  };
}

describe("buildTree", () => {
  it("returns top-level rows as roots with empty children", () => {
    const tree = buildTree([row({ id: 1, name: "Men" })]);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ id: 1, name: "Men", children: [] });
  });

  it("nests children under parents across arbitrary depth", () => {
    // Men → Shoes → Sneakers (3 levels). Rows deliberately out of order.
    const tree = buildTree([
      row({ id: 3, parentId: 2, name: "Sneakers" }),
      row({ id: 1, name: "Men" }),
      row({ id: 2, parentId: 1, name: "Shoes" }),
    ]);

    expect(tree).toHaveLength(1);
    const men = tree[0]!;
    expect(men.id).toBe(1);
    expect(men.children).toHaveLength(1);
    const shoes = men.children[0]!;
    expect(shoes.id).toBe(2);
    expect(shoes.children.map((c) => c.id)).toEqual([3]);
    expect(shoes.children[0]!.children).toEqual([]);
  });

  it("orders siblings by sortOrder then name", () => {
    const tree = buildTree([
      row({ id: 1, parentId: null, name: "Women", sortOrder: 2 }),
      row({ id: 2, parentId: null, name: "Men", sortOrder: 1 }),
      row({ id: 3, parentId: null, name: "Accessories", sortOrder: 1 }),
    ]);

    // sortOrder 1 before 2; within sortOrder 1, "Accessories" before "Men".
    expect(tree.map((n) => n.name)).toEqual(["Accessories", "Men", "Women"]);
  });

  it("returns an empty tree for an empty list", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("drops orphans whose parent is not present", () => {
    const tree = buildTree([
      row({ id: 1, name: "Men" }),
      row({ id: 99, parentId: 42, name: "Ghost" }), // parent 42 does not exist
    ]);

    expect(tree.map((n) => n.id)).toEqual([1]);
  });
});

describe("descendantLeafIds", () => {
  // A small catalog used across the cases below:
  //   Men (1)
  //     Shoes (2)
  //       Sneakers (3, leaf)
  //       Boots (4, leaf)
  //     Hats (5, leaf)
  //   Women (6)
  //     Bags (7, leaf)
  const tree = buildTree([
    row({ id: 1, name: "Men" }),
    row({ id: 2, parentId: 1, name: "Shoes" }),
    row({ id: 3, parentId: 2, name: "Sneakers" }),
    row({ id: 4, parentId: 2, name: "Boots" }),
    row({ id: 5, parentId: 1, name: "Hats" }),
    row({ id: 6, name: "Women" }),
    row({ id: 7, parentId: 6, name: "Bags" }),
  ]);

  it("returns the node itself when it is a leaf", () => {
    expect(descendantLeafIds(tree, 3)).toEqual([3]);
  });

  it("collects leaves beneath an intermediate node", () => {
    // Shoes (2) → Sneakers (3), Boots (4).
    expect(descendantLeafIds(tree, 2).sort()).toEqual([3, 4]);
  });

  it("collects all leaves beneath a root across arbitrary depth", () => {
    // Men (1) spans Sneakers (3) + Boots (4) under Shoes, plus Hats (5).
    expect(descendantLeafIds(tree, 1).sort()).toEqual([3, 4, 5]);
  });

  it("returns an empty array when the category is not in the tree", () => {
    expect(descendantLeafIds(tree, 999)).toEqual([]);
  });

  it("returns an empty array for an empty tree", () => {
    expect(descendantLeafIds([], 1)).toEqual([]);
  });
});

describe("findNode", () => {
  const tree = buildTree([
    row({ id: 1, name: "Men" }),
    row({ id: 2, parentId: 1, name: "Shoes" }),
    row({ id: 3, parentId: 2, name: "Sneakers" }),
  ]);

  it("finds a nested node by id and exposes its children", () => {
    const shoes = findNode(tree, 2);
    expect(shoes?.name).toBe("Shoes");
    expect(shoes?.children.map((c) => c.id)).toEqual([3]);
  });

  it("returns undefined when the id is absent", () => {
    expect(findNode(tree, 999)).toBeUndefined();
  });
});
