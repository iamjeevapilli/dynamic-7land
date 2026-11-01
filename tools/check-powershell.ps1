$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
foreach ($name in @('PUBLISH-TO-GITHUB.ps1', 'buddy-helper.ps1', 'buddy-look.ps1', 'volume-watch.ps1', 'windows-ai-access.ps1')) {
    $tokens = $null
    $parseErrors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $root $name), [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -gt 0) {
        $parseErrors | ForEach-Object { Write-Error $_.Message }
        throw "$name contains PowerShell syntax errors."
    }
}
Write-Host 'Windows helper script syntax verified. Scripts were not executed.'
