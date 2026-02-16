# Supabase Backend Artifacts

This folder contains Phase 1 backend scaffolding:

- `migrations/20260216_phase1_schema.sql`: PostgreSQL schema + RLS policies.
- `functions/properties-search`: `GET /api/properties` contract.
- `functions/property-detail`: `GET /api/properties/:id` contract.
- `functions/cities-list`: `GET /api/cities` contract.
- `functions/city-detail`: `GET /api/cities/:slug` contract.
- `functions/city-properties`: `GET /api/cities/:slug/properties` contract.
- `functions/leads-create`: `POST /api/leads` contract.
- `workers/provider-sync.ts`: scheduled feed sync scaffold.

## Security notes
- Endpoint validation is server-side.
- Lead insert requires consent.
- RLS policies include service-role management and public read limitations.

## Deployment notes
- Bind each function to your routing layer in Lovable/Supabase edge deploy config.
- Configure secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
