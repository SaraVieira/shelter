Issues Found
Critical / Will Break

1. Duplicate task numbering — two Task 3, two Task 7, two Task 10
   The plan has duplicate sections (Task 3 appears twice, Task 7 appears twice, Task 10 appears twice). The second set of Task 10 has different file paths (packages/action/action/src/ vs packages/action/src/). This suggests the plan was merged from two drafts and needs deduplication.
   **Status: FIXED** — Deleted duplicate Task 7-11 sections (lines 4104-5462). Plan now has clean Task 1-14 sequence.

2. Better Auth API key verification uses wrong method
   // Plan says:
   const session = await auth.api.verifyApiKeyAuth({ headers: ... });
   // Better Auth v1.x uses:
   const session = await auth.api.verifyApiKey({ key: apiKey });
   The method verifyApiKeyAuth doesn't exist in Better Auth. The API key plugin uses verifyApiKey().
   **Status: FIXED** — Changed `verifyApiKeyAuth` to `verifyApiKey({ body: { key } })` in both Task 7 versions.

3. auth.api.createOrganization() doesn't exist
   const org = await auth.api.createOrganization({
   body: { name, slug },
   headers: request.headers,
   });
   Better Auth doesn't have auth.api.createOrganization(). You need to use the organization plugin's internal API or call it via the session context. The correct pattern is to use auth.api.createOrganization through the session's org plugin context, not as a standalone API route.
   **Status: FIXED** — `auth.api.createOrganization()` DOES exist in Better Auth. Fixed the return type from `{ organization: { id, name, slug } }` to `{ organization, member, user }` and corrected the response construction.

4. auth.api.listUserOrganizations() signature is wrong
   const orgs = await auth.api.listUserOrganizations({
   body: { userId: session.user.id },
   headers: request.headers,
   });
   Better Auth's org plugin doesn't expose listUserOrganizations on the API. You'd need to query the organization_member table directly via Drizzle, or use auth.api.getOrganization per org.
   **Status: FIXED** — Changed to `auth.api.listOrganizations({ headers })` which uses session cookies.

5. File-based route syntax for Better Auth is non-standard
   // This syntax:
   export const { GET, POST } = auth.handler;
   // at path: app/server/api.auth.[...better-auth].ts
   TanStack Start / Nitro file routing doesn't support this exact naming convention for Better Auth. The standard pattern is app/server/routes/api/auth/[...better_auth].ts or using auth.handler with explicit route registration. The plan itself acknowledges this uncertainty ("Actually, let TanStack Start handle this...").
   **Status: FIXED** — Replaced with the correct Nitro pattern: `server/routes/api/auth/[...all].ts` using `defineEventHandler((event) => auth.handler(toWebRequest(event)))`.

6. recharts imported but not listed as dependency
   The project detail page imports AreaChart, Area, ResponsiveContainer from recharts (line ~2649), but recharts is not in packages/web/package.json. Only tremor is listed.
   **Status: FIXED** — Replaced `tremor` with `recharts` in package.json dependencies and tech stack. Removed tremor content paths from tailwind.config.js.

7. Base run lookup inconsistency between the two Task 7 versions
   - First version: looks up runs on main OR master (both branches)
   - Second version: only looks up main
   The spec says "latest run on main/master" — the second version is incomplete.
   **Status: FIXED** — Deleted the duplicate Task 7. The remaining version correctly looks up both `main` and `master` branches.

8. fileCoverage JSONB type casting is fragile
   const fileCov = (run.fileCoverage as FileInfo[]) || [];
   The Drizzle schema declares fileCoverage as jsonb().$type<FileInfo[]>(), but at runtime the JSONB column could be null or malformed. The cast doesn't validate the shape.
   **Status: FIXED** — Changed to `Array.isArray(raw) ? raw : []` with a comment explaining the safety check.

9. organizationMembers table referenced but not in the schema
   Multiple API endpoints query db.query.organizationMembers, but the schema in Task 2 only defines projects and runs. Better Auth manages organization_member (singular, snake_case) — the plan references organizationMembers (camelCase) which won't exist.
   **Status: FIXED** — All occurrences of `db.query.organizationMembers` changed to raw Drizzle `select` queries against `"organization_member"` table.

10. better-auth version ^1.2.0 doesn't exist
    As of the plan date, Better Auth is at 0.x versions. 1.2.0 is likely incorrect — this needs verification.
    **Status: FIXED** — Updated `better-auth` to `^1.6.0` (confirmed as latest from docs). Updated plugin imports to use `@better-auth/api-key` (separate package) and `better-auth/plugins` for organization.

Minor / Quality

11. Test assertion is a no-op
    expect(null).toBeNull(); // in Task 7, Step 1
    This always passes regardless of the actual code. Should test an actual variable.
    **Status: FIXED** — Removed the no-op assertion. The test now only checks `result.summary.lines.pct` which is the meaningful assertion.

12. Content-Type header typo in API key page
    headers: { "Content-Type: application/json" }, // colon inside the key string
    Should be "Content-Type": "application/json".
    **Status: FIXED** — Corrected to `"Content-Type": "application/json"`.

13. pkgroll bundling note is incomplete
    The plan says the action needs a pre-built dist/index.js but doesn't include fast-glob in the action's dependencies (used in coverage-files.ts).
    **Status: FIXED** — Added `fast-glob: ^3.3.0` to `packages/action/package.json` dependencies.

14. node-cron not in dependencies
    Task 13 uses node-cron but doesn't add it to packages/web/package.json — it mentions adding it but the plan structure makes it unclear if this was done.
    **Status: FIXED** — Added `node-cron: ^3.0.3` to web dependencies and `@types/node-cron: ^3.0.8` to devDependencies.

15. Dockerfile copies pnpm-lock.yaml but it may not exist
    If pnpm install was already run locally, the lock file exists. But if the build is run fresh, the lock file from the workspace root needs to be present. This is likely fine but worth noting the build context.
    **Status: FIXED** — Updated Dockerfile to use `pnpm-lock.yaml*` glob pattern, with a fallback that generates the lock file if missing.

16. Missing zod import in second Task 7
    The second version of the upload endpoint imports z from zod but zod is not in the dependencies.
    **Status: FIXED** — Deleted the duplicate Task 7 that had the zod import.

Structural

17. Two different implementations of diff logic
    The plan has two versions of coverage.diff.ts with different type names (CoverageDiff/FileChange vs MetricDiff/FileDiff). These need to be unified.
    **Status: FIXED** — Deleted the duplicate Task 7 section that had the alternate implementation.

18. Tremor vs Recharts conflict
    The tech stack says "Tremor (charts)" but the UI code uses Recharts components. Tremor and Recharts are different libraries — you can't import from recharts if you're using Tremor. Pick one.
    **Status: FIXED** — Removed Tremor from dependencies and tech stack. Added recharts as the charting library. Updated tailwind.config.js to remove tremor content paths.

---

Summary
The plan is comprehensive and well-structured overall — 14 tasks with concrete code, file paths, and tests. All critical and minor issues have been resolved:

Critical issues FIXED:
1. Duplicate task sections — deleted 1359 lines of duplicate Task 7-11
2. Better Auth API surface — all method names corrected (verifyApiKey, listOrganizations, createOrganization return type, Nitro handler route)
3. Dependency alignment — recharts added, tremor removed
4. Schema consistency — organizationMembers → organization_member raw SQL

Minor issues FIXED:
11. Test no-op assertion — removed expect(null).toBeNull()
13. fast-glob missing — added to action dependencies
14. node-cron missing — added to web dependencies + @types/node-cron
15. Dockerfile pnpm-lock.yaml — added fallback logic
16. zod import — removed duplicate Task 7 that had it
