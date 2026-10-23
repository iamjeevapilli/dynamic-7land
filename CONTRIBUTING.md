# Contributing

Use Node.js 22.12 or newer. On Windows x64 run `npm ci --include=optional`, `npm test` and `npm run check:syntax`. Build the portable app with `npm run build:windows`.

Keep user-facing text in English, preserve the upstream attribution, use official provider interfaces and keep credentials out of source and logs. Changes to project editing must retain path validation, review and undo. Include focused regression checks for changes to provider routing, hooks or file permissions.

Report the Windows version, app version, feature, steps and a redacted error when filing an issue. Screenshots and log excerpts must exclude secrets and unrelated conversations.
