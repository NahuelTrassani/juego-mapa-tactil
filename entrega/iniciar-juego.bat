@echo off
rem Abre el juego en Edge a pantalla completa (modo kiosco). Para salir: Alt+F4.
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" (
  echo No se encontro Microsoft Edge en esta PC.
  pause
  exit /b 1
)
start "" "%EDGE%" --kiosk "file:///%~dp0index.html" --edge-kiosk-type=fullscreen --no-first-run --user-data-dir="%LOCALAPPDATA%\juego-mapa-edge"
