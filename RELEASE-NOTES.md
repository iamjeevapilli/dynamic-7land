Dynamic 7land 1.4 simplifies AI setup around **Arena** while retaining the desktop island, animated robot, Claude/Codex session monitoring and everyday desktop tools.

- Removed the added OpenRouter, Ollama, OmniRoute, FreeLLMAPI and direct Claude API connections, setup cards and router/model installers.
- Arena is the default connection. **Save and open Claude via Arena** saves the key before launching interactive Claude Code. Its key is passed in the child environment, never on the command line.
- Free-router setup defaults to **Interactive Claude Code only** and hides the direct API test. **Workspace with API access** enables direct chat and project requests, subject to Arena permission, pricing and quotas. A free-router key cannot unlock those API features.
- Existing encrypted Arena keys survive the update. Removed-provider selections switch to Arena setup; unused retired key entries are removed from the app's connection file. Conversation history and existing account selection are retained. Other Windows apps and remote credentials are not changed.
- Key storage remains encrypted. **A key is saved** confirms retention after the visible input clears. No private credentials are included in the public app.

Download **Dynamic7land-Windows-x64.zip**, quit the old tray instance and choose **Extract All into a fresh folder**. Open **Dynamic7land.exe → Settings → AI connections**, paste your own Arena key, choose its access type and follow **AI-SETUP.md**. Do not mix the old and new portable folders.

Automated storage, routing, migration, access-restriction and renderer tests passed. The Windows workflow checks helper-script syntax and builds the portable ZIP and checksum. Native desktop behavior and live Arena access require testing on your PC. The executable is unsigned. Browser conversation monitoring and the missing optional companion backend remain unavailable. Original credits and license notices are retained.
