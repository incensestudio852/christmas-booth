/**
 * 伯利恆照相館 · AI 風格轉換 Worker
 * ------------------------------------------------------------
 * 瀏覽器唔可以直接呼叫 HKUST gateway（無 CORS），所以經這個 Worker 轉發。
 * API key 只存在 Worker secret 裡，永遠唔會送到前端。
 *
 * 部署：
 *   cd worker
 *   npx wrangler secret put HKUST_KEY
 *   npx wrangler deploy
 *
 * 前端只要填：
 *   AI_ENDPOINT = 'https://bethlehem-ai.<你>.workers.dev'
 *
 * 端點：
 *   POST /style    { image: dataURL, style } → { image, cached, credit }
 *   GET  /balance                            → { credit }
 *
 * 成本：每次風格轉換約 0.31 credit（實測）。
 * 快取策略：同一張相（perceptual-ish 雜湊）+ 同一風格 → 直接回舊圖，唔再扣。
 */

const GATEWAY = 'https://hkust.azure-api.net/hkust-genai/v1';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const COST_PER_IMAGE = 0.31;

/* ── 風格庫 ─────────────────────────────────────────────
   每個風格都要求「保留身份」，只換畫風。
   PRESERVE 是關鍵：無這段，模型會自己作一個人出來。
   ───────────────────────────────────────────────────── */
const PRESERVE =
  'CRITICAL — preserve identity: the same person, the same face, the same facial features, ' +
  'same eyes, same nose, same lips, same skin tone, same hairstyle and hair colour, same head angle, ' +
  'same expression, same framing and crop. Only the rendering style changes. ' +
  'Do not add or remove people. Do not change the pose. No text, no lettering, no watermark, no border. ';

const STYLES = {
  /* 教堂活動用：溫柔、莊重，唔誇張 */
  shinkai: {
    name: '新海誠',
    prompt: 'Restyle this photograph as a Makoto Shinkai anime film still: anime cel shading with ' +
            'soft gradients, luminous rim light, deep blue sky with warm sunset glow, gentle lens ' +
            'bloom, delicate hair highlights, cinematic warmth. '
  },
  storybook: {
    name: '繪本水彩',
    prompt: 'Restyle this photograph as a gentle children\u2019s bible storybook watercolour ' +
            'illustration: soft ink outlines, muted ivory sage and dusty blue washes, visible ' +
            'cold-press paper grain, tender light. '
  },
  ivory: {
    name: '象牙攝影',
    prompt: 'Restyle this photograph as a warm monochrome studio portrait: desaturated ivory and ' +
            'sepia toning, soft directional window light, fine film grain, gentle falloff, ' +
            'quiet and reverent. '
  },
  /* 玩味一點的，給小朋友 */
  comic: {
    name: '英雄漫畫',
    prompt: 'Restyle this photograph as a Marvel comic-book illustration: bold ink outlines, ' +
            'dramatic cross-hatched shadow, saturated heroic colour palette, halftone dot texture, ' +
            'dynamic rim lighting. '
  }
};

/* 只准自己的前端呼叫 */
const ALLOWED_ORIGINS = [
  'https://incensestudio852.github.io',
  'http://127.0.0.1:8899',
  'http://localhost:8899'
];

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  };
}

/* Cloudflare 出外網偶爾會回 1042（DNS 抖動）。重試三次，仍然失敗就當作暫時不可用。 */
async function gw(env, path, opts = {}) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(GATEWAY + path, {
        ...opts,
        headers: { 'api-key': env.HKUST_KEY, ...(opts.headers || {}) },
        cf: { cacheTtl: 0 }
      });
      if (r.ok) return r;
      lastErr = new Error('gateway ' + r.status);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  throw lastErr;
}

/* 餘額讀不到就回 null：前端唔顯示數字，其餘功能照常 */
async function balance(env) {
  try {
    const r = await gw(env, '/balance');
    const j = await r.json();
    const c = Number(j.credit);
    return Number.isFinite(c) ? c : null;
  } catch (e) {
    console.warn('balance failed:', e && e.message);
    return null;
  }
}

/* 圖片內容的短雜湊，用來做快取鍵（唔需要密碼學強度） */
async function hashImage(dataURL) {
  const body = dataURL.split(',')[1] || '';
  const buf = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function transform(image, style, env) {
  const s = STYLES[style];
  if (!s) throw new Error('unknown style');

  const key = `t:${style}:${await hashImage(image)}`;

  /* 1. 快取命中：唔使花錢 */
  if (env.SCENES) {
    const hit = await env.SCENES.get(key);
    if (hit) return { image: hit, cached: true };
  }

  /* 2. 呼叫模型：文字指令 + 原相片 */
  const body = {
    model: IMAGE_MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: s.prompt + PRESERVE },
        { type: 'image_url', image_url: { url: image } }
      ]
    }]
  };

  const r = await gw(env, '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const j = await r.json();
  const out = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!out || !out.startsWith('data:image')) throw new Error('no image');

  /* 3. 存快取（7 日），同一張相重按唔會再扣 credit */
  if (env.SCENES) await env.SCENES.put(key, out, { expirationTtl: 60 * 60 * 24 * 7 });

  return { image: out, cached: false };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = { ...cors(origin), 'Content-Type': 'application/json' };

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    const url = new URL(request.url);

    try {
      if (url.pathname === '/balance') {
        const credit = await balance(env);
        return new Response(JSON.stringify({ credit }), { headers });
      }

      /* 風格清單，前端可以據此建按鈕 */
      if (url.pathname === '/styles') {
        const list = Object.entries(STYLES).map(([id, s]) => ({ id, name: s.name }));
        return new Response(JSON.stringify({ styles: list }), { headers });
      }

      if (url.pathname === '/style' && request.method === 'POST') {
        const { image, style } = await request.json();
        if (!image || !String(image).startsWith('data:image')) {
          return new Response(JSON.stringify({ error: 'image required' }), { status: 400, headers });
        }
        if (!STYLES[style]) {
          return new Response(JSON.stringify({ error: 'unknown style' }), { status: 400, headers });
        }

        const out = await transform(image, style, env);
        const credit = await balance(env);
        return new Response(JSON.stringify({
          image: out.image,
          cached: out.cached,
          credit,
          spent: out.cached ? 0 : COST_PER_IMAGE
        }), { headers });
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
    } catch (err) {
      /* 前端收到 5xx 就自動退回本機光線，唔會卡住訪客 */
      return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 502, headers });
    }
  }
};
