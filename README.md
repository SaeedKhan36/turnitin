# Attest

An academic-integrity platform: a marketing site plus a working similarity
checker. Upload a document, and it is read, fingerprinted, compared against
everything else in the instance, and returned as a report that highlights the
matching passages next to the documents they came from.

Built as an original product — it is modelled on the *shape* of commercial
academic-integrity tooling, not on any vendor's copy, branding, or code.

## What it actually does

- **Reads documents.** PDF (text layer), DOCX, TXT, MD, and images. Scanned PDFs
  with no text layer are rasterised and read with OCR.
- **Finds reused passages.** Winnowed k-gram fingerprinting locates candidates in
  the index; each candidate is then verified word by word, so the report points
  at real shared text rather than a hash coincidence.
- **Explains itself.** Every percentage is backed by highlighted spans in the
  submitted document, with the source excerpt beside them.
- **Handles classes.** Instructors create classes and assignments and see every
  submission; students join by code and see only their own reports.

### What it does not do

- **No web crawl, no publisher database.** Matching covers documents submitted to
  *your* instance plus reference material you add. A clean report is not evidence
  of originality, and the UI says so.
- **No AI-writing detection.** There is a writing-style *signal* — sentence-length
  variance, vocabulary richness, transition density — shown with its inputs
  visible and an explicit caveat. It is not a detector, it cannot tell you who or
  what wrote a document, and it must never be used on its own as evidence.

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (React 19, Vite 8) |
| Routing | TanStack Router, file-based |
| Server data | TanStack Query + tRPC 11 |
| HTTP server | Hono, mounted at `/api/*` |
| Validation | Zod 4 |
| Database | Postgres (Neon) via Prisma 7 driver adapters |
| Auth | Better Auth, email + password, instructor/student roles |
| Object storage | Cloudflare R2 (S3 API), with a local-disk fallback |
| Extraction | unpdf, mammoth, tesseract.js, @napi-rs/canvas |
| UI | Tailwind 4 + shadcn/ui |

## Getting started

```bash
pnpm install
cp .env.example .env      # add your DATABASE_URL
pnpm db:push              # create the schema
pnpm db:seed              # users, a class, and a reference corpus
pnpm dev
```

### No Postgres to hand?

`pnpm db:local` starts an in-process Postgres (PGlite) on port 5433 speaking the
real wire protocol, so the whole app runs with no cloud account and no Docker:

```bash
pnpm db:local             # leave running in one terminal
# DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres"
pnpm db:push && pnpm db:seed && pnpm dev
```

Neon URLs automatically use the Neon serverless driver; anything else — PGlite,
local Postgres, RDS — falls back to node-postgres. Swapping is a URL change.

Then sign in as `instructor@attest.test` / `attest-demo-2026` and upload
`prisma/fixtures/student-essay-with-lifted-passage.txt` — it reuses a paragraph
from a seeded reference document, so the report comes back non-empty.

### Environment

Only `DATABASE_URL` is required. Everything else has a working default.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon URLs use the Neon serverless driver; any other Postgres URL falls back to node-postgres. |
| `BETTER_AUTH_SECRET` | production | `openssl rand -base64 32`. A dev default is used if unset. |
| `BETTER_AUTH_URL` | no | Only when the public URL differs from the request host. |
| `STORAGE_DRIVER` | no | `auto` (default), `r2`, or `local`. |
| `R2_ENDPOINT` | no | e.g. `https://<account-id>.r2.cloudflarestorage.com`. `R2_ACCOUNT_ID` works as an alias. |
| `R2_BUCKET_NAME` | no | `R2_BUCKET` works as an alias. |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | no | Set all four R2 values and storage switches to R2 automatically. Without them, uploads go to `.data/blobs`. |
| `MAX_UPLOAD_BYTES` | no | Defaults to 25MB. |

## Architecture

**One Hono app owns `/api/*`.** TanStack Start's catch-all server route
(`src/routes/api.$.tsx`) hands the raw `Request` to `src/server/hono.ts`, which
mounts Better Auth at `/api/auth/*`, tRPC at `/api/trpc/*`, and binary file
handling at `/api/files/*`. tRPC covers all typed CRUD; Hono covers multipart
upload and byte streaming, which a typed RPC layer is a poor fit for.

**Storage is driver-based** (`src/server/storage/`) so a fresh clone runs with no
cloud account. Original uploads and extracted text are both stored as objects;
the database holds metadata and pointers.

**The pipeline** (`src/server/pipeline.ts`) runs extract → fingerprint → compare
→ report, advancing `Submission.status` so the UI can poll. It runs in-process
after the upload response, which is right for a single node; a multi-node
deployment would put this body behind a job queue and change nothing else.

### How matching works

1. **Normalise** (`similarity/normalize.ts`) — fold to lowercase, strip
   diacritics, and record the original character range of every token. That
   offset map is what lets the report highlight the *original* document.
2. **Fingerprint** (`similarity/fingerprint.ts`) — hash overlapping 5-token
   k-grams, then winnow with a 4-wide window, keeping the minimum in each. This
   stores ~1/4 of the hashes while guaranteeing that any shared run of ≥ 8 tokens
   produces at least one shared hash.
3. **Compare** (`similarity/compare.ts`) — look up colliding hashes to rank
   candidates, then grow each seed outward token by token into the longest
   genuinely identical run. This is also what kills 32-bit hash collisions: a
   false seed has nothing to extend and is dropped.
4. **Filter and score** — apply the assignment's minimum match length, quotation
   exclusion, and reference-list exclusion. The headline score is the share of
   the document's words covered by at least one surviving match, unioned across
   sources so overlapping matches never sum past the text they cover.

## A note on auth providers

Authentication is **Better Auth** (`src/server/auth.ts`). It owns the `User`,
`Session`, and `Account` tables in `schema.prisma` and carries the
`INSTRUCTOR`/`STUDENT` role that every tRPC procedure authorises against.

Clerk keys are parked, commented out, in `.env`. Nothing reads them. Swapping to
Clerk is not a drop-in: Clerk would own identity externally, so `User` would
become a local mirror keyed by Clerk user id, the `Account`/`Session` tables and
the sign-up/login pages would go away, `role` would move to Clerk metadata (or
stay local and be looked up per request), and the tRPC context would build from
a Clerk session instead of `auth.api.getSession`. Worth doing deliberately, not
by adding an env var.

## Testing

```bash
pnpm test
```

The suite covers the parts where a wrong answer still looks plausible: token
offsets round-tripping to the original text, identical documents scoring ~100%,
unrelated ones scoring 0, a known lifted passage landing within an expected
band, highlight spans pointing at the actually-copied text, the exclusion rules,
and overlapping-span segmentation in the report viewer.

## Project layout

```
prisma/
  schema.prisma          data model
  seed.ts                demo users, class, reference corpus
  fixtures/              sample documents, including one with a lifted passage
src/
  server/
    hono.ts              every server endpoint
    auth.ts db.ts env.ts
    pipeline.ts          extract → fingerprint → compare → report
    extract/             pdf, docx, text, ocr
    similarity/          normalize, fingerprint, compare, ai-heuristic
    storage/             r2 + local drivers
    routes/files.ts      upload and download
  integrations/trpc/     context, procedures, routers
  routes/
    _site.*              marketing site
    app.*                the product
    login signup
  components/marketing/  site shell and sections
  components/app/        upload, status, score
  lib/highlight.ts       overlapping-span segmentation
```
