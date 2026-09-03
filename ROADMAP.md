# Roadmap

## Version 0.10 development update

Implemented on the `development` branch. It must be tested there and merged to
`main` before the release tag is created.

### Group the StreamDock action catalog

Use short menu-only prefixes so related actions remain grouped even when a
StreamDock version sorts actions alphabetically. LCD titles remain unchanged
and continue to support their own custom names.

- `[SETUP] Dashboard`
- `[OBS] Stream`, `[OBS] Record`, `[OBS] Status`, `[OBS] Bitrate`,
  `[OBS] Stream Time`, `[OBS] Record Time`, `[OBS] Health`
- `[AUDIO] Track`, `[AUDIO] Compare`, `[AUDIO] Reset Peaks`
- `[TWITCH] Viewers`, `[TWITCH] Chat`, `[TWITCH] Account`, `[TWITCH] Marker`
- `[TOOLS] Timer`
- `[INFO] Dashboard`

Keep legacy audio UUIDs hidden in the manifest so existing placed keys remain
compatible.

### Show plugin and Twitch authorization versions

Add a diagnostic section to Dashboard Setup:

```text
Plugin: 0.x.x
Twitch authorization: 0.x.x
Scopes: Chat ✓  Markers ✓
Token: Valid
Status: Reconnect not required
```

- Store the plugin version used when a Twitch authorization is completed.
- Compare that version and its granted scopes with the current requirements.
- Recommend reconnecting only when scopes are missing, the token is invalid,
  or the saved authorization format is obsolete.
- Do not imply that every plugin update requires reconnecting Twitch.

## Public zero-setup Twitch connection

Implemented on `development` with the publisher-owned Public application
`Reynov Live Dashboard`.

- Register one publisher-owned Twitch Public Client named
  `Reynov Live Dashboard`.
- Ship its public Client ID as the plugin default.
- Keep Client Secret out of the repository, plugin, profiles, and releases.
- Present one normal `Connect Twitch` button using Device Code Flow; hide the
  activation-code mechanics from the user when Twitch supplies a prefilled URL.
- Keep `Advanced → Use another Twitch application` as an optional override.
- Store each user's access and refresh tokens only in their local StreamDock
  settings.
- Document that an inactive public-client refresh token may require reconnecting
  after an extended period.

The Client ID is intentionally public. Client Secrets and user tokens remain
excluded from the repository and release artifacts.

## Branch and release policy

- Day-to-day changes are committed to `development`.
- Test development builds directly; do not tag them as releases.
- Merge a reviewed and tested update into `main`.
- Create the `vX.Y.Z` tag only from the resulting `main` history.
- The GitHub workflow verifies that a release tag belongs to `origin/main`.

Never paste a GitHub password, Personal Access Token, Twitch token, or Client
Secret into chat or commit it to the repository.
