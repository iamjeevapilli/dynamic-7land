# Arena setup for Dynamic 7land 1.4.1

1. Download the Windows ZIP from the [latest release](https://github.com/iamjeevapilli/dynamic-7land/releases/latest) and choose **Extract All** into a fresh folder.
2. Quit the old desktop island from its tray menu, then open **Dynamic7land.exe** from the new folder.
3. Right-click the robot near the Windows clock → **Settings → AI connections**. You can also open **Dynamic7land-Settings.cmd**.
4. Leave **Arena** selected. Paste your key into **Arena API key**. Keep **coding-router-preview** unless your workspace requires a different model.
5. Choose the access type granted by your Arena workspace and follow the matching route below.

## Free-router / interactive Claude Code

Choose **Interactive Claude Code only (free-router)**. If Claude Code is missing, choose **Install Claude Code**, complete its official installer in PowerShell, then **Refresh status**.

Choose **Open Arena chat window**. This saves the key before launching a terminal with Arena's gateway environment. Ask a short question in that terminal to verify it. The launcher opening alone is not proof that the key works. Under **Connections**, enable Claude Code and restart the coding session to show its activity in the island.

Arena free-router keys work only in interactive Claude Code. Direct desktop chat, screen questions, Word analysis, print mode and project API requests require API-enabled workspace access. Changing the access dropdown cannot grant access the workspace does not have. The direct test is hidden for interactive-only access.

## Open your saved Arena connection next time

Open Dynamic 7land's notch chat, select Arena and click **Open Arena chat window**. The app reuses its encrypted saved key and opens Claude Code in the dedicated `Dynamic7land-Chat` folder. The free-router notch input is disabled so it cannot be mistaken for the terminal chat. You can also use **Open Arena chat window** in AI connections.

Claude starts in **Manual mode**, with normal prompts before commands or edits. This avoids using auto mode's classifier for those approvals; Arena still controls usage, quotas and prices. Opening a window does not prove the key can answer. Complete any theme or folder prompt in the new window, then type a normal question beside `>` and wait for a reply. Do not type launch commands into Claude Code's chat.

The launcher uses a visible PowerShell window with its own keyboard input and an encoded startup command. The key is passed only through the child environment and is never written into that command. No manual PowerShell environment setup is needed.

## Workspace with API access

Choose **Workspace with API access → Save connection → Test connection**. The test makes an actual Arena request and follows your workspace's pricing and limits. Success says **Connection successful. Arena returned an answer.** Return to the island, open chat and select Arena.

**Load models** saves the form and requests Arena's model catalog. Select a model available to your key and save. Screenshot questions require image support, and project requests require structured-output support from the selected model. There is no automatic switch to another added provider.

## Key storage

After saving, the input becomes empty and **A key is saved** appears. This is normal: the encrypted key remains in your Windows profile and is not sent back to the visible settings page. Leave the input blank to retain it. **Remove saved key** deletes the app's encrypted copy, not the Arena account's key. An `ARENA_API_KEY` environment variable, if you configured one yourself, remains managed by Windows.

No private key is included in the source or executable. Enter your key directly on your PC; do not share it through chat or public issues. If a key has been shared, revoke it in the Arena dashboard and use a replacement.

## Troubleshooting

| What happens | Next step |
| --- | --- |
| Dynamic7land.exe is missing | Download the Windows ZIP asset, rather than GitHub's source-code ZIP, and extract the whole archive |
| Settings still shows removed provider options | Quit the old instance from its tray menu and open version 1.4 from the fresh extracted folder |
| Key box clears after Save | Look for **A key is saved**; leave the box blank on later saves |
| Claude Code was not found | Complete **Install Claude Code**, refresh status and retry the Arena launcher |
| `organization_client_restricted` / HTTP 403 | Set interactive access and use the Claude Code terminal; desktop API requests need workspace API permission |
| HTTP 401 | Check that the key is active, complete and issued by Arena; save the correct key |
| Quota / HTTP 429 | Check Arena usage and wait for the applicable quota; a new key does not bypass account limits |
| Model unavailable | Use Load models and choose an ID enabled for your workspace |
| Screenshot or structured output unsupported | Select a model with the required capability |
| Arena could not be reached | Check the PC's internet connection and Arena status |

## Existing accounts and upgrades

Claude/Codex monitoring and existing account sign-in remain available. Choose **Existing Claude / Codex account setup** and save to use them for desktop chat.

Retired connections migrate to the Arena form, retaining only an existing encrypted Arena key. Old conversation history remains. No external Windows apps/models are uninstalled, and no remote credentials are revoked. The new package contains no local-model or router setup installers.

Official setup: [Arena Claude Code](https://platform.arena.ai/docs/claude-code), [Arena Codex](https://platform.arena.ai/docs/codex).
