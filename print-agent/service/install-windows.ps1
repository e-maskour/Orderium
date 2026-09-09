#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Installs the Orderium Print Agent as a boot-time scheduled task.
.DESCRIPTION
  A scheduled task is used rather than a Windows service so the install needs
  no third-party service wrapper (nssm) and no native Node modules.
#>
param(
  [Parameter(Mandatory = $true)][string]$InstallDir,
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [Parameter(Mandatory = $true)][string]$PairingCode
)
$ErrorActionPreference = 'Stop'

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  throw 'Node.js is required. Install the LTS build from https://nodejs.org and re-run this script.'
}

$entry = Join-Path $InstallDir 'dist\index.js'
if (-not (Test-Path $entry)) {
  throw "Could not find $entry. Copy the built agent to $InstallDir first (run: pnpm build)."
}

Write-Host 'Pairing agent...'
& $node $entry pair --url $ApiUrl --code $PairingCode
if ($LASTEXITCODE -ne 0) {
  throw 'Pairing failed. Codes expire after 15 minutes — generate a fresh one in Settings > Printers.'
}

Write-Host 'Registering boot task...'
$action   = New-ScheduledTaskAction -Execute $node -Argument $entry -WorkingDirectory $InstallDir
$trigger  = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName 'OrderiumPrintAgent' `
  -Action $action -Trigger $trigger -Settings $settings `
  -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

Start-ScheduledTask -TaskName 'OrderiumPrintAgent'
Write-Host 'Orderium Print Agent installed and started.'
Write-Host 'Check status with: Get-ScheduledTask -TaskName OrderiumPrintAgent'
