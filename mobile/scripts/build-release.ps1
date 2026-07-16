# Builds and signs the Android release APK with the real keystore (S0.4).
#
# Run this from anywhere: `mobile\scripts\build-release.ps1`. It prompts for the keystore password
# securely (never echoed, never stored, never in your command history), sets the env vars the
# signing/toolchain config plugins read, runs prebuild + assembleRelease, and prints the signing
# certificate so you can confirm it is YOUR key (CN=Largata), not the debug placeholder.
#
# The keystore itself lives OUTSIDE the repo (default C:\Users\<you>\keys\); override with
# -KeystorePath. Nothing secret is written by this script — it only reads the password into the
# process environment for the child Gradle build, which reads it via System.getenv at eval time.

param(
    [string]$KeystorePath = "$env:USERPROFILE\keys\largata-release.keystore",
    [string]$Alias = 'largata'
)

$ErrorActionPreference = 'Stop'
$mobileRoot = Resolve-Path "$PSScriptRoot\.."

if (-not (Test-Path $KeystorePath)) {
    Write-Error "Keystore not found at $KeystorePath. Pass -KeystorePath if it lives elsewhere."
    exit 1
}

# --- environment the config plugins read -------------------------------------------------
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:LARGATA_KEYSTORE_PATH = $KeystorePath
$env:LARGATA_KEY_ALIAS = $Alias

# withLongPathNinja finds ninja on PATH; set LARGATA_NINJA only if a suitable one is not there.
$ninja = (Get-Command ninja -ErrorAction SilentlyContinue).Source
if (-not $ninja) {
    $wingetNinja = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ninja.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($wingetNinja) { $env:LARGATA_NINJA = $wingetNinja.FullName }
}

# --- password: prompted, secure, never echoed or persisted -------------------------------
$secure = Read-Host "Keystore password" -AsSecureString
$env:LARGATA_KEYSTORE_PASSWORD =
    [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

try {
    Set-Location $mobileRoot

    Write-Host "`n[1/3] Prebuild (regenerates android/ with the signing + ninja config)..." -ForegroundColor Cyan
    npx expo prebuild --platform android
    if ($LASTEXITCODE -ne 0) { throw "prebuild failed" }

    Write-Host "`n[2/3] Assembling the signed release APK..." -ForegroundColor Cyan
    Set-Location "$mobileRoot\android"
    .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) { throw "assembleRelease failed" }

    $apk = Get-ChildItem "$mobileRoot\android\app\build\outputs\apk\release\*.apk" | Select-Object -First 1
    if (-not $apk) { throw "no APK produced" }

    Write-Host "`n[3/3] Verifying the signing certificate..." -ForegroundColor Cyan
    $apksigner = Get-ChildItem "$env:ANDROID_HOME\build-tools" -Recurse -Filter apksigner.bat -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
    if ($apksigner) {
        # Capture to a variable rather than piping with `2>$null`: apksigner (on JDK 25) prints a
        # harmless "restricted method" warning to stderr, and redirecting a native command's stderr
        # in PowerShell wraps each line in a NativeCommandError that aborts the pipeline before the
        # cert line prints. Capturing the combined output and filtering in-process avoids that.
        $certs = & $apksigner.FullName verify --print-certs $apk.FullName
        $certs | Select-String -Pattern "certificate DN|certificate SHA-1 digest" | ForEach-Object { $_.Line.Trim() }
    }

    Write-Host "`nSIGNED APK: $($apk.FullName)" -ForegroundColor Green
    Write-Host "Size: $([math]::Round($apk.Length/1MB,1)) MB"
    Write-Host "Install on a connected device/emulator with:" -ForegroundColor Yellow
    Write-Host "  adb install -r `"$($apk.FullName)`""
}
finally {
    # Scrub the password from the environment as soon as the build is done.
    Remove-Item Env:LARGATA_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
}
