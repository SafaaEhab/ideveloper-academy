# نشر iDeveloper Academy: Vercel + MonsterASP

الواجهة (React/Vite) على Vercel، والباك اند + داتابيز MySQL + النسخ الاحتياطي
على MonsterASP. الاتنين متوصلين ببعض عن طريق `VITE_API_URL` على Vercel و
`WEB_ORIGIN` على Monster، والـ cookies شغالة cross-site.

```text
الواجهة:  https://ideveloper-academy.vercel.app
الـ API:  https://ideveloper-academy.runasp.net
```

## اللي اتغيّر في الكود

- `server/_core/production.ts` — مدخل تشغيل الإنتاج، بيقرأ `PORT` و
  `HTTP_PLATFORM_PORT` (اللي IIS بيديه للـ Node) ومش بيحمّل Vite خالص.
- `server/_core/static.ts` — بيخدم `dist/public` من غير ما يجرّ Vite معاه.
- `pnpm build` بقى يطلع `dist/server.cjs` — ملف واحد فيه كل الباك اند
  (Express + tRPC + mysql2 + ExcelJS)، فمش محتاج ترفع `node_modules`.
- `web.config` — بيشغّل Node عن طريق HttpPlatformHandler على IIS.
- `server/_core/excelBackup.ts` — نسخة Excel تلقائية:
  - بعد كل كتابة ناجحة في `/api/*` (إنشاء/تعديل/حذف طالب، مجموعة، تقييم…).
  - كل 30 دقيقة حتى لو مفيش تعديلات.
  - أول نسخة في كل يوم تتبعت على إيميل المالك لو `GMAIL_USER` و
    `GMAIL_APP_PASSWORD` متظبطين.
  - كل جدول في شيت لوحده + شيت `Backup info` فيه عدد الصفوف.
- `server/_core/backupRoutes.ts` + `BackupManager.tsx` — تبويب **Data backup**
  في لوحة الأدمن لتحميل أحدث نسخة أو عمل نسخة فورية.
- `scripts/copy-database.mjs` — نسخ كل البيانات من Aiven للداتابيز الجديدة.
- `scripts/package-monster.mjs` — تجهيز ZIP للرفع.

> **مهم:** النسخ بتتحفظ في `App_Data/excel-backups`، وده فولدر بره
> `dist/public` فمحدش يقدر يفتحه من المتصفح. Monster بتحافظ على `App_Data`
> بعد النشر، فتاريخ النسخ بيفضل موجود.

---

## 1. إنشاء الداتابيز على MonsterASP

1. افتح <https://admin.monsterasp.net/app/dashboard> وسجّل الدخول بحساب صفاء.
2. من القائمة: **Databases → MySQL → Create database**.
3. بعد الإنشاء افتح الداتابيز → **Overview**:
   - من **Local access** انسخ: Server / Port / Login / Password / Database.
     ده اللي الموقع المنشور هيستخدمه.
   - من **Remote access**: فعّل `Enabled`، وانسخ الـ public host
     (`dbXXXX.public.databaseasp.net`) عشان نقدر ننسخ البيانات من جهازك.

صيغة `DATABASE_URL` في Node:

```text
mysql://USER:PASSWORD@HOST:3306/DATABASE
```

على الموقع نفسه استخدم **Local access**. من جهازك للنسخ الأولي استخدم
**Public host** مع SSL:

```text
mysql://USER:PASSWORD@dbXXXX.public.databaseasp.net:3306/DATABASE?ssl-mode=REQUIRED
```

> لو كلمة السر فيها رموز زي `@` أو `#`، اعمللها URL encoding أو غيّرها لكلمة
> بسيطة من لوحة الداتابيز.

## 2. نسخ البيانات من Aiven

من PowerShell في مجلد المشروع:

```powershell
$env:SOURCE_DATABASE_URL="mysql://avnadmin:...@mysql-....aivencloud.com:19592/defaultdb?ssl-mode=REQUIRED"
$env:TARGET_DATABASE_URL="mysql://dbXXXX:كلمة-السر@dbXXXX.public.databaseasp.net:3306/dbXXXX?ssl-mode=REQUIRED"

node scripts/copy-database.mjs --replace
```

السكريبت:

- بيقرأ كل الجداول من Aiven.
- بيعيد إنشاء نفس الجداول على Monster (بنفس الـ ids والتواريخ و
  `__drizzle_migrations`).
- بينقل كل الصفوف، وبيراجع العدد في الآخر.
- لو الهدف فيه بيانات بالفعل، بيرفض إلا لو حطيت `--replace`.

بعد ما تخلص، غيّر `DATABASE_URL` في متغيرات الموقع على Monster للـ **Local**
connection string (مش الـ public).

## 3. تجهيز متغيرات البيئة على Monster

من **Website → Scripting → Environment variables** أضف:

| المتغير | القيمة |
| --- | --- |
| `DATABASE_URL` | Local access connection string |
| `JWT_SECRET` | نفس القيمة القديمة أو سلسلة عشوائية 32+ حرف |
| `ADMIN_EMAILS` | `safsafehab012345@gmail.com` |
| `OWNER_EMAIL` | `safsafehab012345@gmail.com` |
| `OWNER_OPEN_ID` | اتركه فاضي (إلا لو كنت بتستخدمه) |
| `SITE_URL` | `https://ideveloper-academy.vercel.app` (رابط الواجهة) |
| `WEB_ORIGIN` | `https://ideveloper-academy.vercel.app` (CORS + cookies) |
| `NODE_ENV` | `production` (موجود في web.config، لكن الأفضل تأكيده) |
| `EXCEL_BACKUP_DIR` | `App_Data\excel-backups` |
| `UPLOAD_DIR` | `App_Data\uploads\achievements` (صور الإنجازات لو Cloudinary مش متظبط) |
| `GMAIL_USER` | إيميل Gmail لو عايز النسخة اليومية تتبعت |
| `GMAIL_APP_PASSWORD` | App Password مش باسورد الحساب |
| `CLOUDINARY_CLOUD_NAME` | لو هترفع صور الإنجازات |
| `CLOUDINARY_API_KEY` | اختياري |
| `CLOUDINARY_API_SECRET` | اختياري |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL` | إيميل الـ service account |
| `GOOGLE_SHEETS_PRIVATE_KEY` | private_key من ملف JSON (سطر واحد) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | معرف شيت العملاء |
| `GOOGLE_SHEETS_SHEET_NAME` | `Leads` (اختياري) |
| `LEAD_OVERDUE_HOURS` | `24` (اختياري) |

### ربط Vercel بالباك اند

في مشروع Vercel أضف متغير بيئة (Production + Preview):

```text
VITE_API_URL=https://ideveloper-academy.runasp.net
```

ثم أعد النشر. أي طلب tRPC أو تسجيل دخول أو تحميل نسخة Excel من الواجهة
هيروح لـ Monster، والـ cookies بتتبعت cross-site لأن Monster بيصدرها
`SameSite=None; Secure`.

`vercel.json` بيسمح على Vercel بـ `/api/markdown` و`/api/health` فقط، وأي
`/api/*` تاني بيرجع 404 — عشان مفيش نسختين من الباك اند بيعدلوا داتابيزين
مختلفين.

> لو ظهر خطأ CORS، اتأكد إن `WEB_ORIGIN` على Monster فيه نفس أصل الواجهة
> بالظبط، من غير `/` في الآخر. لو بتختبر Preview deployment، ضيف الـ preview
> origin مؤقتًا لـ `WEB_ORIGIN` (مفصول بفاصلة).

## 4. بناء الحزمة ورفعها

```powershell
pnpm build
pnpm package:monster
```

هيتكوّن:

```text
release/monsterasp/monsterasp-site.zip
release/monsterasp/README.txt
```

داخل الـ ZIP:

```text
web.config
dist/server.cjs
dist/public/...
```

خطوات الرفع:

1. **Website → Files**.
2. **Upload file** واختار `monsterasp-site.zip` (أقصى حجم 2 GB).
3. بعد الرفع اضغط **Unzip**، اختار الـ target folder `/wwwroot`، وفعّل
   **Overwrite existing files** و **Restart application pool**.
4. استنى **ZIP jobs** تخلص.
5. من **Website → Restart application**.
6. الـ API شغال على <https://ideveloper-academy.runasp.net>، والواجهة
   على <https://ideveloper-academy.vercel.app>.

### بديل: FTP/SFTP

لو حابب ترفع من سطر الأوامر، انسخ بيانات FTP من **Website → FTP/SFTP** وارفع
محتويات `release/monsterasp/site` نفسها. نفس النتيجة.

### بديل: Git deploy

لو هتفضل تستخدم GitHub، اختار **Node.js SSR app** وحدد:
- Build command: `npm install && npm run build`
- Start command: `node dist/server.cjs`
- Build output: `dist`

بس الطريقة دي هتحتاج `npm install` على السيرفر، وممكن تفشل بسبب إصدارات
الحزم. الـ ZIP المبنية محليًا أضمن لأن كل حاجة متبنيّة بالفعل.

## 5. اختبار بعد النشر

1. افتح `/` — لازم الصفحة الرئيسية تظهر.
2. افتح `/login` وسجّل دخول الأدمن.
3. اتأكد إن الطلبة والمجموعات والإنجازات موجودين.
4. افتح **Admin → Data backup**:
   - اضغط **Create a copy now**.
   - نزّل `ideveloper-data-latest.xlsx` وافتحه في Excel.
   - لازم تلاقي شيت لكل جدول + `Backup info`.
5. اعمل تعديل صغير (مثلاً تعديل طالب) واستنى 5 ثواني، ثم افتح التبويب تاني
   واتأكد إن فيه نسخة جديدة.

## 6. ربط الدومين بدل Vercel

الموقع الحالي شغال على:

```text
الواجهة:  https://ideveloper-academy.vercel.app
الـ API:  https://ideveloper-academy.runasp.net
```

- **الواجهة على Vercel** ومعاها الدومين العام. أي دومين مخصص للواجهة
  (مثل `ideveloper-academy.com`) بيتظبط من Vercel → Domains.
- **MonsterASP** شغال على subdomain من `runasp.net`؛ الدومين المخصص للـ API
  ميزة Premium. لو رقّيت، اربط الدومين من **Website → Domains** وغيّر
  `WEB_ORIGIN`/`SITE_URL` حسب الحاجة.
- HTTPS شغال على الاتنين: Vercel بشهادته، وMonster بشهادة Let's Encrypt
  مجانية مع تحويل إجباري من `http` لـ `https`.
- **متقفلش مشروع Vercel** لأنه دلوقتي الواجهة نفسها. لو حبيت ترجع كل حاجة
  على Monster، غيّر `VITE_API_URL` لـ `""` وانشر الواجهة من Monster، بس
  ساعتها الدومين المخصص هيتنقل من Vercel لـ Monster.

## 7. النسخة الاحتياطية والاسترجاع

### وين بتتحفظ؟

```text
/wwwroot/App_Data/excel-backups/ideveloper-data-latest.xlsx
/wwwroot/App_Data/excel-backups/ideveloper-data-2026-11-04T17-07-06-583Z.xlsx
```

- `latest` دايمًا آخر نسخة.
- بيتحفظ آخر 120 نسخة (تقدر تغيّرها بـ `EXCEL_BACKUP_KEEP`).
- النسخة اليومية بتتبعت على `ADMIN_EMAILS` / `OWNER_EMAIL` لو Gmail متظبط.
- تقدر تنزّل أي نسخة من **Admin → Data backup**.
- فيه كمان نسخة محلية على جهازك في
  `backups\excel\ideveloper-data-latest.xlsx`. لتحديثها في أي وقت:

  ```powershell
  $env:BACKUP_JWT_SECRET="نفس JWT_SECRET اللي على Monster"
  $env:BACKUP_EMAIL="safsafehab012345@gmail.com"
  node scripts/download-backup.mjs
  ```

  لو Windows عندك لسه مش واثق في شهادة Let's Encrypt الجديدة، أضف
  `$env:BACKUP_INSECURE="1"` للمرة الواحدة فقط.

### استرجاع بعد كارثة

لو الداتابيز ضاعت:

1. اعمل داتابيز جديدة على Monster.
2. شغّل `scripts/copy-database.mjs` من نسخة SQL لو موجودة، أو استخدم
   `scripts/restore-from-excel.mjs` (شغّله من جهازك):
   ```powershell
   $env:DATABASE_URL="mysql://.../db?ssl-mode=REQUIRED"
   node scripts/restore-from-excel.mjs App_Data/excel-backups/ideveloper-data-latest.xlsx --replace
   ```
3. السكريبت بيقرأ كل شيت ويحوله لصفوف في الجدول اللي بنفس الاسم.

> ملف Excel مش بديل عن dump SQL كامل 100%: الأعمدة الطويلة جدًا (أكبر من
> 32,767 حرف) بتتقص. لكن ملفات الواجبات المرفوعة بتتحفظ كملفات فعلية في
> `App_Data/excel-backups/files/` مع `index.json` يربط كل ملف باسمه الأصلي
> ونوعه، فمش بتضيع مع الداتابيز. لو محتاج نسخة SQL كاملة للـ schema، استخدم
> `scripts/copy-database.mjs` أو `pnpm db:push` لإعادة إنشاء الجداول.

## 8. اكتشاف الوكلاء (Agent Discovery)

النتيجة الحالية على `isitagentready.com`: **Level 4 — Agent-Integrated**
على الواجهة والـ API. اللي اتضاف للنسختين (Vercel + Monster):

- `Content-Signal` في `robots.txt`:
  `ai-train=no, search=yes, ai-input=no`.
- **MCP Server Card** على:
  `/.well-known/mcp/server-card.json` + endpoint حقيقي على `/mcp`.
  الأدوات العامة: `list_courses`, `get_achievements`, `get_announcement`.
- **Poppy** discovery على `/.well-known/poppy.json` (website-only).
- Markdown negotiation لصفحات `/`, `/courses`, `/register` على الاتنين.

**مش منشور عن قصد:**

- **OAuth/OIDC metadata**: الموقع مش OAuth authorization server؛ نشر
  metadata وهمية كان هيضلل الوكلاء. البيانات العامة مفتوحة، والـ MCP مش
  محتاج توكن.
- **DNS-AID**: محتاج تحكم في DNS + DNSSEC للدومين. `runasp.net` تابع لـ
  Monster، ودومين `ideveloper-academy.com` مش على Monster. لو الدومين
  اتنقل لـ Cloudflare/DNS provider بندعمه، نقدر نضيف
  `_a2a._agents.example.com` SVCB/HTTPS records.
- **A2A Agent Card**: مش فيه A2A agent endpoint شغال، فمش منشور.

## 9. troubleshooting سريع

| المشكلة | الحل |
| --- | --- |
| 500 أو صفحة بيضاء | **Website → Logs** أو `App_Data/logs/node*` — غالبًا `DATABASE_URL` غلط |
| Node مش بيبدأ | اتأكد إن `web.config` و `dist/server.cjs` في `/wwwroot` مباشرة |
| تسجيل الدخول مش شغال | `JWT_SECRET` لازم يكون ثابت ومش فاضي على الإنتاج |
| النسخ مش بتتعمل | `DATABASE_URL` لازم يكون متاح للعملية، والفولدر `App_Data` قابل للكتابة |
| الإيميل مش بيوصل | `GMAIL_USER` + `GMAIL_APP_PASSWORD` (App Password مش باسورد الحساب) |
| تسجيل الدخول من Vercel بيفشل | `VITE_API_URL` على Vercel لازم يكون رابط Monster، و`WEB_ORIGIN` على Monster لازم يكون رابط Vercel بالظبط |
| تحميل Excel من Vercel بيفتح صفحة HTML | الوسيط/المتصفح مش بيسمح بالكوكي cross-site — اتأكد إن HTTPS شغال وإن `SameSite=None; Secure` موجودة في `Set-Cookie` |

## أوامر سريعة

```powershell
pnpm check                  # TypeScript
pnpm test                   # الاختبارات
pnpm build                  # الواجهة + الباك اند
pnpm package:monster        # ZIP للرفع
node scripts/copy-database.mjs --replace   # نقل البيانات
```

لو أي خطوة وقفت، ابعتلي رسالة الخطأ من **Logs** أو من نافذة Build، وأنا أكمّل
معاك.
