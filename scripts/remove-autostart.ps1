# Cafe Banani POS - Remove Auto-Start
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "        REMOVING CAFE BANANI PRINTER AUTO-START SHORTCUTS" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$startupShortcut = Join-Path $startupFolder "CafeBananiPrinterAgent.lnk"
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = Join-Path $desktopFolder "Cafe Banani Printer.lnk"

if (Test-Path $startupShortcut) {
    Remove-Item -Force $startupShortcut
    Write-Host "[OK] Removed from Windows Startup." -ForegroundColor Green
}

if (Test-Path $desktopShortcut) {
    Remove-Item -Force $desktopShortcut
    Write-Host "[OK] Removed Desktop Shortcut." -ForegroundColor Green
}

Write-Host "`nAuto-start has been removed." -ForegroundColor Green
Write-Host ""
