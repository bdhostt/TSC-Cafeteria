# Cafe Banani POS - Thermal Printer Agent Auto-Start Setup
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = (Get-Item $scriptDir).Parent.FullName
$vbsPath = Join-Path $rootDir "run-printer-silent.vbs"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "      CAFE BANANI POS - THERMAL PRINTER AUTO-START INSTALLER" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $vbsPath)) {
    Write-Host "[ERROR] $vbsPath not found!" -ForegroundColor Red
    exit 1
}

# 1. Add to Windows Startup folder
Write-Host "[1/3] Setting up Windows Auto-Start on PC Boot..." -ForegroundColor Yellow
$wsh = New-Object -ComObject WScript.Shell
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$startupShortcut = Join-Path $startupFolder "CafeBananiPrinterAgent.lnk"

$s1 = $wsh.CreateShortcut($startupShortcut)
$s1.TargetPath = "wscript.exe"
$s1.Arguments = "`"$vbsPath`""
$s1.WorkingDirectory = $rootDir
$s1.IconLocation = "$env:SystemRoot\System32\imageres.dll,46"
$s1.Description = "Cafe Banani Background Thermal Printer Agent"
$s1.Save()
Write-Host "      [OK] Added to Windows Startup folder." -ForegroundColor Green

# 2. Add to Desktop Shortcut
Write-Host "`n[2/3] Creating Desktop Shortcut for Easy Manual Start..." -ForegroundColor Yellow
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktopFolder "Cafe Banani Printer.lnk"

$s2 = $wsh.CreateShortcut($desktopShortcut)
$s2.TargetPath = "wscript.exe"
$s2.Arguments = "`"$vbsPath`""
$s2.WorkingDirectory = $rootDir
$s2.IconLocation = "$env:SystemRoot\System32\imageres.dll,46"
$s2.Description = "Start Cafe Banani Printer Service"
$s2.Save()
Write-Host "      [OK] Desktop shortcut created: 'Cafe Banani Printer'" -ForegroundColor Green

# 3. Launch the agent right away
Write-Host "`n[3/3] Starting Printer Agent in Background now..." -ForegroundColor Yellow
Start-Process "wscript.exe" -ArgumentList "`"$vbsPath`"" -WorkingDirectory $rootDir
Write-Host "      [OK] Agent is now running in the background!" -ForegroundColor Green

Write-Host "`n====================================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! INSTALLATION COMPLETE." -ForegroundColor Green
Write-Host "  1. The printer service will start automatically whenever Windows boots."
Write-Host "  2. No black terminal windows will be shown to the cashier/manager."
Write-Host "  3. If ever needed, cashier can simply click 'Cafe Banani Printer' on Desktop."
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
