# Dynamic 7land

English Windows desktop island with an animated robot, **Arena connection**, Claude and Codex session monitoring, screen questions, reviewed project editing and everyday desktop tools. **Version 1.4.0**, maintained by Jeeva Pilli.

## Download and open

Download **Dynamic7land-Windows-x64.zip** from the [latest release](https://github.com/iamjeevapilli/dynamic-7land/releases/latest). Choose **Extract All**, open the extracted Dynamic7land folder and launch **Dynamic7land.exe**. Keep the whole folder together. The portable app needs no separate Node.js installation.

Quit an older instance from its tray menu before opening this update. Right-click the robot near the Windows clock and choose **Open island**. Click the chat bubble to open chat. The same tray menu contains **Settings** and **Quit**; **Dynamic7land-Settings.cmd** opens Settings directly. **Ctrl+Alt+T** also shows the island.

## Connect Arena

Open **Settings → AI connections**. Arena is the default connection; paste your own key into **Arena API key**, keep model **coding-router-preview** or choose a model enabled for your key, and select the access type shown by your Arena workspace.

| Arena key access | What to choose in Dynamic 7land | How to verify |
| --- | --- | --- |
| Free-router / interactive Claude Code only | **Interactive Claude Code only (free-router)**, then **Save and open Claude via Arena** | Type a question in the Claude Code terminal that opens |
| Workspace with API access | **Workspace with API access → Save connection → Test connection** | The app says **Connection successful. Arena returned an answer.** |

For the interactive route, choose **Install Claude Code** first if the app says it is missing. Complete the official installer in PowerShell and choose **Refresh status**, then **Save and open Claude via Arena**. That button saves your key before starting Claude Code, passes it through the process environment and uses Arena's official gateway settings. Enable **Claude Code** in **Connections** to show its coding-session activity in the island.

**Free-router keys cannot run this app's direct desktop chat, screen questions, Word analysis or project API requests.** Arena restricts them to interactive Claude Code. API-enabled access is required for those direct features, and Arena's pricing and quotas apply. The app does not infer access from a key's prefix or bypass a restriction. The new setup defaults to interactive access and hides the direct test until API access is selected.

Saving clears the visible key box for privacy. **A key is saved** means it is retained. Leave the box blank to keep it. Keys are encrypted using Windows account storage and are never bundled into a public release. Do not paste a key into the repository or an issue.

**Load models** discovers Arena models available to your key. Saving a key or loading a list does not prove that a model can answer; verify with a terminal question or **Test connection**, as appropriate. Full instructions and troubleshooting are in [AI-SETUP.md](AI-SETUP.md).

**Open Arena Agent** opens [Arena's agent workspace](https://arena.ai/agent). Website sessions, tools and sandboxes are separate from API access. Dynamic 7land runs on your Windows PC.

Official references: [Arena Claude Code setup](https://platform.arena.ai/docs/claude-code), [Arena Codex setup](https://platform.arena.ai/docs/codex).

## Existing accounts and desktop features

Claude and Codex account connections and monitoring remain available. To use an existing account for desktop chat, select **Existing Claude / Codex account setup** in AI connections and save. Use **Sign in to Claude**, or **Open AI & Chat sign-in** for the existing ChatGPT/Codex connection. These accounts keep their own access and plan limits. Enable their hooks under **Connections** and restart an existing coding session after enabling hooks.

| Feature | Setup or current limit |
| --- | --- |
| Desktop island and robot | Moods, animations, outfits, notifications and customisation |
| Claude Code / Codex monitoring | Local hooks, session state, approvals, history and usage exposed by the coding agent |
| Arena desktop chat and screenshot buddy | API-enabled Arena workspace; a model supporting the request |
| Word review and summaries | Windows Word and an eligible AI connection; proposed fixes remain tracked changes |
| Project questions and reviewed edits | Select a project; file validation, review, backups and undo retained |
| VS Code project integration | Included `vscode-editor/dynamic7land-project-editor.vsix`; ID `jeevapilli.project-editor` |
| File tray, clipboard, notes and focus timer | Local desktop tools |
| Spotify | Your Spotify Client ID and account; playback follows Spotify's limits |
| Weather and ICS calendar | Configure location / calendar URL in General |
| Browser Claude / ChatGPT conversation monitoring | Still unavailable in the supplied desktop source |
| Optional companion website | Original website backend was not included in the supplied source |

For Spotify, register `http://127.0.0.1:8890/callback` in your developer app, then save its public Client ID in **Service setup**. The app uses PKCE; no client secret is needed.

## Updating from an earlier version

Version 1.4 removes the added OpenRouter, Ollama, OmniRoute, FreeLLMAPI and direct Claude API connections, setup cards and external-router/model installers. Arena and the original Claude/Codex account features remain. If an old removed connection was selected, the app switches its connection form to Arena and asks for Arena setup. It retains an existing encrypted Arena key and its access choice, removes unused retired provider-key entries from the app's connection file, and preserves conversation history. An existing account selection stays selected.

The update does not uninstall other applications or models from Windows and does not revoke external account credentials. Extract into a fresh folder so old setup launchers are not left alongside the new app.

## Privacy

The profile lives in `%APPDATA%\Dynamic7land`. Arena keys use Electron safeStorage on Windows and are not returned to the settings renderer. Screenshots, document text and selected project context are sent to the selected AI service when you use those features. Provider conversation history is stored locally; removing a key does not delete old conversations. Local hook traffic uses `127.0.0.1:47825` with a local token. See [SECURITY.md](SECURITY.md).

## Build and verify

Use Windows 10/11 x64 and Node.js **22.12+** to build:

```powershell
npm.cmd ci --include=optional
npm.cmd test
npm.cmd run check:syntax
npm.cmd run build:windows
```

The portable folder is `dist/Dynamic7land`. For development, use `npm.cmd start` or `npm.cmd run start:settings`. GitHub Actions tests the source, parses the Windows helper scripts, builds the portable app and publishes the ZIP plus SHA256 checksum. The executable is unsigned.

Automated tests exercise encrypted storage, Arena routing, API restrictions, upgrade migration and renderer flows using simulated responses. Native Windows GUI behavior and live Arena access require testing on your PC. No live user key is used by CI. See [BUILD-INFO.json](BUILD-INFO.json) for the verified checks and their limits.

The source includes CI, a tagged release workflow and `PUBLISH-TO-GITHUB.ps1` for initial publication to a new repository through GitHub CLI browser sign-in. For this existing public repository, update the version and release notes, verify, then run the publishing workflow with the matching `v` tag. No GitHub password belongs in the source.

## Attribution

Credits, source provenance and license information remain in [CREDITS.md](CREDITS.md), [LICENSE-DYNAMIC7LAND.txt](LICENSE-DYNAMIC7LAND.txt), `UPSTREAM.json` and `upstream-notices/`.
