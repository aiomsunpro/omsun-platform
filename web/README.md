# OMSUN web app

Next.js app for the OMSUN admin/employee system (`/admin`) and, later, the public website (`/`).
It talks to Supabase as the signed-in user, so the database's row-level security decides what each role sees and can change.

## Run it

```bash
cp .env.example .env.local   # fill in your Supabase project URL and anon key
npm install
npm run dev                  # http://localhost:3000
```

Only the **anon** key goes in `.env.local`. Never put the service-role key in this app.

## First owner account

1. Open `/signup` and create your account.
2. In the Supabase SQL editor run:
   `update profiles set role = 'owner' where email = 'you@example.com';`
3. Sign in at `/login`. Other staff sign up the same way and you give them a role on the **Team** page.

## Screens

| Path | Who | What |
|---|---|---|
| `/admin` | All staff | Dashboard: greeting, overdue alert, quick buttons, customer search, today / overall / center overview cards, action-required list |
| `/admin/requests` | Staff (service executives see only their own) | Request list with status filter and search |
| `/admin/requests/[id]` | Staff | Request detail: status changes, assignment, documents, payments, history |
| `/admin/requests/new` | Owner, manager, service executive | Walk-in request with daily token |
| `/admin/customers` | All staff | Customer search by name or mobile, with their requests |
| `/admin/services` | All staff (owner/manager edit) | Service catalogue, prices, commission, required documents |
| `/admin/retailers` | Owner, manager, accountant, sales | Add, approve, suspend retailers; joining fee |
| `/admin/payments` | Owner, manager, accountant | Verify or reverse payments |
| `/admin/team` | Owner, manager | Give staff their roles, deactivate accounts |
| `/admin/cashbook` | Owner, manager, accountant | Inflow & Outflow: payments plus other money in and out, cash in hand |
| `/admin/documents` | Owner, manager, accountant, service executive | Verified Docs: customer documents by check status |
| `/admin/enquiries` | Owner, manager, sales, service executive | Customers who asked about a service; turn one into a walk-in |
| `/admin/leads` | Owner, manager, sales | Retailer leads by stage; `/admin/leads/[id]` logs calls and follow-ups |
| `/admin/reminders` | Owner, manager, sales, service executive | Follow-ups overdue, today and in the next 7 days |
| `/admin/settlements` | Owner, manager, accountant (owner/accountant edit) | Monthly retailer settlements: draft and finalize |
| `/admin/reports/daily` | Owner, manager, accountant | EOD report per staff member |
| `/admin/reports/monthly` | Owner, manager, accountant | Month by service and by day |
| `/admin/reports/leads` | Owner, manager, sales | Leads and enquiries per staff member |
