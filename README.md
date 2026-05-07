# Kevlar Codex Desktop

Local-first Electron desktop control plane for Codex CLI.

## Run Locally

**Prerequisites:** Node.js 20+ and Codex CLI installed/logged in on this Mac.

1. Install dependencies: `npm install`
2. Run static checks: `npm run lint`
3. Run tests: `npm run test:run`
4. Start the Electron app: `npm start`
5. Package the macOS app: `npm run package`
6. Use the Codex app Run action or `./script/build_and_run.sh --verify` to build, launch, and verify the packaged app.

## Codex Runtime

Kevlar uses the local `codex` executable and your existing Codex login. It does not require provider API keys or cloud app storage.

The app intentionally passes process-local overrides to avoid known incompatible global config entries:

- `mcp_servers={}`
- `model_reasoning_effort=high`
- model `gpt-5.2`

## Smoke Test

Use this path for the first desktop checkpoint:

1. Open Settings and confirm Codex reports a local CLI path, `codex-cli 0.30.0`, logged-in status, model `gpt-5.2`, sandbox `workspace-write`, and any config warnings.
2. Add a local project folder.
3. Create a chat attached to that project.
4. Send a simple prompt and confirm assistant output streams into the chat.
5. Restart the packaged app and confirm projects, chats, and messages are still present from local SQLite storage.
6. Run Side-Car on that chat and promote one generated card into the main chat.

## Repaired Surface Area

This build removes the remaining old scaffold assumptions from the first desktop checkpoint:

- Home suggestions now seed real Codex prompts instead of acting as inert cards.
- Project/chat/task/team edits persist through SQLite-backed IPC.
- Side-Car cards can be filtered, promoted individually, and cleared locally.
- Team members and roles use inline local forms instead of browser prompts.
- Packaged launch verification checks both the app process and the local SQLite run-state schema.

Verification commands:

```sh
npm run lint
npm run test:run
npm run package
./script/build_and_run.sh --verify
```

`npm run test:run` rebuilds `better-sqlite3` for the local Node runtime before Vitest. `npm start`, `npm run package`, and `npm run make` force an Electron ABI rebuild for the same native dependency before launching or packaging.
