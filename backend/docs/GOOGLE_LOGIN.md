# Google login and account status - backend rollout

This change adds Google login alongside the existing password login. It does not create new RMS users, replace passwords, change roles, backfill production records, or invalidate active users' existing sessions. Existing users without a `status` field are treated as active. The frontend now includes the official Google Identity Services button alongside password login, with responsive PWA styling and inline error handling.

## Environment configuration

Create an OAuth client of type **Web application** in Google Cloud / Google Auth Platform, configure its consent screen, and copy its **Client ID** (ending in `.apps.googleusercontent.com`). Add these Authorized JavaScript origins:

- `https://dashboard.bharatspecialsteels.com`
- `http://localhost`
- `http://localhost:3000` (or the actual frontend development origin)

Use the Google Identity Services JavaScript callback / popup flow. This flow does not need an OAuth redirect callback route or a client secret on this backend. If the app is in testing mode, add the required test users in Google's audience configuration. For Workspace-only internal apps, use the appropriate organization audience; otherwise configure an external audience and publish as appropriate.

Backend environment (initial rollout):

```dotenv
GOOGLE_LOGIN_ENABLED=false
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

Keep the existing `JWT_SECRET` value and other production environment settings unchanged. After configuration and login verification, set `GOOGLE_LOGIN_ENABLED=true`. When disabled or missing a client ID, only Google endpoints are unavailable; password login continues working.

Frontend environment (Create React App):

```dotenv
REACT_APP_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

The frontend and backend client IDs must match. This is a public client ID, not a token or secret. Do not store a Google ID token in either environment file. Tokens are issued for each sign-in. No Google client secret belongs in the frontend. No existing environment file was modified by this change.

## API contract

Existing endpoint, unchanged request and session shape:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"registered@example.com","password":"existing-password"}
```

Google callback endpoint:

```http
POST /api/auth/google
Content-Type: application/json

{"credential":"GOOGLE_ID_TOKEN_FROM_CALLBACK"}
```

The server uses Google's `verifyIdToken` with `GOOGLE_CLIENT_ID` as the audience. This validates signature, issuer, expiry, and audience. The server also requires a verified email and a Google subject (`sub`). Client-supplied email, role, or Google user IDs are never trusted as authentication.

Successful Google/password response:

```json
{"success":true,"message":"Login successful","data":{"token":"RMS_JWT","user":{"id":"RMS_USER_ID","name":"Existing name","email":"registered@example.com","role":"user","status":"active"}}}
```

The frontend loads `https://accounts.google.com/gsi/client`, initializes with `REACT_APP_GOOGLE_CLIENT_ID`, and sends `response.credential` from Google's callback to `/api/auth/google`. It then uses `data.token` and `data.user` exactly as the password login does. Continue keeping the password button available.

Only existing RMS users may sign in. The first successful Google sign-in links the Google `sub` to the existing RMS account when the verified email is authoritative (Gmail or Google Workspace). For other email providers, sign in with the RMS password first, then link the matching Google email using:

```http
POST /api/auth/google/link
Authorization: Bearer RMS_JWT
Content-Type: application/json

{"credential":"GOOGLE_ID_TOKEN_FROM_CALLBACK"}
```

After linking, the Google subject is the stable identifier and its verified email must continue to match the registered RMS email. Existing roles remain unchanged. A conflicting link is rejected. New model fields: `status` (`active`/`inactive`, default active), optional `googleId` (unique sparse index), and `googleLinkedAt`. Password remains required for provisioned RMS accounts.

## Account status administration

Both routes require an active **super_admin** RMS session:

```http
GET /api/user
Authorization: Bearer RMS_JWT
```

Returns account details without passwords. Legacy users report `status: active`.

```http
PATCH /api/user/USER_OBJECT_ID/status
Authorization: Bearer RMS_JWT
Content-Type: application/json

{"status":"inactive"}
```

Use `{"status":"active"}` to restore access. Self-deactivation is rejected. This route cannot change passwords, roles, or Google identities.

An inactive account receives HTTP 403 / `ACCOUNT_INACTIVE` on password login, Google login/linking, and protected API requests, including requests with already-issued tokens. Status changes through this endpoint immediately disconnect its socket connections on this server. New socket handshakes reject inactive users. Existing sockets recheck database status every 30 seconds, covering direct database edits and other server workers. Re-enabling the account restores access, including still-valid sessions.

## Production sequence

1. Deploy backend code and the updated package lock with Google login disabled. There is no user data migration or frontend change. Normal hosting deployment/restart behavior still applies.
2. Verify existing password login, an existing active session, and a socket connection.
3. Configure Google client ID and enable Google login. Verify with a registered active user before adding the frontend button.
4. Test deactivation using a separate test account, verify access is rejected, then reactivate it.
5. Set frontend `REACT_APP_GOOGLE_CLIENT_ID`, rebuild the frontend, and deploy it after backend verification. The login screen handles `ACCOUNT_INACTIVE`, `GOOGLE_LINK_REQUIRED`, and `GOOGLE_USER_NOT_REGISTERED` explicitly. Placeholder client IDs leave Google unavailable while password login stays usable.
6. Roll back Google availability by setting `GOOGLE_LOGIN_ENABLED=false`; password login remains available.

Automated tests use mocked Google identity verification and database operations. A real configured Google credential and a production/staging database smoke test remain required before rollout.

## Official references

- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/identity/gsi/web/reference/js-reference

Local backend and frontend `.env` files contain client-ID placeholders if no configuration existed; existing values were preserved. These local files are ignored by Git. Configure the same variables in your hosting build/runtime settings before deployment. The frontend client ID is embedded at build time, so restart the development server or rebuild after replacing it.

## Local frontend API routing

The authentication service accepts `REACT_APP_AUTH_API_URL` (including `/api/auth`). Local `.env.development.local` points it to `http://localhost:5000/api/auth`. Restart `npm start` after environment changes. This file is ignored by production builds; production continues using the live backend unless an explicit override is set. A live `API_ROUTE_NOT_FOUND` response for `/api/auth/google` means the deployed backend does not expose that route; deploy the updated backend before enabling production Google sign-in. The local route has been verified to reject an empty credential with HTTP 400 / `GOOGLE_CREDENTIAL_REQUIRED`.
