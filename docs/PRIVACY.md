# Privacy notice

**Reynov Live Dashboard** is a local StreamDock plugin for Twitch and OBS. It
does not operate a Reynov account server and does not send analytics or
telemetry to the publisher.

## Data used

When the user connects Twitch, the plugin receives and processes:

- Twitch access and refresh tokens;
- Twitch user ID, login, display name, and profile image;
- live status and viewer count;
- chat events needed to count messages;
- the permissions granted to the application.

When the user connects OBS, the plugin processes the local OBS WebSocket URL,
password, output status, performance counters, and selected audio-input levels.

## Storage and transmission

Twitch tokens, OBS settings, counters, and plugin preferences are stored using
StreamDock's local plugin-settings mechanism on the user's computer. They are
not included in plugin releases and are not sent to Reynov.

The plugin communicates directly with Twitch API, Twitch Identity, and Twitch
EventSub endpoints. OBS communication normally stays on the user's computer at
`ws://127.0.0.1:4455`. Profile images are downloaded directly from the URL
returned by Twitch.

The plugin does not intentionally retain complete chat history. Message content
is processed in memory for live dashboard behavior; the persisted stream
session contains the message count and stream start time.

## User control

**Disconnect Twitch** revokes the current Twitch access token when possible and
removes the locally stored Twitch authorization. Users can also revoke access
from Twitch **Settings → Connections → Other Connections**. Removing the plugin
does not automatically remove StreamDock profile data; users may remove the
associated StreamDock profile/settings separately.

## Security

The publisher Twitch application is a Public client. The bundled Client ID is
not a secret. The plugin never requires a Twitch Client Secret. Users should not
share Twitch tokens, OBS passwords, configured profiles, or diagnostic logs
that contain credentials.

## Contact

Questions and security reports can be opened through the repository's
[GitHub Issues](https://github.com/andrey-reynov/StreamDock-Twitch-By-Reynov/issues).

Last updated: 2026-09-03.

