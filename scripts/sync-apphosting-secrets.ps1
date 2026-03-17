param(
  [string]$ProjectId = "camikey-cb1a8",
  [string]$Backend = "camikeycom",
  [string]$Location = "us-east4",
  [string]$EnvFile = ".env.local"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

$requiredSecrets = @(
  "SOLANA_RPC_URL",
  "PLATFORM_TREASURY",
  "PAYMENT_ENCRYPTION_KEY",
  "CRON_SECRET"
)

$envMap = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^(?<k>[A-Z0-9_]+)=(?<v>.*)$') {
    $envMap[$matches.k] = $matches.v
  }
}

foreach ($name in $requiredSecrets) {
  if (-not $envMap.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($envMap[$name])) {
    throw "Missing required secret in ${EnvFile}: $name"
  }
}

$tmpDir = Join-Path $env:TEMP ("camikey-secrets-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmpDir | Out-Null

try {
  foreach ($name in $requiredSecrets) {
    $path = Join-Path $tmpDir ($name + ".txt")
    Set-Content -Path $path -Value $envMap[$name] -NoNewline

    Write-Host "Ensuring secret $name exists in project $ProjectId..."
    & gcloud secrets describe $name --project $ProjectId | Out-Null
    if ($LASTEXITCODE -ne 0) {
      & gcloud secrets create $name --project $ProjectId --replication-policy="automatic"
      if ($LASTEXITCODE -ne 0) {
        throw "Failed creating secret $name"
      }
    }

    Write-Host "Adding a new version for secret $name..."
    & gcloud secrets versions add $name --project $ProjectId --data-file=$path
    if ($LASTEXITCODE -ne 0) {
      throw "Failed adding version for secret $name"
    }
  }

  $serviceAccount = "firebase-app-hosting-compute@$ProjectId.iam.gserviceaccount.com"
  foreach ($name in $requiredSecrets) {
    Write-Host "Granting Secret Manager access for $name to $serviceAccount..."
    & gcloud secrets add-iam-policy-binding $name `
      --project $ProjectId `
      --member="serviceAccount:$serviceAccount" `
      --role="roles/secretmanager.secretAccessor" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Failed granting secret access for $name"
    }
  }

  Write-Host "App Hosting secrets synced successfully."
} finally {
  if (Test-Path $tmpDir) {
    Remove-Item -Recurse -Force $tmpDir
  }
}
