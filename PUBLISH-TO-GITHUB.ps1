param([ValidatePattern('^[A-Za-z0-9_.-]+$')][string]$RepositoryName = 'dynamic-7land')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
function Check-Exit([string]$Message) { if ($LASTEXITCODE -ne 0) { throw $Message } }
try {
    foreach ($program in @('git', 'gh')) {
        if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
            throw "Install $program first. See README.md, Publish your public repository. Then reopen PowerShell."
        }
    }
    & gh auth status --hostname github.com 2>$null
    if ($LASTEXITCODE -ne 0) {
        & gh auth login --hostname github.com --git-protocol https --web --scopes 'repo,workflow'
        Check-Exit 'GitHub sign-in was not completed. No repository was created.'
    }
    $account = (& gh api user | ConvertFrom-Json)
    Check-Exit 'Could not verify the signed-in GitHub account.'
    if ($account.login -ne 'iamjeevapilli') { throw "Signed in as $($account.login). Sign in as iamjeevapilli before publishing this edition." }
    $repository = "$($account.login)/$RepositoryName"
    & gh repo view $repository --json nameWithOwner 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { throw "$repository already exists. This script will not overwrite it. Use -RepositoryName with a new name, or push from an existing trusted checkout yourself." }
    if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '.git')) { throw 'This source folder already contains Git history. Use a fresh extracted source ZIP, or publish the existing checkout with Git.' }
    & git init -b main
    Check-Exit 'Git initialisation failed.'
    & git config user.name 'Jeeva Pilli'
    & git config user.email "$($account.id)+$($account.login)@users.noreply.github.com"
    & git add --all
    Check-Exit 'Could not stage the source.'
    & git commit -m 'Release Dynamic 7land 1.1 with English UI and Claude / Arena connections'
    Check-Exit 'Could not commit the source.'
    & gh auth setup-git
    Check-Exit 'Could not set up GitHub Git authentication.'
    & gh repo create $repository --public --source . --remote origin --push --description 'Windows desktop island with Claude, Codex and Arena connections. English TwoCode-based fork.'
    Check-Exit 'Repository publishing failed. The source remains in this folder.'
    & gh repo edit $repository --add-topic electron --add-topic windows --add-topic claude --add-topic arena-ai --add-topic desktop-assistant
    $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
    & git tag "v$version"
    Check-Exit 'Could not create the release tag.'
    & git push origin "v$version"
    Check-Exit 'The repository was created, but the release tag did not push. Run git push origin --tags after resolving GitHub authentication.'
    Write-Host "Published https://github.com/$repository" -ForegroundColor Green
    Write-Host 'GitHub Actions will build the Windows x64 release. Check its Actions tab for the result.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
