# بوح التضاريس | منظومة أبوعزيزه — Android APK Builder V12

هذه الحزمة تحول تطبيق الرادار HTML/PWA إلى تطبيق Android APK حقيقي عبر WebView.

## المطور
Eng. Ahmed Abu Aziza Al-Rashidi

## ما بداخل التطبيق
- تطبيق بوح التضاريس V12 داخل `app/src/main/assets/index.html`
- بيانات Sentinel-2 B01–B12 مدمجة داخل HTML
- بيانات النطاقات الثلاثة Center / North / South
- Top Candidates CSV/KML/JSON داخل assets/data
- صلاحيات GPS حقيقية
- تشغيل Offline من داخل APK
- خرائط Satellite/Hybrid/OSM/Topo عند توفر الإنترنت
- حفظ وتصدير من داخل التطبيق

## البناء بدون Android Studio
1. ارفع محتويات هذه الحزمة إلى GitHub.
2. افتح تبويب Actions.
3. شغّل workflow باسم: Build BOUH Terrain Radar APK.
4. بعد انتهاء البناء، حمّل الملف:
   `app-debug.apk`

## تثبيت APK
- انسخ APK إلى الهاتف.
- فعّل تثبيت التطبيقات من مصادر غير معروفة.
- ثبّت التطبيق.
- عند أول تشغيل، اسمح بإذن الموقع GPS.

## ملاحظة الصدق
النتائج داخل التطبيق هي قوة مؤشر محسوبة من بيانات TIFF/Sentinel داخل النطاقات، وليست assay ولا نسبة ذهب اقتصادية.
