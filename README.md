# EkPocket – Development Setup

EkPocket is an enterprise multi-tenant wallet, departmental expense and approval management system (course project `cse470_project`).

**Stack:** NestJS (plain JavaScript, ESM) + Prisma + PostgreSQL 17 on the backend. React 18 + Material UI + Vite on the frontend. Everything runs in Docker Compose on localhost.

## Requirements

- Git
- Docker Desktop (or Docker Engine)
- Docker Compose
- A modern browser (WebAuthn / fingerprint login needs one)

You do **not** need Node.js on your machine. Run every `npm` and `prisma` command **inside the containers** (see section 6). Installing a package on the host does not help.

## 1. Clone the Repository

```bash
git clone git@github.com:MahmudlHasanMahi/CSE470_Project.git
cd CSE470_Project
```

## 2. Start the Project

```bash
docker compose up --build
```

Use `docker compose up -d` to run in the background. After the first build you can drop `--build` unless a Dockerfile or `package.json` changed.

## 3. Services and Ports

| Service          | URL / Host            | Container       |
| ---------------- | --------------------- | --------------- |
| Frontend (Vite)  | http://localhost:5173 | `frontend`      |
| Backend (NestJS) | http://localhost:3000 | `ekpocket_backend` |
| PostgreSQL       | localhost:5432        | `ekpocket_db`   |
| Prisma Studio    | http://localhost:5555 | run on demand (section 7) |

Always use `localhost`, never `127.0.0.1`. WebAuthn (fingerprint login) only works when the browser URL matches `WEBAUTHN_ORIGIN` exactly, including the port.

## 4. Two Ports, Two Purposes

| Port   | Served by       | Use it for |
| ------ | --------------- | ---------- |
| `5173` | Vite dev server | Day-to-day UI work. Edits in `frontend/src` appear instantly, no build needed. |
| `3000` | NestJS          | Testing the final behavior. It serves the **built** files from `public/` (`PUBLIC_DIR`), so frontend edits do not show here until you rebuild. |

Important differences:

- On `5173`, Vite proxies `/api` to the backend (`http://backend:3000`).
- The login redirects, role checks and page protection live in the backend `main.js`, so they run **only on port 3000**. On `5173` a logged-out visit to `/employee/` still shows the page, and the API calls return `401`.
- To test the real login flow, redirects and role-based access, use `http://localhost:3000`.

## 5. Building the Frontend for Port 3000

Port 3000 serves the compiled frontend, so rebuild after you change files in `frontend/src`:

```bash
docker compose exec frontend npm run build
```

Then check that the built pages exist where the backend looks for them:

```bash
docker compose exec backend ls public
docker compose exec backend ls public/employee public/manager
```

You should see an `index.html` inside both `employee` and `manager`. If `public/` is empty, the build output folder (`build.outDir` in `frontend/vite.config.js`) does not point at the folder the backend serves (`PUBLIC_DIR`). Make the two match.

No backend restart is needed after a rebuild, the static files are read from disk. Hard refresh the browser (Ctrl+Shift+R) if you still see the old version.

## 6. Running Commands Inside the Containers

```bash
# install a package
docker compose exec backend npm install <package>
docker compose exec frontend npm install <package>

# check a package is installed
docker compose exec frontend npm ls axios

# restart a service (for example after a Vite config change)
docker compose restart frontend
docker compose restart backend
```

If Vite reports `Failed to resolve import "axios"`, the package is missing inside the frontend container. Install it there, then `docker compose restart frontend`.

## 7. Database (Prisma)

```bash
# create and apply a migration after editing schema.prisma
docker compose exec backend npx prisma migrate dev --name <migration_name>

# check the schema
docker compose exec backend npx prisma validate
docker compose exec backend npx prisma migrate status

# open a visual database editor at http://localhost:5555
docker compose exec backend npx prisma studio --port 5555 --hostname 0.0.0.0
```

Prisma Studio needs port `5555` mapped on the `backend` service in `docker-compose.yml`.

Use Prisma Studio to create test data: users, roles, wallets, wallet members and transactions.

### Roles

The database uses two role names. Create them in the `role` table first, then set `role_id` on each user.

| name       | permissions |
| ---------- | ----------- |
| `employee` | `["wallet:read", "transaction:create"]` |
| `manager`  | `["wallet:read", "transaction:create", "approval:review", "member:manage", "budget:manage"]` |

## 8. Environment Variables

Set on the `backend` service in `docker-compose.yml`:

```yaml
WEBAUTHN_RP_ID: localhost
WEBAUTHN_ORIGIN: http://localhost:5173
```

The backend also needs `JWT_SECRET` and the database connection string. Optional: `PUBLIC_DIR` (folder with the built frontend, defaults to `public`) and `REFRESH_DAYS` (default 7).

## 9. Pages (Browser URLs)

There are separate HTML pages per role. Inside each page, React Router handles the sub-routes (no page reload).

| URL | Who | Notes |
| --- | --- | ----- |
| `/login/` | Everyone | Logged-in users are redirected to their own page. |
| `/employee/` | Employees | Employee home. Managers are redirected to `/manager/`. |
| `/employee/<route>` | Employees | Internal routes, for example `/employee/wallets` (see the router in the employee page). |
| `/manager/` | Managers | Manager home. Employees are redirected to `/employee/`. |
| `/manager/<route>` | Managers | Internal routes, same idea as the employee page. |

Try them on both ports:

- http://localhost:5173/login/
- http://localhost:5173/employee/
- http://localhost:3000/login/
- http://localhost:3000/employee/
- http://localhost:3000/manager/

**Deep links:** refreshing on `/employee/wallets` works because the server answers every non-file path under `/employee` and `/manager` with that page's `index.html`, and React Router then shows the right screen. Port 3000 does this in `main.js` (after the login and role check). Port 5173 does this with the `page-fallback` plugin in `vite.config.js`.

Quick checks on port 3000:

1. Logged out, open `/employee/wallets`: you are redirected to login.
2. Log in as an employee, open `/employee/wallets` and refresh: the page loads.
3. As an employee, open `/manager/`: you are redirected to `/employee/`.

## 10. API Endpoints

All routes start with `/api`. Every route needs the `access_token` cookie except the public ones (`/auth/login`, `/auth/register`, `/auth/refresh`, `/health`).

| Method | Path | What it does |
| ------ | ---- | ------------ |
| GET  | `/api/health` | Health check |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, sets both cookies |
| POST | `/api/auth/refresh` | Rotate the refresh token, issue a new access token |
| POST | `/api/auth/logout` | Revoke the refresh token and clear both cookies |
| GET  | `/api/auth/me` | Raw user from the guard |
| GET  | `/api/users/me` | Profile, role, permissions, department |
| GET  | `/api/users/me/wallets` | My wallets, with my own membership row |
| GET  | `/api/users/me/transactions` | Transactions I created or that touch my wallets |
| GET  | `/api/wallets/:id/transactions` | One wallet's transactions (owner or active member only) |
| POST | `/api/webauthn/register/options` | Start passkey registration |
| POST | `/api/webauthn/register/verify` | Finish passkey registration |

To print the live list of routes Nest registered (read the last block only, each restart prints the full list again):

```bash
docker compose logs backend --tail 60 | grep "Mapped" | sed 's/.*Mapped //'
```

## 11. Useful Commands

```bash
# stop everything
docker compose down

# stop and delete the database and node_modules volumes (full reset)
docker compose down -v

# follow all logs, or one service
docker compose logs -f
docker compose logs -f backend

# open a shell inside a container
docker compose exec backend sh
docker compose exec frontend sh

# list backend source files (useful when an import fails)
docker compose exec backend ls src
```

## 12. Troubleshooting

| What you see | Likely cause | Fix |
| ------------ | ------------ | --- |
| `Cannot GET /employee/wallets` after refresh | Deep link fallback missing | Port 3000: check `main.js`. Port 5173: check the `page-fallback` plugin, then `docker compose restart frontend`. |
| Blank page, console errors loading `.js` files | Wrong asset paths | `base` in `vite.config.js` must be `'/'`. Rebuild. |
| Changes in `frontend/src` do not show on port 3000 | Port 3000 serves built files | Run the build (section 5). |
| `401` on every API call on port 5173 | Not logged in, and the page protection runs only on 3000 | Log in on `localhost:3000/login/`. |
| `Cannot find module '../a/b'` | Wrong folder name or letter case (Linux is case sensitive) | `docker compose exec backend ls src`, then match imports exactly. |
| `Nest can't resolve dependencies of X` | Module missing from `imports`, or service missing from `exports` | Fix the module files. |
| `Cannot GET /api/...` from Nest | Route not registered | Check the controller is in its module's `controllers` array and the module is in `AppModule`. |
| `this.x.someMethod is not a function` | The method does not exist on that service | `grep -n "async " <service file>`. |
| Fingerprint login fails | `WEBAUTHN_ORIGIN` does not match the browser URL | Use `http://localhost:5173` exactly, not `127.0.0.1`. |
| Port already in use | Another app uses 3000, 5173, 5432 or 5555 | Stop it, or change the port mapping in `docker-compose.yml`. |

## 13. Project Layout

```
backend/src/
  main.js          page protection, role redirects, deep link fallback
  app.module.js
  prisma/          global PrismaService
  auth/            login, refresh, guards, permissions
  webauthn/        fingerprint registration and login
  users/           /me, /me/wallets
  wallets/         wallets, members, /wallets/:id/transactions
  transactions/    /users/me/transactions
frontend/src/
  api/             shared axios client + one *.api.js file per domain (TanStack Query hooks)
  pages/           Manager/, Employee/, login page
  mount.jsx        shared providers (theme, TanStack Query)
```

Code conventions: plain JavaScript (no TypeScript), `@Dependencies(...)` for injection, `@Bind(...)` for controller parameters, and lowercase `*.service.js` / `*.controller.js` / `*.module.js` file names.