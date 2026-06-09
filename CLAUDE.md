# Vibe Commerce

A guest-first mobile ecommerce app. **Principle: simple surface area, every feature done excellently.**

Full spec lives in **PRD → GitHub issue #2**. Work is sliced into independently-grabbable issues **#3–#12** (label `ready-for-agent`). Prefer a fresh session per issue; start with "implement #N".

## Repo layout

- `backend/` — Node + Express + TypeScript API (MVC + service layer), Drizzle ORM, Neon Postgres. Deploys to Render.
- `frontend-mobile/` — Expo (Expo Router) React Native app. Has its own `AGENTS.md`/`CLAUDE.md`.

Each subproject owns its `.gitignore`; the root `.gitignore` is repo-wide only.

## Stack

**Frontend:** TypeScript · Expo Router (file-based) · NativeWind v4 (design tokens, follows system light/dark) · Reanimated (motion) · Lottie (sparingly: empty states, order success, splash) · `@expo/vector-icons` · react-hook-form + Zod · **TanStack Query for all server state** · Context + useState only for client state (cart, theme, Clerk user).

**Backend:** Express + TypeScript · Drizzle ORM + drizzle-kit migrations · Neon Postgres · REST · Render (persistent Node, `pg` pool on Neon's pooled connection string).

**Auth:** Clerk (email/password + Google; custom screens via hooks). Backend verifies Clerk JWT → `userId`; users synced via Clerk webhook.

**Payments:** Stripe PaymentSheet.

## Non-negotiable conventions

- **Money:** integer **cents** everywhere; single currency (USD). Order items snapshot `unit_price_cents`.
- **Every product has ≥1 variant.** A one-size item (cap, sunglasses) is a product with a single variant. **Cart, wishlist, and order items always reference `variant_id`** — never a bare product. No simple-vs-variant branching.
- **Variant options:** fixed nullable `size`, `color_name` + `color_hex` columns.
- **Categories:** adjacency list (`parent_id`), arbitrary depth. Tree is small → fetch the whole flat list and **build the tree + resolve descendants in memory** (no recursive SQL / ltree). Products attach to **leaf** categories only.
- **Guest-first:** browse, cart, and checkout (with email + shipping) all work without an account. Accounts add wishlist sync, saved addresses, order history. Auth is never a gate.
- **Guest-order claiming:** on Clerk `user.created`/`user.updated`, link unclaimed orders by **verified, lowercased** email where `user_id IS NULL`. Only verified emails — never unverified.
- **Checkout/payments security:** the **server is the sole authority on price** (recompute from catalog; client sends only `variant_id` + qty) **and on "paid"** (the Stripe webhook is the source of truth, not the client). Stock decrement runs in a **row-locked transaction**, idempotent on `stripe_payment_intent_id`; insufficient stock → order `cancelled`.
- **Catalog** is curated and **seeded** via a script — no admin UI.

## Testing

Test-first (red-green-refactor; see the `tdd` skill) for the deep modules: **category tree** (`buildTree`/`descendantLeafIds`), **cart reducer**, **variant resolver**, **order fulfillment + cart pricing**, **guest-order claiming**. Test external behavior, not implementation. Runner: **Vitest** (introduced in #4). Pure modules → unit tests; transactional modules → integration tests against a test DB.

## Commands

**Backend** (`cd backend`): `npm run dev` · `npm run typecheck` · `npm run db:generate` · `npm run db:migrate`
**Frontend** (`cd frontend-mobile`): `npx expo start` (`i`/`a` for sim) · `npm run ios|android` · `npx tsc --noEmit` · `npx expo lint`

## Environment

- Backend: `NEON_DB_URL` (pooled Neon string) in `backend/.env` (git-ignored; see `.env.example`).
- Frontend: API base URL auto-detects the dev host on `:4000`; override with `EXPO_PUBLIC_API_URL`.
- Later slices add Clerk and Stripe keys (see `.env.example` files).

## Working notes

- **Expo SDK 54:** per `frontend-mobile/AGENTS.md`, consult the versioned docs (https://docs.expo.dev/versions/v54.0.0/) before writing Expo code. The Reanimated Babel plugin is auto-configured by `babel-preset-expo` — do not add it manually.
- **Git:** do not add Claude/Anthropic attribution to commits or PRs (no `Co-Authored-By` trailer, no "Generated with Claude Code" footer). Branch off `main` per slice; commit/push only when asked.
