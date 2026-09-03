# StreamDock HSV293-S Live Dashboard — research notes

Research date: 2026-09-02.

## Confirmed

- MiraBox publishes an official multi-language Plugin SDK: <https://github.com/MiraboxSpace/StreamDock-Plugin-SDK>.
- The plugin host launches browser or Node code and exchanges local JSON messages over WebSocket. Dynamic LCD output uses `setTitle`, `setImage`, and `setState` with an action-instance `context`.
- The official manifest reference lists `Keypad`, `Information`, `SecondaryScreen`, `Knob`, and `btn` as controller types: <https://sdk.key123.vip/en/guide/manifest.html>.
- The official Device SDK lists the StreamDock 293 family (`293`, `293s`, `293V3`, `293sV3`) as supported and exposes `set_touchscreen_image` for direct device control: <https://github.com/MiraboxSpace/StreamDock-Device-SDK/blob/main/docs/readme.en.md>.
- The installed official Twitch plugin declares both `Keypad` and `Information` on its actions. This is strong local evidence that the HSV293-S Info Board is intended to consume plugin actions through the `Information` controller, but it still needs a device test.
- The installed Twitch plugin's Audience action is **not live-updating**. Its `_willAppear` explicitly sets the title to `1`; only `keyDown` calls `GET https://api.twitch.tv/helix/streams` and replaces the title with `viewer_count`. The observed `1` is therefore a placeholder until the key is pressed.
- The installed Twitch plugin version inspected was `1.0.260129`, with StreamDock minimum software version `3.10.188.226`.
- Twitch officially supports Device Code Grant for public desktop/device clients, with no client secret. This is the simplest suitable “Connect Twitch” flow: <https://dev.twitch.tv/docs/authentication/getting-tokens-oauth>.
- OBS Studio 28+ includes obs-websocket 5.x. Its default port is `4455`; it supports `GetStreamStatus`, `StartStream`, `StopStream`, and `ToggleStream`: <https://github.com/obsproject/obs-websocket> and <https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md>.

## Hardware verification on HSV293-S

- StreamDock identifies the rear-labelled HSV293-S as `Stream Dock 293S_1494`. This confirms the model maps to the officially supported 293S family.
- The plugin category and compatible actions load in the `Key` and `Info board` catalogs after a full tray-process restart.
- The current StreamDock runtime log confirms `com.personal.streamdock.livedashboard.sdPlugin is now connected` and identifies the attached host target as `StreamDock[293S]`, with no plugin error following startup.
- `Information` renders dynamic plugin output on the physical right-side display.
- The Info Board is three non-pressable square action slots stacked vertically, not one full-height plugin canvas. A large vertical SVG is scaled into a single slot. The correct native display is therefore `VIEWERS` + `CHAT` + passive `OBS STATUS`; interactive `START/STOP` belongs on a normal LCD key. A compact 144×144 all-in-one dashboard can occupy one Info Board slot.
- Closing the main window only hides StreamDock to the tray. A true plugin reload requires exiting/terminating the tray process and starting StreamDock again.
- Manifest/category/state icons need PNG/JPG for this host version. Dynamic SVG sent later through `setImage` works.

## Not yet confirmed

- Live Twitch authorization and EventSub delivery with the user's own Twitch Client ID.
- Authenticated OBS start/stop against the user's current OBS WebSocket password.

## Recommended implementation

Use the official Node.js v2 plugin shape for the production plugin, with actions sharing one service layer:

1. `viewers`: poll Helix `GET /helix/streams?user_id=...` every 30 seconds while live; show `0`/`OFFLINE` when no stream exists.
2. `messages`: subscribe to EventSub WebSocket `channel.chat.message`; increment an in-memory/persisted session counter.
3. `stream`: connect to local OBS WebSocket 5.x, show `LIVE` or `OFFLINE`, and call `StartStream`/`StopStream` on press.
4. `obsstatus`: passive OBS state for the non-pressable Info Board.
5. Optional `dashboard`: a combined 144×144 rendering for one slot. On HSV293-S the practical full-height dashboard is composed from three independent actions across the three Info Board slots.

Reset message count on Twitch `stream.online` (authoritative public-live boundary), not merely when OBS starts output. Also reset on first transition from Helix offline to live as a recovery path. Preserve the count across a plugin restart together with the Twitch stream ID/start time.

## Twitch authorization

Register one personal Twitch application and configure it as a public client. Device Code Grant is preferred because the plugin opens the returned verification URL with the code already embedded, giving the user a browser sign-in/Authorize flow without manual code entry, a callback server, or a client secret.

Minimum scope for receiving chat through EventSub as the broadcaster's own user is expected to be `user:read:chat`. Viewer count and basic stream presence use Helix and do not need a privileged broadcaster-management scope. Token validation and refresh must be implemented; Device Code refresh tokens are rotated on use.

## Stage 1 test artifact

`poc/com.personal.streamdock.livedashboard.sdPlugin` is a dependency-free diagnostic plugin. Its counter updates once per second through `setTitle`, resets on `keyUp`/`touchTap`, and declares all three candidate display controllers: `Keypad`, `Information`, and `SecondaryScreen`.

## Stage 2 MVP

`live-dashboard/com.personal.streamdock.livedashboard.sdPlugin` contains a bundled Node.js MVP with viewers, chat messages, OBS stream control, passive OBS status, and a compact Info Board dashboard. Configuration is shared through StreamDock global settings. Twitch authorization uses browser-assisted Device Code Grant and EventSub WebSocket; OBS uses obs-websocket 5.x.

Automated coverage includes state/reset behavior, compact metric formatting, adaptive 144×144 SVG typography, StreamDock launch arguments, LCD frame caching, Twitch browser activation, token refresh locking, EventSub keepalive/reconnect and duplicate delivery handling, OBS authentication/toggle locking, and a bundled-plugin integration test against a mock StreamDock WebSocket host.
