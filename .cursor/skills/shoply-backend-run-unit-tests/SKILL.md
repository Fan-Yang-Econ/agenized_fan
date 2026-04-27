---
name: shoply-backend-run-unit-tests
description: >-
  Run shopilyapi (Shoply backend) unit tests using the project virtualenv wrapper
  ~/virtual_shoply_py/bin/python_with_PYTHONPATH. Use when the user wants to run
  all or part of shopilyapi tests, CI parity locally, or invokes /shoply-backend-run-unit-tests.
disable-model-invocation: true
---

# Shoply backend — run unit tests

## When this applies

- Running **shopilyapi** unit tests (the `test/` tree under the `shopilyapi` repo).
- User asks for **all** unit tests, a file, or a single test with the **same interpreter** the local server docs recommend.

## Prerequisite

The wrapper is created by `start_local_server_with_virtual_python.py` (see `shopilyapi/README.md`). It must exist:

`~/virtual_shoply_py/bin/python_with_PYTHONPATH`

If missing, create/recreate the venv with that script first (`--dependency_package_path` to `PyHelpers` and `shopilycommon` as in the README).

## Working directory

Use the **`shopilyapi` repository root** (the directory that contains `test/`, `shopilyapi/`, `conftest.py`). 

`/Users/fanyang/shopily/shopilyapi`

## Run all unit tests (recommended)

From `shopilyapi` repo root:

```bash
cd /Users/fanyang/shopily/shopilyapi
~/virtual_shoply_py/bin/python_with_PYTHONPATH -m pytest test/ -x
```

- `test/` limits collection to the unit/integration-style tests under that package (matches typical “all shopilyapi tests” runs).
- For a **long** full suite, use a generous tool/shell timeout (many minutes) so the run is not cut off.

## Run a subset

Single file:

```bash
cd /Users/fanyang/shopily/shopilyapi
~/virtual_shoply_py/bin/python_with_PYTHONPATH -m pytest test/test_livechat_sessions_connected_no_messages.py -q
```

Single test (pytest node id):

```bash
~/virtual_shoply_py/bin/python_with_PYTHONPATH -m pytest test/test_livechat_sessions_connected_no_messages.py::TestGetLivechatSessionsConnectedNoMessages::test_connected_customer_with_no_messages_is_included -q
```

## Alternative: unittest

The README sometimes shows `unittest` for one class. Equivalent style from repo root:

```bash
~/virtual_shoply_py/bin/python_with_PYTHONPATH -m unittest test.test_human_agent_auth.HumanAgentAuthTest.test_login_success
```

Prefer **pytest** for “run everything” unless the user explicitly wants unittest discovery.
