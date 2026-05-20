param(
  [string]$TaskName = "XinChao Print Agent",
  [string]$NodePath = ""
)

$ErrorActionPreference = "Stop"
$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $AgentDir "agent.mjs"
$EnvFile = Join-Path $AgentDir ".env"

if (!(Test-Path $EnvFile)) {
  throw "Missing $EnvFile. Copy .env.example to .env and fill it in first."
}

if (!$NodePath) {
  $NodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (!$NodeCommand) {
    throw "node.exe was not found in PATH. Install Node.js LTS or pass -NodePath C:\Path\To\node.exe"
  }
  $NodePath = $NodeCommand.Source
}

$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$AgentScript`"" -WorkingDirectory $AgentDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host "Installed and started scheduled task: $TaskName"
Write-Host "Logs: $(Join-Path $AgentDir 'logs\print-agent.log')"
