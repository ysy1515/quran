# Deploying Phase 1 safely

## Compatibility

| | Old server (main) | New server (Phase 1) |
| --- | --- | --- |
| **Old TestFlight builds** | works | Reading, tafsir, search and prayer times work. Bookmarks, progress, settings and stats calls hit stateless compatibility routes (`routes/legacy.ts`): reads return empty defaults, writes return 410 with an Arabic "please update the app" message. Data those builds stored on the shared server is no longer shown. Push changes from old builds fail (404) because they have no manage token. |
| **New builds** | Reading works. Personal data is on device so it is unaffected. Turning on push reminders gets no manage token from the old server, so the app keeps showing them as off until the server is updated. | works |

Pre-Phase-1 server data was shared by all users (not per person), so it cannot be
safely attached to any one user. It is left in the database untouched.

## Recommended order

1. **Verify the iOS build** from the Phase 1 branch with the `ios-verify-build`
   Codemagic workflow (no upload). Fix anything it reports before going on.
2. **Set the new VAPID secrets** in Replit (`docs/VAPID-ROTATION.md`). Doing this
   first means push is never live with the leaked keys.
3. **Merge the PR and publish the API on Replit.** The post-merge `drizzle-kit
   push` is additive (three columns and an index) and runs without prompts;
   verified on a copy of main's schema.
4. **Check the live server:** startup log says `Web push enabled`, then run
   `pnpm --filter @workspace/api-server verify:quran` in the Replit shell
   (all 114 surahs, 6236 ayat against live Quran.com).
5. **Build TestFlight from `main`** with `ios-testflight` as usual.
6. **About 90 days later** (TestFlight build expiry), remove `routes/legacy.ts`
   and, optionally, the old shared tables.

Rollback: re-publish the previous Replit deployment. The new columns are nullable
and ignored by the old code.
