param([string]$Version)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$pluginRoot = Join-Path $repoRoot 'live-dashboard\com.personal.streamdock.livedashboard.sdPlugin'
$manifest = Get-Content -Raw -LiteralPath (Join-Path $pluginRoot 'manifest.json') | ConvertFrom-Json

if (-not $Version) { $Version = $manifest.Version }
$Version = $Version -replace '^v', ''
if ($Version -ne $manifest.Version) {
  throw "Requested version $Version does not match manifest version $($manifest.Version)."
}

$distRoot = Join-Path $repoRoot 'dist'
$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("streamdock-dashboard-" + [guid]::NewGuid())
$stagedPlugin = Join-Path $stagingRoot 'com.personal.streamdock.livedashboard.sdPlugin'
$archivePath = Join-Path $distRoot "streamdock-twitch-dashboard-v$Version.zip"

New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

try {
  Copy-Item -LiteralPath $pluginRoot -Destination $stagedPlugin -Recurse
  if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath }
  Compress-Archive -LiteralPath $stagedPlugin -DestinationPath $archivePath -CompressionLevel Optimal
  Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
} finally {
  if (Test-Path -LiteralPath $stagingRoot) { Remove-Item -LiteralPath $stagingRoot -Recurse -Force }
}
