@echo off
chcp 65001 >nul
cd /d "%~dp0"

set GITHUB_USER=YOUR_USERNAME
if "%GITHUB_USER%"=="YOUR_USERNAME" (
    echo.
    echo ========================================
    echo Откройте этот файл в блокноте и замените
    echo YOUR_USERNAME на ваш логин GitHub
    echo ========================================
    pause
    exit /b 1
)

if not exist .git (
    echo Инициализация git...
    git init
)

git add .
git commit -m "Initial commit: KARO.AI landing"

echo.
git remote remove origin 2>nul
echo Добавление удалённого репозитория...
git remote add origin https://github.com/%GITHUB_USER%/myproject.git

echo.
echo ВАЖНО: Сначала создайте пустой репозиторий "myproject" на GitHub!
echo https://github.com/new ^| название: myproject
echo.
pause

echo Отправка на GitHub...
git branch -M main
git push -u origin main

echo.
echo Готово!
pause
