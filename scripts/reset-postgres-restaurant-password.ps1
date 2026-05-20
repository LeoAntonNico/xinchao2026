# Run this PowerShell script as Administrator.
# It resets the local PostgreSQL "restaurant" user password to "restaurant"
# without deleting databases or product data.

$ErrorActionPreference = "Stop"

$serviceName = "postgresql-x64-18"
$dataDir = "C:\Program Files\PostgreSQL\18\data"
$pgHba = Join-Path $dataDir "pg_hba.conf"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$createdb = "C:\Program Files\PostgreSQL\18\bin\createdb.exe"
$backup = "$pgHba.codex-backup-$(Get-Date -Format 'yyyyMMddHHmmss')"

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Please run this script from an Administrator PowerShell window."
}

if (-not (Test-Path -LiteralPath $pgHba)) {
  throw "Could not find $pgHba"
}

if (-not (Test-Path -LiteralPath $psql)) {
  throw "Could not find $psql"
}

if (-not (Test-Path -LiteralPath $createdb)) {
  throw "Could not find $createdb"
}

Copy-Item -LiteralPath $pgHba -Destination $backup -Force

try {
  $content = Get-Content -LiteralPath $pgHba
  $content = $content | ForEach-Object {
    if ($_ -match '^\s*host\s+all\s+all\s+127\.0\.0\.1/32\s+\S+') {
      'host    all             all             127.0.0.1/32            trust'
    } elseif ($_ -match '^\s*host\s+all\s+all\s+::1/128\s+\S+') {
      'host    all             all             ::1/128                 trust'
    } else {
      $_
    }
  }
  Set-Content -LiteralPath $pgHba -Value $content -Encoding ascii

  Restart-Service -Name $serviceName -Force
  Start-Sleep -Seconds 3

  & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -c @"
DO `$`$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'restaurant') THEN
    ALTER ROLE restaurant WITH LOGIN PASSWORD 'restaurant';
  ELSE
    CREATE ROLE restaurant WITH LOGIN PASSWORD 'restaurant';
  END IF;
END
`$`$;
"@

  $dbExists = & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -tAc "SELECT 1 FROM pg_database WHERE datname = 'restaurant';"
  if (-not $dbExists) {
    & $createdb -h 127.0.0.1 -p 5432 -U postgres -w -O restaurant restaurant
  }

  & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -c "ALTER DATABASE restaurant OWNER TO restaurant;"
  & $psql -h 127.0.0.1 -p 5432 -U postgres -d restaurant -w -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON SCHEMA public TO restaurant; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO restaurant; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO restaurant;"

  Write-Host "PostgreSQL password reset complete. User: restaurant  Password: restaurant"
} finally {
  Copy-Item -LiteralPath $backup -Destination $pgHba -Force
  Restart-Service -Name $serviceName -Force
  Write-Host "Restored original pg_hba.conf from $backup"
}
