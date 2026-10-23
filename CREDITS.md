# Dynamic 7land credits

Dynamic 7land is a customised personal edition prepared for Jeeva Pilli, based on
**TwoCode 1.2.0-beta.1 by levon-z / TwoCode**.

Upstream release: https://github.com/levon-z/TwoCode/releases/tag/v1.2.0-beta.1

The island, original robot renderer and animation system, AI integrations,
monitor, buddy, project editor, Spotify controls and desktop tools derive from
the supplied TwoCode application. Renaming and adapting them does not make
those original components solely authored by Jeeva Pilli.

This edition adds Dynamic 7land identity and icons, English defaults, purple accents,
isolated app data and hook endpoints, Claude and Arena provider setup, encrypted API-key storage, a service setup screen, owner-managed
Spotify configuration, local release notes, packaging and regression checks.

The upstream package declares its application license as ISC. None of the
three supplied archives contains a separate application license text. The
original README and release documentation are preserved in `upstream-notices`;
archive hashes and comparison results are in `UPSTREAM.json`.
`LICENSE-DYNAMIC7LAND.txt` covers the new contributions in this edition.

Electron's runtime license is retained as `LICENSE` in the portable folder,
alongside `LICENSES.chromium.html`. The OpenAI Codex CLI is Apache-2.0;
its license and notice are included in `upstream-notices`, with its bundled
third-party notices retained in its package. Package download integrity was
checked against the exact SHA-512 entries in the supplied package lock.

Dynamic 7land is a personal fork and is not an official TwoCode, OpenAI, Anthropic,
Arena, Spotify or Microsoft product. Those names identify the original software or
the services that can be connected.
