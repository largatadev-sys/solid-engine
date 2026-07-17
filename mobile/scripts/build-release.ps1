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
#
# -ApiBaseUrl is the backend this APK will talk to, baked into the bundle at build time (S0.5). It
# defaults to the deployed dev backend because that is what a release APK is for: a real phone
# cannot reach `10.0.2.2` (the emulator's alias for the host loopback, which mobile/.env carries for
# local development). A release build that silently inherited that alias is exactly what deferred
# the S0.4 sideload AC, so the value is echoed in the summary below — every build states what it
# points at.
#
# REVISIT WHEN THE PROD RUNG EXISTS (backlog: preprod + prod environments): a dev default is correct
# while dev is the only deployed backend, and becomes a landmine the day a release build is meant
# for real users. At that point this should take the environment, not a URL, or refuse to default.

param(
    [string]$KeystorePath = "$env:USERPROFILE\keys\largata-release.keystore",
    [string]$Alias = 'largata',
    [string]$ApiBaseUrl = 'https://api-dev.largata.com'
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

# Baked into the JS bundle by Expo's EXPO_PUBLIC_* inlining. Setting it here beats mobile/.env
# without touching that file: Expo's dotenv load never overrides a variable already present in the
# process environment. That file stays what it is — local-development config — instead of something
# to remember to flip before a release and flip back after.
$env:EXPO_PUBLIC_API_BASE_URL = $ApiBaseUrl

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
    # Loud, next to the cert, because both are facts you cannot read off the APK later without
    # tooling — and a release build pointed at the wrong backend looks identical to a right one
    # until it fails on someone else's phone.
    Write-Host "API BASE URL (baked in): $ApiBaseUrl" -ForegroundColor Green
    Write-Host "Install on a connected device/emulator with:" -ForegroundColor Yellow
    Write-Host "  adb install -r `"$($apk.FullName)`""
}
finally {
    # Scrub the password from the environment as soon as the build is done.
    Remove-Item Env:LARGATA_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue

    # And the API URL, for a different reason: this script is run interactively, so the variable
    # would otherwise outlive it in that terminal — where the very precedence this script relies on
    # (a process var beats mobile/.env) turns against you. The next `npm run android` in the same
    # window would silently bake the deployed backend into a local emulator build, with no error
    # naming the cause. Leaving it set would recreate the invisible-state trap the param exists to
    # remove. The keystore path/alias leak too, but are inert; this one changes behaviour.
    Remove-Item Env:EXPO_PUBLIC_API_BASE_URL -ErrorAction SilentlyContinue
}
