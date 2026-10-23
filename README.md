# Dynamic 7land

English Windows desktop island with an animated robot, Claude and Codex session monitoring, screen questions, project editing and everyday desktop tools. **Version 1.1.0**, maintained as a TwoCode-based fork for Jeeva Pilli.

The original desktop application is [TwoCode 1.2.0-beta.1](https://github.com/levon-z/TwoCode/releases/tag/v1.2.0-beta.1) by levon-z. Its credits and notices are retained. This fork adds its own identity, English interface, Claude / Arena setup, API routing, encrypted provider-key storage, independent profile, packaging and publishing workflows.

## Run on Windows

Download the Windows x64 ZIP from this repository's Releases page after a release build completes. Extract the **whole folder** and open **Dynamic7land.exe**. Keep its runtime files together. The portable app does not need a separate Node.js installation.

If using **Dynamic7land-Easy-Setup.zip**, extract it, keep your original **TwoCode-Windows.zip** nearby and run **INSTALL-AND-RUN.cmd**. Select the original ZIP if asked. Setup verifies that exact archive, creates a separate Dynamic7land folder and downloads the pinned Codex component from the official npm registry. If that download fails, the app still opens; retry it with **INSTALL-AI.cmd**. The small setup ZIP reuses the original runtime and is not a standalone Windows download.

Quit an older JeevaBot or TwoCode instance from its tray menu before starting the new app. The new profile is independent. Use **Ctrl+Alt+T** or the tray icon to show the island. Right-click the tray icon for Settings and Quit.

## Connect Claude

1. Open **Settings → Claude & Arena**.
2. Choose **Install Claude Code** if it was not found. Complete the official installer in PowerShell.
3. Choose **Sign in to Claude** and complete Claude's browser sign-in. A compatible Claude account or subscription is required by that service.
4. Refresh status. Enable **Claude Code** under **Connections** to show coding-session activity in the island; restart an existing Claude session after enabling hooks.

You can now select Claude in desktop chat. Claude Code performs the account authentication; Dynamic 7land does not collect your Claude password. Website sessions already open in claude.ai are not automatically imported.

For the **Claude API**, select Claude API as the desktop provider, save your Anthropic API key, choose **Load models**, select an available model ID and save. Use **Test connection** to verify access. API billing is separate from a Claude website subscription.

## Route requests through Arena

1. Get a key through [Arena's API platform](https://platform.arena.ai), and check the access granted to your workspace.
2. In **Claude & Arena**, select **Arena API**, enter your key and choose its access type. The router model defaults to `coding-router-preview`; use **Load models** for models available to your account.
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
| Desktop chat and screenshot buddy | Choose a signed-in Claude / Codex account or configured Arena / Claude API |
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

Provider keys are saved through Electron safeStorage on Windows. They are never returned to the settings renderer or included in a release. Do not commit keys or AppData profiles. See [SECURITY.md](SECURITY.md).

The profile lives in `%APPDATA%\Dynamic7land`. Local hook traffic uses `127.0.0.1:47825` with a local token. The app does not import passwords or tokens from another desktop edition. Screenshots, document text and selected project context are sent to the chosen provider when those features are used. Provider history is stored locally; removing a key does not erase old conversations.

## Build and verify

Use Windows 10/11 x64 and Node.js **22.12+** for building:

```powershell
npm.cmd ci --include=optional
npm.cmd test
npm.cmd run check:syntax
npm.cmd run build:windows
```

The portable folder is `dist/Dynamic7land`. For development, run `npm.cmd start` or `npm.cmd run start:settings`. Windows packaging copies the pinned Electron runtime and Codex Windows component, then sets the app icon and executable metadata. The executable is unsigned.

The prepared edition passed **37 automated tests**, source syntax checks and renderer checks using simulated desktop bridges. Native Windows startup, screen capture, Word, notifications and live provider account access still require a Windows smoke test with your own accounts. No live API key was used for these checks.

## Publish your public repository

The source includes a GitHub publishing script for **iamjeevapilli/dynamic-7land**, plus CI and tagged Windows-release workflows. Publishing does not require sharing a GitHub password in chat or placing one in the source.

Install [Git for Windows](https://git-scm.com/downloads/win) and the [GitHub CLI](https://cli.github.com), reopen PowerShell and run this from a freshly extracted source folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\PUBLISH-TO-GITHUB.ps1
```

The script uses GitHub's browser sign-in, verifies the account is `iamjeevapilli`, creates a **public** repository, commits and pushes this source, and pushes `v1.1.0`. It stops if the repository already exists or this folder already contains Git history. It never overwrites an existing repository. GitHub Actions then builds and publishes the full Windows ZIP and checksum; inspect the Actions result before treating the release as ready.

For subsequent releases, update the package and release-note versions, test, then push a matching `v` tag. Set your repository under **Service setup → Your GitHub releases repository** after publishing, to enable release news in the app.

## Attribution

See [CREDITS.md](CREDITS.md), [LICENSE-DYNAMIC7LAND.txt](LICENSE-DYNAMIC7LAND.txt), `UPSTREAM.json` and `upstream-notices/`. The upstream package declares ISC but the supplied archives did not include a separate application license text. New contributions carry an ISC notice; upstream and third-party components retain their own rights. Dynamic 7land is an independent fork and is not endorsed by TwoCode, Anthropic, OpenAI, Arena, Spotify or Microsoft.
