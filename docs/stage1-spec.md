# OMSUN Platform — Stage 1 Spec

Business workflow, user roles, database and commission rules for the OMSUN website, admin web app and OMSUN Mitra app. All three share one Supabase project.

Status: **draft v0.1 (2026-10-01)**. Items marked **[Decision]** follow the default recommended in the project thread and change if Aditya picks otherwise.

Companion file: [the Stage 1 migration](../supabase/migrations/20261001000000_stage1_schema.sql) is the full Supabase database (tables, rules, security policies). [supabase/tests/schema-test.sql](../supabase/tests/schema-test.sql) walks one retailer request and one walk-in through every rule above; it passes on PostgreSQL 16 with a small Supabase stand-in (`supabase/tests/supabase-stub.sql`).

---

## 1. Apps and stack

| App | Users | Stack **[Decision]** |
|---|---|---|
| Public website | Visitors, customers, retailer leads | Next.js (same app as admin, public pages) |
| Admin web app | Owner, Manager, Accountant, Sales, Service staff | Next.js, `/admin` area |
| OMSUN Mitra | Retailers | React Native with Expo (Android first), Marathi + English |
| Backend | All | Supabase: Auth (mobile OTP), Postgres, Storage, Realtime, RLS |

Rules that apply everywhere:
- The service catalogue lives in the database. Nothing about services is hard-coded in the apps.
- The service-role key never ships in the website or the app. Privileged actions run in database functions or Supabase Edge Functions.
- Customer documents live in a private storage bucket and are opened only through short-lived signed URLs.

## 2. Roles

| Role | Who | In short |
|---|---|---|
| `owner` | Aditya | Sees and controls everything, including prices, commissions, staff and audit logs |
| `manager` | Omerga office manager | Runs daily operations: assigns work, watches pending requests, manages retailers and leads. No owner-level finance or staff control |
| `accountant` | Accountant | Records and verifies payments, receipts, commissions and retailer settlements |
| `sales_executive` | Sales staff | Works their own leads (CRM) and onboards retailers |
| `service_executive` | Processing staff | Processes the requests assigned to them, records walk-in payments |
| `retailer` | OMSUN E Sewa Kendra partners | Uses OMSUN Mitra: their own customers, requests, documents and earnings only |
| `customer` | Public (later) | Website enquiry and request tracking. Not needed in Stage 1-3 |

New sign-ups always start as `retailer` with approval status `pending`. Only the owner (or the manager, for retailer approval) can change a role or approve a retailer.

## 3. Service request lifecycle

### 3.1 Where requests come from
- **Retailer** (OMSUN Mitra): the retailer creates or picks a customer, picks a service, uploads documents and submits.
- **Walk-in** (office): staff register the customer immediately and a daily token number is generated.
- **Website** (later): a customer enquiry becomes a request after staff confirm it.

Every request gets a unique number like `OMS-2610-000123` (year-month and a running number).

### 3.2 Statuses

| Status | Meaning | Who sets it |
|---|---|---|
| `new` | Submitted, not yet assigned | System on submit |
| `assigned` | A service executive owns it | Manager/Owner |
| `documents_required` | Something is missing or unclear; note says what | Assigned staff, Manager |
| `documents_received` | Retailer/customer supplied the missing documents | Retailer (by uploading), staff |
| `under_process` | Being worked on (applied on the govt portal etc.) | Assigned staff |
| `pending` | Waiting on an outside party (govt office, approval) | Assigned staff |
| `completed` | Done; the output document is attached | Assigned staff, Manager |
| `rejected` | Cannot be done; note gives the reason | Assigned staff, Manager |
| `cancelled` | Withdrawn | Retailer (only while `new`), Manager/Owner |

### 3.3 Allowed moves

```
new ──────────► assigned ──► under_process ──► completed
 │                 │  ▲            │  ▲
 │                 ▼  │            ▼  │
 │       documents_required ◄──► pending
 │                 │
 │                 ▼
 │       documents_received ──► under_process
 │
 └─► cancelled          (any open status) ──► rejected / cancelled
```

Exact list, enforced by the database:

| From | To |
|---|---|
| new | assigned, documents_required, rejected, cancelled |
| assigned | under_process, documents_required, rejected, cancelled |
| documents_required | documents_received, rejected, cancelled |
| documents_received | under_process, documents_required, rejected, cancelled |
| under_process | pending, documents_required, completed, rejected, cancelled |
| pending | under_process, completed, rejected, cancelled |
| completed, rejected, cancelled | none (final). Owner can reopen to `under_process` |

Rules:
- Every status change is written to `request_status_history` with who, when and a note. `rejected`, `documents_required` and `cancelled` need a note.
- `completed` needs at least one output document attached.
- Moving to `assigned` needs an assigned employee.
- Realtime pushes each change to the retailer's app and the staff dashboards.

### 3.4 Walk-in flow
Customer arrives → staff register customer → request created with channel `walk_in` and today's token number → manager assigns (or staff self-assign) → processed → payment recorded with receipt → completed. A walk-in request cannot be marked completed until it is fully paid (no verbal credit).

## 4. Money: payments, commissions, settlements

### 4.1 Prices **[Decision]**
Each service has:
- `govt_fee`: the official fee paid onward (can be 0),
- `service_charge`: OMSUN's charge,
- `customer_price` = govt_fee + service_charge,
- `retailer_commission`: a **fixed rupee amount** set by the owner, taken out of the service charge.

When a request is created, these four values are **copied onto the request**. Later price changes never alter old requests.

### 4.2 Payments
- Every rupee is recorded in `payments` with method (cash, UPI, bank, other), reference, receipt number (`RCP-2610-000045`), who received it and when.
- Staff record payments; the accountant **verifies** them. Only verified payments count as collected.
- No backdated entries: payment date cannot be earlier than yesterday unless the owner enters it.
- Payments are never deleted. A mistake is reversed by the accountant with a `reversed` status and a reason.

### 4.3 Commission **[Decision]**
- A retailer earns the request's `retailer_commission` when the request is **completed** and the customer price is **fully paid**.
- The database creates the commission record automatically when the request is completed. It waits as `on_hold` until the payment is in, then becomes `earned` on its own.
- Rejected or cancelled requests earn nothing. If an owner reopens a completed request, its commission goes back to `on_hold`.
- Walk-in and website requests have no retailer and no commission.

### 4.4 Retailer settlement **[Decision]**
The retailer collects the full customer price at their shop. They owe OMSUN `customer_price − retailer_commission` for each completed request.
- Each request from a retailer records what the retailer has paid OMSUN against it (`payments` with payer `retailer`).
- Once a month the accountant creates a **settlement** per retailer: total requests, gross amount, commission kept, amount due to OMSUN, amount received, balance. Commissions in that settlement move to `settled`.
- Later option (Stage 4): a prepaid retailer wallet that is debited on submit. The tables leave room for it.

## 5. Permissions matrix

R = read, W = create/edit, own = only their own rows, asg = only requests assigned to them, — = none.

| Data | Owner | Manager | Accountant | Sales exec | Service exec | Retailer |
|---|---|---|---|---|---|---|
| Profiles / staff | RW | R (edit retailers & sales/service staff) | R | R own | R own | R/W own |
| Retailers | RW | RW (approve) | R | RW (onboarding) | R | R/W own (not approval) |
| Service catalogue | RW | RW (not price/commission) | R | R | R | R active only |
| Customers | RW | RW | R | R | RW (for asg + walk-in) | RW own |
| Service requests | RW | RW | R | R | R/W asg (status), W walk-in | R own, W new; cancel while `new` |
| Request documents | RW | RW | R | — | RW asg | R/W own requests |
| Status history | R | R | R | — | R asg | R own |
| Payments | RW | R, W record | RW (verify, reverse) | — | W record, R own entries | R own |
| Commissions | RW | R | RW | — | — | R own |
| Settlements | RW | R | RW | — | — | R own |
| Leads (CRM) | RW | RW | — | RW own/assigned | — | — |
| Support tickets | RW | RW | R | — | R/W assigned | R/W own |
| Notifications | own | own | own | own | own | own |
| Announcements | RW | RW | R | R | R | R (if targeted) |
| Audit logs | R | — | — | — | — | — |

Nobody can delete requests, payments, commissions, history or audit logs. Deactivating a profile blocks all access.

## 6. Database tables (summary)

Full definitions in [the Stage 1 migration](../supabase/migrations/20261001000000_stage1_schema.sql).

| Table | Purpose |
|---|---|
| `profiles` | One row per login (linked to Supabase Auth). Role, name, mobile, language, active |
| `retailers` | Retailer shop details, village/taluka/district, approval status, joining fee status |
| `employees` | Staff code, designation, reporting manager |
| `service_categories`, `services` | Dynamic catalogue with Marathi + English names, prices, commission, processing days |
| `service_required_documents` | The document checklist per service |
| `customers` | Customer record, owned by a retailer or by the office |
| `service_requests` | The central table: number, channel, token, customer, service, retailer, assignee, status, price snapshot, paid amount |
| `request_documents` | Uploaded input documents and output (completed) documents, with verification status |
| `request_status_history` | Every status change |
| `payments` | Every rupee received, with receipt number and verification |
| `commissions` | Retailer commission per completed request |
| `retailer_settlements` | Monthly settlement per retailer |
| `leads`, `lead_activities` | Sales CRM: stages New Lead → Converted/Lost, calls and follow-ups |
| `support_tickets`, `notifications`, `announcements` | Support and messaging |
| `audit_logs` | Before/after copy of every change to key tables |

Storage bucket `request-documents` (private). File path: `<request_id>/<file>`; access follows the request's rules.

## 7. Not in Stage 1
Employee points and attendance, online payment gateway, retailer wallet, SMS/WhatsApp notifications, analytics dashboards, Tally export. The schema leaves room for each.

## 8. Next steps
1. Aditya answers the open questions in the thread; this spec is updated.
2. Create the Supabase project and a fresh GitHub repository.
3. Run the Stage 1 migration and seed 10–20 real services with real prices.
4. Stage 2: build the admin web app on top.
