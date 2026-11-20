/* ============================================================
   伯利恆照相館 · 符號庫
   全部純 SVG，無外部檔案，輸出時按尺寸重畫，4R 沖印清晰。
   刻意不含：聖誕老人、馴鹿、雪橇、商業禮品、雪花商人。
   ============================================================ */

/* 每個 SVG 只用平塗色：<img> 載入時 url(#id) 跨圖會失效 */
function wrapSVG(key, body) {
  const s = SYMBOLS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}">${body}</svg>`;
}

const SYMBOLS = {

  /* ── 伯利恆之星 ──────────────────────────────────────── */
  star: { name: '伯利恆之星', w: 200, h: 200, svg: `
    <defs><radialGradient id="sg"><stop offset="0%" stop-color="#FFF6D8" stop-opacity=".85"/><stop offset="42%" stop-color="#F0C870" stop-opacity=".28"/><stop offset="100%" stop-color="#F0C870" stop-opacity="0"/></radialGradient></defs>
    <circle cx="100" cy="104" r="96" fill="url(#sg)"/>
    <g stroke="#FFF6D8" stroke-width="3" stroke-linecap="round" opacity=".55">
      <line x1="100" y1="14" x2="100" y2="0"/><line x1="100" y1="194" x2="100" y2="208"/>
      <line x1="14" y1="104" x2="0" y2="104"/><line x1="186" y1="104" x2="200" y2="104"/>
      <line x1="42" y1="144" x2="32" y2="154"/><line x1="158" y1="144" x2="168" y2="154"/>
      <line x1="42" y1="64" x2="32" y2="54"/><line x1="158" y1="64" x2="168" y2="54"/>
    </g>
    <path d="M100 22 L117 81 L178 98 L117 115 L100 174 L83 115 L22 98 L83 81 Z"
          fill="#DFB26A" stroke="#FFF3D0" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M100 44 L110 86 L152 98 L110 110 L100 152 L90 110 L48 98 L90 86 Z"
          fill="#FFF6D8" opacity=".62"/>
    <circle cx="100" cy="98" r="9" fill="#FFFDF8"/>
  `},

  /* ── 冠冕（馬槽上的金光環狀冠，不是商業皇冠） ─────────── */
  crown: { name: '金冠', w: 160, h: 120, svg: `
    <path d="M22 96 L12 46 Q12 40 18 44 L46 66 L74 26 Q80 18 86 26 L114 66 L142 44 Q148 40 148 46 L138 96 Z"
          fill="#DFB26A" stroke="#FFF3D0" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="18" y="94" width="124" height="13" rx="3" fill="#C79A52"/>
    <circle cx="80" cy="22" r="6" fill="#FFF6D8"/>
    <circle cx="47" cy="100" r="3.6" fill="#FFF6D8" opacity=".9"/>
    <circle cx="80" cy="100" r="4" fill="#A63A2E" opacity=".85"/>
    <circle cx="113" cy="100" r="3.6" fill="#FFF6D8" opacity=".9"/>
  `},

  /* ── 天使（無臉，翅膀與光環） ────────────────────────── */
  angel: { name: '天使', w: 200, h: 210, svg: `
    <defs><radialGradient id="an"><stop offset="0%" stop-color="#FFF6D8" stop-opacity=".9"/><stop offset="100%" stop-color="#F0C870" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="60" r="56" fill="url(#an)"/>
    <ellipse cx="100" cy="30" rx="24" ry="6.5" fill="none" stroke="#E8C27A" stroke-width="4"/>
    <ellipse cx="100" cy="30" rx="24" ry="6.5" fill="none" stroke="#FFF6D8" stroke-width="1.4"/>
    <!-- 翅膀 -->
    <path d="M96 78 C64 66 26 84 12 132 C32 126 44 132 52 144 C62 130 76 122 94 118 Z"
          fill="#FBF6EC" stroke="#E3D6BC" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M104 78 C136 66 174 84 188 132 C168 126 156 132 148 144 C138 130 124 122 106 118 Z"
          fill="#FBF6EC" stroke="#E3D6BC" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M84 86 C56 82 26 100 18 128 M78 104 C54 104 30 116 24 134"
          fill="none" stroke="#D9CBB0" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M116 86 C144 82 174 100 182 128 M122 104 C146 104 170 116 176 134"
          fill="none" stroke="#D9CBB0" stroke-width="1.8" stroke-linecap="round"/>
    <!-- 長袍 -->
    <path d="M100 64 C86 64 76 74 74 90 L62 190 Q100 200 138 190 L126 90 C124 74 114 64 100 64 Z"
          fill="#FBF6EC" stroke="#E3D6BC" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M100 70 C94 108 94 154 100 192" fill="none" stroke="#D9CBB0" stroke-width="2"/>
    <path d="M88 74 Q76 94 74 108 M112 74 Q124 94 126 108"
          fill="none" stroke="#D9CBB0" stroke-width="2" stroke-linecap="round"/>
    <!-- 頭 -->
    <circle cx="100" cy="52" r="17" fill="#F3DCC0" stroke="#E0C49F" stroke-width="1.4"/>
    <path d="M83 50 Q83 32 100 32 Q117 32 117 50 Q110 44 100 44 Q90 44 83 50 Z" fill="#8E6B3A" opacity=".5"/>
  `},

  /* ── 馬槽 ────────────────────────────────────────────── */
  manger: { name: '馬槽', w: 190, h: 160, svg: `
    <path d="M22 68 L95 16 L168 68" fill="none" stroke="#9A7444" stroke-width="10"
          stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="34" y1="62" x2="34" y2="140" stroke="#7A5730" stroke-width="8" stroke-linecap="round"/>
    <line x1="156" y1="62" x2="156" y2="140" stroke="#7A5730" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 66 Q95 40 150 66" fill="none" stroke="#6B4E28" stroke-width="3" opacity=".5"/>
    <!-- 草 -->
    <ellipse cx="95" cy="118" rx="58" ry="13" fill="#E0BE74"/>
    <g stroke="#B98B4E" stroke-width="2" stroke-linecap="round" opacity=".75">
      <path d="M52 114 L48 102 M62 112 L60 100 M130 112 L133 100 M140 114 L145 103 M95 110 L95 98"/>
    </g>
    <!-- 槽身 -->
    <path d="M44 116 L146 116 L132 152 Q95 160 58 152 Z" fill="#7A5730" stroke="#5C4222" stroke-width="2"/>
    <path d="M50 126 L140 138 M140 126 L50 138" stroke="#4E381C" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>
    <!-- 布 -->
    <path d="M74 113 Q95 96 116 113 Q95 124 74 113 Z" fill="#F7EBD6" stroke="#E3D6BC" stroke-width="1.6"/>
  `},

  /* ── 聖嬰 ────────────────────────────────────────────── */
  jesus: { name: '聖嬰', w: 190, h: 170, svg: `
    <defs><radialGradient id="js"><stop offset="0%" stop-color="#FFF6D8" stop-opacity=".9"/><stop offset="100%" stop-color="#F0C870" stop-opacity="0"/></radialGradient></defs><circle cx="95" cy="72" r="62" fill="url(#js)"/>
    <ellipse cx="95" cy="132" rx="62" ry="16" fill="#E0BE74"/>
    <g stroke="#B98B4E" stroke-width="2" stroke-linecap="round" opacity=".7">
      <path d="M46 130 L42 116 M58 128 L57 114 M132 128 L135 114 M146 130 L151 117"/>
    </g>
    <!-- 襁褓 -->
    <path d="M52 118 Q95 76 138 118 Q95 146 52 118 Z" fill="#FBF6EC" stroke="#E3D6BC" stroke-width="2"/>
    <path d="M62 116 L128 128 M128 112 L66 132" stroke="#E9DCBF" stroke-width="3" stroke-linecap="round"/>
    <!-- 頭 -->
    <circle cx="95" cy="80" r="26" fill="#F3DCC0" stroke="#DFC09A" stroke-width="1.6"/>
    <path d="M74 76 Q74 54 95 54 Q116 54 116 76 Q108 66 95 66 Q82 66 74 76 Z" fill="#B98A3E" opacity=".35"/>
    <path d="M85 79 Q88.5 75.5 92 79 M98 79 Q101.5 75.5 105 79"
          fill="none" stroke="#7A5630" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M89 90 Q95 95 101 90" fill="none" stroke="#B0714E" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="79" cy="86" r="4.2" fill="#E8A58C" opacity=".55"/>
    <circle cx="111" cy="86" r="4.2" fill="#E8A58C" opacity=".55"/>
    <!-- 小光環 -->
    <ellipse cx="95" cy="49" rx="16" ry="4.5" fill="none" stroke="#E8C27A" stroke-width="3"/>
  `},

  /* ── 十字架 ──────────────────────────────────────────── */
  cross: { name: '十字架', w: 110, h: 160, svg: `
    <rect x="46" y="16" width="18" height="128" rx="3" fill="#DFB26A"/>
    <rect x="19" y="52" width="72" height="18" rx="3" fill="#DFB26A"/>
    <rect x="50" y="16" width="5" height="128" fill="#FFF6D8" opacity=".55"/>
    <rect x="19" y="55" width="72" height="4" fill="#FFF6D8" opacity=".55"/>
  `},

  /* ── 鴿子 ────────────────────────────────────────────── */
  dove: { name: '鴿子', w: 180, h: 150, svg: `
    <!-- 上翼 -->
    <path d="M74 66 C92 34 128 20 148 30 C136 44 128 58 122 72 C108 78 90 76 74 66 Z"
          fill="#FFFDF8" stroke="#DED1B6" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- 身體 -->
    <path d="M52 70 C66 56 96 54 118 66 C132 74 138 88 134 100
             C128 116 108 124 88 122 C66 120 50 108 46 92 C44 82 46 74 52 70 Z"
          fill="#FBF6EC" stroke="#DED1B6" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- 尾 -->
    <path d="M54 94 L18 112 L30 96 L16 90 L56 82 Z" fill="#EFE4CC" stroke="#DED1B6" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- 下翼（陰影） -->
    <path d="M70 92 C84 84 108 86 120 96 C108 108 86 110 70 104 Z" fill="#E9DCC2" opacity=".9"/>
    <!-- 頭 -->
    <circle cx="132" cy="66" r="12" fill="#FFFDF8" stroke="#DED1B6" stroke-width="1.8"/>
    <circle cx="137" cy="64" r="2.6" fill="#5A4A32"/>
    <path d="M143 68 L154 71 L143 74 Z" fill="#DFB26A"/>
    <path d="M124 58 Q132 50 140 56" fill="none" stroke="#E8C27A" stroke-width="2.6" stroke-linecap="round"/>
    <!-- 橄欖枝 -->
    <path d="M140 76 Q158 84 166 100" fill="none" stroke="#4C6B4A" stroke-width="2.6" stroke-linecap="round"/>
    <g fill="#5E8055">
      <ellipse cx="149" cy="84" rx="7" ry="3.4" transform="rotate(28 149 84)"/>
      <ellipse cx="158" cy="93" rx="7" ry="3.4" transform="rotate(38 158 93)"/>
      <ellipse cx="151" cy="95" rx="6" ry="3" transform="rotate(-16 151 95)"/>
    </g>
  `},

  /* ── 燭光 ────────────────────────────────────────────── */
  candle: { name: '燭光', w: 100, h: 170, svg: `
    <circle cx="50" cy="46" r="44" fill="rgba(240,200,112,0.35)"/>
    <path d="M50 22 C62 40 62 54 50 64 C38 54 38 40 50 22 Z" fill="#F6D488"/>
    <path d="M50 34 C56 44 56 53 50 60 C44 53 44 44 50 34 Z" fill="#FFFDF6"/>
    <rect x="36" y="66" width="28" height="74" rx="3" fill="#FDF7EA"/>
    <rect x="36" y="66" width="9" height="74" fill="#FFFDF6"/>
    <path d="M36 70 Q50 76 64 70" fill="#F0E4CB"/>
    <rect x="28" y="138" width="44" height="10" rx="4" fill="#C79A52"/>
    <line x1="50" y1="66" x2="50" y2="60" stroke="#5C4222" stroke-width="2"/>
  `},

  /* ── 冬青 ────────────────────────────────────────────── */
  holly: { name: '冬青', w: 170, h: 150, svg: `
    <path d="M60 78 C40 60 26 36 34 30 C46 24 60 46 66 66 Z" fill="#2C5A40" stroke="#20412F" stroke-width="1.4"/>
    <path d="M80 70 C70 40 72 16 84 16 C96 20 98 46 92 70 Z" fill="#3A6E4E" stroke="#20412F" stroke-width="1.4"/>
    <path d="M100 78 C118 58 136 36 142 44 C148 54 128 72 110 84 Z" fill="#2C5A40" stroke="#20412F" stroke-width="1.4"/>
    <path d="M92 88 C104 74 122 66 128 72 C132 80 114 92 98 96 Z" fill="#3A6E4E" stroke="#20412F" stroke-width="1.4"/>
    <g fill="#A6392B">
      <circle cx="70" cy="102" r="13"/><circle cx="94" cy="108" r="13"/><circle cx="81" cy="122" r="13"/>
    </g>
    <g fill="#C25242" opacity=".85">
      <circle cx="66" cy="97" r="4"/><circle cx="90" cy="103" r="4"/><circle cx="77" cy="117" r="4"/>
    </g>
  `},

  /* ── 教堂鐘 ──────────────────────────────────────────── */
  bells: { name: '教堂鐘', w: 130, h: 170, svg: `
    <path d="M65 28 C40 28 31 58 31 86 C31 108 21 116 16 124 L114 124 C109 116 99 108 99 86
             C99 58 90 28 65 28 Z" fill="#DFB26A" stroke="#9E7530" stroke-width="2.6"/>
    <rect x="56" y="16" width="18" height="15" rx="4" fill="#9E7530"/>
    <circle cx="65" cy="138" r="12" fill="#9E7530"/>
    <circle cx="65" cy="138" r="4" fill="#C79A52"/>
    <path d="M43 48 C43 40 50 34 65 34" fill="none" stroke="#FFF6D8" stroke-width="4" opacity=".7"/>
    <line x1="16" y1="124" x2="114" y2="124" stroke="#8E6B3A" stroke-width="2" opacity=".5"/>
  `},

  /* ── 花邊 ────────────────────────────────────────────── */
  lace: { name: '花邊', w: 240, h: 70, svg: `
    <path d="M0 38 Q12 14 24 38 Q36 14 48 38 Q60 14 72 38 Q84 14 96 38 Q108 14 120 38
             Q132 14 144 38 Q156 14 168 38 Q180 14 192 38 Q204 14 216 38 Q228 14 240 38"
          fill="none" stroke="#FBF6EC" stroke-width="2.6" stroke-linecap="round"/>
    <line x1="0" y1="52" x2="240" y2="52" stroke="#FBF6EC" stroke-width="1.3" opacity=".55"/>
    <g fill="#FBF6EC" opacity=".8">
      <circle cx="24" cy="60" r="2.4"/><circle cx="72" cy="60" r="2.4"/>
      <circle cx="120" cy="60" r="2.4"/><circle cx="168" cy="60" r="2.4"/><circle cx="216" cy="60" r="2.4"/>
    </g>
  `},

  /* ── 天上 ────────────────────────────────────────────── */
  sparkle: { name: '星塵', w: 90, h: 90, svg: `
    <path d="M45 6 L53 37 L84 45 L53 53 L45 84 L37 53 L6 45 L37 37 Z" fill="#FFF6D8"/>
    <circle cx="45" cy="45" r="3.4" fill="#FFFFFF"/>
  `},

  snow: { name: '雪花', w: 110, h: 110, svg: `
    <g stroke="#FBF6EC" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M55 10 V100 M16 32 L94 78 M94 32 L16 78"/>
      <path d="M55 26 L45 34 M55 26 L65 34 M55 84 L45 76 M55 84 L65 76"/>
      <path d="M30 45 L38 40 M30 65 L38 70 M80 45 L72 40 M80 65 L72 70"/>
    </g>
  `},

  dot: { name: '圓點', w: 70, h: 70, svg: `
    <circle cx="35" cy="35" r="26" fill="#FBF6EC" opacity=".9"/>
    <circle cx="27" cy="27" r="8" fill="#FFFFFF" opacity=".7"/>
  `},

  glow: { name: '光芒', w: 240, h: 240, svg: `
    <defs><radialGradient id="gl"><stop offset="0%" stop-color="#FFF6D8" stop-opacity=".9"/><stop offset="30%" stop-color="#F0C870" stop-opacity=".42"/><stop offset="100%" stop-color="#F0C870" stop-opacity="0"/></radialGradient></defs>
    <circle cx="120" cy="120" r="118" fill="url(#gl)"/>
  `},

  halo: { name: '光環', w: 200, h: 90, svg: `
    <ellipse cx="100" cy="45" rx="78" ry="22" fill="none" stroke="#E8C27A" stroke-width="7"/>
    <ellipse cx="100" cy="45" rx="78" ry="22" fill="none" stroke="#FFF6D8" stroke-width="2.4"/>
    <ellipse cx="100" cy="45" rx="58" ry="15" fill="none" stroke="#F6DFA6" stroke-width="1.6" opacity=".7"/>
  `},

  ribbon: { name: '緞帶', w: 240, h: 82, svg: `
    <path d="M4 26 L236 26 L219 58 L120 44 L21 58 Z" fill="#DFB26A"/>
    <path d="M4 26 L236 26 L233 36 L7 36 Z" fill="#FFF6D8" opacity=".68"/>
    <path d="M21 58 L120 44 L219 58" fill="none" stroke="#9E7530" stroke-width="1.6" opacity=".5"/>
  `}
};


/* 字句：畫成墨色字牌，不是圖片 */
const WORDS = [
  { id: 'w1', text: '平安喜樂' },
  { id: 'w2', text: '以馬內利' },
  { id: 'w3', text: '主賜平安' },
  { id: 'w4', text: '伯利恆之星' }
];
