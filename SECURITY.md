# Security and account data

Never put passwords, API keys, OAuth tokens, or AppData profiles in an issue or commit.
Use Settings → AI connections for provider keys. On Windows the new provider store uses Electron safeStorage, backed by the Windows user account. Saving a key fails if encryption is unavailable. Keys are not returned to the renderer, placed in command-line arguments, or bundled with releases.

The app sends the question, selected screenshot, document text or project context to the chosen provider when you use those features. Conversation history is stored locally under `%APPDATA%\Dynamic7land`. Review the context before asking about sensitive documents. Removing a provider key does not delete past conversations.

Project tools exclude credential files and common private folders, restrict paths to the selected project, and retain the existing review, backup and undo flow. Read proposed edits before applying them. The local hook listener binds only to 127.0.0.1 and checks its token.

Sign into Claude, ChatGPT, Arena and GitHub on their official sign-in surfaces. The app does not collect website passwords. Arena access restrictions are surfaced as errors and are not bypassed.

For a vulnerability, use the repository's private vulnerability reporting feature if enabled. Do not include a working secret in a public report; revoke it through its provider first.

## Free providers

OpenRouter requests accept only the free router or available `:free` IDs. Discovery excludes nonzero or missing pricing. Each request has zero price ceilings and no paid model fallbacks or paid plugins. A quota or availability error stops the request.

Ollama uses only the fixed IPv4 loopback server. Redirects, cloud model names, remote metadata and models that are not downloaded are rejected. The local route does not read or send saved provider keys. Image requests require model vision support. The same project file validation, reviewed edits, backups and undo paths apply to both new providers.

## Local gateways and setup

OmniRoute and FreeLLMAPI use distinct encrypted connection keys. Provider credentials are configured in the external router, not imported into Dynamic 7land. These connections target only `127.0.0.1` on a validated port, use bearer headers and refuse redirects. They cannot be configured as arbitrary remote URLs; changing a port changes the project connection fingerprint. Gateway errors redact the active connection key. Model and routing overrides from request payloads are not forwarded.

Gateway software can forward prompts, screenshots and project text to cloud providers. Its connections, pricing and fallback behavior are controlled by its own settings. Dynamic 7land's OpenRouter zero-price safeguards do not apply inside another router; a gateway is not labelled as guaranteed free or local inference. Use only eligible free upstream connections and enforce spending limits in that router for a free setup.

Setup is opt-in through explicit buttons or CMD launchers. Only the trusted local Settings page can trigger the allowlisted actions. No renderer-provided command, path or URL is executed. PowerShell execution-policy bypass is limited to the launched process for the shipped setup script; no persistent execution-policy setting is changed. Ollama and Node.js installation use official Windows Package Manager IDs. FreeLLMAPI's installer URL, version and SHA256 are pinned and verified before execution. OmniRoute uses a pinned npm package with its required upstream install scripts. No router, model or provider credentials are silently installed/configured when the desktop app starts.
