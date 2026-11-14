# EkPocket: Project Overview & Progress (Updated)

Last updated: 2026-11-14 (RolesGuard and /api/users/me confirmed, WalletMember updated)

Status snapshot for handing this project to an AI agent or picking it up later.
Part 1 is the overall project. Part 2 is the current progress. Part 3 is the full agent guidelines file (`agent_coding_guidelines.md`), which still applies to everything, except where Part 2 (section 2.6) lists an update.

---

# Part 1: Overall Project

## 1.1 What it is

EkPocket (course project `cse470_project`) is an **Enterprise Multi-Tenant Wallet, Departmental Expense, Treasury & Approval Management System**. Organizations manage hierarchical departmental budgets, multi-user wallets with spend controls, multi-level transaction approvals, recurring bill payments, financial forecasting, and audit compliance.

## 1.2 User types (current scope)

- **Manager (department admin):** manages a department, approves requests, looks at the finances.
- **Employee:** works under a manager, spends from wallets within limits, submits requests.

Each type has its own HTML page (`/manager/` and `/employee/`). The server sends users to the right one by role.

## 1.3 Business domains

| Domain | Tables (from guidelines) | Status |
|---|---|---|
| A. Users, departments, RBAC, security | `users`, `department`, `role`, `biometric_device` | In progress (see Part 2) |
| B. Departmental & shared wallets | `wallet`, `wallet_member` (rules now live inside `wallet_member`) | Schema finalized (`WalletMember` updated), migration not yet confirmed |
| C. Transactions & failure investigation | `txn`, `payment_attempt`, `failure_investigation`, `ledger_entry`, `receipt`, `import_batch` | Not started |
| D. Multi-level approvals & escalation | `approval_policy`, `approval` | Not started |
| E. Budgeting, recurring payments, forecasting | `budget`, `budget_item`, `recurring_payment`, `cashflow_forecast`, `savings_goal` | Not started |
| F. Audit & compliance | `audit_log` | Not started |

## 1.4 Stack

- **Backend:** NestJS in plain JavaScript (ESM), Prisma + PostgreSQL 17, JWT in HTTP-only cookies, bcryptjs, SHA-256 hashed refresh tokens. No TypeScript.
- **Frontend:** React 18 with Material UI v5, centralized theme (`theme.js`), `mount(Page)` helper, Vite dev server.
- **Runtime:** Docker Compose on localhost only.
- **Biometrics:** WebAuthn via `@simplewebauthn/server` (backend) and `@simplewebauthn/browser` (frontend).

## 1.5 Environment

- Services: `frontend` (Vite, port 5173), `backend` (NestJS, port 3000), `database` (Postgres, port 5432). Containers: `ekpocket_backend`, `ekpocket_db`.
- Backend and frontend folders are bind-mounted, and `node_modules` lives in named volumes. Run npm and Prisma commands **inside the containers**:

```bash
docker compose exec backend npm install <package>
docker compose exec backend npx prisma migrate dev --name <name>
docker compose exec backend npx prisma studio --port 5555 --hostname 0.0.0.0
```

- Port `5555` must be mapped on the `backend` service for Prisma Studio (http://localhost:5555).
- WebAuthn env vars on the backend service:

```yaml
WEBAUTHN_RP_ID: localhost
WEBAUTHN_ORIGIN: http://localhost:5173
```

`WEBAUTHN_ORIGIN` must match the browser URL exactly, including the port. Use `localhost`, never `127.0.0.1`.

## 1.6 Backend structure: feature modules

One NestJS app with one feature module per domain (not separate apps). Each module folder has `x.module.js`, `x.controller.js` and `x.service.js`.

```
backend/src/
  main.js
  app.module.js
  prisma/          (global PrismaService)
  auth/            login, refresh, JwtAuthGuard, RolesGuard, @RequirePermissions
  webauthn/        fingerprint registration and login
  users/           /me, user management
  departments/     departments, members
  roles/           roles and their JSON permissions
  wallets/         wallet, wallet_member
  transactions/    later
  approvals/       later
  budgets/         later
  audit/           later
```

Rules:
- A module exposes what others need through `exports` (for example `WalletsService`). Other modules call that service instead of querying its tables directly.
- Guards live in `auth/`. `JwtAuthGuard` is global, and any module can use `RolesGuard` with `@UseGuards(RolesGuard)`.
- Every module must be listed in `AppModule`'s `imports`. A missing entry causes 404s.

## 1.7 Key design decisions

- **Roles:** one role per user. Permissions are stored NoSQL-style as a JSON array inside a Postgres field (`Role.permissions`) instead of separate role/permission tables. Permission strings look like `resource:action`.
- **Role vs department:** the role says *what* a user can do. The department says *where*. Department scoping is checked in services, not in the guard.
- **Manager detection:** role name `dept_admin` means manager, everything else is an employee.
- **Guards vs pages:** `JwtAuthGuard` (logged in?) and `RolesGuard` (allowed to do this?) only run on Nest routes (`/api/...`). `RolesGuard` reads the role from the database on every request, not from the JWT, so changes apply immediately. The static HTML pages are protected by middleware in `main.js`, which redirects instead of returning errors.
- **Money:** `Decimal(14, 2)`, never floats. Default currency `BDT`.
- **Wallet deletion:** `onDelete: Restrict` on a wallet's user and department, so owners with wallets cannot be deleted by accident.
- **Wallet rules live on the member:** there is no `WalletRule` table. Each `WalletMember` has spending limits as real columns plus a `rules` JSON field for extras.
- **Limits are spending limits only:** `perTransactionLimit`, `dailyLimit`, `monthlyLimit` cap money going out of a wallet. There are no limits on receiving money. For a transfer, the limits apply to the sender only. Controls on large incoming amounts belong to the approval system.
- **No "spent so far" counters:** daily and monthly totals are computed from transactions when the spending check runs. "Daily" needs a time zone decision (probably Dhaka time) at that point.
- **Three status switches:** `User.status` blocks a person everywhere, `Wallet.status` freezes a wallet for everyone, `WalletMember.status` blocks one person in one wallet.
- **WebAuthn use:** passkeys for login and, later, step-up checks for sensitive actions. The password stays as a fallback and users can register several devices.

## 1.8 Working agreements

- Go one step at a time: explain the step, test it, show real output, then move on.
- Keep code simple and include an explanation of it.
- Make new code compatible with the existing schema and the guidelines in Part 3.

---

# Part 2: Current Progress

## 2.1 Current Prisma schema

Conventions: UUID string ids, camelCase fields mapped to snake_case columns with `@map`, tables mapped with `@@map`.

```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  status       String   @default("active")
  createdAt    DateTime @default(now()) @map("created_at")
  departmentId String?  @map("department_id")
  roleId       String?  @map("role_id")

  credential        PasswordCredential?
  refreshTokens     RefreshToken[]
  biometricDevices  BiometricDevice[]
  department        Department? @relation("DepartmentMembers", fields: [departmentId], references: [id], onDelete: SetNull)
  managedDepartment Department? @relation("DepartmentManager")
  role              Role?       @relation(fields: [roleId], references: [id], onDelete: SetNull)
  wallet            Wallet?
  walletMemberships WalletMember[]

  @@map("users")
}

model PasswordCredential { /* unchanged: userId, passwordHash, updatedAt */ }
model RefreshToken       { /* unchanged: tokenHash, replacedBy, authMethod, deviceInfo, issuedAt, expiresAt, revokedAt */ }

model BiometricDevice {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  credentialId String    @unique @map("credential_id")
  publicKey    String    @map("public_key")        // base64url string
  counter      Int       @default(0)
  transports   String?                              // comma-separated
  deviceName   String?   @map("device_name")
  createdAt    DateTime  @default(now()) @map("created_at")
  lastUsedAt   DateTime? @map("last_used_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("biometric_device")
}

model Department {
  id        String   @id @default(uuid())
  name      String   @unique
  managerId String?  @unique @map("manager_id")
  createdAt DateTime @default(now()) @map("created_at")

  manager User?   @relation("DepartmentManager", fields: [managerId], references: [id], onDelete: SetNull)
  members User[]  @relation("DepartmentMembers")
  wallet  Wallet?

  @@map("department")
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  permissions Json     @default("[]")   // array of "resource:action" strings
  createdAt   DateTime @default(now()) @map("created_at")

  users User[]

  @@map("role")
}

model Wallet {
  id           String   @id @default(uuid())
  name         String
  type         String   // "user" or "department"
  userId       String?  @unique @map("user_id")
  departmentId String?  @unique @map("department_id")
  balance      Decimal  @default(0) @db.Decimal(14, 2)
  currency     String   @default("BDT")
  status       String   @default("active")
  createdAt    DateTime @default(now()) @map("created_at")

  user       User?          @relation(fields: [userId], references: [id], onDelete: Restrict)
  department Department?    @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  members    WalletMember[]

  @@map("wallet")
}

model WalletMember {
  id                  String   @id @default(uuid())
  walletId            String   @map("wallet_id")
  userId              String   @map("user_id")
  status              String   @default("active")   // "active" | "suspended" | "removed"
  canSpend            Boolean  @default(false) @map("can_spend")
  perTransactionLimit Decimal? @map("per_transaction_limit") @db.Decimal(14, 2)  // null = no limit
  dailyLimit          Decimal? @map("daily_limit") @db.Decimal(14, 2)            // null = no limit
  monthlyLimit        Decimal? @map("monthly_limit") @db.Decimal(14, 2)          // null = no limit
  rules               Json     @default("{}")   // extras, e.g. {"blockedVendorTypes": ["gambling"]}
  createdAt           DateTime @default(now()) @map("created_at")

  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([walletId, userId])
  @@map("wallet_member")
}
```

Notes:
- The `WalletRule` model was removed. `perTransactionLimit`, `dailyLimit` and `monthlyLimit` are real columns because they are checked on every spend. `rules` JSON is only for flexible extras, and the service should accept only known keys (currently `blockedVendorTypes`). Do not put `dailyCap` in `rules`.
- Removed members keep their row (`status = "removed"`) so history stays intact. Re-adding a person sets the status back to `active` on the same row.
- A personal (`"user"`) wallet's owner is not automatically a `WalletMember`. Add the owner as a member if they need limits or rules there.
- Wallet `balance` is a simple starting point. Later the `ledger_entry` table becomes the source of truth.

Planned roles:

| name | permissions |
|---|---|
| `employee` | `["wallet:read", "transaction:create"]` |
| `dept_admin` | `["wallet:read", "transaction:create", "approval:review", "member:manage", "budget:manage"]` |

## 2.2 Planned spending check order

1. User is active.
2. Wallet is active.
3. Member `status` is `active`.
4. Member `canSpend` is true.
5. Amount is within `perTransactionLimit`.
6. Today's total plus the amount is within `dailyLimit`.
7. This month's total plus the amount is within `monthlyLimit`.
8. Wallet balance is enough.

## 2.3 Done

### Authentication (existing)
- Password login, refresh token rotation with reuse detection, cookie-based JWT, global `JwtAuthGuard` with `@Public()` for open routes.

### WebAuthn: registration endpoints written, partly tested
- Files in `backend/src/webauthn/`: `webauthn.service.js`, `webauthn.controller.js`, `webauthn.module.js`. `WebauthnModule` is registered in `AppModule`.
- `POST /api/webauthn/register/options` generates options and stores a single-use 5-minute challenge in an in-memory `Map`. **Tested:** returns the expected JSON (`rp.id` is `localhost`, random challenge, `userVerification: "required"`).
- `POST /api/webauthn/register/verify` verifies the browser response and saves the device. **Not tested yet:** it needs the browser fingerprint prompt (frontend step postponed).
- Suggested small fix: add `userDisplayName: user.name` to `generateRegistrationOptions`.

### RBAC guard: written and confirmed working
- `permissions.decorator.js` with `@RequirePermissions(...)` and `roles.guard.js` with `RolesGuard`, both in `backend/src/auth/`.
- Use per route: `@UseGuards(RolesGuard)` plus `@RequirePermissions('approval:review')`.
- **Confirmed:** `RolesGuard` works. This also confirms that `JwtAuthGuard` sets `req.user.id`.
- The temporary `GET /api/webauthn/test-admin` route was only for testing and can now be removed.
- Note: the project's own guard files are named `jwt-auth.guard.js` and `role-guard.js`. Align the names and imports with the guidelines' `*.guard.js` convention.

### Page routing by role: designed
- `/dashboard` was removed. There are now two HTML pages, `/manager/` and `/employee/`.
- Proposed `main.js`: a `homeFor()` helper (loads user and role, checks `status === 'active'`), a `/login` redirect to the user's own page, and `protectPage()` middleware for `/manager` and `/employee` that redirects logged-out users to `/api/auth/refresh?next=...` and wrong-role users to their own page.
- Proposed: a shared `auth/home-path.js` (`homePathFor(user)`) used by both `main.js` and `AuthService.login`, which returns `redirectTo` so the login page can go straight to the right page with `window.location.href`.

### Users module: `GET /api/users/me` confirmed working
- Files in `backend/src/users/`: `users.service.js`, `users.controller.js`, `users.module.js`. `UsersModule` must be added to `AppModule`.
- Returns `id`, `name`, `email`, `role` (name or null), `permissions` (array) and `department` (`{id, name}` or null). Fields are picked one by one so nothing internal leaks. It re-checks `status === 'active'` and only ever uses the logged-in user's id from `req.user.id`.
- Protected by the global `JwtAuthGuard` (no `@Public()`), so no cookie or a fake token gives `401`.
- **Confirmed:** the endpoint works.

### Wallet schema: `WalletMember` updated
- `WalletMember` has been updated to the final design: `status`, `perTransactionLimit`, `dailyLimit`, `monthlyLimit`, and the `rules` JSON field. The `WalletRule` model is no longer part of the design.

## 2.4 Needs verification

The code or schema was provided, but results were not confirmed:
- The migration for the final wallet models (`WalletMember` updated, `WalletRule` dropped), plus test rows in Prisma Studio (a Finance department with a manager, wallets, wallet members with limits and status). Roles are confirmed working through the `RolesGuard` and `/api/users/me` tests.
- The `main.js` middleware assumes the JWT stores the user id in `sub`. Adjust if the project uses a different claim. (`req.user.id` is already confirmed in `RolesGuard` and `/api/users/me`.)
- The latest `main.js` shared in chat still contained the old `/dashboard` middleware and sent every authenticated user from `/login` to `/manager/`. The role-based version has not been confirmed as applied.
- Search for leftover `/dashboard` references (`grep -rn "dashboard" backend/src frontend/src`), especially the refresh endpoint's default redirect and the login page.

## 2.5 Next steps

1. Remove the temporary `test-admin` route, then finish the verification items in 2.4.
2. Apply the role-based page routing and `redirectTo` in the login response.
3. `GET /api/wallets/me` in a new `wallets/` module: the user's own wallet and the wallets they can use, with each member's status, limits and rules.
4. Wallet member endpoints for managers: add a member, set limits, change status (requires `member:manage`, and the service must check the wallet belongs to the manager's own department).
5. Department scoping in services (a manager can only act on their own department's data).
6. Optional: split `schema.prisma` into several files under `prisma/schema/`, one per domain (`base.prisma` with the generator and datasource, `auth.prisma`, `organization.prisma`, `wallets.prisma`). Check `npx prisma -v` first. The schema folder path must be set in the Prisma config, and `prisma/migrations` must move to `prisma/schema/migrations`. Verify afterwards with `prisma validate`, `prisma migrate status` and `prisma generate`.
7. Frontend: manager and employee pages (design to be done later), then the WebAuthn registration button using `startRegistration()`.
8. WebAuthn login: options and verify endpoints marked `@Public()`, check the signature counter, update `lastUsedAt`, issue the normal cookies with `authMethod: "webauthn"`.
9. Step-up fingerprint check on sensitive actions (large approvals, changing member limits or `approval_policy`).
10. Add lists of allowed permission strings, rule keys and member statuses in code, since JSON and string columns cannot validate them.
11. Remaining domains: transactions and ledger, approvals, budgets and forecasts, audit log.

## 2.6 Updates to the guidelines

These changes apply on top of Part 3:
- **Section 5 (routing):** `/dashboard` no longer exists. The protected pages are `/manager/` and `/employee/`.
- **Section 1A (RBAC):** roles use a single `Role` table with a JSON `permissions` field and `User.roleId`, not the `user_role`, `role_permission` and `permission` tables, for now.
- **Section 1A (biometrics):** the table is `BiometricDevice`, mapped to `biometric_device`, and holds WebAuthn credentials.
- **Section 1B (wallets):** there is no separate `wallet_rule` table. Rules live on `wallet_member` as limit columns plus a `rules` JSON field. `wallet_member` also has `status`, `daily_limit` and `monthly_limit` in addition to `can_spend` and `per_transaction_limit`.
- **Section 3 (file naming and structure):** the backend is organized as one feature module per domain (see Part 1, section 1.6).

---

# Part 3: Agent Guidelines (`agent_coding_guidelines.md`)

# AI Agent Guidelines & Architecture Rules

This document defines the project vision, domain architecture, code conventions, security constraints, and operational patterns for AI agents working across the full stack of this codebase.

---

## 1. Project Vision & Domain Architecture

### Overview
This project is an **Enterprise Multi-Tenant Wallet, Departmental Expense, Treasury & Approval Management System**. It enables organizations to manage hierarchical departmental budgets, multi-user wallets with spend controls, automated multi-level transaction approvals, recurring bill payments, financial forecasting, and comprehensive audit compliance.

### Core Business Domains & Architecture Breakdown

```
                       ┌─────────────────────────┐
                       │ User & Access (RBAC)    │
                       └────────────┬────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│  Department & Wallets  │  │ Approval & Escalations │  │ Budgeting & Forecasts  │
│  - Department hierarchy│  │ - Threshold approvals  │  │ - Category budgets     │
│  - Member limits       │  │ - Multi-level reviews  │  │ - Projected cashflows  │
│  - Custom wallet rules │  │ - Over-budget alerts   │  │ - Savings goals        │
└───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘
            │                           │                           │
            └───────────────────────────┼───────────────────────────┘
                                        ▼
                            ┌────────────────────────┐
                            │ Transactions & Engine  │
                            │ - Payment attempts     │
                            │ - Failure resolution   │
                            │ - Double-entry ledger  │
                            │ - Receipts & Batches   │
                            └───────────┬────────────┘
                                        ▼
                            ┌────────────────────────┐
                            │ Audit & Compliance     │
                            │ - Entity change logs   │
                            └────────────────────────┘
```

#### A. User Management, RBAC & Security (`users`, `department`, `role`, `permission`, `biometric_device`)
* **Hierarchical Departments:** Structured with `manager_id` and optional `parent_id` for nested organizational trees.
* **Role-Based Access Control (RBAC):** Dynamic role-permission mapping (`user_role`, `role_permission`, `permission`).
* **Authentication Options:** Password credentials, refresh token rotation, and hardware/biometric security devices (`biometric_device`).

#### B. Departmental & Shared Wallets (`wallet`, `wallet_member`, `wallet_rule`)
* **Multi-Type Wallets:** Support for user-level and department-level treasury wallets (`wallet`).
* **Granular Spend Limits:** `wallet_member` entries define individual user spending rights (`can_spend`) and per-transaction limits (`per_transaction_limit`).
* **Custom Rules Engine:** `wallet_rule` attaches dynamic operational constraints (e.g., restricted vendor types, daily caps) to wallets.

#### C. Transaction Engine & Failure Investigation (`txn`, `payment_attempt`, `failure_investigation`, `ledger_entry`, `receipt`, `import_batch`)
* **Inter & Intra Department Transfers:** Wallets execute transfers between departments or individuals (`transfer`).
* **Execution & Attempts:** Each transaction tracks one or more `payment_attempt` records. Failed attempts enter a dedicated resolution workflow (`failure_investigation`).
* **Ledger Accounting:** Transactions post double-entry records (`ledger_entry`) linked to bulk CSV/bank imports (`import_batch`).
* **Receipt Management:** File attachments (`receipt`) linked directly to transactions for tax and audit compliance.

#### D. Multi-Level Approval & Escalation System (`approval_policy`, `approval`)
* **Policy Enforcement:** `approval_policy` defines department spend thresholds (`head_limit`) and automatic escalation flags (`escalate_over_budget`).
* **Sequential Approval Chains:** Submissions progress through multi-level approvals (`level`, `status`, `escalation_reason`).

#### E. Budgeting, Recurring Payments & Cashflow Forecasting (`budget`, `budget_item`, `recurring_payment`, `cashflow_forecast`, `savings_goal`)
* **Category & Department Budgets:** Monthly budget limits with enforcement policies (hard stop vs. warning).
* **Automated Payments & Reminders:** Scheduled recurring payments (`recurring_payment`) with automated auto-pay capabilities and system notifications (`notification`).
* **Savings & Treasury:** Target-driven savings goals (`savings_goal`) backed by structured fund allocations (`fund_allocation`).
* **Predictive Forecasting:** Real-time projection of income vs. expenses (`cashflow_forecast`).

#### F. Audit & Compliance (`audit_log`)
* **Immutable Audit Trail:** Tracks all entity mutations, action types, snapshot changes (`change_data`), and user actors for strict financial compliance.

---

## 2. Stack & Runtime Environment

### Backend
* **Framework:** NestJS (JavaScript ESM mode)
* **Language:** JavaScript (ES2022+ / Node.js ESM format) — **Do NOT use TypeScript**.
* **Database & ORM:** Prisma Client (`PrismaService`)
* **Authentication:** JWT (`@nestjs/jwt`), HTTP-only Cookies (`cookie-parser`), bcryptjs, SHA-256 token hashing
* **Module System:** Native ES Modules (`import`/`export`)

### Frontend
* **Framework / Library:** React 18 (JSX / ES Modules)
* **UI Components & Styling:** Material UI (MUI v5), `@mui/material/styles`, `@mui/material/CssBaseline`
* **Typography & Fonts:** `@fontsource/inter` (weights: 400, 500, 600, 700), `@fontsource/grand-hotel` (400)
* **Theme Management:** Centralized Material UI `createTheme` configuration

---

## 3. Core Backend Conventions

### A. JavaScript Decorator Pattern (No TypeScript Types)
Because this project uses plain JavaScript instead of TypeScript, standard NestJS constructor injection cannot rely on TypeScript type annotations.

* **Dependency Injection:** Always use the `@Dependencies(...)` decorator on classes to declare injected providers.

  ```javascript
  // CORRECT
  @Injectable()
  @Dependencies(PrismaService, JwtService)
  export class AuthService {
    constructor(prisma, jwt) {
      this.prisma = prisma;
      this.jwt = jwt;
    }
  }

  // INCORRECT (Do not use TypeScript type annotations)
  // constructor(private prisma: PrismaService, private jwt: JwtService) {}
  ```

### B. Controller Parameter Binding
* Always use `@Bind(...)` to pass request objects, headers, body, or parameters into controller methods.

  ```javascript
  @Public()
  @Post('login')
  @Bind(Body(), Req(), Res({ passthrough: true }))
  async login(body, req, res) {
    // ...
  }
  ```

### C. Backend File Naming Conventions
* `*.service.js` — Service providers containing business logic.
* `*.controller.js` — HTTP controllers handling routing and response formatting.
* `*.module.js` — NestJS feature modules.
* `*.guard.js` — NestJS guards.
* `*.decorator.js` — Custom decorators.

---

## 4. Authentication & Security Invariants

### A. Route Protection Strategy
1. **Global Guard:** `JwtAuthGuard` is registered globally via `APP_GUARD` in `AuthModule`.
2. **Public Endpoints:** Any route that does not require authentication **must** be explicitly decorated with `@Public()`.
3. **Cookie Extraction:** Access tokens are read from `req.cookies.access_token`.

### B. Cookie Scoping & Configuration
* **Access Token:**
  * Cookie Name: `access_token`
  * Path: `/`
  * Expiry: 15 minutes (`15 * 60 * 1000` ms)
  * Properties: `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`
* **Refresh Token:**
  * Cookie Name: `refresh_token`
  * Path: `/api/auth` (Restricted path scope)
  * Expiry: `REFRESH_DAYS` (default 7 days)
  * Properties: `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`

### C. Refresh Token Rotation & Reuse Grace Period
The authentication system enforces strict single-use refresh token rotation with security reuse detection:
* **Token Hashing:** Raw refresh tokens are never stored in plain text; store `sha256(raw)` in the database.
* **Reuse Detection:** If an already-revoked refresh token is presented:
  * **Within Grace Period (`REUSE_GRACE_MS = 15000`):** Treat as concurrent request / network retry, allow issuance of fresh access token if `replacedBy` exists.
  * **Outside Grace Period:** Flag as potential token theft! Invalidate **all** active refresh tokens for that user immediately and throw `UnauthorizedException`.

### D. User Verification & Status Rules
* Always normalize user email addresses before query/creation: `email.trim().toLowerCase()`.
* Always verify that `user.status === 'active'` in both `JwtAuthGuard` and `AuthService.login`/`AuthService.refresh`.

---

## 5. Routing & Middleware Architecture

* **Global Prefix:** All API endpoints are prefixed with `/api` (`app.setGlobalPrefix('api')`).
* **Route Protection Middleware (`main.js`):**
  * `/dashboard`: Verifies `access_token` synchronously via `jsonwebtoken`. Redirects unauthenticated requests to `/api/auth/refresh?next=...`.
  * `/login`: Redirects already-authenticated users directly to `/dashboard/`.
* **Safe Redirect Rule:** Always sanitize redirect paths using `safeNext()` to prevent open redirect vulnerabilities (ensure path starts with `/` and not `//` or `/\`).

---

## 6. Frontend Architecture & UI System

### A. Dynamic Page Mounting (`mount.jsx`)
To ensure consistent theme injection and provider wrapping, pages or dynamic entry points use the standardized `mount(Page)` utility:
* **Providers Included:** `StrictMode`, `ThemeProvider` (with custom theme), `CssBaseline`, and font packages.
* **Usage:** Always wrap page roots with `mount(PageComponent)` when initializing standalone root components.

### B. Design System & Theme Tokens (`theme.js`)

#### Color Palette
* **Cream (`#FFFBF5`):** Default background color.
* **Sand (`#F7EFE5`):** Paper background, card background, and input field background.
* **Purple (`#7743DB`):** Main primary brand color.
* **Lavender (`#C3ACD0`):** Secondary accent color, input borders, outlined button borders.
* **Highlight (`#6f6f6f2a`):** Interactive hover states.
* **Text Colors:** Primary `#2B2140`, Secondary `#6B6080`.

#### Typography
* **Primary Body Font:** `"Inter", "Helvetica", "Arial", sans-serif`
* **Display / Brand Accent Font:** `"Grand Hotel"` (`brandFont`)
* **Heading Weights:** `h3`, `h4`, `h5` are bold (`700`) with negative letter-spacing (`-0.02em` to `-0.03em`). `h6` uses weight `600`.

#### Component Customizations
* **Border Radius:** Global component shape radius is standard **`12px`** (`shape.borderRadius: 12`).
* **Buttons (`MuiButton`):**
  * Text transform is disabled (`textTransform: "none"`).
  * Outlined buttons feature cream background with lavender borders, transitioning to purple/highlight on hover.
  * Contained buttons have shadow disabled by default, casting a soft purple drop shadow on hover (`rgba(119, 67, 219, 0.3)`).
* **Inputs (`MuiOutlinedInput`):**
  * Background set to `sand` (`#F7EFE5`).
  * Default border is transparent, highlighting in lavender on hover and purple (2px width) on focus.
  * Webkit autofill style override is applied to preserve the `sand` background color seamlessly.

---

## 7. Development Guidelines for Agents

1. **Align New Features with the ER Schema:** Whenever adding backend endpoints or UI views, map entity interactions directly back to the database schema defined in Section 1 (e.g., check `wallet_member.per_transaction_limit` when authorizing transactions).
2. **Do Not Introduce TypeScript:** Keep all files as standard `.js` / `.jsx` ES modules.
3. **Global Prisma Module:** Import `PrismaService` from `../prisma/prisma.service`.
4. **Frontend Styling Consistency:** Always rely on MUI components and theme tokens from `theme.js` instead of arbitrary inline colors or CSS files.
5. **Error Handling:** Use standard NestJS HTTP exceptions (`UnauthorizedException`, `ConflictException`, etc.) on the backend.
6. **Preserve Security Mechanisms:** Never alter the SHA-256 token hashing, cookie path constraints, or the 15-second rotation grace period when editing authentication code.