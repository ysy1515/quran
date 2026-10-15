# Rotating the web push (VAPID) keys

The VAPID key pair committed to `.replit` on `main` before Phase 1 is public in
Git history and must be treated as compromised. Phase 1 removes it from `.replit`
and the server refuses to enable web push if it is configured with either half of
that pair (see `artifacts/api-server/src/lib/vapid.ts`, which stores only SHA-256
fingerprints of the leaked keys, never the keys).

## Rules

- Keys live only in Replit Secrets. Never put them in `.replit`, `.env` files that
  are committed, code, issues, PRs or chat.
- The server never logs a key. At startup it logs a 16-character fingerprint of the
  public key so you can confirm which key is live.

## Procedure

1. On your own computer (not in a committed file), generate a new pair:

   ```sh
   npx web-push generate-vapid-keys
   ```

2. In Replit, open **Tools → Secrets** and set:
   - `VAPID_PUBLIC_KEY`: the new public key
   - `VAPID_PRIVATE_KEY`: the new private key
   - `VAPID_SUBJECT`: a `mailto:` address you control (recommended; the fallback `mailto:quran@app.com` is not yours)

   Close the terminal or clear the output that showed the private key.

3. Deploy (see `docs/DEPLOYMENT.md` for the order) and check the startup log:
   - `Web push enabled` with `publicKeyFingerprint`: rotation worked.
   - `Web push disabled: the configured VAPID keys are the ones exposed in the
     repository`: the old pair is still configured. Replace it.
   - `Web push disabled: VAPID keys are not configured`: secrets are missing.

4. Confirm from outside:

   ```sh
   curl https://<your-domain>/api/push/vapid-public-key
   ```

   It must return the new public key (200). It returns 503 while push is disabled.

5. Old subscriptions were created with the old key and without an ownership token.
   The server never sends to them. Once the new version is live you can remove
   them:

   ```sql
   DELETE FROM push_subscriptions WHERE manage_token_hash IS NULL;
   ```

   Users re-enable reminders in the app; the app subscribes again with the new key.

## What was verified (Phase 1 branch, local Postgres)

- Fresh keys in the process environment only: `Web push enabled`, fingerprint
  logged, 0 occurrences of the private key or any manage token in the log.
- Leaked public key configured: `vapid-public-key` and `subscribe` return 503,
  the scheduler does not start, health stays 200, the key does not appear in the log.
