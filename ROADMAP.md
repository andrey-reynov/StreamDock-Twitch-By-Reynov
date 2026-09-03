# Roadmap

## Next plugin update

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

## Later: public zero-setup Twitch connection

Postpone this until the GitHub repository and release process are ready.

- Register one publisher-owned Twitch Public Client named
  `Twitch by Reynov (StreamDock)`.
- Ship its public Client ID as the plugin default.
- Keep Client Secret out of the repository, plugin, profiles, and releases.
- Present one normal `Connect Twitch` button using Device Code Flow; hide the
  activation-code mechanics from the user when Twitch supplies a prefilled URL.
- Keep `Advanced → Use another Twitch application` as an optional override.
- Store each user's access and refresh tokens only in their local StreamDock
  settings.
- Document that an inactive public-client refresh token may require reconnecting
  after an extended period.

Before enabling this for releases, confirm that the Twitch application belongs
to the publisher and is intended for public distribution. Do not publish a
personal Client ID accidentally.

## GitHub repository prerequisites

Current local state: Git is initialized on `main`, but there are no commits and
no remote configured yet.

Before the first push:

- choose the GitHub owner and repository name;
- choose public or private visibility;
- create or select the empty GitHub repository and provide its HTTPS URL;
- choose a license for a public repository;
- authenticate GitHub locally through the browser or Git credential manager;
- review the initial commit, README, workflow, and release contents;
- verify that no Twitch tokens, OBS passwords, configured profiles, logs, or
  Client Secret are tracked.

Never paste a GitHub password, Personal Access Token, Twitch token, or Client
Secret into chat or commit it to the repository.
