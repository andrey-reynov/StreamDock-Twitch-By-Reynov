# Changelog

## [Unreleased — 0.10.0]

- Group StreamDock actions with `[SETUP]`, `[OBS]`, `[AUDIO]`, `[TWITCH]`,
  `[TOOLS]`, and `[INFO]` menu prefixes without changing LCD labels or UUIDs.
- Show plugin version, Twitch authorization version, scopes, token validity, and
  reconnect guidance in Dashboard Setup.
- Store authorization-format and plugin-version metadata for new Twitch logins.
- Reject release tags whose commit has not already been merged into `main`.
- Keep the publisher-owned, zero-setup Twitch Client ID postponed for a later
  release.

## 0.9.0

- Consolidated the catalog into Audio — Track, Audio — Compare, and Reset Audio Peaks.
- Kept old audio UUIDs as hidden compatibility aliases so placed keys continue working.
- Unified one-track Live + Peak and absolute range modes in one action.
- Rebuilt audio settings as explained step-by-step sections with Freeze beside its track.

## 0.8.0

- Reworked relative Audio Balance with Live/Peak sources and Number/Meters/Status views.
- Added independent Target and Reference peak freeze controls.
- Added single-track Audio Balance — Absolute with configurable good range and meter/value/status views.
- Added a global Reset all audio peaks action.
- Added optional custom LCD titles to actions and automatic ellipsis for long titles.
- Moved primary values and statuses upward for better visual centering.

## 0.7.0

- Replaced Audio Balance arrows with a signed numeric difference.
- Added optional per-key peak hold and press-to-reset for Audio Check and both Balance views.
- Added preferred target peak and clipping thresholds to Audio Balance.
- Improved long source-name spacing in dual meters and switched the timer to a taller condensed face.
- Added automatic Twitch token refresh-and-retry when a stored access token is rejected.
- Added a StreamDock-compatible settings fallback for action property inspectors.

## 0.6.0

- Added OBS Start / Stop Recording and combined `LIVE`, `REC`, `LIVE+REC` status.
- Added selectable Audio Check meters and two-source Audio Balance guidance.
- Added separate numeric/arrow and dual-meter Audio Balance views with upper and lower safe limits.
- Added connected Twitch account avatar tile.
- Added configurable signed countdown timer.
- Added Moment Marker for Twitch VOD markers and OBS recording chapters.
- Added the `channel:manage:broadcast` Twitch scope required for markers.

## 0.5.0

- Added a dedicated Dashboard setup action as the single Twitch/OBS configuration entry point.
- Removed the repeated connection wizard from all metric and control actions.
- Added clear `SETUP / USE SETUP` placeholders before a dependency is configured.
- Added READY/CHECK status rendering to the setup key.

## 0.4.0

- Turned setup into collapsible steps with live Twitch/OBS connection checkmarks.
- Added Twitch Disconnect with token revocation.
- Expanded the bundled guide with exact Twitch application field values and a recommended connection name.
- Added Stream bitrate, Stream time, Recording time, and OBS health actions.
- OBS health reports OBS CPU, active FPS, and skipped output frames; GPU is explicitly omitted because OBS WebSocket does not expose it reliably.

## 0.3.0

- Reworked first-time setup into three visible steps: Dashboard, Twitch, OBS.
- Added a full offline setup guide inside the StreamDock property inspector.
- Added a repository-level installation guide for GitHub Releases.
- Added reproducible release packaging and a tag-driven GitHub Actions workflow.
- Added a StreamDock-compatible Twitch connection request fallback.
- Added compact metric formatting such as `1k` and `1,2k`.
