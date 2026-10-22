@echo off
setlocal
rem Instala el juego: descomprime juego-mapa.zip en C:\juego-mapa, crea el acceso directo y lo abre.
set "DESTINO=C:\juego-mapa"
set "ZIP="
rem Toma el juego-mapa*.zip mas nuevo de la carpeta (por si el navegador lo guardo como "juego-mapa (1).zip")
for /f "delims=" %%f in ('powershell -NoProfile -Command "(Get-ChildItem -LiteralPath '%~dp0.' -Filter 'juego-mapa*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName"') do set "ZIP=%%f"

if not defined ZIP (
  echo No se encontro juego-mapa.zip. Tiene que estar en la misma carpeta que este archivo.
  pause
  exit /b 1
)

echo Instalando el juego en %DESTINO% ...
if exist "%DESTINO%" rmdir /s /q "%DESTINO%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%DESTINO%' -Force"
if not exist "%DESTINO%\index.html" (
  echo No se pudo descomprimir el juego.
  pause
  exit /b 1
)

echo Creando el acceso directo en el escritorio ...
rem Apunta a cmd.exe (no al .bat) para que Windows deje anclarlo a la barra de tareas
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = [Environment]::GetFolderPath('Desktop'); Remove-Item -LiteralPath ($d + '\Juego de mapa.lnk') -ErrorAction SilentlyContinue; $s = (New-Object -ComObject WScript.Shell).CreateShortcut($d + '\Juego Todo esto es NQN.lnk'); $s.TargetPath = $env:ComSpec; $s.Arguments = '/c %DESTINO%\iniciar-juego.bat'; $s.WorkingDirectory = '%DESTINO%'; $s.WindowStyle = 7; $s.IconLocation = ${env:ProgramFiles(x86)} + '\Microsoft\Edge\Application\msedge.exe,0'; $s.Save()"

echo Listo. Abriendo el juego ...
call "%DESTINO%\iniciar-juego.bat"
