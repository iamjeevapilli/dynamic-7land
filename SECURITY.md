# Security and account data

Never put passwords, API keys, OAuth tokens or AppData profiles in an issue or commit. Use **Settings → AI connections** for your Arena key. Electron safeStorage encrypts it for the Windows user account. Saving fails when encryption is unavailable. Keys are not returned to the settings renderer, put on command lines or bundled in releases.

Arena requests use only the fixed official `https://api.arena.ai/v1` endpoint with bearer authentication, timeouts and redirects disabled. The selected model is authoritative; caller-provided alternate models, fallbacks or plugins are not forwarded. Errors redact the active key. Workspace access, model capabilities, pricing and quotas are controlled by Arena.

Free-router keys are supported only in interactive Claude Code. The app defaults new Arena setup to interactive-only access and hides the direct test. Direct chat and project requests are blocked locally in that mode. A remote `organization_client_restricted` response is explained without retrying through another provider or bypassing it.

The Arena launcher passes the key through the child process environment, uses the gateway root URL and removes conflicting personal Anthropic-key and provider-selection environment variables from that child. It does not change system environment settings or global Claude credentials. Only the trusted local Settings page can invoke allowlisted account actions; renderer-provided commands, paths and URLs are not executed. The official Claude Code installer opens only when requested.

Upgrades from retired connections preserve an existing encrypted Arena key and discard unused provider-key entries and gateway ports from the app's connection file. Existing conversation history remains. The app does not revoke credentials or uninstall other applications. No local-model/router installers remain in this version.

Questions, selected screenshots, document text and project context go to the selected AI service when those features are used. Conversation history is stored locally under `%APPDATA%\Dynamic7land`. Removing a key does not delete past conversations. Review context before sharing sensitive documents.

Project tools exclude credential files and common private folders, restrict paths to the selected project, and retain review, backup and undo. The local hook listener binds to `127.0.0.1` and checks its token. Claude/Codex account connections and monitoring retain their existing access boundaries.

Sign in through official account surfaces. The app does not collect website passwords. For a vulnerability, use private vulnerability reporting if enabled. Do not include a working secret in a public report; revoke it through its provider first.
