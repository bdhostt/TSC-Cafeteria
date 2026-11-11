# Build TSC-Printer-Setup.zip
$ErrorActionPreference = "Stop"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$pkgDir = Join-Path $rootDir "pkg-build-tmp"
$downloadsDir = Join-Path $rootDir "public\downloads"

if (Test-Path $pkgDir) { Remove-Item $pkgDir -Recurse -Force }
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $pkgDir "scripts") -Force | Out-Null

Copy-Item (Join-Path $rootDir "print-agent.cjs") $pkgDir -Force
Copy-Item (Join-Path $rootDir "run-printer-silent.vbs") $pkgDir -Force
Copy-Item (Join-Path $rootDir "start-printer-agent.bat") $pkgDir -Force
Copy-Item (Join-Path $rootDir "stop-printer-agent.bat") $pkgDir -Force
if (Test-Path (Join-Path $rootDir ".env")) {
    Copy-Item (Join-Path $rootDir ".env") $pkgDir -Force
}

$installerBat = Join-Path $rootDir "scripts\INSTALL-TSC-PRINTER.bat"
if (Test-Path $installerBat) {
    Copy-Item $installerBat (Join-Path $pkgDir "INSTALL-TSC-PRINTER.bat") -Force
}
Copy-Item (Join-Path $rootDir "scripts\README-INSTRUCTIONS.txt") $pkgDir -Force

$printerScripts = @(
    "print-raw.ps1",
    "raw-print.exe",
    "raw-print.cs",
    "setup-autostart.ps1",
    "stop-agent.ps1",
    "remove-autostart.ps1"
)

foreach ($sc in $printerScripts) {
    $srcPath = Join-Path $rootDir "scripts\$sc"
    if (Test-Path $srcPath) {
        Copy-Item $srcPath (Join-Path $pkgDir "scripts\$sc") -Force
    }
}

if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir -Force | Out-Null
}

$zipPath = Join-Path $downloadsDir "TSC-Printer-Setup.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path "$pkgDir\*" -DestinationPath $zipPath -Force
Copy-Item $zipPath (Join-Path $downloadsDir "TSCPrinter-Setup.zip") -Force

# Also sync to dist/downloads if dist exists
$distDownloads = Join-Path $rootDir "dist\downloads"
if (Test-Path (Join-Path $rootDir "dist")) {
    if (-not (Test-Path $distDownloads)) {
        New-Item -ItemType Directory -Path $distDownloads -Force | Out-Null
    }
    Copy-Item $zipPath (Join-Path $distDownloads "TSC-Printer-Setup.zip") -Force
    Copy-Item $zipPath (Join-Path $distDownloads "TSCPrinter-Setup.zip") -Force
}

Remove-Item $pkgDir -Recurse -Force

# Clean any old posdemo zips from public/downloads
$oldPosdemoZip = Join-Path $downloadsDir "POSDEMO-Printer-Setup.zip"
if (Test-Path $oldPosdemoZip) { Remove-Item $oldPosdemoZip -Force }

Write-Host "Created Zip at: $zipPath"
Get-Item $zipPath | Select-Object Name, Length
