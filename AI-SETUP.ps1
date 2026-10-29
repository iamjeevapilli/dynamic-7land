param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('ollama', 'ollama-vision', 'freellmapi', 'omniroute')]
    [string]$Tool
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Refresh-ProcessPath {
    $env:Path = $env:Path + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Find-Application([string]$Name, [string[]]$Candidates = @()) {
    $found = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.Source }
    foreach ($candidate in $Candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return $null
}

function Install-WingetPackage([string]$Id, [string]$DownloadPage) {
    $winget = Find-Application 'winget.exe'
    if (-not $winget) {
        Start-Process $DownloadPage
        throw 'Windows App Installer (winget) is unavailable. The official download page was opened. Install the app there, then run this setup again.'
    }
    & $winget install --id $Id --exact --source winget --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "The Windows package installer did not complete ($Id). Complete any installer prompt or use $DownloadPage and try again." }
    Refresh-ProcessPath
}

function Set-UpOllama([string]$Model) {
    Write-Host 'This installs Ollama if missing and downloads a local AI model.'
    Write-Host 'No API key or AI API subscription is needed. Internet, disk space and RAM are required.'
    $ollamaPaths = @((Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'), (Join-Path $env:ProgramFiles 'Ollama\ollama.exe'))
    $ollama = Find-Application 'ollama.exe' $ollamaPaths
    if (-not $ollama) {
        Install-WingetPackage 'Ollama.Ollama' 'https://ollama.com/download/windows'
        $ollama = Find-Application 'ollama.exe' $ollamaPaths
    }
    if (-not $ollama) { throw 'Ollama could not be found after installation. Open the installed Ollama app, then run this setup again.' }
    # This process and its model download always address the loopback server.
    $env:OLLAMA_HOST = '127.0.0.1:11434'
    $serverReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try {
            $null = Invoke-WebRequest 'http://127.0.0.1:11434/api/version' -UseBasicParsing -TimeoutSec 2
            $serverReady = $true
            break
        } catch {
            if ($attempt -eq 0) { Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden }
            Start-Sleep -Seconds 1
        }
    }
    if (-not $serverReady) { throw 'The local Ollama server did not start. Open Ollama from the Windows Start menu, then try again.' }
    Write-Host "Downloading $Model. Wait for the success message; this can take several minutes."
    & $ollama pull $Model
    if ($LASTEXITCODE -ne 0) { throw 'The model download did not finish. Check free disk space and your internet connection, then run this setup again.' }
    Write-Host ''
    Write-Host "Ready: $Model is downloaded."
    Write-Host "In Dynamic 7land: Settings > AI connections > Use local AI > Load models > select $Model > Save connection > Test connection."
}

function Set-UpFreeLLMAPI {
    # Official upstream release, pinned and checked before opening its installer.
    $version = '0.16.11'
    $url = 'https://github.com/tashfeenahmed/freellmapi/releases/download/v0.16.11/FreeLLMAPI-Setup-0.16.11.exe'
    $expectedHash = '734e83431caa918f23e8c9b90fd91beac97357c5fa47386f9db0bdff23462077'
    $downloadDirectory = Join-Path $env:LOCALAPPDATA 'Dynamic7land\downloads'
    $null = New-Item -ItemType Directory -Path $downloadDirectory -Force
    $installer = Join-Path $downloadDirectory "FreeLLMAPI-Setup-$version.exe"
    if (-not (Test-Path -LiteralPath $installer) -or (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
        Write-Host "Downloading official FreeLLMAPI $version Windows installer (about 109 MB)."
        $partial = $installer + '.download'
        try {
            Invoke-WebRequest -Uri $url -OutFile $partial -UseBasicParsing -TimeoutSec 600
            if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Checksum did not match the pinned upstream release. Nothing was installed.' }
            Move-Item -LiteralPath $partial -Destination $installer -Force
        } finally {
            if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
        }
    }
    Write-Host 'Checksum verified. Finish the FreeLLMAPI installer, then open its app.'
    $installation = Start-Process -FilePath $installer -Wait -PassThru
    if ($installation.ExitCode -ne 0) { throw 'The FreeLLMAPI installer did not finish. Complete installation before testing the connection.' }
    Write-Host ''
    Write-Host 'FreeLLMAPI needs usable provider connections in its own dashboard. Enable only eligible free connections for a free setup.'
    Write-Host 'Copy its unified key from the tray Copy Key button. Paste it only in Dynamic 7land > AI connections > FreeLLMAPI.'
    Write-Host 'Match the port shown in its tray (normally 31415). Keep model auto, save and test. Keep FreeLLMAPI running.'
}

function Supported-Node([string]$Executable) {
    if (-not $Executable) { return $false }
    $value = & $Executable -p 'process.versions.node'
    if ($LASTEXITCODE -ne 0) { return $false }
    $nodeVersion = [version]$value
    return ($nodeVersion.Major -eq 22 -and $nodeVersion -ge [version]'22.22.2') -or ($nodeVersion.Major -ge 24 -and $nodeVersion.Major -lt 27)
}

function Set-UpOmniRoute {
    Write-Host 'This installs a supported Node.js runtime if needed and OmniRoute 3.8.53 from npm.'
    Write-Host 'The router needs your own eligible provider connections. It does not grant unlimited free access.'
    $node = Find-Application 'node.exe' @((Join-Path $env:ProgramFiles 'nodejs\node.exe'))
    if (-not (Supported-Node $node)) {
        Install-WingetPackage 'OpenJS.NodeJS.LTS' 'https://nodejs.org/en/download'
        $node = Find-Application 'node.exe' @((Join-Path $env:ProgramFiles 'nodejs\node.exe'))
    }
    if (-not (Supported-Node $node)) { throw 'OmniRoute requires Node.js 22.22.2, or Node.js 24-26. Install a supported Node.js version, reopen setup, then try again.' }
    $npm = Find-Application 'npm.cmd' @((Join-Path (Split-Path $node) 'npm.cmd'))
    if (-not $npm) { throw 'npm could not be found. Repair the Node.js installation, then run setup again.' }
    $router = Find-Application 'omniroute.cmd' @((Join-Path $env:APPDATA 'npm\omniroute.cmd'))
    $installedVersion = if ($router) { & $router --version } else { '' }
    if ($installedVersion -ne '3.8.53') {
        # Upstream requires its postinstall step to prepare the native runtime.
        & $npm install --global 'omniroute@3.8.53'
        if ($LASTEXITCODE -ne 0) { throw 'OmniRoute installation did not complete. Read the npm message above; no connection was configured.' }
    }
    Refresh-ProcessPath
    $router = Find-Application 'omniroute.cmd' @((Join-Path $env:APPDATA 'npm\omniroute.cmd'))
    if (-not $router) { throw 'OmniRoute was installed but its launcher was not found. Reopen PowerShell and run omniroute.' }
    Write-Host ''
    Write-Host 'Starting OmniRoute. Keep this window open while using the router.'
    Write-Host 'Connect only eligible free providers and configure free-only routing in its dashboard.'
    Write-Host 'Copy an Endpoints key into Dynamic 7land > AI connections > OmniRoute. Port is normally 20128.'
    $env:OMNIROUTE_SERVER_HOST = '127.0.0.1'
    $env:OMNIROUTE_LANG = 'en'
    & $router serve
    if ($LASTEXITCODE -ne 0) { throw 'OmniRoute stopped with an error. Read its message above.' }
}

try {
    Write-Host 'Dynamic 7land - AI setup'
    Write-Host 'Windows may ask you to approve an installer. No account keys or passwords are collected by this script.'
    Write-Host ''
    switch ($Tool) {
        'ollama' { Set-UpOllama 'llama3.2:1b' }
        'ollama-vision' { Set-UpOllama 'gemma3:4b' }
        'freellmapi' { Set-UpFreeLLMAPI }
        'omniroute' { Set-UpOmniRoute }
    }
} catch {
    Write-Host ''
    Write-Host ('Setup stopped: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
