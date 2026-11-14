# 云上麦加 · Cloud Mecca

An online courtyard for remembrance — Web + PWA, Chinese / English.
一个随时可以进入的线上灵修庭院（网页 + PWA，中英双语）。

## Features
- 3D courtyard with an illustrative Kaaba, prayer rows, galleries and minarets (Three.js r128); other visitors shown live (Supabase Realtime)
- Prayer times (MWL / ISNA / Egypt / Umm al-Qura / Karachi; Standard or Hanafi Asr), Hijri date, Qibla bearing + device compass — calculated locally in `pt.js`, location never uploaded
- Tasbih counter (free count or 33·33·34 after salah), live collective totals
- Public dhikr circle every :00 and :30 (5 min) and user-created dhikr circles
- Du’a wall (anonymous, moderated, “Āmīn”)
- Qur’an: daily ayah + surah reader via AlQuran.cloud (Arabic Uthmani; 马坚 Chinese / Pickthall English)
- Hajj & Umrah practice: free overview; paid guided course with 3D ṭawāf (7 circuits) and saʿy (7 laps)
- “Support us” (not zakat/sadaqah)

## Structure
- `index.html` — shell & styles · `i18n.js` — UI strings, dhikr phrases, cities · `pt.js` — prayer times / qibla / hijri · `app.js` — scene & features
- `admin.html` — du’a wall moderation (admin key in `mecca_config`) · `privacy.html` — privacy & terms (bilingual)
- `sw.js`, `manifest.webmanifest` — PWA. Static site, no build step.

## Backend
Supabase project `find-thief-europe` (shared), all objects prefixed `mecca_`. RLS on, no direct table access; everything goes through `mecca_*` RPCs.
Payments: `mecca_config.payments_enabled` (false = free beta). PayPal edge functions `mecca-paypal-checkout` / `mecca-paypal-capture` (secrets: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV, ALLOWED_ORIGINS) are not deployed yet.
