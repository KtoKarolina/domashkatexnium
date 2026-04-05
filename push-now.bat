@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo === Push to GitHub ===
echo.
echo [1/5] Git add...
git add .

echo [2/5] Git commit...
git commit -m "Initial commit: KARO.AI landing"

echo [3/5] Remote...
git remote remove origin 2>nul
git remote add origin https://github.com/KtoKarolina/myproject.git

echo [4/5] Branch main...
git branch -M main

echo [5/5] Push to GitHub...
git push -u origin main
if errorlevel 1 (
    echo.
    echo Конфликт с существующим README на GitHub. Перезаписываю...
    git push -u origin main --force
)

echo.
echo === Готово ===
pause
