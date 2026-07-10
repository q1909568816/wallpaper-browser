try {
    $steamPath = (Get-ItemProperty "HKCU:\Software\Valve\Steam").SteamPath
} catch { exit }
$libraryVdf = Join-Path $steamPath "config\libraryfolders.vdf"
$libraryPaths = @($steamPath)
if (Test-Path $libraryVdf) {
    Get-Content $libraryVdf -Encoding UTF8 | ForEach-Object {
        if ($_ -match '"path"\s+"(.+)"') {
            $libraryPaths += $matches[1].Replace("\\", "\")
        }
    }
}
$libraryPaths = $libraryPaths | Select-Object -Unique
foreach ($lib in $libraryPaths) {
    $sa = Join-Path $lib "steamapps"
    if (Test-Path $sa) {
        Set-Content -Path (Join-Path $sa ".wpb-protocol") -Value "installed" -Force -Encoding UTF8
    }
    $content431960 = Join-Path $lib "steamapps\workshop\content\431960"
    if (Test-Path $content431960) {
        Set-Content -Path (Join-Path $content431960 ".wpb-protocol") -Value "installed" -Force -Encoding UTF8
    }
}