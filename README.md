# Secure Note-Taking API (backend)

Node.js + Express + TypeScript + MongoDB (Mongoose) + JWT. Roles: `user`, `admin`.

## Run locally
```bash
npm install
cp .env.example .env        # edit MONGO_URI / JWT_SECRET
npm run seed:admin          # creates the first admin from ADMIN_* env vars
npm run seed:demo           # optional: 11 users (john@demo.com / Password123!), notes, posts
npm run dev                 # http://localhost:5000
npm run explain             # prints index usage (IXSCAN/COLLSCAN) for every query
```
Production: `npm run build && npm start`.

## Environment variables
| Name | Meaning |
|---|---|
| PORT | server port (default 5000) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | long random secret for signing tokens |
| JWT_EXPIRES_IN | token lifetime, e.g. `1d` |
| CLIENT_URL | frontend origin allowed by CORS |
| ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD | used only by `seed:admin` |

## Security
- bcrypt (cost 12) password hashing; `password` is `select: false` and removed in `toJSON`.
- JWT (HS256, expiring). Middleware verifies the token and loads the user from DB, so role changes/deletions apply immediately.
- Public registration always creates `role: "user"` (zod strips any `role` in the body). The first admin is created by `npm run seed:admin`.
- `authorize("admin")` protects the whole `/api/admin` router.
- Notes: `userId` comes from the token, never from the body. PATCH/DELETE/GET on someone else's note returns 404. Admin can only *view* other users' notes.
- zod validation, helmet, CORS allow-list, rate limit on `/api/auth`, 10kb body limit.

## API (all responses: `{ success, data, message }`; lists add `pagination`)
List endpoints accept `?page=1&limit=10` (default 1/10, max limit 100) and return
`pagination: { currentPage, limit, totalItems, totalPages }`.

| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| GET | /api/auth/me | logged in |
| POST/GET | /api/notes | own notes (`?scope=all[&userId=]` admin only = everyone's notes) |
| GET/PATCH/DELETE | /api/notes/:id | owner (admin may GET any) |
| POST/GET | /api/posts | logged in (posts are visible to everyone) |
| GET | /api/users/interests?interest= | **Scenario 1** |
| GET | /api/users/:id/posts | **Scenario 2** |
| POST/GET | /api/admin/users | admin |
| GET/PATCH/DELETE | /api/admin/users/:id | admin (cannot delete self / change own role; deleting a user also deletes their notes and posts) |

## Aggregations
**Scenario 1 – group users by interests** (`user.routes.ts`): exactly one `User.aggregate()` call:
`[$match?] → $unwind interests → [$match?] → $group {_id: interest, users: $push name} → $sort → $facet {data: skip/limit, total: $count}`.
`$facet` provides pagination inside the same call (no `find`/`countDocuments`).

**Scenario 2 – posts of a user**: one pipeline: `$match {_id} → $lookup posts (localField _id, foreignField userId, pipeline sort/skip/limit) → $lookup count → $project`.

## Indexing strategy (only 4 indexes besides `_id`)
| Collection | Index (`schema.index`) | Why |
|---|---|---|
| users | `{ email: 1 }` unique | login lookup + uniqueness |
| users | `{ interests: 1 }` | Scenario 1 `$match` when `?interest=` is given (multikey) |
| notes | `{ userId: 1, _id: -1 }` | my-notes list newest first; admin filter by user |
| posts | `{ userId: 1, _id: -1 }` | `$lookup` foreignField + newest-first |

Everything else uses the built-in `_id` index: get-by-id, users list (`sort _id`), admin all-notes list (`sort _id`), posts list.
ObjectIds are time-ordered, so `_id: -1` = newest first and no `createdAt` index is needed.
Scenario 1 *without* a filter must read every user by nature (a full grouping), so no index can help it; with `?interest=` it uses the interests index.
Run `npm run explain` to verify.

## Deployment
Render: build `npm install && npm run build`, start `npm start`, set env vars, use MongoDB Atlas. Then run `npm run seed:admin` once against the production DB.

URLs: Backend: _add_ · Frontend: _add_
