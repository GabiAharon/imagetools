# פריסה לקלאודפלייר Pages

## שיטה 1: פריסה אוטומטית עם GitHub Actions

### 1. הכנת המאגר
```bash
# וודא שהמאגר מעודכן ב-GitHub
git add .
git commit -m "הכנה לפריסה בקלאודפלייר"
git push origin main
```

### 2. הגדרות ב-GitHub
1. עבור להגדרות המאגר ב-GitHub
2. לחץ על `Settings` > `Secrets and variables` > `Actions`
3. הוסף את ה-Secrets הבאים:
   - `CLOUDFLARE_API_TOKEN`: Token API מקלאודפלייר
   - `CLOUDFLARE_ACCOUNT_ID`: מזהה החשבון שלך בקלאודפלייר

### 3. הוצאת Token מקלאודפלייר
1. עבור ל-[Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. לחץ על "Create Token"
3. בחר "Custom token"
4. הגדר את ההרשאות הבאות:
   - Zone: Zone:Read, Account:Read
   - Page: Page:Edit
   - Account: Account:Read

---

## שיטה 2: פריסה ידנית

### 1. בניית הפרויקט
```bash
npm install
npm run build:cloudflare
```

### 2. פריסה דרך Cloudflare Dashboard
1. עבור ל-[Cloudflare Pages](https://dash.cloudflare.com/pages)
2. לחץ על "Create a project"
3. בחר "Upload assets"
4. העלה את התוכן של תיקיית `dist`

---

## שיטה 3: פריסה דרך Wrangler CLI

### 1. התקנת Wrangler
```bash
npm install -g wrangler
```

### 2. התחברות לקלאודפלייר
```bash
wrangler login
```

### 3. פריסה
```bash
npm run build:cloudflare
wrangler pages publish dist --project-name=image-toolbox-platform
```

---

## הגדרות נוספות

### דומיין מותאם אישית
1. ב-Cloudflare Pages Dashboard
2. עבור לפרויקט שלך
3. לחץ על "Custom domains"
4. הוסף את הדומיין שלך

### משתני סביבה
אם הפרויקט זקוק למשתני סביבה:
1. ב-Cloudflare Pages Dashboard
2. עבור לפרויקט שלך
3. לחץ על "Settings" > "Environment variables"
4. הוסף את המשתנים הנדרשים

---

## פתרון בעיות

### בעיות בניה
- וודא שכל התלויות מותקנות: `npm install`
- נסה לבנות מקומית: `npm run build:cloudflare`
- בדוק שאין שגיאות ב-console

### בעיות ניתוב
- הקובץ `_redirects` אמור לפתור בעיות ניתוב ב-SPA
- וודא שהקובץ נמצא בתיקיית `dist` לאחר הבניה

### בעיות CORS
- בדוק את הגדרות CORS בקלאודפלייר
- יתכן שתצטרך להוסיף כללי Page Rules מותאמים 