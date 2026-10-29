$ErrorActionPreference = 'Stop'
$setupPath = Join-Path (Split-Path $PSScriptRoot) 'AI-SETUP.ps1'
$tokens = $null
$parseErrors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($setupPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) {
    $parseErrors | ForEach-Object { Write-Error $_.Message }
    throw 'AI-SETUP.ps1 contains PowerShell syntax errors.'
}
Write-Host 'Windows AI setup script syntax verified. Installers were not executed.'
