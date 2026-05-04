---
name: shopify-admin-debug
description: Debug Shoply Shopify admin embedded-app errors in shopping_assistant_by_shopily using Playwright-launched Chrome with imported Chrome cookies, frontend console/network evidence, Shopify app dev auth checks, admin_get_store_metadata failures, and backend shopilyapi route/auth investigation.
---

# Shopify Admin Debug

Use this skill to investigate Shoply Shopify admin embedded-app errors end to end across:

- `shopping_assistant_by_shopily` Remix/React admin console
- `shopilyapi` backend admin routes
- Shopify Admin embedded app sessions
- Chrome cookie/session state
- Playwright console and network evidence

## Critical Rules

- Do not use `browser-use:browser` for this workflow.
- Use Playwright to launch a Chrome/Chromium browser context.
- Export cookies from the user's Chrome profile in Playwright format, then import them with `context.addCookies(...)` before visiting Shopify Admin.
- Do not say cookies were imported unless `context.addCookies(...)` ran and the post-navigation URL/title/screenshot were checked.
- Keep cookie values out of chat. Save cookie artifacts under `/tmp` with local file permissions.
- For `/Settings`, use `app/routes/Settings.tsx` and `loader_with_auth`; do not infer behavior from `app/routes/app.tsx` unless the failing path is `/app`.
- `ACCESS_TOKEN_HARDCODED` is only a dev fallback. For normal Shopify app dev embedded routes such as `/Settings`, the Remix loader should call Shopify auth/token exchange and return an access token.

## Workflow

1. **Capture the exact failure**
   - Record the Shopify admin URL, store key, app slug, route path, failing API endpoint, query params, HTTP status, response body, and console error.
   - Convert relative log windows to concrete timestamps.

2. **Inspect route ownership before diagnosing auth**
   - List relevant route files:
     ```bash
     rg --files app/routes | sort
     ```
   - For `/Settings`, read:
     - `app/routes/Settings.tsx`
     - `app/routes/Settings._index.tsx`
     - `app/loader.ts`
     - `app/utility/auth.ts`
   - Confirm whether the page uses `loader_with_auth` or `loader_no_auth`.

3. **Export Chrome cookies**
   - Prefer the frontend repo script if it exists; otherwise use this skill's bundled script:
     ```bash
     node /Users/fanyang/shopily/shopping_assistant_by_shopily/scripts/export_chrome_cookies.mjs --list-profiles
     node /Users/fanyang/shopily/shopping_assistant_by_shopily/scripts/export_chrome_cookies.mjs --all-profiles --url '<admin-url>'
     node /Users/fanyang/shopily/shopping_assistant_by_shopily/scripts/export_chrome_cookies.mjs --profile Default --url '<admin-url>' --format playwright --output /tmp/shopify-admin-cookies.json
     ```
   - If needed:
     ```bash
     node /Users/fanyang/shopily/agenized_fan/.cursor/skills/shopify-admin-debug/scripts/export_chrome_cookies.mjs --profile Default --url '<admin-url>' --format playwright --output /tmp/shopify-admin-cookies.json
     ```
   - Verify only counts/names in chat, not raw values.

4. **Launch Playwright Chrome with imported cookies**
   - Run from `shopping_assistant_by_shopily` so Playwright dependencies resolve:
     ```bash
     node /Users/fanyang/shopily/agenized_fan/.cursor/skills/shopify-admin-debug/scripts/inspect_shopify_admin_with_cookies.mjs \
       --url '<admin-url>' \
       --cookies /tmp/shopify-admin-cookies.json \
       --output-dir /tmp/shopify-admin-debug
     ```
   - The script must:
     - launch Chrome/Chromium via Playwright
     - call `context.addCookies(...)`
     - navigate to the admin URL
     - capture console messages
     - capture relevant request/response metadata without Cookie or Set-Cookie headers
     - save a screenshot and JSON artifact
   - If the final URL is still `accounts.shopify.com`, report that imported cookies did not produce an authenticated Shopify Admin session and continue with route/log/API analysis.

5. **Inspect Playwright artifacts**
   - Read `/tmp/shopify-admin-debug/playwright-shopify-admin-debug.json`.
   - Look for:
     - final URL
     - console errors
     - failing `api.shopily.ai` or local backend requests
     - HTTP status codes
     - whether Shopify Admin embedded navigation reached the intended app route

6. **Reproduce backend requests directly**
   - Use direct curl only after identifying the request from Playwright artifacts or user-provided console logs.
   - Capture headers/body:
     ```bash
     curl -sS -D /tmp/admin_get_store_metadata.headers -o /tmp/admin_get_store_metadata.body '<api-url>'
     ```
   - If the endpoint requires auth, do not conclude that the real embedded request is unauthenticated unless the real Authorization header was inspected.

7. **Trace backend behavior**
   - For `admin_get_store_metadata`, read:
     - `shopilyapi/shopilyapi/apiserver/app_admin.py`
     - `shopilyapi/shopilyapi/apiserver/admin_console/admin_api.py`
     - `shopilyapi/shopilyapi/common/utils.py`
   - Check wrappers that mask exceptions, especially `log_exception_with_args(return_value={'statusCode': 500, ...})`.
   - Check whether fields are in `DIRECT_ACCESS_META_FIELDS` and `PUBLIC_READ_META_FIELDS`.
   - For non-public fields, verify `validate_admin_auth_token(request, store_key)` behavior.

8. **Use logs for production evidence**
   - If the user gives a time range, use the CloudWatch admin-console/backend log skills as appropriate.
   - Search for route, store key, request ID/rid, exception, and auth validation detail.

9. **Report carefully**
   - Separate verified facts from inference.
   - Say explicitly whether cookies were exported and imported into Playwright.
   - Say explicitly whether evidence came from Playwright, direct `curl`, source, or logs.
   - If correcting a prior diagnosis, state the correction plainly.

## Common Findings

- **Playwright still lands on Shopify login**: Chrome cookies were imported, but not sufficient for Shopify Admin auth in that context. Continue with server logs/source and avoid claiming Chrome itself is logged out.
- **HTTP 200 body has `statusCode: 500`**: backend route may be returning an application-level error or masking an exception.
- **`admin_get_store_metadata` v2 fails for multiple fields**: one field may raise inside the v2 loop; inspect each field separately.
- **No-auth direct curl fails**: expected for non-public metadata. It proves unauthorized/masked behavior, not necessarily the real embedded request's auth state.

## Output Shape

Use:

- **Verified**: concrete Playwright/API/log/source facts
- **Likely Cause**: grounded inference
- **Next Checks**: exact commands or files
