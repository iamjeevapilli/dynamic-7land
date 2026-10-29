# Dynamic 7land: choose your AI connection

Version 1.3.0 includes the connection code and Windows setup launchers for all the options below. External apps and models download only when you choose their setup button. No working account credentials are supplied with the download.

| Choice | What you need | What the app sets up |
| --- | --- | --- |
| **Ollama local AI** | Windows x64, internet for installation/model downloads, disk space and enough RAM | Installs Ollama if missing, starts its local server and downloads `llama3.2:1b`. No API key or provider account. |
| **FreeLLMAPI** | Its Windows app, usable provider connections, its locally generated unified key | Downloads the official pinned Windows installer, verifies SHA256 and opens it. Desktop port defaults to **31415**. |
| **OmniRoute** | A supported Node.js version, usable provider connections, an endpoint key from its dashboard | Installs Node.js LTS if needed through Windows Package Manager, installs the pinned router and starts it on loopback. Default port **20128**. |
| **OpenRouter direct** | Your OpenRouter key and free model access | Existing encrypted connection, free model discovery and zero price ceilings. Free quotas apply. |
| **Claude / Codex / Arena** | An eligible account, subscription or API-enabled key, depending on the provider | Existing account and API connection controls. These platforms set their own prices and limits. |

**Start with Ollama if obtaining API keys is the problem.** Routers combine the provider access you configure; installing a router does not unlock all premium platforms or remove provider quotas. FreeLLMAPI's optional paid catalog subscription is not required by this integration. A “cheap” route is not a promise of free use.

## 1. Use AI without an API key

1. Extract the whole Dynamic 7land Windows ZIP. Close an older instance from its tray menu.
2. Open `Dynamic7land.exe`, then **Settings → AI connections**.
3. Choose **Install Ollama + small model**. Complete any Windows installer prompts and wait for the setup window's final result. Installation and model downloads can take several minutes.
4. Choose **Use local AI — no key → Load models**. Select `llama3.2:1b`, then **Save connection → Test connection**.
5. A successful test says **Connection successful. Your provider returned an answer.** Minimize Settings, right-click the robot near the clock, choose **Open island**, then click the chat bubble.

You can also open **SETUP-LOCAL-AI.cmd** from the extracted portable folder to run the same setup. The portable desktop app itself needs no separate Node.js install.

For screen questions, the optional **Install Ollama + vision model** button downloads `gemma3:4b`. That model needs several GB of disk space and enough memory. Select it after loading models. Text-only models cannot read screenshots. The local route verifies downloaded model details and refuses cloud model aliases.

If Windows Package Manager is unavailable, setup opens the official download page. Install Ollama there and run setup again. If the PC is too slow, use a smaller local model or a cloud provider you are eligible to use. Local model speed and quality depend on hardware.

## 2. Connect FreeLLMAPI

1. In AI connections, choose **Install FreeLLMAPI**. Finish the official installer and open its app. **SETUP-FREELLMAPI.cmd** runs the same setup from the portable folder.
2. Open its dashboard and add eligible free provider connections on its **Keys** page. These are the provider credentials that FreeLLMAPI uses to answer your questions. Keep paid custom endpoints disabled for a free setup.
3. In the FreeLLMAPI tray, choose **Copy Key**. This is its **unified API key**, generated locally by the router. Its Keys page header also has it. You do not need to send it to anyone.
4. In Dynamic 7land, choose **Use FreeLLMAPI** and paste that key into **Connection key from your router**. Match the port shown in its tray. Desktop normally uses **31415**; a Docker/server installation normally uses **3001**. A port conflict can make the desktop app choose another port.
5. Keep model **auto**, or choose **Load models** for the available catalog. Choose **Save connection → Test connection**. Keep FreeLLMAPI running while using this connection.

Provider keys belong in FreeLLMAPI. Only its unified connection key belongs in Dynamic 7land. Model discovery requests `/v1/models?available=true`; the gateway can still advertise `auto` before an upstream provider is usable, so a model list is not proof of a successful live answer. The connection test makes an actual request.

The installer is pinned to upstream **0.16.11**. SHA256: `734e83431caa918f23e8c9b90fd91beac97357c5fa47386f9db0bdff23462077`. The installer is downloaded directly from its official GitHub release when requested; it is not redistributed inside the portable ZIP.

## 3. Connect OmniRoute

1. Choose **Install / start OmniRoute** in AI connections, or open **SETUP-OMNIROUTE.cmd**. Setup installs a compatible Node.js LTS runtime if needed, installs **omniroute@3.8.53** from npm and runs `omniroute serve`. Keep the terminal open.
2. Open **Open OmniRoute dashboard**. It normally uses **20128**. Complete the router's own setup, then add only provider connections you are eligible to use.
3. For a free setup, configure its free-only routing and spending controls, and enable only free connections. Its `auto` route can include paid connections. A free-looking model name alone is not a billing guarantee. Dynamic 7land cannot inspect or enforce another app's internal fallback settings.
4. Copy a connection key from **Endpoints**. In Dynamic 7land, choose **Use OmniRoute**, paste that endpoint key and match the port.
5. Use **Load models**, choose an available model or your configured free-only combo, then **Save connection → Test connection**.

The pinned router supports Node.js **22.22.2+ within version 22**, or **24–26**. Its official postinstall prepares native components, so setup allows that required step. Windows may show installer or administrator prompts for Node.js. The launcher binds OmniRoute to `127.0.0.1` and starts its CLI in English.

## What this connection can do

The selected provider handles desktop chat, screen questions, Word analysis and project questions/reviewed edits. Screenshot requests need a vision-capable upstream model. Structured project output needs compatible model support. Original path checks, change review, backups and undo remain in place.

The island, robot, outfits, local tools, timers and monitoring remain desktop features. Installing a gateway does not make the unfinished browser-conversation monitoring or missing companion-server backend available.

## If something does not connect

| Message or symptom | Next step |
| --- | --- |
| Key box becomes empty after Save | Expected. **A key is saved** means it is retained encrypted. Leave the box blank to keep it. |
| Router could not be reached | Start that router on the same PC and match its current port. Keep it running. |
| Router rejected its connection key | Copy its current unified/endpoint key from its own tray or dashboard. A provider key is different. |
| No available model or provider | Connect a usable provider in the router dashboard and check its quota. Installation alone does not grant inference access. |
| Busy / quota reached | Wait for the indicated provider limit to reset or use another already-configured eligible provider. A new key does not bypass account limits. |
| Screenshot/model unsupported | Choose an available vision model. For Ollama, download and select a local vision model. |

Only **Test connection** or a successful chat verifies that your provider can currently answer. Opening an installer, saving a key or loading a catalog is a separate step. Setup launchers do not collect or configure your cloud accounts for you. Never paste passwords or full keys into a public repository or support chat.

Official projects: [Ollama](https://ollama.com), [OmniRoute](https://github.com/cheaper-inference/OmniRoute), [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi).
