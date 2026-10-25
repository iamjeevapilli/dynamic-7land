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
