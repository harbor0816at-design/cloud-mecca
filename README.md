# مكة في السحاب · 云上麦加

محاكاة تعليمية لرحلة الحج خطوة بخطوة في مشاهد ثلاثية الأبعاد — العربية أولاً، ثم الصينية.
一步步模拟朝觐的 3D 教学网站（阿拉伯语为主，中文为辅；Web + PWA）。

## المحتوى · 内容
- 3D scenes (Three.js r128): المسجد الحرام (الكعبة، الحِجر، المقام، الأروقة الثلاثية، المآذن، برج الساعة، المسعى والعلمان الأخضران)، منى (مدينة الخيام)، عرفات (جبل الرحمة، مسجد نمرة، لوحات الحدود)، مزدلفة (ليلاً)، منشأة الجمرات. Crowds of pilgrims are instanced; tawaf crowd moves anticlockwise.
- Hajj al-Tamattuʿ journey in 11 stages (ihram → tawaf → two rakʿahs & Zamzam → saʿy → taqsir → 8th Mina → 9th Arafah → Muzdalifah → 10th Aqabah/nahr/halq/ifadah → 11–13 three jamarat → farewell tawaf), each with rulings and an interaction (talbiyah, 7 circuits, 7 laps, Mina day/night time-lapse, Arafah noon→sunset, pebble collection 49/70, stoning in order).
- Hajj requirements (permit/Nusuk, vaccines, health) with sources; next Day of Arafah computed from the Umm al-Qura calendar.
- Tools: prayer times & qibla (`pt.js`, local), tasbih with live totals, du’a wall (moderated), Qur’an (AlQuran.cloud: Uthmani + al-Muyassar / 马坚).
- Real photos: freely licensed Wikimedia Commons images mirrored into Supabase Storage (`mecca-media/photos/*`), credited in-app (`window.PHOTOS`).

## Files
`index.html` (shell & styles) · `i18n.js` (ar/zh strings, Hajj stages, photo credits) · `pt.js` · `app.js` · `admin.html` (du’a moderation) · `privacy.html` · `sw.js`, `manifest.webmanifest`. Static, no build step.

## Backend
Supabase (`mecca_*` tables/RPCs, RLS on, RPC-only). Edge functions: `mecca-media-sync` (admin-only photo mirror, deployed), Stripe Checkout: `mecca-stripe-checkout`, `mecca-stripe-confirm` (verify JWT) and `mecca-stripe-webhook` (signature-verified), all deployed. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook URL `…/functions/v1/mecca-stripe-webhook`, event `checkout.session.completed`). Payments off until `mecca_config.payments_enabled='true'`.
