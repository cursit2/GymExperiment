param(
  [int]$Port = 8080,
  [string]$FirewallRuleName = "GymExperiment HTTP Server"
)

$ErrorActionPreference = "Stop"

function Ensure-FirewallRule {
  param(
    [string]$RuleName,
    [int]$RulePort
  )

  $existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue
  if ($null -eq $existing) {
    New-NetFirewallRule `
      -DisplayName $RuleName `
      -Direction Inbound `
      -Action Allow `
      -Profile Private `
      -Protocol TCP `
      -LocalPort $RulePort | Out-Null
    Write-Host "Created firewall rule: $RuleName (TCP $RulePort, Private profile)"
  } else {
    Write-Host "Firewall rule already exists: $RuleName"
  }
}

function Get-LanUrls {
  param([int]$RulePort)

  $ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike "169.254.*" -and
      $_.IPAddress -ne "127.0.0.1" -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -ExpandProperty IPAddress -Unique

  if (-not $ips) {
    return @("http://localhost:$RulePort")
  }

  return $ips | ForEach-Object { "http://$_:$RulePort" }
}

function Start-HttpServer {
  param([int]$RulePort)

  $python = Get-Command py -ErrorAction SilentlyContinue
  if ($python) {
    Write-Host "Starting Python server on port $RulePort..."
    py -m http.server $RulePort --bind 0.0.0.0
    return
  }

  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if ($npx) {
    Write-Host "Starting Node serve on port $RulePort..."
    npx serve -l $RulePort .
    return
  }

  throw "Neither 'py' nor 'npx' was found. Install Python or Node.js first."
}

Write-Host "Ensuring firewall rule for LAN access..."
Ensure-FirewallRule -RuleName $FirewallRuleName -RulePort $Port

Write-Host ""
Write-Host "Open from other devices on this network using one of these URLs:"
Get-LanUrls -RulePort $Port | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "Press Ctrl+C to stop the server."
Write-Host ""

Start-HttpServer -RulePort $Port
