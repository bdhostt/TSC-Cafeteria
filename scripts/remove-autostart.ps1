# BD HOSTT TSC Cafeteria - Remove Auto-Start
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "        REMOVING BD HOSTT TSC PRINTER AUTO-START SHORTCUTS" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$startupShortcuts = @(
    Join-Path $startupFolder "TSCPrinterAgent.lnk",
    Join-Path $startupFolder "POSDEMOPrinterAgent.lnk",
    Join-Path $startupFolder "POSPrinterAgent.lnk"
)

$desktopFolder = [Environment]::GetFolderPath('Desktop')
$desktopShortcuts = @(
    Join-Path $desktopFolder "TSC Printer Agent.lnk",
    Join-Path $desktopFolder "POS DEMO Printer Agent.lnk",
    Join-Path $desktopFolder "POSDEMO Printer Agent.lnk",
    Join-Path $desktopFolder "POS Printer Agent.lnk"
)

foreach ($sc in $startupShortcuts) {
    if (Test-Path $sc) {
        Remove-Item -Force $sc
        Write-Host "[OK] Removed from Windows Startup: $sc" -ForegroundColor Green
    }
}

foreach ($sc in $desktopShortcuts) {
    if (Test-Path $sc) {
        Remove-Item -Force $sc
        Write-Host "[OK] Removed Desktop Shortcut: $sc" -ForegroundColor Green
    }
}

Write-Host "`nAuto-start has been removed." -ForegroundColor Green
Write-Host ""
