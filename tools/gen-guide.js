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

// Extra evergreen pages (high search intent): Umrah step by step, Hajj 2027 dates + virtual-Hajj ruling FAQ.
// Dates follow the Umm al-Qura calendar and are estimates until the crescent is sighted.
const H27 = [
  ['1448-12-01', '2027-05-07', { ar: 'بداية العشر من ذي الحجة (١ ذو الحجة)', zh: '都尔黑哲月第 1 天（十日开始）' }],
  ['1448-12-08', '2027-05-14', { ar: 'يوم التروية (٨ ذو الحجة) · بداية الحج', zh: '台尔维叶日（8 日）· 朝觐开始' }],
  ['1448-12-09', '2027-05-15', { ar: 'يوم عرفة (٩ ذو الحجة)', zh: '阿拉法特日（9 日）' }],
  ['1448-12-10', '2027-05-16', { ar: 'عيد الأضحى · يوم النحر (١٠ ذو الحجة)', zh: '古尔邦节 · 宰牲日（10 日）' }],
  ['1448-12-11', '2027-05-17 – 2027-05-19', { ar: 'أيام التشريق (١١–١٣ ذو الحجة)', zh: '晒肉日（11–13 日）' }],
];
const EXTRA = {
  ar: [
    { slug: 'umrah', h1: 'خطوات العمرة بالترتيب', title: 'خطوات العمرة بالترتيب بالتفصيل · مكة في السحاب',
      desc: 'كيف تؤدي العمرة خطوة بخطوة: الإحرام من الميقات، الطواف سبعة أشواط، ركعتا الطواف، السعي بين الصفا والمروة، ثم الحلق أو التقصير — مع محاكاة ثلاثية الأبعاد مجانية.',
      body: c => `<h1>خطوات العمرة بالترتيب</h1>
<p>العمرة أربعة أعمال رئيسية: الإحرام، والطواف، والسعي، والحلق أو التقصير. هذا ملخص مرتب لكل خطوة، ويمكنك التدرّب عليها قبل السفر في محاكاة ثلاثية الأبعاد مجانية.</p>
<a class="cta" href="${appLink('ar', { step: 'ihram' })}">🕋 تدرّب على العمرة في المحاكاة</a>
<ol class="steps">
<li><a href="${c.base}ihram.html"><b>الإحرام من الميقات</b></a><small>الاغتسال والتطيب في البدن قبل الإحرام، ولبس الإزار والرداء للرجل، ثم نية العمرة: «لبيك عمرة»، والإكثار من التلبية حتى البدء بالطواف.</small></li>
<li><a href="${c.base}tawaf.html"><b>الطواف حول الكعبة</b></a><small>سبعة أشواط تبدأ من الحجر الأسود وتنتهي عنده، والكعبة عن يسارك؛ ويُسنّ الاضطباع والرمل في الأشواط الثلاثة الأولى للرجل.</small></li>
<li><a href="${c.base}rakah.html"><b>ركعتا الطواف وماء زمزم</b></a><small>صلاة ركعتين خلف مقام إبراهيم إن تيسّر، وإلا ففي أي مكان من المسجد، ثم الشرب من ماء زمزم.</small></li>
<li><a href="${c.base}sai.html"><b>السعي بين الصفا والمروة</b></a><small>سبعة أشواط تبدأ بالصفا وتنتهي بالمروة، ويُسرع الرجل بين العلمين الأخضرين.</small></li>
<li><a href="${c.base}taqsir.html"><b>الحلق أو التقصير</b></a><small>الحلق أفضل للرجل، والتقصير جائز، والمرأة تقصّ قدر أنملة. وبذلك تتم العمرة ويحلّ كل شيء حرم بالإحرام.</small></li>
</ol>
<div class="card"><h2>تنبيه</h2><p>هذا ملخص تعليمي للتذكير والتدرّب، وليس فتوى. ارجع إلى أهل العلم في المسائل التفصيلية، وإلى منصة نسك الرسمية لتصاريح العمرة.</p></div>
<a class="cta alt" href="${c.base}">مناسك الحج كاملة خطوة بخطوة</a>`,
      ld: { '@type': 'HowTo', name: 'خطوات العمرة بالترتيب', step: ['الإحرام من الميقات', 'الطواف سبعة أشواط', 'ركعتا الطواف', 'السعي بين الصفا والمروة', 'الحلق أو التقصير'] } },
    { slug: 'hajj-2027', h1: 'موعد الحج 2027 ويوم عرفة 1448', title: 'موعد الحج 2027 ويوم عرفة وعيد الأضحى 1448 هـ · مكة في السحاب',
      desc: 'متى يبدأ الحج 2027؟ يوم التروية ١٤ مايو ويوم عرفة ١٥ مايو وعيد الأضحى ١٦ مايو 2027 تقريباً حسب تقويم أم القرى، مع عدّ تنازلي وقائمة استعداد.',
      body: c => `<h1>موعد الحج 2027 ويوم عرفة (1448 هـ)</h1>
<p>حسب تقويم أم القرى، يُتوقع أن يكون <b>يوم عرفة السبت ١٥ مايو 2027</b> و<b>عيد الأضحى الأحد ١٦ مايو 2027</b>. التواريخ تقديرية وتُعتمد نهائياً بعد رؤية هلال ذي الحجة، وقد تختلف يوماً بين الدول.</p>
<div class="card"><b>العدّ التنازلي ليوم عرفة:</b> <span id="cd">…</span></div>
<table style="width:100%;border-collapse:collapse">${H27.map(([, g, n]) => `<tr><td style="padding:8px;border-bottom:1px solid #e3e7e5">${esc(n.ar)}</td><td style="padding:8px;border-bottom:1px solid #e3e7e5" dir="ltr">${g}</td></tr>`).join('')}</table>
<h2>استعد من الآن</h2>
<ul><li>التسجيل والتصاريح عبر القنوات الرسمية فقط (منصة نسك أو الجهة المعتمدة في بلدك).</li><li>راجع <a href="${c.base}">مناسك الحج بالترتيب</a> واحفظ أدعية كل موضع.</li><li>تدرّب على الطواف والسعي ورمي الجمرات في المحاكاة حتى تعرف المكان والترتيب قبل الزحام.</li><li>جهّز اللقاحات والفحوص المطلوبة في <a href="${c.base}#req">شروط الحج</a>.</li></ul>
<a class="cta" href="${appLink('ar', { go: 'journey' })}">🕋 تدرّب على الحج في المحاكاة</a>
<h2>هل الحج الافتراضي يُغني عن الحج؟</h2>
<p>لا. الحج عبادة بدنية لا تصح إلا بالحضور في المشاعر في وقتها، وقد نصّت جهات الإفتاء على أن الزيارة الافتراضية لا تُسقط فريضة الحج. «مكة في السحاب» أداة تعليم وتدريب فقط، تساعدك على فهم المناسك وترتيبها قبل أن تؤديها بنفسك.</p>
<p class="muted">المصدر: تقويم أم القرى (تقديري).</p>
<script>(function(){var t=Date.UTC(2027,4,14,21,0,0);function f(){var d=t-Date.now(),e=document.getElementById('cd');if(!e)return;if(d<=0){e.textContent='تقبّل الله';return;}var D=Math.floor(d/864e5),h=Math.floor(d%864e5/36e5);e.textContent=D.toLocaleString('ar-SA')+' يوماً و'+h.toLocaleString('ar-SA')+' ساعة';}f();setInterval(f,6e4);})();</script>`,
      ld: { '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: 'متى يوم عرفة 2027؟', acceptedAnswer: { '@type': 'Answer', text: 'يُتوقع أن يكون يوم عرفة السبت ١٥ مايو 2027 (٩ ذو الحجة ١٤٤٨ هـ) حسب تقويم أم القرى، ويُعتمد بعد رؤية الهلال.' } },
        { '@type': 'Question', name: 'متى عيد الأضحى 2027؟', acceptedAnswer: { '@type': 'Answer', text: 'يُتوقع أن يكون عيد الأضحى الأحد ١٦ مايو 2027 حسب تقويم أم القرى.' } },
        { '@type': 'Question', name: 'هل الحج الافتراضي يُغني عن الحج؟', acceptedAnswer: { '@type': 'Answer', text: 'لا، الزيارة الافتراضية لا تُسقط فريضة الحج؛ المحاكاة أداة تعليم وتدريب فقط.' } } ] } },
  ],
  zh: [
    { slug: 'umrah', h1: '副朝（欧姆拉）功课步骤', title: '副朝（欧姆拉）功课步骤详解 · 云上麦加',
      desc: '副朝怎么做：在戒关受戒、绕天房巡游七圈、礼两拜、在赛法与麦尔沃之间奔走七趟、剃发或剪发——配免费 3D 模拟演练。',
      body: c => `<h1>副朝（欧姆拉）功课步骤</h1>
<p>副朝有四项主要功课：受戒、巡游、奔走、剃发或剪发。下面按顺序讲清每一步，出发前可以在免费的 3D 模拟里先演练。</p>
<a class="cta" href="${appLink('zh', { step: 'ihram' })}">🕋 在模拟中演练副朝</a>
<ol class="steps">
<li><a href="${c.base}ihram.html"><b>在戒关受戒</b></a><small>受戒前大净、身上用香；男子换上两块无缝白布，举意副朝并念"应召词"，一直念到开始巡游。</small></li>
<li><a href="${c.base}tawaf.html"><b>巡游天房</b></a><small>从黑石处开始并结束，天房在左手边，共七圈；男子前三圈可快步。</small></li>
<li><a href="${c.base}rakah.html"><b>巡游后两拜与渗渗泉水</b></a><small>方便时在易卜拉欣立足处后礼两拜，不方便可在清真寺任何地方礼，之后喝渗渗泉水。</small></li>
<li><a href="${c.base}sai.html"><b>赛法与麦尔沃之间奔走</b></a><small>从赛法开始、到麦尔沃结束，共七趟；男子在两处绿灯标志之间快走。</small></li>
<li><a href="${c.base}taqsir.html"><b>剃发或剪发</b></a><small>男子剃发更优，剪短也可以；女子剪去约一指节长。至此副朝完成，开戒。</small></li>
</ol>
<div class="card"><h2>说明</h2><p>本页是帮助记忆和演练的教学摘要，不是教法裁决；细节请请教阿訇，副朝许可请走官方 Nusuk 平台。</p></div>
<a class="cta alt" href="${c.base}">完整朝觐功课一步步</a>`,
      ld: { '@type': 'HowTo', name: '副朝（欧姆拉）功课步骤', step: ['受戒', '巡游七圈', '巡游后两拜', '赛法与麦尔沃奔走', '剃发或剪发'] } },
    { slug: 'hajj-2027', h1: '2027 年朝觐日期与阿拉法特日（伊历 1448）', title: '2027 年朝觐日期、阿拉法特日与古尔邦节（伊历 1448）· 云上麦加',
      desc: '2027 年朝觐什么时候？按乌姆古拉历，台尔维叶日约 5 月 14 日、阿拉法特日约 5 月 15 日、古尔邦节约 5 月 16 日，附倒计时和准备清单。',
      body: c => `<h1>2027 年朝觐日期与阿拉法特日（伊历 1448）</h1>
<p>按沙特乌姆古拉历，预计 <b>阿拉法特日为 2027 年 5 月 15 日（周六）</b>，<b>古尔邦节为 5 月 16 日（周日）</b>。具体以都尔黑哲月新月观测为准，各国可能相差一天。</p>
<div class="card"><b>距离阿拉法特日：</b><span id="cd">…</span></div>
<table style="width:100%;border-collapse:collapse">${H27.map(([, g, n]) => `<tr><td style="padding:8px;border-bottom:1px solid #e3e7e5">${esc(n.zh)}</td><td style="padding:8px;border-bottom:1px solid #e3e7e5">${g}</td></tr>`).join('')}</table>
<h2>现在就可以准备</h2>
<ul><li>报名和许可只走官方渠道（Nusuk 平台或本国认可的朝觐机构）。</li><li>熟悉<a href="${c.base}">朝觐功课顺序</a>和各处的祈祷词。</li><li>在模拟里先练巡游、奔走、射石，出发前就知道位置和顺序。</li><li>按<a href="${c.base}#req">朝觐条件</a>准备疫苗和体检。</li></ul>
<a class="cta" href="${appLink('zh', { go: 'journey' })}">🕋 在模拟中演练朝觐</a>
<h2>线上模拟能代替朝觐吗？</h2>
<p>不能。朝觐是必须亲身在规定时间到达各圣地的功修，教法机构已明确虚拟参观不能免除朝觐主命。云上麦加只是学习和演练工具，帮你在亲自朝觐前弄懂功课和顺序。</p>
<p class="muted">资料来源：乌姆古拉历（预估）。</p>
<script>(function(){var t=Date.UTC(2027,4,14,21,0,0);function f(){var d=t-Date.now(),e=document.getElementById('cd');if(!e)return;if(d<=0){e.textContent='愿主悦纳';return;}e.textContent=' '+Math.floor(d/864e5)+' 天 '+Math.floor(d%864e5/36e5)+' 小时';}f();setInterval(f,6e4);})();</script>`,
      ld: { '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: '2027 年阿拉法特日是哪天？', acceptedAnswer: { '@type': 'Answer', text: '按乌姆古拉历预计为 2027 年 5 月 15 日，以新月观测为准。' } },
        { '@type': 'Question', name: '线上模拟能代替朝觐吗？', acceptedAnswer: { '@type': 'Answer', text: '不能，虚拟参观不能免除朝觐主命；模拟只用于学习和演练。' } } ] } },
  ],
};

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
<div class="card">${EXTRA[lang].map(p => `<a href="${c.base}${p.slug}.html"><b>${esc(p.h1)}</b></a><br><small class="muted">${esc(p.desc)}</small>`).join('<br>')}</div>
<h2>${esc(c.steps)}</h2>
<ol class="steps">${STEPS.map(id => `<li><a href="${c.base}${id}.html"><b>${esc(T[id].t)}</b></a><small>${esc(T[id].d)}</small></li>`).join('')}</ol>
<div class="card"><h2>${esc(D.typeH)}</h2><ul><li>${esc(D.typeTam)}</li><li>${esc(D.typeQir)}</li><li>${esc(D.typeIfr)}</li></ul></div>
<h2 id="req">${esc(c.req)}</h2>${reqHtml}
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
  // extra pages
  EXTRA[lang].forEach(p => {
    const alt = [['ar', `/guide/${p.slug}.html`], ['zh', `/guide/zh/${p.slug}.html`], ['x-default', `/guide/${p.slug}.html`]];
    const ld = { '@context': 'https://schema.org', inLanguage: c.html, ...p.ld };
    if (ld['@type'] === 'HowTo') ld.step = ld.step.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s, text: s }));
    write(`${c.base.slice(1)}${p.slug}.html`, page({ lang, url: `${c.base}${p.slug}.html`, title: p.title, desc: p.desc, body: p.body(c), alt, jsonld: ld }));
    urls.push([`${c.base}${p.slug}.html`, alt]);
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
