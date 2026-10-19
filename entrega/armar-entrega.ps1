# Arma la entrega en entrega\dist: juego-mapa.zip (solo lo que usa el juego) + instalar-juego.bat
$raiz = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $PSScriptRoot 'dist'
$tmp = Join-Path $dist 'juego-mapa'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $tmp 'assets') | Out-Null
Copy-Item (Join-Path $raiz 'index.html') $tmp
Copy-Item (Join-Path $raiz 'css') $tmp -Recurse
Copy-Item (Join-Path $raiz 'js') $tmp -Recurse
Copy-Item (Join-Path $raiz 'assets\juego') (Join-Path $tmp 'assets') -Recurse
Copy-Item (Join-Path $PSScriptRoot 'iniciar-juego.bat') $tmp
Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath (Join-Path $dist 'juego-mapa.zip')
Remove-Item $tmp -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot 'instalar-juego.bat') $dist
Get-ChildItem $dist | Select-Object Name, Length
