@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting server at http://localhost:3000
echo Open this address in your browser
echo.
python -m http.server 3000
pause
