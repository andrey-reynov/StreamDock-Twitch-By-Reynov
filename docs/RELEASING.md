# Release guide

This document describes how to prepare, publish, and verify a release of
**StreamDock Twitch Live Dashboard**. The repository currently uses GitHub
Actions to build the plugin and attach a ZIP archive to a GitHub Release.

## Release contents

The distributable archive must contain exactly one top-level plugin directory:

```text
com.personal.streamdock.livedashboard.sdPlugin/
  manifest.json
  plugin/
  propertyInspector/
  static/
```

Do not distribute a configured StreamDock profile. Twitch tokens and the OBS
WebSocket password are user data and must never be included in a release.

## Prerequisites

- Node.js 20;
- pnpm 10 or newer;
- PowerShell 7 on Windows;
- permission to push tags to the GitHub repository;
- a clean `main` branch synchronized with GitHub.

Normal development happens on `development`. Merge tested changes into `main`
before creating a version tag. The release workflow rejects a `v*` tag when its
commit is not already contained in `origin/main`.

Run all commands below from the repository root unless stated otherwise.

## 1. Choose and apply the version

Use semantic versions such as `0.10.0`. The following values must match:

- `Version` in
  `live-dashboard/com.personal.streamdock.livedashboard.sdPlugin/manifest.json`;
- `version` in `live-dashboard/plugin-src/package.json`;
- the release heading in `CHANGELOG.md`;
- the Git tag, prefixed with `v`, for example `v0.10.0`.

Update the changelog with user-visible additions, changes, fixes, and known
limitations. Do not move or reuse a tag that has already been published. Ship a
new patch release instead.

## 2. Run the local release checks

```powershell
cd live-dashboard/plugin-src
pnpm install --frozen-lockfile
pnpm run check
pnpm test
pnpm run build
cd ../..
./scripts/package-release.ps1 -Version 0.10.0
```

The packaging script verifies the requested version against the manifest,
creates `dist/streamdock-twitch-dashboard-v0.10.0.zip`, and prints its SHA-256
hash.

Inspect the archive before publishing:

```powershell
tar -tf dist/streamdock-twitch-dashboard-v0.10.0.zip
Get-FileHash dist/streamdock-twitch-dashboard-v0.10.0.zip -Algorithm SHA256
```

Confirm that:

- there is one top-level `.sdPlugin` directory;
- the compiled `plugin/index.js` is present;
- the manifest and Property Inspector files are present;
- no `.env`, logs, profiles, tokens, Client Secrets, OBS passwords, or unrelated
  development files are present;
- the plugin starts in StreamDock and the main actions render correctly.

## 3. Merge development into main

Open a pull request from `development` to `main`, wait for its checks, review
the final diff, and merge it. Update the local branches before tagging:

```powershell
git switch main
git pull --ff-only origin main
```

## 4. Commit and publish the tag

```powershell
git status
git add README.md CHANGELOG.md docs live-dashboard
git commit -m "Release v0.10.0"
git push origin main
git tag -a v0.10.0 -m "StreamDock Twitch Live Dashboard v0.10.0"
git push origin v0.10.0
```

Pushing a `v*` tag starts `.github/workflows/release.yml`. The workflow uses
Node.js 20 and pnpm 10, installs locked dependencies, runs the tests, builds the
Node.js bundle, packages the `.sdPlugin` directory, creates a GitHub Release,
and attaches the ZIP. A manual `workflow_dispatch` run builds an artifact but
does not create a tagged release.

## 5. Fill in the GitHub Release

Open **GitHub → Releases → the new release → Edit** and use these fields:

- **Choose a tag:** the existing tag, for example `v0.10.0`;
- **Target:** `main`;
- **Previous tag:** the immediately preceding published version;
- **Release title:** `StreamDock Twitch Live Dashboard v0.10.0`;
- **Description:** summarize the changelog and include install/update notes;
- **Set as a pre-release:** off for a stable release, on for alpha/beta/RC;
- **Set as the latest release:** on for the newest stable release;
- **Create a discussion:** optional;
- **Assets:** verify that `streamdock-twitch-dashboard-v0.10.0.zip` is attached.

Use **Save draft** while the text or artifact is incomplete. Use **Publish
release** only after the checks below pass. GitHub's automatically generated
“Source code” archives are not the installable plugin; users need the attached
`streamdock-twitch-dashboard-*.zip` asset.

Suggested release-note template:

```markdown
## What's new

- Change one.
- Change two.

## Installation

1. Close StreamDock completely.
2. Download and extract `streamdock-twitch-dashboard-v0.10.0.zip`.
3. Copy `com.personal.streamdock.livedashboard.sdPlugin` to
   `%APPDATA%\HotSpot\StreamDock\plugins\`.
4. Start StreamDock.

Existing users can replace the old plugin directory. Their StreamDock profile
settings are stored separately.

## Verification

- Tests: passed
- SHA-256: `PASTE_HASH_HERE`
```

## 6. Verify the published release

1. Confirm that the GitHub Actions run is green.
2. Download the ZIP from the public Release page, not from the local `dist`
   directory.
3. Recalculate SHA-256 and compare it with the release notes.
4. Install the downloaded artifact on a clean or disposable StreamDock setup.
5. Check Dashboard setup, one dynamic metric, one OBS control, and—when
   available—the HSV293-S Information slot.
6. Confirm that the displayed plugin version matches the release.

## Hotfixes and failed releases

If the workflow fails before publication, fix the source, commit, create a new
version/tag, and run the process again. If a broken release is already public,
mark it as a pre-release or explain the issue in its notes, then publish a new
patch version. Avoid replacing an asset under the same version because users
can no longer reliably verify what they downloaded.
