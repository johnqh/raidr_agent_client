> **Git policy — never auto-commit or auto-push.** Leave work in the working tree. Run git commit, git push, gh pr create or a release script only when the user explicitly asks in that turn.

# raidr_agent_client

HTTP client for raidr_agent_api plus TanStack Query hooks. All HTTP goes through an injected `NetworkClient`; the client never calls `fetch` directly.

**Package**: `@sudobility/raidr_agent_client` (public on npm)

## What raidr_agent is

raidr_agent is a native agent app. It takes a user's request in plain language and:

1. finds the intent via **shapeshyft** (a hosted structured-AI endpoint);
2. filters the **raidr** catalog of MCP servers by label to the sites that can serve that intent;
3. signs the user in to those sites in an in-app **web view** — the site session tokens stay on the device and are never sent to the raidr_agent backend;
4. calls the sites through **raidr's hosted MCP** endpoint (raidr_api);
5. renders the results with the **Vercel AI SDK**.

## Layering

```
raidr_agent_types -> raidr_agent_client -> raidr_agent_lib -> raidr_agent_app_rn
raidr_agent_types ------------------------------------------> raidr_agent_api
```

- `raidr_agent_types` — shared TypeScript types and response helpers (no runtime deps).
- `raidr_agent_client` — `RaidrAgentClient` HTTP class (injected `NetworkClient`) + TanStack Query hooks.
- `raidr_agent_lib` — business logic: Zustand stores and hooks composed from client hooks.
- `raidr_agent_api` — Hono + Postgres (Drizzle) backend; Firebase auth; talks to shapeshyft and raidr.
- `raidr_agent_app_rn` — the React Native app (separate repo).

All repos use **Bun only** — never npm, yarn or pnpm.

## Project structure

```
src/
├── index.ts
├── types.ts                       # FirebaseIdToken, QUERY_KEYS, DEFAULT_STALE_TIME / DEFAULT_GC_TIME
├── network/RaidrAgentClient.ts    # getHealth, getUser, understandIntent (POST /intent, IntentRequest),
│                                  # classifyIntent (deprecated alias, string | IntentRequest), prepare (POST /prepare),
│                                  # getSiteContext, getSiteAuth, getRuns, getRun, runsUrl,
│                                  # getLlmPayload, getCandidates, getSiteManifest, importRun (local mode)
├── hooks/useAgent.ts              # useUnderstandIntent, useClassifyIntent (deprecated), usePrepare, useSiteContext,
│                                  # useSiteAuth, useRuns, useRun,
│                                  # useLlmPayload, useCandidates, useSiteManifest, useImportRun (invalidates runs)
├── hooks/useHealth.ts             # placeholder query hook
└── utils/raidr-agent-helpers.ts   # createAuthHeaders, createHeaders, buildUrl, handleApiError
```

## Commands

```bash
bun install           # see "Local dependency workaround"
bun run typecheck
bun run lint
bun run test:unit
bun run build         # tsc -p tsconfig.build.json -> dist/
bun run verify
```

### Local dependency workaround

The `@sudobility/raidr_agent_*` packages are not published yet, so `bun install`
fails on them. Install everything else, then build the dependency locally and
copy its `dist/` and `package.json` into
`node_modules/@sudobility/<name>/`. Build order: types -> client -> lib -> api.

## Notes

- Placeholder exports: `RaidrAgentClient.getHealth()` and the `useHealth` hook. `getUser()` is kept from the template.
- Query keys are namespaced `['raidr_agent', ...]`; add new keys to `QUERY_KEYS` in `types.ts`.
- Every response is checked with `validateResponse` before it is returned.
- Depends on `@sudobility/raidr_agent_types` and `@sudobility/raidr_types` (dev, types only: `McpManifest`) and peers `@sudobility/types`, `@tanstack/react-query`, `react`.

## CI/CD

`.github/workflows/ci-cd.yml` calls `johnqh/workflows/.github/workflows/unified-cicd.yml@main` on push and PR to `main` and `develop`.

## Origin

Scaffolded from the mogulgame repos (themselves a copy of the company "starter" template), with the game domain removed.
