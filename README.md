# OMSUN Platform

One platform for OMSUN E-Services, Omerga: the public website, the admin/employee web app and the **OMSUN Mitra** retailer app (Marathi + English). All three share one Supabase project (auth, Postgres, storage, realtime, row-level security).

## Status

Stage 1 (business workflow, roles and database) is done. Stage 2, the admin web app, is in `web/`. Stage 3, the OMSUN Mitra retailer app, is in `mobile/`. Next: payments and commissions, notifications, analytics.

## Layout

| Path | What |
|---|---|
| [web/](web/) | Next.js admin web app (and later the public website). See [web/README.md](web/README.md) |
| [mobile/](mobile/) | OMSUN Mitra retailer app (Expo, Android first). See [mobile/README.md](mobile/README.md) |
| [docs/stage1-spec.md](docs/stage1-spec.md) | Request lifecycle, role permissions, payments, commissions and settlements |
| [supabase/migrations/](supabase/migrations/) | Database schema, rules and security policies |
| [tests/db/](tests/db/) | Rule tests run against a local PostgreSQL with a Supabase stand-in |
| [scripts/test-db.sh](scripts/test-db.sh) | Runs those tests |

## Database

To set up a new Supabase project, run the files in `supabase/migrations/` in order (SQL editor, or `supabase db push`). For a local copy, `supabase start` uses `supabase/config.toml`.

To test locally (PostgreSQL 16):

```bash
scripts/test-db.sh
```

Never put the Supabase service-role key in the website or the app. Customer documents stay in the private `request-documents` bucket and are opened through signed URLs.
