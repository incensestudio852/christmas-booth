/* ============================================================
   伯利恆照相館 · Bethlehem Photo Booth
   單頁靜態 app。平板優先，觸控優先。
   輸出：1600×1067（4R，3:2，300dpi 綽綽有餘）
   ============================================================ */

/* ── 常數 ─────────────────────────────────────────────── */
const OUT_W = 1600, OUT_H = 1067;        // 4R 比例
const CARD_AR = OUT_W / OUT_H;           // 1.5
const FONT_SERIF = '"Noto Serif TC","Songti TC",serif';
const FONT_SANS  = '"Noto Sans TC","PingFang HK",sans-serif';

/* 光線：Canvas 2D filter 直接支援，老 iPad 都跑得順 */
const FILTERS = [
  { id: 'none',  name: '原色',       css: 'none' },
  { id: 'warm',  name: '暖冬',       css: 'sepia(.16) saturate(1.18) brightness(1.04) contrast(1.03)' },
  { id: 'candle',name: '燭光',       css: 'sepia(.3) saturate(1.25) brightness(.97) contrast(1.08)' },
  { id: 'soft',  name: '繪本柔光',   css: 'saturate(.92) brightness(1.08) contrast(.94)' },
  { id: 'ivory', name: '象牙',       css: 'grayscale(.35) sepia(.28) saturate(1.1) brightness(1.06)' }
];

/* 相紙：以 canvas 繪製，輸出時一併重畫 */
const FRAMES = [
  { id: 'gold',   name: '燙金細邊', swatch: '#B98A3E' },
  { id: 'ivory',  name: '象牙厚框', swatch: '#FBF6EC' },
  { id: 'star',   name: '星角花',   swatch: '#E8C27A' },
  { id: 'verse',  name: '經文底帶', swatch: '#12261F' }
];

/* ── 狀態 ─────────────────────────────────────────────── */
const S = {
  stage: 'capture',
  stream: null,
  shot: null,            // 拍下／載入的原始 canvas（3:2 已裁）
  filter: 'none',
  frame: 'gold',
  ai: null,              // AI 生成的底圖（已裁成 3:2）
  aiStyle: null,         // 'bethlehem' | 'candlelight' | 'storybook'
  aiBusy: false,
  stickers: [],
  selected: null,
  drag: null,
  pinch: null
};

/* ============================================================
   AI 場景轉換
   ------------------------------------------------------------
   AI_ENDPOINT 留空時，整個 AI 模式自動隱藏，只留本機光線濾鏡。
   接上 Worker 之後填一個網址即可，例如：
     AI_ENDPOINT = 'https://your-worker.workers.dev/ai'
   約定格式：POST { image: dataURL, style: 'bethlehem' } → { image: dataURL }
   失敗時（超時、4xx/5xx、格式錯）一律退回本機濾鏡，唔會阻住訪客。
   ============================================================ */
let AI_ENDPOINT = '';            // ← 之後填 Worker 網址（可由 console 覆寫作測試）
const AI_TIMEOUT_MS = 20000;     // AI 太慢就放棄，唔好令訪客等

/* AI 場景：每款同時綁定一個本機濾鏡做後備，所以無 AI 都一定有成品 */
const AI_STYLES = [
  { id: 'bethlehem', name: '伯利恆夜色', sub: '星空・暖燈',
    hint: '讓夜空與星光落在相片四周，人物保留清楚。',
    prompt: 'deep blue night sky with a large glowing star, warm candlelight glow at the edges, soft falling snow, painterly, reverent, no people, no text',
    fallback: 'candle' },
  { id: 'candlelight', name: '馬槽燭光', sub: '金暖・柔焦',
    hint: '暖金燭光籠罩，適合大合照。',
    prompt: 'warm golden candlelight glow, soft bokeh, straw and wood tones, gentle haze, painterly, reverent, no people, no text',
    fallback: 'warm' },
  { id: 'storybook', name: '繪本福音', sub: '水彩・柔筆',
    hint: '水彩插畫感，適合小朋友。',
    prompt: 'soft watercolour illustration, muted ivory and sage palette, gentle paper texture, storybook children bible illustration style, no people, no text',
    fallback: 'soft' }
];

/* ── DOM ──────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const video = $('video');
const viewfinder = $('viewfinder');
const preview = $('preview');
const card = $('card');
const ctx = card.getContext('2d');

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}
function busy(on, text) {
  const el = $('busy');
  if (text) $('busy-text').textContent = text;
  el.hidden = !on;
}
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ══════════════════════════════════════════════════════
   一、影相
   ══════════════════════════════════════════════════════ */

async function startCamera(opts = {}) {
  const quiet = !!opts.quiet;
  if (S.stream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (!quiet) showCamError('這個瀏覽器不支援相機，請改用相片。');
    $('btn-upload-label').classList.add('btn--primary');
    return;
  }
  if (!quiet) busy(true, '開啟相機');
  try {
    /* 老 iPad：先試 1280×960；失敗就退回最寬鬆的條件 */
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
    } catch (e1) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    S.stream = stream;
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* iOS 有時要再點一次 */ }
    viewfinder.classList.add('is-live');
    $('vf-error').hidden = true;
    $('vf-idle').style.display = '';
    $('btn-start').hidden = true;
    $('btn-countdown').hidden = false;
  } catch (err) {
    $('btn-start').hidden = false;
    if (!quiet) showCamError(camErrorMsg(err));
  } finally {
    busy(false);
  }
}

function camErrorMsg(err) {
  const n = (err && err.name) || '';
  if (n === 'NotAllowedError' || n === 'SecurityError')
    return '相機權限被拒。去「設定 › Safari › 相機」重新允許，或者直接用相片。';
  if (n === 'NotFoundError' || n === 'OverconstrainedError')
    return '找不到鏡頭。可以直接用相片 App 內的相片。';
  if (n === 'NotReadableError')
    return '鏡頭被另一個 App 佔用。關掉其他相機 App 再試。';
  return '相機未能開啟。可以直接用相片 App 內的相片。';
}

function showCamError(msg) {
  $('vf-error-sub').textContent = msg;
  $('vf-error').hidden = false;
  $('vf-idle').style.display = 'none';
  viewfinder.classList.remove('is-live');
}

let countTimer = null;
function startCountdown() {
  if (!S.stream) { toast('先開相機'); return; }
  if (countTimer) return;
  let n = 3;
  const overlay = $('vf-count'), num = $('vf-count-num');
  overlay.hidden = false;
  num.textContent = n;
  num.style.animation = 'none'; void num.offsetWidth; num.style.animation = '';

  countTimer = setInterval(() => {
    n -= 1;
    if (n > 0) {
      num.textContent = n;
      num.style.animation = 'none'; void num.offsetWidth; num.style.animation = '';
    } else {
      clearInterval(countTimer); countTimer = null;
      overlay.hidden = true;
      grabFrame();
    }
  }, 1000);
}

function grabFrame() {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) { toast('相機畫面未準備好，再試一次'); return; }

  const c = document.createElement('canvas');
  c.width = OUT_W; c.height = OUT_H;
  const g = c.getContext('2d');

  /* 置中裁成 3:2，再水平翻轉（鏡像） */
  const target = CARD_AR, src = vw / vh;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (src > target) { sw = vh * target; sx = (vw - sw) / 2; }
  else { sh = vw / target; sy = (vh - sh) / 2; }

  g.save();
  g.translate(OUT_W, 0); g.scale(-1, 1);
  g.drawImage(video, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
  g.restore();

  const flash = $('vf-flash');
  flash.hidden = false;
  setTimeout(() => { flash.hidden = true; }, 520);

  S.shot = c;
  goPaper();
}

/* 上載相片（iPad 直出 HEIC 多數 Safari 會自動轉 JPEG） */
$('file-input').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  busy(true, '讀取相片');
  try {
    const img = await loadImage(file);
    const c = document.createElement('canvas');
    c.width = OUT_W; c.height = OUT_H;
    const g = c.getContext('2d');

    const target = CARD_AR, src = img.width / img.height;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (src > target) { sw = img.height * target; sx = (img.width - sw) / 2; }
    else { sh = img.width / target; sy = (img.height - sh) / 2; }
    g.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);

    S.shot = c;
    busy(false);
    goPaper();
    /* 讓同一個檔案可以再揀一次 */
    e.target.value = '';
  } catch (err) {
    busy(false);
    toast('這張相片讀不到，試另一張');
    e.target.value = '';
  }
});

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/* ══════════════════════════════════════════════════════
   二、相紙同顏色
   ══════════════════════════════════════════════════════ */

function syncFilterChips() {
  const cf = $('chips-filter');
  if (!cf) return;
  [...cf.children].forEach((c, i) =>
    c.setAttribute('aria-pressed', String(FILTERS[i].id === S.filter)));
}

function buildChips() {
  const cf = $('chips-filter');
  cf.innerHTML = '';
  FILTERS.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('aria-pressed', String(f.id === S.filter));
    b.textContent = f.name;
    b.addEventListener('click', () => {
      S.filter = f.id;
      if (S.ai) { S.ai = null; S.aiStyle = null; }   /* 手動揀光線即取消 AI */
      [...cf.children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      drawPreview();
    });
    cf.appendChild(b);
  });

  const cb = $('chips-frame');
  cb.innerHTML = '';
  FRAMES.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('aria-pressed', String(f.id === S.frame));
    b.innerHTML = `<span class="chip-dot" style="background:${f.swatch}"></span>${f.name}`;
    b.addEventListener('click', () => {
      S.frame = f.id;
      [...cb.children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      drawPreview();
    });
    cb.appendChild(b);
  });
}

function drawPreview() {
  if (!S.shot) return;
  preview.width = 900; preview.height = 600;
  const g = preview.getContext('2d');
  paintCard(g, 900, 600, { withStickers: false });
}

/* ══════════════════════════════════════════════════════
   AI 場景：呼叫 → 混合 → 失敗即退回本機濾鏡
   ══════════════════════════════════════════════════════ */

/* 送出去之前先縮細：老 iPad 上載 1600×1067 太肥 */
function aiInputDataURL(maxW = 900) {
  const src = S.shot;
  if (!src) return null;
  if (src.width <= maxW) return src.toDataURL('image/jpeg', 0.86);
  const k = maxW / src.width;
  const c = document.createElement('canvas');
  c.width = maxW; c.height = Math.round(src.height * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}

async function runAI(styleId) {
  const style = AI_STYLES.find((s) => s.id === styleId);
  if (!style || S.aiBusy) return;
  if (!S.shot) { toast('先影一張相'); return; }

  /* 未接 API：即刻用本機後備，並老實講清楚 */
  if (!AI_ENDPOINT) {
    applyAIFallback(style, '未接上 AI 服務，先用本機光線');
    return;
  }

  S.aiBusy = true;
  showAIOverlay(true, '正在生成' + style.name);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: aiInputDataURL(), style: style.id, prompt: style.prompt }),
      signal: ac.signal
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || typeof data.image !== 'string' || !data.image.startsWith('data:image'))
      throw new Error('bad payload');

    const img = await loadImageSrc(data.image);
    S.ai = img;
    S.aiStyle = style.id;
    showAIOverlay(false);
    drawPreview();
    toast('已加上「' + style.name + '」');
  } catch (err) {
    /* 超時、網絡、格式錯 —— 一律退回，唔彈錯誤俾訪客睇 */
    console.warn('[AI]', err && err.message);
    showAIOverlay(false);
    applyAIFallback(style, 'AI 暫時未能連上，已用本機光線');
  } finally {
    clearTimeout(timer);
    S.aiBusy = false;
  }
}

/* 無 AI 時：用該場景對應的本機濾鏡，成品照樣出得 */
function applyAIFallback(style, msg) {
  S.ai = null;
  S.aiStyle = null;
  S.filter = style.fallback;
  syncFilterChips();
  drawPreview();
  toast(msg, '⚡');
}

function loadImageSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = src;
  });
}

function showAIOverlay(on, text) {
  let el = $('ai-overlay');
  if (!el) return;
  if (text) el.querySelector('.ai-overlay-text').textContent = text;
  el.hidden = !on;
}

function clearAI() {
  S.ai = null;
  S.aiStyle = null;
  drawPreview();
}

function buildAIPanel() {
  const wrap = $('ai-panel');
  if (!wrap) return;
  /* 未接 API 都要顯示：訪客照樣有場景可按，只是走後備 */
  const grid = $('ai-grid');
  grid.innerHTML = '';
  AI_STYLES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip chip--ai';
    b.setAttribute('aria-pressed', String(S.aiStyle === s.id));
    b.innerHTML = `<span class="chip-ai-name">${s.name}</span><span class="chip-ai-sub">${s.sub}</span>`;
    b.addEventListener('click', () => {
      [...grid.children].forEach((c) => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      runAI(s.id);
    });
    grid.appendChild(b);
  });

  const note = $('ai-note');
  if (note) {
    note.textContent = AI_ENDPOINT
      ? '生成需時，失敗會自動改用本機光線。'
      : '暫用本機光線模擬場景，效果即時。';
  }
}

/* ══════════════════════════════════════════════════════
   三、繪卡（預覽同輸出共用）
   ══════════════════════════════════════════════════════ */

function paintCard(g, W, H, opts = {}) {
  const withStickers = opts.withStickers !== false;
  g.clearRect(0, 0, W, H);

  /* 1. 相片 + 光線 */
  g.save();
  const f = FILTERS.find((x) => x.id === S.filter) || FILTERS[0];
  if (f.css !== 'none') g.filter = f.css;
  if (S.shot) g.drawImage(S.shot, 0, 0, W, H);
  else { g.fillStyle = '#0d1f18'; g.fillRect(0, 0, W, H); }
  g.restore();

  /* 1b. AI 場景：疊在相片上，人物保留，只換四周氣氛 */
  if (S.ai) {
    g.save();
    /* 先柔化相片邊緣，令 AI 底圖自然貼住 */
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.55;
    g.drawImage(S.ai, 0, 0, W, H);
    g.restore();

    /* 四周暗角，把人留下、把畫面收邊 */
    g.save();
    const vg = g.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.28,
                                      W / 2, H * 0.52, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,22,17,0.46)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  /* 2. 淡暖色罩（令相片同紙邊同一家族） */
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(251,246,236,0.10)';
  g.fillRect(0, 0, W, H);
  g.restore();

  /* 3. 相紙 */
  paintFrame(g, W, H);

  /* 4. 貼紙 */
  if (withStickers) {
    S.stickers.forEach((st) => paintSticker(g, st, W, H));
  }
}

function paintFrame(g, W, H) {
  const k = W / OUT_W;   // 保比例係數
  g.save();

  if (S.frame === 'gold') {
    g.strokeStyle = '#B98A3E';
    g.lineWidth = 16 * k;
    g.strokeRect(10 * k, 10 * k, W - 20 * k, H - 20 * k);
    g.strokeStyle = 'rgba(255,243,208,.8)';
    g.lineWidth = 2 * k;
    g.strokeRect(24 * k, 24 * k, W - 48 * k, H - 48 * k);

  } else if (S.frame === 'ivory') {
    const p = 46 * k;
    g.fillStyle = '#FBF6EC';
    g.fillRect(0, 0, W, p);
    g.fillRect(0, H - p, W, p);
    g.fillRect(0, 0, p, H);
    g.fillRect(W - p, 0, p, H);
    /* 紙邊細線 */
    g.strokeStyle = 'rgba(0,0,0,.06)';
    g.lineWidth = 1;
    g.strokeRect(p, p, W - 2 * p, H - 2 * p);

  } else if (S.frame === 'star') {
    g.strokeStyle = '#B98A3E';
    g.lineWidth = 6 * k;
    g.strokeRect(14 * k, 14 * k, W - 28 * k, H - 28 * k);
    const s = 34 * k;
    [[14 * k, 14 * k, 1, 1], [W - 14 * k, 14 * k, -1, 1],
     [14 * k, H - 14 * k, 1, -1], [W - 14 * k, H - 14 * k, -1, -1]].forEach(([x, y, dx, dy]) => {
      g.save(); g.translate(x, y); g.scale(dx, dy);
      g.fillStyle = '#E8C27A';
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(s * .38, s * .16); g.lineTo(s * .62, s * .54);
      g.lineTo(s * .2, s * .42); g.lineTo(0, s * .7);
      g.lineTo(-s * .2, s * .42); g.lineTo(-s * .62, s * .54); g.lineTo(-s * .38, s * .16);
      g.closePath(); g.fill();
      g.restore();
    });

  } else if (S.frame === 'verse') {
    const band = 112 * k;
    g.fillStyle = '#12261F';
    g.fillRect(0, H - band, W, band);
    g.fillStyle = '#B98A3E';
    g.fillRect(0, H - band, W * .22, 3 * k);
    g.fillStyle = '#FBF6EC';
    g.font = `300 ${34 * k}px ${FONT_SERIF}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('在至高之處榮耀歸與神', 40 * k, H - band * .62);
    g.fillStyle = 'rgba(216,172,99,.9)';
    g.font = `400 ${15 * k}px ${FONT_SANS}`;
    g.fillText('路加福音 2:14', 40 * k, H - band * .24);
    /* 星 */
    g.save();
    g.translate(W - 74 * k, H - band * .5);
    g.scale(k, k);
    g.fillStyle = '#E8C27A';
    const ss = 30;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const r = i % 2 === 0 ? ss : ss * .42;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
}

/* ── 貼紙繪製 ─────────────────────────────────────────── */
function paintSticker(g, st, W, H) {
  const cx = st.x * W, cy = st.y * H;
  const base = st.scale * W;
  g.save();
  g.translate(cx, cy);
  g.rotate(st.rot);

  if (st.kind === 'svg') {
    const sym = SYMBOLS[st.sym];
    /* 以最長邊定尺寸，令大小貼紙視覺一致 */
    const longest = Math.max(sym.w, sym.h);
    const longestPx = base * 0.40;
    const k = longestPx / longest;
    const w = sym.w * k, h = sym.h * k;
    g.drawImage(st.img, -w / 2, -h / 2, w, h);

  } else if (st.kind === 'word') {
    const size = base * 0.058;
    g.font = `500 ${size}px ${FONT_SERIF}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    /* 量字，畫成一塊真字牌：墨底＋金線，唔會變成一舊灰方塊 */
    const tw = g.measureText(st.text).width;
    const pw = tw + size * 1.1;
    const ph = size * 1.55;
    g.fillStyle = 'rgba(18,38,31,0.92)';
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.strokeStyle = '#C89B52';
    g.lineWidth = Math.max(1.2, size * 0.055);
    g.strokeRect(-pw / 2 + size * 0.2, -ph / 2 + size * 0.2, pw - size * 0.4, ph - size * 0.4);

    g.fillStyle = st.light ? '#FBF6EC' : '#F1E4C8';
    g.fillText(st.text, 0, size * 0.04);
  }
  g.restore();

  /* 選取框（僅螢幕預覽） */
  if (S.selected === st.id && !st._export) {
    const r = base * 0.26;
    g.save();
    g.strokeStyle = 'rgba(216,172,99,.95)';
    g.lineWidth = Math.max(1.2, W / 700);
    g.setLineDash([6, 5]);
    g.strokeRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
  }
}

/* ══════════════════════════════════════════════════════
   四、貼紙
   ══════════════════════════════════════════════════════ */

const svgCache = {};

function svgImage(key, svgString) {
  if (svgCache[key]) return Promise.resolve(svgCache[key]);
  return new Promise((resolve, reject) => {
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const img = new Image();
    img.onload = () => { svgCache[key] = img; resolve(img); };
    img.onerror = () => reject(new Error('svg ' + key));
    img.src = src;
  });
}

async function preloadSymbols() {
  const jobs = Object.keys(SYMBOLS).map((k) => {
    const s = SYMBOLS[k];
    const body = s.svg.replace(/\s+/g, ' ');
    const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}">${body}</svg>`;
    return svgImage(k, full).catch(() => null);
  });
  await Promise.all(jobs);
}

function buildTray() {
  const groups = {
    'tray-scene':   ['star', 'crown', 'angel', 'manger', 'jesus', 'cross', 'candle', 'dove', 'holly', 'bells', 'lace'],
    'tray-heaven':  ['sparkle', 'snow', 'dot', 'glow', 'halo', 'ribbon'],
    'tray-words':   []
  };

  Object.entries(groups).forEach(([id, keys]) => {
    const box = $(id);
    box.innerHTML = '';
    keys.forEach((key) => {
      const s = SYMBOLS[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sticker-btn';
      b.innerHTML = `<svg viewBox="0 0 ${s.w} ${s.h}" aria-hidden="true">${s.svg}</svg><span>${s.name}</span>`;
      b.setAttribute('aria-label', '加上' + s.name);
      b.addEventListener('click', () => addSticker(key, s.name));
      box.appendChild(b);
    });
  });

  /* 字句 —— 手繪字牌，用 canvas 畫，唔加外部字圖 */
  const words = $('tray-words');
  words.innerHTML = '';
  WORDS.forEach((w) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sticker-btn sticker-btn--word';
    b.innerHTML = `<svg viewBox="0 0 200 70" aria-hidden="true">
        <rect x="1" y="1" width="198" height="68" rx="4" fill="#12261F" opacity=".08"/>
        <text x="100" y="44" font-family="Noto Serif TC, Songti TC, serif" font-size="30"
              font-weight="500" fill="#12261F" text-anchor="middle">${w.text}</text>
      </svg><span>${w.text}</span>`;
    b.setAttribute('aria-label', '加上「' + w.text + '」');
    b.addEventListener('click', () => addWord(w));
    words.appendChild(b);
  });
}

function addSticker(sym, name) {
  const img = svgCache[sym];
  const st = {
    id: 's' + Date.now() + Math.random().toString(36).slice(2, 5),
    kind: 'svg', sym, name, img,
    x: 0.5, y: 0.5, scale: 1, rot: 0
  };
  /* 避開正中央堆疊：每次偏移少許 */
  const n = S.stickers.length;
  st.x = 0.5 + Math.cos(n * 1.9) * 0.16;
  st.y = 0.5 + Math.sin(n * 1.9) * 0.12;
  S.stickers.push(st);
  S.selected = st.id;
  drawCard();
  toast('加上「' + name + '」');
}

function addWord(w) {
  const st = {
    id: 'w' + Date.now() + Math.random().toString(36).slice(2, 5),
    kind: 'word', text: w.text, name: w.text,
    x: 0.5, y: 0.8, scale: 1.15, rot: 0, light: S.frame === 'verse' || S.frame === 'gold'
  };
  S.stickers.push(st);
  S.selected = st.id;
  drawCard();
}

function drawCard() {
  card.width = 900; card.height = 600;
  paintCard(ctx, 900, 600);
}

/* ── 拖動／縮放 ────────────────────────────────────────── */
function cardPoint(ev) {
  const r = card.getBoundingClientRect();
  const t = ev.touches ? ev.touches[0] : ev;
  return {
    x: ((t.clientX - r.left) / r.width),
    y: ((t.clientY - r.top) / r.height)
  };
}

function hitTest(p) {
  /* 由上層往下搵 */
  for (let i = S.stickers.length - 1; i >= 0; i--) {
    const st = S.stickers[i];
    const r = st.scale * 0.16;
    if (Math.abs(p.x - st.x) < r && Math.abs(p.y - st.y) < r * 1.1) return st;
  }
  return null;
}

card.addEventListener('pointerdown', (e) => {
  const p = cardPoint(e);
  const hit = hitTest(p);
  if (hit) {
    S.selected = hit.id;
    S.stickers = S.stickers.filter((s) => s !== hit).concat([hit]);
    S.drag = { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
    card.setPointerCapture && card.setPointerCapture(e.pointerId);
  } else {
    S.selected = null;
  }
  drawCard();
});

card.addEventListener('pointermove', (e) => {
  if (!S.drag) return;
  const p = cardPoint(e);
  const st = S.stickers.find((s) => s.id === S.drag.id);
  if (!st) return;
  st.x = Math.min(1, Math.max(0, p.x - S.drag.dx));
  st.y = Math.min(1, Math.max(0, p.y - S.drag.dy));
  drawCard();
});

['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
  card.addEventListener(ev, () => { S.drag = null; })
);

/* 雙指縮放／旋轉（iPad 主用法） */
card.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 2) return;
  e.preventDefault();
  const st = S.stickers.find((s) => s.id === S.selected);
  if (!st) return;

  const [a, b] = e.touches;
  const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const ang = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);

  if (!S.pinch || S.pinch.id !== st.id) {
    S.pinch = { id: st.id, dist, ang, scale: st.scale, rot: st.rot };
    return;
  }
  st.scale = Math.min(3, Math.max(0.35, S.pinch.scale * (dist / S.pinch.dist)));
  st.rot = S.pinch.rot + (ang - S.pinch.ang);
  drawCard();
}, { passive: false });

card.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) S.pinch = null;
});

/* ══════════════════════════════════════════════════════
   五、輸出 4R
   ══════════════════════════════════════════════════════ */

function exportCanvas() {
  const c = document.createElement('canvas');
  c.width = OUT_W; c.height = OUT_H;
  const g = c.getContext('2d');
  paintCard(g, OUT_W, OUT_H, { withStickers: true });
  return c;
}

async function finish() {
  if (!S.shot) { toast('未影相'); return; }
  busy(true, '輸出相紙');
  try {
    const c = exportCanvas();
    const url = c.toDataURL('image/png');

    const holder = $('done-canvas-holder');
    holder.innerHTML = '';
    c.style.width = '100%';
    c.style.height = 'auto';
    holder.appendChild(c);

    const a = $('btn-save');
    a.href = url;
    a.download = 'bethlehem-4R.png';

    /* iPad Safari：用 webkitdirectory 無用，改用長按 / 分享 */
    const shareBtn = $('btn-share');
    if (navigator.canShare && isIOS) {
      shareBtn.hidden = false;
      shareBtn.onclick = async () => {
        try {
          const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
          const file = new File([blob], 'bethlehem-4R.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '伯利恆照相館' });
          } else { toast('用「存到相片庫」再從相片分享'); }
        } catch (e) { /* 用戶取消，唔當錯 */ }
      };
    }

    goStage('done');
  } catch (err) {
    console.error(err);
    toast('輸出失敗，試下重新整理');
  } finally {
    busy(false);
  }
}

/* ══════════════════════════════════════════════════════
   六、流程控制
   ══════════════════════════════════════════════════════ */

function goStage(name) {
  S.stage = name;
  ['capture', 'paper', 'stickers', 'done'].forEach((s) => {
    const el = $('stage-' + s);
    if (el) el.hidden = (s !== name);
  });
  if (name === 'paper') { document.querySelector('#chips-filter .chip')?.focus?.(); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function goPaper() {
  await ensureFonts();
  buildChips();
  buildAIPanel();
  drawPreview();
  goStage('paper');
}

/* 字體未載好時 measureText 會用後備字體，字牌就會量錯。畫之前等一次。 */
let fontsReady = null;
function ensureFonts() {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([
          document.fonts.load(`500 48px ${FONT_SERIF}`),
          document.fonts.load(`300 48px ${FONT_SERIF}`),
          document.fonts.load(`400 16px ${FONT_SANS}`)
        ]);
        await document.fonts.ready;
      }
    } catch (e) { /* 無字體都要照行 */ }
  })();
  return fontsReady;
}

function goStickers() {
  buildTray();
  S.stickers = [];
  S.selected = null;
  drawCard();
  goStage('stickers');
}

function resetAll() {
  S.stickers = []; S.selected = null; S.shot = null;
  S.filter = 'none'; S.frame = 'gold';
  goStage('capture');
}

/* ── 綁定 ─────────────────────────────────────────────── */
$('btn-start').addEventListener('click', startCamera);
$('btn-countdown').addEventListener('click', startCountdown);
$('btn-retake').addEventListener('click', resetAll);
$('btn-to-stickers').addEventListener('click', goStickers);
$('btn-back-paper').addEventListener('click', () => { buildChips(); drawPreview(); goStage('paper'); });
$('btn-clear').addEventListener('click', () => { S.stickers = []; S.selected = null; drawCard(); });
$('btn-done').addEventListener('click', finish);
$('btn-again').addEventListener('click', resetAll);

/* ── 落雪（純裝飾，reduced-motion 會自動停） ───────────── */
function snow() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('snow');
  const glyphs = ['·', '✳', '❄'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('i');
    el.textContent = glyphs[i % glyphs.length];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.fontSize = (Math.random() * 7 + 7) + 'px';
    el.style.animationDuration = (Math.random() * 9 + 11) + 's';
    el.style.animationDelay = (Math.random() * 10) + 's';
    box.appendChild(el);
  }
}

/* ── 啟動 ─────────────────────────────────────────────── */
(async function boot() {
  snow();
  buildChips();
  await preloadSymbols();
  /* iPad Safari 一定要用戶手勢才開相機，唔好自動試 */
  /* 桌機靜靜試一次；失敗就留住「按一下，開啟相機」的狀態，唔彈錯誤 */
  if (!isIOS && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    Promise.race([
      startCamera({ quiet: true }),
      new Promise((r) => setTimeout(r, 8000))
    ]).catch(() => {}).finally(() => busy(false));
  }
})();
