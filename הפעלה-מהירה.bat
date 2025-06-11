@echo off
chcp 65001 >nul
title 🚀 פלטפורמת עיצוב תמונות - הפעלה מהירה

echo.
echo ===============================================
echo 🖼️  פלטפורמת עיצוב תמונות - ImageToolbox Platform
echo ===============================================
echo.

echo 📋 בודק תלות וחבילות...
if not exist "node_modules" (
    echo ⚠️  תיקיית node_modules לא נמצאה - מתקין חבילות...
    echo.
    npm install
    if errorlevel 1 (
        echo ❌ שגיאה בהתקנת חבילות
        pause
        exit /b 1
    )
) else (
    echo ✅ חבילות זמינות
)

echo.
echo 🌐 מפעיל שרת פיתוח...
echo 📍 הפרויקט יפתח בכתובת: http://localhost:3001
echo.
echo 💡 טיפים:
echo    • השתמש ב-Ctrl+C כדי לעצור את השרת
echo    • השרת יפתח אוטומטית בדפדפן
echo    • שינויים בקוד יתעדכנו אוטומטית
echo.

timeout /t 2 /nobreak >nul

echo 🚀 מתחיל...
start "" "http://localhost:3001"
npm run dev

echo.
echo �� השרת הופסק
pause 