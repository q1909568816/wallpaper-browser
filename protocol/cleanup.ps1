$ErrorActionPreference = 'SilentlyContinue'
try {
    $steamPath = (Get-ItemProperty 'HKCU:\Software\Valve\Steam').SteamPath
    $steamPath = [System.IO.Path]::GetFullPath($steamPath)
    $libraryVdf = Join-Path $steamPath 'config\libraryfolders.vdf'
    $libraryPaths = @($steamPath)
    if (Test-Path $libraryVdf) {
        Get-Content $libraryVdf -Encoding UTF8 | ForEach-Object {
            if ($_ -match '"path"\s+"([^"]+)"') {
                $libraryPaths += $matches[1].Replace('\\', '\')
            }
        }
    }
    $libraryPaths = $libraryPaths | Select-Object -Unique
    foreach ($lib in $libraryPaths) {
        $f1 = Join-Path $lib 'steamapps\.wpb-protocol'
        if (Test-Path $f1) { Remove-Item $f1 -Force }
        $f2 = Join-Path $lib 'steamapps\workshop\content\431960\.wpb-protocol'
        if (Test-Path $f2) { Remove-Item $f2 -Force }
    }
} catch { }
