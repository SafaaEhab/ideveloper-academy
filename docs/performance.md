# أداء الموقع (Lighthouse)

آخر قياس: **4 نوفمبر 2026**، Lighthouse 13.6، على
`https://ideveloper-academy.vercel.app`.

## النتيجة الحالية

| المقياس | Desktop | Mobile |
| --- | ---: | ---: |
| Performance | **100** | **100** |
| First Contentful Paint | 0.4s | 1.0s |
| Largest Contentful Paint | 0.4s | 1.0s |
| Total Blocking Time | 0ms | 80ms |
| Cumulative Layout Shift | 0.01 | 0.015 |
| Speed Index | 1.1s | 2.4s |
| Time to Interactive | 0.8s | 2.8s |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

### قبل التحسينات (Mobile)

| المقياس | قبل | بعد |
| --- | ---: | ---: |
| Performance | 46 | 72 |
| LCP | 11.4s | 4.3s |
| TBT | 500ms | 410ms |
| CLS | 0.226 | 0 |
| SEO | 83 | 100 |

## اللي اتعمل

- **Code splitting**: `Admin`, `StudentPortal`, `InstructorPortal`, `Login`,
  `CoursesPage`, `RegisterPage`, `TermsPage`, `PrivacyPage` بقت lazy chunks.
  الـ JS الأساسي نزل من **2.56 MB → 792 KB**.
- **YouTube facade**: الفيديو مش بيحمّل الـ iframe غير لما المستخدم يدوس Play،
  فاتشال ~1.5 MB من سكريبتات YouTube من التحميل الأول.
- **صورة الـ hero**: WebP 33 KB بدل PNG 186 KB، مع أبعاد صريحة
  و`fetchpriority="high"` و`loading="eager"`.
- **الخطوط**: preconnect + preload + نقل Google Fonts من `@import` لـ
  `<link>`؛ الـ CLS بقى **0**.
- **Static first-paint shell**: هيرو ثابت داخل `index.html` بيترسم قبل تحميل
  React (FCP/LCP ≈ 0.4-1.0s)، وبيتشال بعد ما الـ CSS والخطوط تجهز. ثابت
  `position: fixed` و`aria-hidden`، فتغيبه مش بيحرك الصفحة.
- **خطوط self-hosted**: Cairo وSpace Grotesk من `@fontsource` بدل Google
  Fonts، مع preload لملفات 700/800، فمفيش طلب خارجي render-blocking.
- **CSS غير معطّل للرسم**: الـ stylesheet الكبير بيتحمّل async، والـ shell
  بيفضل ظاهر لحد ما يجهز، فمفيش flash أو layout shift.
- **`content-visibility: auto` على الموبايل**: الأقسام تحت الـ fold مش
  بتتعمل layout/paint غير لما تقرب من الشاشة، فـ TBT نزل من 410ms لـ 80ms.
- **SEO/A11y**: meta description، viewport بدون منع zoom، canonical،
  وrobots.txt بدون `Agentmap` غير القياسي.

## ليه تقرير Lighthouse بتاعك طلع كله Error؟

الرسالة `NO_FCP` معناها إن Lighthouse ما شافش أي رسم في الجلسة. ده بيحصل
غالبًا لو تاب Chrome كان في الخلفية أو الـ window مخفي. قبل القياس:

1. افتح الموقع في تاب ظاهر.
2. سيب التاب في المقدمة لحد ما Lighthouse يخلص.
3. استخدم **Navigation** mode، وشغّل Incognito من غير إضافات.
4. اختار Desktop أو Mobile من إعدادات Lighthouse.

## إعادة القياس

```powershell
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

npx lighthouse https://ideveloper-academy.vercel.app/ `
  --preset=desktop `
  --only-categories=performance,accessibility,best-practices,seo `
  --output=html --output-path=reports/lighthouse/desktop-new `
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --hide-scrollbars"
```

شيل `--preset=desktop` لقياس الموبايل (محاكاة 4G + CPU throttling).

## ملاحظة عن التقييم

النتيجة **100/100** على Desktop وMobile في آخر تشغيل. Lighthouse بطبيعته
بيتذبذب بين 99 و100 حسب الشبكة وتحميل المعالج؛ لو شغّلته أكتر من مرة ممكن
تشوف 99 في مرة. المهم إن كل المؤشرات في النطاق الأخضر:

- FCP < 1.8s
- LCP < 2.5s
- TBT < 200ms
- CLS < 0.1
- Speed Index < 3.4s

مفيش مشاكل أداء متبقية معروفة على الصفحة الرئيسية.

## الريبورتات

- `reports/lighthouse/desktop-final5.report.html` — **100**
- `reports/lighthouse/mobile-final6.report.html` — **100**
- `reports/lighthouse/desktop.report.html` (قبل)
- `reports/lighthouse/mobile.report.html` (قبل)
