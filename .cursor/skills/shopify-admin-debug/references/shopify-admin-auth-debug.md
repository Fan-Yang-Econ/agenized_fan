# Shopify Admin Auth Debug Notes

## Settings Route

For the admin Settings page in `shopping_assistant_by_shopily`, inspect:

- `app/routes/Settings.tsx`: parent route and loader
- `app/routes/Settings._index.tsx`: child UI issuing Settings API calls
- `app/loader.ts`: `loader_with_auth`
- `app/utility/auth.ts`: `retrieve_and_store_access_token`

`Settings.tsx` should use `loader_with_auth`, which calls `retrieve_and_store_access_token`. That path should use Shopify embedded app auth and token exchange in normal app-dev/admin flows. `ACCESS_TOKEN_HARDCODED` is not the primary expected path for Settings.

## Backend Metadata Route

For `admin_get_store_metadata`, inspect:

- `shopilyapi/shopilyapi/apiserver/app_admin.py`
- `shopilyapi/shopilyapi/apiserver/admin_console/admin_api.py`
- `shopilyapi/shopilyapi/common/utils.py`

Non-public metadata fields call `validate_admin_auth_token(request, store_key)`. Direct curl without an `Authorization` header is useful only to understand unauthorized/masked behavior.

## Browser Session

This skill intentionally uses a Playwright-launched browser context, not the Codex in-app browser. The workflow exports cookies from the user's Chrome profile into Playwright JSON format, then imports those cookies with `context.addCookies(...)` before navigation.

Do not use `browser-use:browser` for this skill. It does not expose a cookie import API in the current environment.
