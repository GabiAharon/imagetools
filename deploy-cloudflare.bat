@echo off
echo ==================================================
echo          פריסה לקלאודפלייר Pages
echo ==================================================
echo.

echo שלב 1: בניית הפרויקט...
call npm run build:cloudflare
if %errorlevel% neq 0 (
    echo שגיאה בבניית הפרויקט!
    pause
    exit /b 1
)
echo בניה הושלמה בהצלחה!
echo.

echo שלב 2: בדיקת התקנת Wrangler...
wrangler --version >nul 2>&1
if %errorlevel% neq 0 (
    echo מתקין Wrangler CLI...
    npm install -g wrangler
    if %errorlevel% neq 0 (
        echo שגיאה בהתקנת Wrangler!
        pause
        exit /b 1
    )
)
echo Wrangler מותקן!
echo.

echo שלב 3: התחברות לקלאודפלייר...
echo אם זו הפעם הראשונה, תתבקש להתחבר לחשבון שלך
wrangler auth whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo מתחבר לקלאודפלייר...
    wrangler login
    if %errorlevel% neq 0 (
        echo שגיאה בהתחברות!
        pause
        exit /b 1
    )
)
echo מחובר לקלאודפלייר!
echo.

echo שלב 4: פריסת הפרויקט...
wrangler pages publish dist --project-name=image-toolbox-platform
if %errorlevel% neq 0 (
    echo שגיאה בפריסה!
    pause
    exit /b 1
)

echo.
echo ==================================================
echo        הפריסה הושלמה בהצלחה!
echo ==================================================
echo הפרויקט זמין בכתובת:
echo https://image-toolbox-platform.pages.dev
echo.
pause 