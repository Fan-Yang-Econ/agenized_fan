# Shoply AI Workspace Overview

**Shoply AI** builds AI **chatbot**, AI **search**, and **live-chat** solutions for Shopify merchants and any website ("sitechat"). Merchants install a Shopify app to configure the experience; their customers see a chat widget + AI-powered search on the storefront; human agents reply to escalated chats from a separate web app. 

A single Python backend (`shopilyapi)` serves all three frontends:

1. `shopilyjs_chat_core` repo (React) for the chat and search.
2. `shopping_assistant_by_shopily` repo (React + remix) for a) the admin console for both Shopify merchants and site-chat web onwers, b) define the Shopify's embedding app
3. `shoply_chat_rn` repo (ReactNative) for the human agent live chat app.

### Special Considerations for `shoply_chat_rn`

For the chat window, it renders the `shopilyjs_chat_core` using webview (mobile) or iframe (web).

In development, 

###. Special Things for `shopilyapi`

- **Python interpreter**: `~/virtual_shoply_py/bin/python_with_PYTHONPATH` — already has `shopilycommon`, `PyHelpers`, `shopilyapi` on `PYTHONPATH`. Created/updated by `shoply-backend-reuse (reuse existing virtual)` or `shoply-backend` (creating a new virtual env). Always prefer it over `python3` when running anything that imports Shoply code.




## 5. Where to Start by Task Type


| Task                                                  | Repo                                                     |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Backend feature / new API endpoint                    | `shopilyapi`                                             |
| Customer-facing chat UI / search UI                   | `shopilyjs_chat_core`                                    |
| Merchant admin UI / Shopify integration / billing     | `shopping_assistant_by_shopily`                          |
| Theme extension / liquid block / Web Pixel            | `shopping_assistant_by_shopily/extensions/`              |
| Human agent UI / live-chat session ownership          | `shoply_chat_rn`                                         |
| Crawling, indexing, store data                        | `shopilycrawler` (+ shared interface in `shopilycommon`) |
| New DynamoDB table / shared storage                   | `shopilycommon/storage/`                                 |
| Lower-level AWS helper                                | `PyHelpers/AWS/`                                         |
| Email template                                        | `shopily_email`                                          |
| Marketing site copy / page                            | `shoplyweb`                                              |
| AWS infra change (instance size, pipeline, S3 bucket) | the matching `cdk_`* repo                                |


## 7. Workspace Conventions

- **Python interpreter**: `~/virtual_shoply_py/bin/python_with_PYTHONPATH` — already has `shopilycommon`, `PyHelpers`, `shopilyapi` on `PYTHONPATH`. Created/updated by `shoply-backend-reuse (reuse existing virtual)` or `shoply-backend` (creating a new virtual env). Always prefer it over `python3` when running anything that imports Shoply code.
- **Backend dev**: `SHOPILY_ENV=prod` for local dev that should still log to prod-style stores; otherwise some dev stores skip session/QA logging. `STORES_TO_LOAD=<csv>` keeps backend startup fast.
- **Frontend dev parity**: `shoply_chat_rn/scripts/setup_local_dev_env.sh --store-key=…` runs backend + chat_core + RN web in one terminal.
- **JS build coupling**: The chat widget is the *single source of truth* for chat/search UI. Edits live in `shopilyjs_chat_core/src/` and reach consumer repos via the hot-rebuild watchers — do not edit the copies in `shopping_assistant_by_shopily/extensions/.../assets/` or `shopping_assistant_by_shopily/app/shopilyjs_chat_core/`.
- **Test commands**:
  - `shopilyapi`: `~/virtual_shoply_py/bin/python_with_PYTHONPATH -m pytest test/ -x` (also wrapped by `/shoply-backend-run-unit-tests`).
  - JS repos: `npm test` (Jest/Vitest), `npm run test:e2e` (Playwright).
- **Deploy**: every service has a matching `cdk`_* repo; pushes to GitHub trigger CodePipeline → CodeBuild → ECR/ECS or S3+CloudFront.
- **Region & account**: prod runs in **us-west-1** (account `767397751768`).

## 8. Per-Repo Docs

- [shopilyapi/PROJECT_OVERVIEW.md](shopilyapi/PROJECT_OVERVIEW.md)
- [shopilyjs_chat_core/PROJECT_OVERVIEW.md](shopilyjs_chat_core/PROJECT_OVERVIEW.md)
- [shopping_assistant_by_shopily/PROJECT_OVERVIEW.md](shopping_assistant_by_shopily/PROJECT_OVERVIEW.md)
- [shoply_chat_rn/PROJECT_OVERVIEW.md](shoply_chat_rn/PROJECT_OVERVIEW.md)

> These docs are intentionally summary-level. They cite specific files and folders but expect the agent to read the actual code for implementation detail. They are *not* maintained automatically — refresh them whenever a major subsystem moves, a repo is added/retired, or a cross-repo bridge changes.

