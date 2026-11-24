# DapurKita frontend

React, TypeScript, Vite and Tailwind foundation. The approved OpenAPI contract is copied to `openapi.yaml` and is the only source for generated API types.

## Setup

```sh
npm install
npm run generate:api
npm run dev
```

Set `VITE_API_BASE_URL=/api/v1`. The Vite dev server proxies `/api` to `http://localhost:8080`. Set `VITE_ENABLE_MOCKS=true` to start the MSW mock worker; set it to `false` to use the backend. To exercise the shared refresh-and-retry path with mocks, temporarily set `VITE_MOCK_TOKEN_EXPIRED_ONCE=true`; the first authenticated request then returns `TOKEN_EXPIRED` once. Both mock flags are off in the checked-in development environment for backend integration.

With mocks on, the mock admin (`admin@dapurkita.local`) can only sign in when `VITE_MOCK_ADMIN_PASSWORD` is set in your untracked `.env.development.local`. Pick any value; no password is stored in the repository.

## Decorative photos

The decorative photos referenced from `src/lib/photos.ts` (`public/images/foodzero/*.jpg`) are not part of this repository because they come from a licensed design template. They are added at production build time. Without them every page still works: photo backgrounds fall back to the plain dark green, and cards show the pot placeholder. To use your own photos locally, put JPEG files in that git-ignored folder, named after the `photo('...')` calls in `src/`.

## Contract workflow

After an approved OpenAPI change, update `openapi.yaml` and run `npm run generate:api`. Do not edit `src/api/generated/openapi.ts` by hand. The typed client imports its `paths` and `components` directly.

Access tokens live only in module memory. The app waits for `POST /auth/refresh` before mounting routes and fetching recipe data. Authentication requests include credentials; a single shared refresh request handles concurrent `TOKEN_EXPIRED` responses.
