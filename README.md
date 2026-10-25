# Dynamic 7land

English Windows desktop island with an animated robot, Claude and Codex session monitoring, screen questions, project editing and everyday desktop tools. **Version 1.2.0**, maintained by Jeeva Pilli.

Dynamic 7land includes free cloud models through OpenRouter, local AI through Ollama, optional Claude / Codex / Arena connections, encrypted provider-key storage and a complete Windows portable download.

## Run on Windows

Download **Dynamic7land-Windows-x64.zip** from the [latest release](https://github.com/iamjeevapilli/dynamic-7land/releases/tag/v1.2.0). Extract the **whole folder** and open **Dynamic7land.exe**. Keep its runtime files together. The portable app does not need a separate Node.js installation.

Quit any older desktop island instance from its tray menu before starting the new app. The new profile is independent. Use **Ctrl+Alt+T** or the tray icon to show the island. Right-click the tray icon for Settings and Quit.

## Use free AI

Arena approval is optional. Version 1.2 adds two routes for users who do not want AI API charges. These routes do not unlock every premium model or remove provider limits.

### Free cloud models: OpenRouter

1. Open **Settings → AI connections** and choose **Use free cloud models**.
2. Choose **Get a free-model API key**, sign in to OpenRouter and create a key. Keep the account on its free tier; no credit purchase is needed for this setup.
3. Paste the key in the app. Keep the model as **openrouter/free**, then choose **Save connection → Test connection**.
4. Use **Load models** if you want to pick an available free model yourself. Only zero-price catalog entries ending in `:free` are listed, plus the free router.

The app rejects paid model IDs, sets a zero price ceiling for prompt, completion, request and image prices, and sends no paid fallback array or paid plugins. Free-model quota or availability errors stop the request; the app does not upgrade your plan or buy credits. Available models and rate limits can change. A free model with vision support is required for screenshot questions; structured project requests also require model support.

### Local AI: Ollama

1. Choose **Download Ollama for Windows** in AI connections and install the official app.
2. Download a **local** model in Ollama. A small text model such as `llama3.2:1b` uses fewer resources. For screenshot questions, `gemma3:4b` is a vision option if your PC has enough memory; its model download is several GB.
3. In Dynamic 7land, choose **Use local AI → Load models** and select your downloaded model.
4. Choose **Save connection → Test connection**. No API key or cloud subscription is used by this route.

Only downloaded local models are allowed. The app checks the local catalog and model details, rejects cloud models and aliases that point to a remote model, and connects only to `http://127.0.0.1:11434` without following redirects. Text and screenshots sent through this route stay with the Ollama server on your PC. Local models use your computer's resources; response speed and quality depend on the model and hardware. A model that does not support images gives a clear error instead of silently ignoring a screenshot.

The existing Claude and Codex account options remain available and follow those services' plan limits. A free chat website account does not automatically grant API access. Original credits and licenses are in the attribution files.

References: [OpenRouter free variants](https://openrouter.ai/docs/guides/routing/model-variants/free), [provider price ceilings](https://openrouter.ai/docs/guides/routing/provider-selection), [Ollama local API](https://docs.ollama.com/api/authentication).

## Connect Claude

1. Open **Settings → AI connections**.
2. Choose **Install Claude Code** if it was not found. Complete the official installer in PowerShell.
3. Choose **Sign in to Claude** and complete Claude's browser sign-in. A compatible Claude account or subscription is required by that service.
4. Refresh status. Enable **Claude Code** under **Connections** to show coding-session activity in the island; restart an existing Claude session after enabling hooks.

You can now select Claude in desktop chat. Claude Code performs the account authentication; Dynamic 7land does not collect your Claude password. Website sessions already open in claude.ai are not automatically imported.

For the **Claude API**, select Claude API as the desktop provider, save your Anthropic API key, choose **Load models**, select an available model ID and save. Use **Test connection** to verify access. API billing is separate from a Claude website subscription.

## Route requests through Arena

1. Get a key through [Arena's API platform](https://platform.arena.ai), and check the access granted to your workspace.
2. In **AI connections**, select **Arena API**, enter your key and choose its access type. The router model defaults to `coding-router-preview`; use **Load models** for models available to your account.
3. Save and test the connection. With API-enabled access, desktop chat, screen questions, Word analysis and project AI requests use Arena. Existing coding sessions keep their own provider configuration. You can explicitly select another connected agent in desktop chat.
4. **Open Claude via Arena** starts interactive Claude Code with the official Arena gateway settings and your saved Arena key. No key is put on its command line.

**Arena free-router keys are restricted to interactive Claude Code.** They cannot run this app's direct API chat, print-mode requests or project tools. Use interactive Claude Code through the Arena launcher, or obtain API-enabled workspace access. The app explains an `organization_client_restricted` response rather than bypassing it.

**Open Arena Agent** opens [Arena's agent workspace](https://arena.ai/agent) in your browser. Arena's website tools, sandboxes and account sessions are separate from the API. This desktop app does not host itself on arena.ai or remotely control all website features.

Official setup references: [Arena Claude Code guide](https://platform.arena.ai/docs), [Arena Codex guide](https://platform.arena.ai/docs/codex), [Claude Code setup](https://code.claude.com/docs/en/setup).

## Features and requirements

| Feature | Setup or current limit |
| --- | --- |
| Desktop island and robot | Moods, animations, outfits, notifications and customisation retained |
| Claude Code / Codex monitoring | Enable local hooks in Connections; restart the agent |
| Coding approvals, history and usage | Depends on information and controls exposed by the coding agent |
| Desktop chat and screenshot buddy | Choose OpenRouter free models, local Ollama, a signed-in Claude / Codex account, or Arena / Claude API |
| Word spelling review and summaries | Windows Word required; proposed fixes remain tracked changes for review |
| Project questions and reviewed edits | Select a project; original editor validation, backup and undo retained |
| VS Code project integration | Install the included `vscode-editor/dynamic7land-project-editor.vsix`; ID `jeevapilli.project-editor` |
| File tray, clipboard, note and focus timer | Local desktop tools |
| Spotify controls and devices | Your own Spotify Client ID and account; playback limits depend on Spotify |
| Weather and ICS calendar | Configure location / calendar URL in General; network required |
| Browser Claude / ChatGPT conversation monitoring | Marked coming soon by the supplied release; still unavailable |
| Optional companion website | Original website backend was not included in the supplied source |

For Spotify, create your own developer app and register `http://127.0.0.1:8890/callback`. Save its public Client ID in **Service setup**, then connect from Music in the island. PKCE is used; no Spotify Client Secret is needed.

## Privacy and local data

Cloud provider keys are saved through Electron safeStorage on Windows. They are never returned to the settings renderer or included in a release. Do not commit keys or AppData profiles. See [SECURITY.md](SECURITY.md).

The profile lives in `%APPDATA%\Dynamic7land`. Local hook traffic uses `127.0.0.1:47825` with a local token. The app does not import passwords or tokens from another desktop edition. Screenshots, document text and selected project context are sent to the chosen provider when those features are used. With local Ollama, the app sends this context only to the server on your PC. Provider history is stored locally; removing a key does not erase old conversations.

## Build and verify

Use Windows 10/11 x64 and Node.js **22.12+** for building:

```powershell
npm.cmd ci --include=optional
npm.cmd test
npm.cmd run check:syntax
npm.cmd run build:windows
```

The portable folder is `dist/Dynamic7land`. For development, run `npm.cmd start` or `npm.cmd run start:settings`. Windows packaging copies the pinned Electron runtime and Codex Windows component, then sets the app icon and executable metadata. The executable is unsigned.

The prepared edition passed **44 automated tests**, source syntax checks and renderer checks using simulated desktop bridges. Native Windows startup, screen capture, Word, notifications and live provider account access still require a Windows smoke test with your own accounts. No live API key was used for these checks.

## Publish your public repository

The source includes a GitHub publishing script for **iamjeevapilli/dynamic-7land**, plus CI and tagged Windows-release workflows. Publishing does not require sharing a GitHub password in chat or placing one in the source.

Install [Git for Windows](https://git-scm.com/downloads/win) and the [GitHub CLI](https://cli.github.com), reopen PowerShell and run this from a freshly extracted source folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\PUBLISH-TO-GITHUB.ps1
```

The script uses GitHub's browser sign-in, verifies the account is `iamjeevapilli`, creates a **public** repository, commits and pushes this source, and pushes `v1.2.0`. It stops if the repository already exists or this folder already contains Git history. It never overwrites an existing repository. GitHub Actions then builds and publishes the full Windows ZIP and checksum; inspect the Actions result before treating the release as ready.

For subsequent releases, update the package and release-note versions, test, then push a matching `v` tag. Set your repository under **Service setup → Your GitHub releases repository** after publishing, to enable release news in the app.

## Attribution

Credits, source provenance and license information are provided in [CREDITS.md](CREDITS.md), [LICENSE-DYNAMIC7LAND.txt](LICENSE-DYNAMIC7LAND.txt), `UPSTREAM.json` and `upstream-notices/`.
