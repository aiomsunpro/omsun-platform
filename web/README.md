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
| `/admin` | All staff | Dashboard: open work, today's completions and collections, retailers |
| `/admin/requests` | Staff (service executives see only their own) | Request list with status filter and search |
| `/admin/requests/[id]` | Staff | Request detail: status changes, assignment, documents, payments, history |
| `/admin/requests/new` | Owner, manager, service executive | Walk-in request with daily token |
| `/admin/services` | All staff (owner/manager edit) | Service catalogue, prices, commission, required documents |
| `/admin/retailers` | Owner, manager, accountant, sales | Add, approve, suspend retailers; joining fee |
| `/admin/payments` | Owner, manager, accountant | Verify or reverse payments |
| `/admin/team` | Owner, manager | Give staff their roles, deactivate accounts |
