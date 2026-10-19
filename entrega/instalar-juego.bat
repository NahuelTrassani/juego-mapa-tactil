@echo off
setlocal
rem Instala el juego: descomprime juego-mapa.zip en C:\juego-mapa, crea el acceso directo y lo abre.
set "DESTINO=C:\juego-mapa"
set "ZIP=%~dp0juego-mapa.zip"

if not exist "%ZIP%" (
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
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Juego de mapa.lnk'); $s.TargetPath = '%DESTINO%\iniciar-juego.bat'; $s.WorkingDirectory = '%DESTINO%'; $s.WindowStyle = 7; $s.Save()"

echo Listo. Abriendo el juego ...
call "%DESTINO%\iniciar-juego.bat"
