# Edge Integration Test Matrix

## Environment flags
- `RUN_EDGE_INTEGRATION=true` enables edge endpoint tests.
- `RUN_EDGE_WRITE_TESTS=true` additionally enables lead write test.

## Config variables
- `EDGE_API_BASE_URL` (or `VITE_API_BASE_URL`)
- Optional explicit endpoint overrides:
  - `EDGE_CITIES_URL`
  - `EDGE_PROPERTIES_URL`
  - `EDGE_LEADS_URL`
- Optional auth headers:
  - `EDGE_ANON_KEY`

## Test coverage
- `GET /api/cities` contract validation
- `GET /api/properties` pagination contract
- `GET /api/properties/:id` detail contract
- Optional `POST /api/leads` write-path validation

## Current execution mode
- CI/local default: skipped unless env flag is enabled.
