# OMSUN Platform

One platform for OMSUN E-Services, Omerga: the public website, the admin/employee web app and the **OMSUN Mitra** retailer app (Marathi + English). All three share one Supabase project (auth, Postgres, storage, realtime, row-level security).

## Status

Stage 1 (business workflow, roles and database) is drafted. Apps come next, in this order: admin web app, OMSUN Mitra, payments and commissions, notifications, analytics.

## Layout

| Path | What |
|---|---|
| [docs/stage1-spec.md](docs/stage1-spec.md) | Request lifecycle, role permissions, payments, commissions and settlements |
| [supabase/migrations/](supabase/migrations/) | Database schema, rules and security policies |
| [tests/db/](tests/db/) | Rule tests run against a local PostgreSQL with a Supabase stand-in |
| [scripts/test-db.sh](scripts/test-db.sh) | Runs those tests |

## Database

To set up a new Supabase project, run the files in `supabase/migrations/` in order (SQL editor, or `supabase db push`).

To test locally (PostgreSQL 16):

```bash
scripts/test-db.sh
```

Never put the Supabase service-role key in the website or the app. Customer documents stay in the private `request-documents` bucket and are opened through signed URLs.
