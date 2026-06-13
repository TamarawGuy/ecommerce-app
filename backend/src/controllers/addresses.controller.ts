import type { Request, Response } from "express";

import { getUserId } from "../middleware/auth.js";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressInput,
} from "../services/addresses.service.js";

/** All handlers run behind `requireUser`, so `getUserId` always resolves. */

export async function getAddresses(req: Request, res: Response): Promise<void> {
  try {
    const items = await listAddresses(getUserId(req));
    res.status(200).json({ items });
  } catch (err) {
    fail(res, err);
  }
}

export async function postAddress(req: Request, res: Response): Promise<void> {
  const input = parseAddress(req.body);
  if (!input) {
    res.status(400).json({ status: "error", message: "Invalid address" });
    return;
  }
  const makeDefault = (req.body as { isDefault?: unknown })?.isDefault === true;

  try {
    const address = await createAddress(getUserId(req), input, makeDefault);
    res.status(201).json({ address });
  } catch (err) {
    fail(res, err);
  }
}

export async function patchAddress(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ status: "error", message: "Invalid id" });
    return;
  }
  const input = parseAddress(req.body);
  if (!input) {
    res.status(400).json({ status: "error", message: "Invalid address" });
    return;
  }

  try {
    const address = await updateAddress(getUserId(req), id, input);
    if (!address) {
      res.status(404).json({ status: "error", message: "Address not found" });
      return;
    }
    res.status(200).json({ address });
  } catch (err) {
    fail(res, err);
  }
}

export async function makeDefaultAddress(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ status: "error", message: "Invalid id" });
    return;
  }

  try {
    const address = await setDefaultAddress(getUserId(req), id);
    if (!address) {
      res.status(404).json({ status: "error", message: "Address not found" });
      return;
    }
    res.status(200).json({ address });
  } catch (err) {
    fail(res, err);
  }
}

export async function removeAddress(req: Request, res: Response): Promise<void> {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ status: "error", message: "Invalid id" });
    return;
  }

  try {
    const deleted = await deleteAddress(getUserId(req), id);
    if (!deleted) {
      res.status(404).json({ status: "error", message: "Address not found" });
      return;
    }
    res.status(200).json({ status: "ok" });
  } catch (err) {
    fail(res, err);
  }
}

function parseId(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Validates and normalizes an address from a request body. The required fields
 * must be non-empty strings; `line2` and `phone` are optional and stored as null
 * when absent or blank. Returns null on any violation so the caller can 400.
 * Zod still validates on the client; this is the server's own guard — the API is
 * authoritative on the shape it persists, never trusting the client to have done
 * it.
 */
function parseAddress(body: unknown): AddressInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const name = req(b.name);
  const line1 = req(b.line1);
  const city = req(b.city);
  const state = req(b.state);
  const postal = req(b.postal);
  const country = req(b.country);
  if (!name || !line1 || !city || !state || !postal || !country) return null;

  return {
    name,
    line1,
    city,
    state,
    postal,
    country,
    line2: optional(b.line2),
    phone: optional(b.phone),
  };
}

/** A trimmed required string, or null when absent/blank/non-string. */
function req(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** A trimmed optional string, or null when absent/blank/non-string. */
function optional(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fail(res: Response, err: unknown): void {
  res.status(500).json({
    status: "error",
    message: err instanceof Error ? err.message : "Unknown error",
  });
}
