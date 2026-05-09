---
name: shoply-debugger
description: Debug local Shoply/Shopily RN chat and live-agent flows across shoply_chat_rn, shopilyjs_chat_core, and shopilyapi. Use when a user asks why localhost RN/customer chat/live-agent behavior is broken, messages do not appear in realtime, websocket/session polling fails, local setup logs need analysis, or browser reproduction is needed for http://localhost:3001, :3002, :3003, or :9000.
---

# Shoply Debugger

## Purpose

Debug the local Shoply RN chat stack by correlating browser behavior, frontend logs, backend logs, and source code paths. Preserve local user changes and report evidence before proposing fixes.

## Local Stack

Assume the standard local dev script starts:

```text
http://localhost:3001  Live Agent App
http://localhost:3002  RN simulator / iframe bundle
http://localhost:3003  Customer chat
http://localhost:9000  shopilyapi backend
```

The standard log directory is:

```text
/tmp/shoply_chat_rn/backend-server.log
/tmp/shoply_chat_rn/frontend-rn-simulator.log
/tmp/shoply_chat_rn/frontend-chatbot-webpack.log
/tmp/shoply_chat_rn/frontend-expo-web.log
```

If credentials are needed to log in, read `/Users/fanyang/shopily/shoply_chat_rn/docs/local_development.md`.

## Debug Workflow

1. Establish current state.
   - Run `git status --short --branch` in relevant repos before editing.
   - Check whether the dev servers are still listening with `lsof -nP -iTCP:3001,3002,3003,9000 -sTCP:LISTEN`.
   - Tail the four `/tmp/shoply_chat_rn` logs before changing code.

2. Search logs with precise patterns.
   - Use `rg` first.
   - Start with:

```bash
rg -n "ERROR|CRITICAL|Traceback|Unhandled|500|404|WebSocket|stream_guide|livechat_sessions|livechat_session_details|understand_customer|store_status|session_id" /tmp/shoply_chat_rn/*.log
```

   - If a user provides a timestamp, session id, message text, store key, or request id, search that exact string and then inspect nearby lines.

3. Reproduce in the browser when UI behavior matters.
   - Use available browser automation when possible, such as Playwright, Claude browser tools, or Codex Browser.
   - Open `http://localhost:3001` for the live agent app and `http://localhost:3003` for the customer chat.
   - Log in only when needed and permitted by the user’s request.
   - Capture a DOM snapshot or screenshot after each meaningful state change.
   - For message-delivery bugs, send a unique test message containing a timestamp so backend logs can be correlated.

4. Inspect source only after logs identify the failing surface.
   - Backend livechat routes: `/Users/fanyang/shopily/shopilyapi/shopilyapi/apiserver/livechat.py`.
   - Backend websocket route: `/Users/fanyang/shopily/shopilyapi/shopilyapi/apiserver/app.py`.
   - Backend store loading/session logic: `/Users/fanyang/shopily/shopilyapi/shopilyapi/apiserver/store_manager.py` and `shopping_assistant.py`.
   - Frontend live-agent session list: `/Users/fanyang/shopily/shoply_chat_rn/src/session_manage`.
   - Frontend live-agent chat window: `/Users/fanyang/shopily/shoply_chat_rn/src/screens/ChatWindow.tsx`.
   - Customer chat websocket/history handling: `/Users/fanyang/shopily/shopilyjs_chat_core/src/components/QA`.

5. Separate facts from inference.
   - Facts: exact log timestamps, endpoint status codes, websocket open/close events, session ids, visible UI state, and source line references.
   - Inference: why a route failed or why a UI state followed from backend behavior.
