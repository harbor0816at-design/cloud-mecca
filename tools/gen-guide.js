// Generates crawlable static Hajj guide pages (Arabic + Chinese) from i18n.js.
// Run: node tools/gen-guide.js   → writes guide/**, sitemap.xml
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const W = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8'), { window: W, navigator: { language: 'ar' } });
const SITE = 'https://cloudmecca.app';
const { STEPS, STEP_TEXT, STEP_META, PHOTOS, PHOTO_BASE, REQ_SOURCES, I18N } = W;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);

const L = {
  ar: {
    dir: 'rtl', html: 'ar', base: '/guide/', other: 'zh', otherLabel: '中文', site: 'مكة في السحاب',
    title: 'دليل الحج خطوة بخطوة (التمتع) · مكة في السحاب',
    h1: 'مناسك الحج خطوة بخطوة',
    lead: 'دليل مختصر لمناسك حج التمتع بالترتيب، من الميقات إلى طواف الوداع، مع إمكانية التدرّب على كل خطوة في محاكاة ثلاثية الأبعاد مجانية.',
    desc: 'دليل مناسك الحج بالترتيب: الإحرام، طواف العمرة، السعي، يوم التروية، الوقوف بعرفة، مزدلفة، رمي الجمرات، طواف الإفاضة والوداع — مع محاكاة ثلاثية الأبعاد مجانية.',
    steps: 'الخطوات', key: 'نقاط مهمة', step: n => `الخطوة ${n} من ${STEPS.length}`,
    try: 'تدرّب على هذه الخطوة في المحاكاة', tryAll: 'ابدأ محاكاة الحج كاملة', prev: 'السابق', next: 'التالي', all: 'كل الخطوات',
    req: 'شروط ومتطلبات الحج', src: 'المصادر', photo: 'الصورة',
    stepTitle: x => `${x.t} · مناسك الحج · مكة في السحاب`,
    num: n => n.toLocaleString('ar-SA'),
  },
  zh: {
    dir: 'ltr', html: 'zh-CN', base: '/guide/zh/', other: 'ar', otherLabel: 'العربية', site: '云上麦加',
    title: '朝觐功课一步步图解（享受朝）· 云上麦加',
    h1: '朝觐功课一步步',
    lead: '按顺序讲清楚享受朝的每一项功课，从戒关受戒到辞朝巡游；每一步都可以在免费的 3D 模拟里提前演练。',
    desc: '朝觐功课顺序详解：受戒、副朝巡游、奔走、八日米纳、阿拉法特驻留、穆兹代里法、射石、正朝巡游与辞朝巡游，配免费 3D 模拟演练。',
    steps: '功课步骤', key: '要点', step: n => `第 ${n} 步 / 共 ${STEPS.length} 步`,
    try: '在模拟中演练这一步', tryAll: '开始完整朝觐模拟', prev: '上一步', next: '下一步', all: '全部步骤',
    req: '朝觐条件与要求', src: '资料来源', photo: '图片',
    stepTitle: x => `${x.t} · 朝觐功课 · 云上麦加`,
    num: n => String(n),
  },
};

const css = `*{box-sizing:border-box}body{margin:0;background:#fbfaf6;color:#17221f;font:17px/1.75 "Noto Naskh Arabic","Noto Sans SC","PingFang SC",system-ui,sans-serif}
html[lang=zh-CN] body{font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif;line-height:1.8}
h1,h2,h3{font-family:"Noto Kufi Arabic","Noto Sans SC",sans-serif;color:#0b6b52;line-height:1.4}
a{color:#0b6b52}header{background:#0b6b52;color:#fff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center}
header a{color:#fff;text-decoration:none;font-weight:700}main{max-width:760px;margin:0 auto;padding:18px}
.hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px;background:#dfe7ea}
.cta{display:inline-block;background:#0b6b52;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;margin:12px 0}
.cta.alt{background:#b98d36}ol.steps{padding-inline-start:22px}ol.steps li{margin:8px 0}ol.steps small{color:#5d6b66;display:block}
.card{background:#fff;border:1px solid rgba(11,107,82,.16);border-radius:14px;padding:14px 18px;margin:14px 0}
nav.pn{display:flex;justify-content:space-between;gap:10px;margin:22px 0}.muted{color:#5d6b66;font-size:14px}footer{max-width:760px;margin:0 auto;padding:18px;color:#5d6b66;font-size:14px}
.share a{margin-inline-end:12px}`;

function page({ lang, url, title, desc, body, alt, jsonld, image }) {
  const c = L[lang];
  return `<!DOCTYPE html>
<html lang="${c.html}" dir="${c.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
${alt.map(([h, u]) => `<link rel="alternate" hreflang="${h}" href="${SITE}${u}">`).join('\n')}
<meta name="theme-color" content="#0b6b52">
<link rel="icon" href="/icon-192.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(c.site)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${image || SITE + '/og.png'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@700&family=Noto+Naskh+Arabic:wght@400;600&family=Noto+Sans+SC:wght@400;600&display=swap" rel="stylesheet">
<style>${css}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<header><a href="${c.base}">🕋 ${esc(c.site)}</a><a href="${alt.find(a => a[0] === c.other)[1]}" hreflang="${c.other}">${c.otherLabel}</a></header>
<main>
${body}
</main>
<footer>${esc(I18N[lang].disclaimer)}<br><a href="/privacy.html">${esc(I18N[lang].privacy || 'Privacy')}</a> · © Fidova Technology</footer>
<script src="/ops-track.js?v=1"></script>
<script>try{OpsTrack.init({product:'mecca',supabaseUrl:'https://smwqqiebkdaheikihbrg.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtd3FxaWVia2RhaGVpa2loYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzU2NzksImV4cCI6MjEwNzU1MTY3OX0.ouoYJ_OTLp4aazXn7H9xcwGJQOQ-pF1fttwR7U5WaG4'});}catch(e){}</script>
</body>
</html>
`;
}

const appLink = (lang, extra) => `/?${new URLSearchParams({ lang, utm_source: 'guide', utm_medium: 'seo', ...extra })}`;
const photo = (slug, w) => slug && PHOTOS[slug] ? `${PHOTO_BASE}${slug}-${w}.jpg` : null;
const urls = [];
const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

for (const lang of ['ar', 'zh']) {
  const c = L[lang], T = STEP_TEXT[lang], D = I18N[lang];
  const altIdx = [['ar', '/guide/'], ['zh', '/guide/zh/'], ['x-default', '/guide/']];
  // index
  const reqHtml = (D.reqSec || []).map(([h, list]) => `<h3>${esc(h)}</h3><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
  const body = `<h1>${esc(c.h1)}</h1>
<p>${esc(c.lead)}</p>
<a class="cta" href="${appLink(lang, { go: 'journey' })}">🕋 ${esc(c.tryAll)}</a>
<h2>${esc(c.steps)}</h2>
<ol class="steps">${STEPS.map(id => `<li><a href="${c.base}${id}.html"><b>${esc(T[id].t)}</b></a><small>${esc(T[id].d)}</small></li>`).join('')}</ol>
<div class="card"><h2>${esc(D.typeH)}</h2><ul><li>${esc(D.typeTam)}</li><li>${esc(D.typeQir)}</li><li>${esc(D.typeIfr)}</li></ul></div>
<h2>${esc(c.req)}</h2>${reqHtml}
<p class="muted">${esc(c.src)}: ${REQ_SOURCES.map(([n, u]) => `<a href="${u}" rel="noopener" dir="ltr">${esc(n)}</a>`).join(' · ')}</p>
<a class="cta" href="${appLink(lang, { go: 'journey' })}">🕋 ${esc(c.tryAll)}</a>`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'HowTo', name: c.h1, description: c.desc, inLanguage: c.html,
    step: STEPS.map((id, i) => ({ '@type': 'HowToStep', position: i + 1, name: T[id].t, text: T[id].p, url: `${SITE}${c.base}${id}.html` })) };
  write(`${c.base.slice(1)}index.html`, page({ lang, url: c.base, title: c.title, desc: c.desc, body, alt: altIdx, jsonld }));
  urls.push([c.base, altIdx]);
  // steps
  STEPS.forEach((id, i) => {
    const x = T[id], m = STEP_META[id], img = photo(m.photo, 800), P = m.photo && PHOTOS[m.photo];
    const alt = [['ar', `/guide/${id}.html`], ['zh', `/guide/zh/${id}.html`], ['x-default', `/guide/${id}.html`]];
    const prev = STEPS[i - 1], next = STEPS[i + 1];
    const b = `<p class="muted"><a href="${c.base}">${esc(c.h1)}</a> › ${esc(c.step(c.num(i + 1)))} · ${esc(x.d)}</p>
<h1>${esc(x.t)}</h1>
${img ? `<img class="hero" src="${img}" alt="${esc(P[lang])}" loading="lazy"><p class="muted">${esc(c.photo)}: <a href="${P.p}" rel="noopener">${esc(P.a)}</a> · ${esc(P.l)}</p>` : ''}
<p>${esc(x.p)}</p>
<h2>${esc(c.key)}</h2><ul>${x.k.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
<a class="cta" href="${appLink(lang, { step: id })}">▶ ${esc(c.try)}</a>
<nav class="pn">${prev ? `<a href="${c.base}${prev}.html">← ${esc(c.prev)}: ${esc(T[prev].t)}</a>` : '<span></span>'}${next ? `<a href="${c.base}${next}.html">${esc(c.next)}: ${esc(T[next].t)} →</a>` : `<a href="${c.base}">${esc(c.all)}</a>`}</nav>`;
    const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: x.t, description: x.p, inLanguage: c.html, image: img || `${SITE}/og.png`,
      publisher: { '@type': 'Organization', name: 'Fidova Technology' }, isPartOf: { '@type': 'WebSite', name: c.site, url: SITE } };
    write(`${c.base.slice(1)}${id}.html`, page({ lang, url: `${c.base}${id}.html`, title: c.stepTitle(x), desc: x.p.slice(0, 155), body: b, alt, jsonld: ld, image: img }));
    urls.push([`${c.base}${id}.html`, alt]);
  });
}

// sitemap
const home = [['ar', '/?lang=ar'], ['zh', '/?lang=zh'], ['x-default', '/']];
const all = [['/', home], ...urls];
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${all.map(([u, alt]) => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod>${alt.map(([h, a]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${(SITE + a).replace(/&/g, '&amp;')}"/>`).join('')}</url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sm);
console.log('pages', urls.length, 'sitemap urls', all.length);
