// Shared category-tree module (FE/BE). Pure functions — no SQL, no I/O.
//
// The category table is an adjacency list (`parent_id`). The tree is small, so we
// fetch the whole flat list once and assemble + traverse it in memory rather than
// using recursive SQL or ltree. This module is the single source of truth for that
// logic; the frontend keeps a copy (no monorepo tooling yet).

/** A flat category row as stored/returned by the API. */
export interface CategoryRow {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
}

/** A category row with its children resolved into a nested tree. */
export interface CategoryNode extends CategoryRow {
  children: CategoryNode[];
}

/**
 * Assembles a flat list of adjacency-list rows into a nested tree.
 *
 * Roots are rows with `parentId === null`. A row whose `parentId` points at an
 * id not present in `rows` is an orphan and is dropped (it is unreachable from
 * any root). Siblings — at every level, including the roots — are ordered by
 * `sortOrder`, then `name` as a stable tiebreaker.
 */
export function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>();
  for (const r of rows) {
    byId.set(r.id, { ...r, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId === null) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    }
    // else: orphan (missing parent) — dropped.
  }

  const bySortThenName = (a: CategoryNode, b: CategoryNode) =>
    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort(bySortThenName);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);

  return roots;
}

/** Finds a node anywhere in the tree by id, or `undefined` if absent. */
export function findNode(
  nodes: CategoryNode[],
  id: number
): CategoryNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Returns the ids of every leaf at or beneath `categoryId`, in tree order.
 *
 * A leaf is a node with no children, so a leaf category resolves to just itself.
 * This is how the client turns a tapped category (at any depth) into the set of
 * leaf categories whose products to list — products attach to leaves only.
 * Returns `[]` when `categoryId` is not in the tree.
 */
export function descendantLeafIds(
  tree: CategoryNode[],
  categoryId: number
): number[] {
  const node = findNode(tree, categoryId);
  if (!node) return [];

  const leaves: number[] = [];
  const collect = (n: CategoryNode) => {
    if (n.children.length === 0) {
      leaves.push(n.id);
      return;
    }
    for (const child of n.children) collect(child);
  };
  collect(node);
  return leaves;
}
