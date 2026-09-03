# Plugin package

The user-facing installation and setup guide is in the repository
[README](../README.md).

This directory contains:

- `com.personal.streamdock.livedashboard.sdPlugin/` — ready-to-package plugin;
- `plugin-src/` — Node.js source, tests, and build configuration;
- `button-preview.png` — rendered LCD button preview.

Build and test from `plugin-src`, then create the GitHub Release archive with
`../scripts/package-release.ps1`.
