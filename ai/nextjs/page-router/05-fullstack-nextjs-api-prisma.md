# Fullstack Next.js — Page Router UI + App Router API (`app/api`) + Prisma

**Mode B** of the Page Router setup (see `skills/nextjs-page-router` → "Deployment modes"). One Next.js
app is **both frontend and backend**:

- **UI** stays in the **Page Router** (`src/pages/`) — thin routes → `_modules/pages` Screens, client-rendered.
- **API** is written with **App Router Route Handlers** (`src/app/api/**/route.ts`) — the modern Next.js
  API surface. `pages/` and `app/` coexist in the same project.
- **Prisma** is the ORM, used only inside the server layer.

Goal is minimal boilerplate and fast iteration, so **no SSR**: data flows browser → `useQuery` →
`/api/*` route handler → Prisma → DB. Do **not** use `getServerSideProps`.

> **Why `app/api` and not `pages/api`?** `pages/api/*` is the legacy API surface; App Router Route
> Handlers (`app/api/**/route.ts`) are the current standard — Web `Request`/`Response`, per-method
> exports, `next/headers` cookies, streaming, and the runtime/caching segment config. Keeping the UI in
> Page Router while writing the API in `app/api` is a fully supported combination.

---

## 1. Ground rules

1. **Not a static export.** `next.config` must **not** set `output: 'export'` — route handlers need a
   Node server.
2. **UI in `pages/`, API in `app/api/`.** The `app/` directory here holds **only** route handlers — no
   `page.tsx`, no `layout.tsx`, no UI. All screens stay under `src/pages/`. The two never serve the same
   path (`/products` is a page; `/api/products` is a handler).
3. **No SSR.** No `getServerSideProps`. Server work lives in route handlers, not page data functions.
4. **Thin handlers, fat services.** A `route.ts` export only does HTTP plumbing (parse, validate, map
   errors → status). Business logic + Prisma calls live in `_modules/server/[domain]/`.
5. **`_modules/server/` is server-only.** Never import it (or `@prisma/client`) from a Screen/component —
   it would leak Prisma and secrets into the client bundle. The UI reaches the server **only** through
   `_modules/_api/*` hooks that fetch `/api/*`.
6. **Node runtime for Prisma.** Route handlers run on the Node.js runtime by default — keep it that way
   (Prisma does not run on the Edge runtime). Don't set `export const runtime = 'edge'` on DB routes.

---

## 2. Directory layout

```
src/
├── pages/                        # ── FRONTEND (Page Router) ──
│   ├── index.tsx                 # thin route → Screen (client-rendered)
│   └── products/index.tsx        # thin route → ProductListScreen
├── app/                          # ── BACKEND (App Router route handlers ONLY) ──
│   └── api/
│       ├── products/
│       │   ├── route.ts          # GET (list) + POST (create)   → /api/products
│       │   └── [id]/route.ts     # GET + PUT + DELETE           → /api/products/:id
│       └── auth/
│           ├── login/route.ts    # → /api/auth/login
│           └── logout/route.ts
└── _modules/
    ├── _api/                     # CLIENT — TanStack Query hooks → fetch('/api/...')
    │   ├── baseFetch.ts
    │   └── apiClientProduct.ts
    ├── common/
    │   └── models/               # shared request/response types (client-safe)
    └── server/                   # SERVER-ONLY (never imported by UI)
        ├── prisma.ts             # PrismaClient singleton
        ├── apiHandler.ts         # route() wrapper: error → status
        └── product/
            ├── service.ts        # Prisma queries + business logic
            └── schema.ts         # Zod input schemas
prisma/
└── schema.prisma                 # models + datasource + generator
.env                              # DATABASE_URL (server secret — NOT NEXT_PUBLIC)
```

> No `app/layout.tsx` / `app/page.tsx` is required: a root layout is only needed to **render** App Router
> pages, and here `app/` contains route handlers exclusively. All rendering stays in `pages/`.

---

## 3. Prisma setup

### Install & init

```bash
npm i prisma --save-dev
npm i @prisma/client
npx prisma init --datasource-provider postgresql   # creates prisma/schema.prisma + .env
```

### Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"          // sqlite | mysql | postgresql | …
  url      = env("DATABASE_URL")
}

model Product {
  id          String   @id @default(cuid())
  name        String
  price       Int                        // store money as integer minor units
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Migrate & generate (dev loop)

```bash
npx prisma migrate dev --name init     # create + apply a migration, then regenerate the client
npx prisma generate                    # regenerate client types after any schema edit (migrate dev does this too)
npx prisma studio                       # optional GUI

# Prototyping only (no migration history):
npx prisma db push
```

In CI/production apply committed migrations with `npx prisma migrate deploy` (never `migrate dev`).

> **Prisma 7 note:** newer Prisma defaults to generating the client to an output path and using driver
> adapters. If your `generator client` sets `output = "../src/generated/prisma"`, import `PrismaClient`
> from that path (not `@prisma/client`) and pass an adapter (e.g. `@prisma/adapter-pg`) into the
> constructor. The singleton shape below is unchanged — only the import and constructor args differ.

---

## 4. Prisma Client singleton

Instantiate **once** and cache on `globalThis`. Without this, Hot Module Replacement in dev creates a new
`PrismaClient` on every file change and exhausts the DB connection pool.

```typescript
// src/_modules/server/prisma.ts   — SERVER ONLY
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Keep the singleton across HMR reloads in dev; a fresh instance every deploy in prod.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 5. Route handlers — App Router, thin

App Router exports **one function per HTTP method** from `route.ts`. Unmatched methods return `405`
automatically — no manual method guard. A small `route()` wrapper centralizes error → status mapping.

### Shared wrapper

```typescript
// src/_modules/server/apiHandler.ts   — SERVER ONLY
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;

// Wrap a route handler so thrown errors become JSON + the right status.
export function route<P = unknown>(handler: Handler<P>): Handler<P> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ message: 'Invalid input', issues: err.issues }, { status: 400 });
      }
      if (err instanceof ApiError) {
        return NextResponse.json({ message: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
  };
}
```

### Collection route — list + create

```typescript
// src/app/api/products/route.ts   → /api/products
import { NextResponse, type NextRequest } from 'next/server';
import { route } from '@/_modules/server/apiHandler';
import * as productService from '@/_modules/server/product/service';
import { productCreateSchema, productListQuerySchema } from '@/_modules/server/product/schema';

export const GET = route(async (req: NextRequest) => {
  const query = productListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json({ data: await productService.list(query) });
});

export const POST = route(async (req: NextRequest) => {
  const input = productCreateSchema.parse(await req.json());
  return NextResponse.json({ data: await productService.create(input) }, { status: 201 });
});
```

### Item route — read + update + delete (dynamic segment, **async `params`**)

In Next.js 15 the `params` argument is a **Promise** — always `await` it.

```typescript
// src/app/api/products/[id]/route.ts   → /api/products/:id
import { NextResponse, type NextRequest } from 'next/server';
import { route, ApiError } from '@/_modules/server/apiHandler';
import * as productService from '@/_modules/server/product/service';
import { productUpdateSchema } from '@/_modules/server/product/schema';

type Params = { id: string };

export const GET = route<Params>(async (_req, { params }) => {
  const { id } = await params;
  const product = await productService.detail(id);
  if (!product) throw new ApiError(404, 'Product not found');
  return NextResponse.json({ data: product });
});

export const PUT = route<Params>(async (req, { params }) => {
  const { id } = await params;
  const input = productUpdateSchema.parse(await req.json());
  return NextResponse.json({ data: await productService.update(id, input) });
});

export const DELETE = route<Params>(async (_req, { params }) => {
  const { id } = await params;
  await productService.remove(id);
  return new NextResponse(null, { status: 204 });
});
```

---

## 6. Zod input schemas

Validate what crosses the wire. Reuse the same schema on the client form when practical (see
`shared-fe/05-validation-patterns.md`).

```typescript
// src/_modules/server/product/schema.ts
import { z } from 'zod';

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().int().nonnegative(),
  description: z.string().max(2000).optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
```

---

## 7. Service layer (Prisma)

The only place Prisma is touched. Uses the singleton and Prisma's generated types — no `as any`.

```typescript
// src/_modules/server/product/service.ts
import type { Prisma, Product } from '@prisma/client';
import { prisma } from '@/_modules/server/prisma';
import type { ProductCreateInput, ProductListQuery } from './schema';

export async function list({ search, page, limit }: ProductListQuery): Promise<Product[]> {
  const where: Prisma.ProductWhereInput = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};
  return prisma.product.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

export const detail = (id: string) => prisma.product.findUnique({ where: { id } });
export const create = (data: ProductCreateInput) => prisma.product.create({ data });
export const update = (id: string, data: Partial<ProductCreateInput>) =>
  prisma.product.update({ where: { id }, data });
export const remove = (id: string) => prisma.product.delete({ where: { id } });
```

---

## 8. Client hooks — fetch same-origin `/api/*`

Frontend is unchanged from the shared pattern (`03-api-data-flow.md`): `baseFetch` targets a **relative**
`/api/...` path. Same origin ⇒ no CORS, and httpOnly cookies ride along automatically.

```typescript
// src/_modules/_api/baseFetch.ts   — CLIENT
export async function baseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {                 // relative '/api/...' — same origin
    ...init,
    headers: { Accept: 'application/json', ...(init?.body && { 'Content-Type': 'application/json' }), ...init?.headers },
    credentials: 'same-origin',                    // send the session cookie
  });
  const body = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(body?.message ?? `Request failed (${res.status})`);
  return body?.data as T;
}
```

```typescript
// src/_modules/_api/apiClientProduct.ts   — CLIENT
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baseFetch } from './baseFetch';
import type { ModelProduct } from '@/_modules/common/models/ModelProduct';

export const useQueryList = (params?: { search?: string; page?: number }) =>
  useQuery({
    queryKey: ['product-list', params],
    queryFn: () => baseFetch<ModelProduct[]>(`/api/products?${new URLSearchParams(params as never)}`),
  });

export const useMutationCreate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ModelProduct, 'id' | 'createdAt'>) =>
      baseFetch<ModelProduct>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-list'] }),
  });
};
```

> **Type sharing without leaking Prisma to the client:** don't import `@prisma/client` types into UI
> code. Define client-safe response types in `_modules/common/models/` (e.g. `ModelProduct`), or infer
> the shape from the Zod schema. Keep the Prisma-generated types confined to `_modules/server/`.

---

## 9. Auth — same-origin httpOnly cookie via `next/headers`

Because frontend and backend share an origin, sessions are simple: set an httpOnly cookie in a route
handler; every later `/api/*` request carries it; read it server-side. In App Router use `cookies()` from
`next/headers` — it is **async in Next.js 15**, so `await` it.

```typescript
// src/app/api/auth/login/route.ts   → /api/auth/login
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { route, ApiError } from '@/_modules/server/apiHandler';
import { verifyCredentials, issueSession } from '@/_modules/server/auth/service';
import { loginSchema } from '@/_modules/server/auth/schema';

export const POST = route(async (req: NextRequest) => {
  const { email, password } = loginSchema.parse(await req.json());
  const user = await verifyCredentials(email, password);
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const token = await issueSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ data: { id: user.id, email: user.email } });
});
```

Guard protected handlers with a small `requireSession()` helper in `_modules/server/auth/` that reads and
verifies the cookie, throwing `ApiError(401, ...)` when absent/invalid:

```typescript
// src/_modules/server/auth/requireSession.ts   — SERVER ONLY
import { cookies } from 'next/headers';
import { ApiError } from '@/_modules/server/apiHandler';
import { verifySession } from './service';

export async function requireSession() {
  const token = (await cookies()).get('session')?.value;
  const session = token && (await verifySession(token));
  if (!session) throw new ApiError(401, 'Unauthenticated');
  return session; // { userId, ... }
}
```

Store password hashes only (e.g. `argon2`/`bcrypt`); never plaintext. Logout clears the cookie with
`(await cookies()).delete('session')`.

---

## 10. Environment & config

- `DATABASE_URL` and any auth secret are **server-only** — never prefix with `NEXT_PUBLIC_`, or they ship
  to the browser. Keep them in `.env` (gitignored) with a committed `.env.example`.
- In Mode B, `baseFetch` uses relative `/api/...`, so no `NEXT_PUBLIC_API_URL` is needed.
- Route handlers touching Prisma must run on the **Node.js runtime** (the default) — never `edge`.
- Deploy to a Node target (Vercel, container, Node server). Run `prisma migrate deploy` as part of the
  release, before the new code serves traffic.

---

## 11. Checklist

- [ ] `next.config` does **not** set `output: 'export'`; app deploys to a Node host
- [ ] UI in `src/pages/` (Page Router); API in `src/app/api/**/route.ts` (App Router handlers)
- [ ] `app/` holds route handlers only — no `page.tsx`/`layout.tsx`, no UI
- [ ] Dynamic route `params` are **awaited** (`const { id } = await params`) — Next.js 15
- [ ] Prisma client is a `globalThis` **singleton** — never `new PrismaClient()` per request
- [ ] Handlers are **thin**: parse → Zod validate → call service → `NextResponse.json` / status
- [ ] All DB access + business logic in `_modules/server/[domain]/service.ts`
- [ ] Every request body/query validated with **Zod**; invalid → `400`
- [ ] `_modules/server/` and `@prisma/client` are **never** imported from Screens/components
- [ ] Client response types are client-safe (`_modules/common/models/`), not Prisma types
- [ ] `baseFetch` targets relative `/api/...` with `credentials: 'same-origin'`
- [ ] DB route handlers stay on the **Node runtime** (no `runtime = 'edge'`)
- [ ] Secrets are server-only (no `NEXT_PUBLIC_`); `prisma migrate deploy` runs on release

---

**Last Updated**: 2026-08 · **Next.js**: Page Router UI + App Router API (15, Node deploy) · **ORM**: Prisma
