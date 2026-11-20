// Иллюстрация для макетов объявлений: каркасный дом-барнхаус на участке. Своя, без чужих фото.
// mood: 'day' — светлое небо, 'evening' — закат и тёплый свет в окнах.
let uid = 0;
function house(mood = 'day', { w = 400, h = 260 } = {}) {
  const id = `h${uid++}`;
  const sky = mood === 'evening' ? ['#f6c58f', '#f2a978', '#c98fa0'] : ['#bcd9ee', '#dcebf5', '#f3f1e8'];
  const glass = mood === 'evening' ? ['#ffe2a3', '#ffb55c'] : ['#9fc3d9', '#d9e9f2'];
  const grass = mood === 'evening' ? ['#6d7f45', '#3f4f2a'] : ['#8fb35a', '#5f8a3a'];
  const pine = mood === 'evening' ? '#2c3a2a' : '#35553a';
  const pine2 = mood === 'evening' ? '#3a4a33' : '#45694a';
  // фасад: фронтон слева (x 110–200), боковая стена уходит вправо со сдвигом вверх
  const SK = -3.88; // наклон боковой стены, градусы
  const frontBoards = Array.from({ length: 13 }, (_, i) => {
    const x = 116 + i * 7;
    const top = x <= 155 ? 130 - (x - 110) * (68 / 45) : 130 - (200 - x) * (68 / 45);
    return `<line x1="${x}" y1="${top + 3}" x2="${x}" y2="214" stroke="#9c7650" stroke-width=".8" opacity=".5"/>`;
  }).join('');
  const sideBoards = Array.from({ length: 17 }, (_, i) => `<line x1="${6 + i * 7}" y1="130" x2="${6 + i * 7}" y2="214" stroke="#8d6a47" stroke-width=".8" opacity=".5"/>`).join('');
  const tree = (x, y, s, c) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="0" width="4" height="16" fill="#4a3426"/><path d="M0 -70 L18 -38 H10 L24 -14 H12 L28 6 H-28 L-12 -14 H-24 L-10 -38 H-18 Z" fill="${c}"/></g>`;
  return `<svg viewBox="0 0 400 260" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%">
  <defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".6" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${grass[0]}"/><stop offset="1" stop-color="${grass[1]}"/></linearGradient>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${glass[0]}"/><stop offset="1" stop-color="${glass[1]}"/></linearGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9b48a"/><stop offset="1" stop-color="#c49a6c"/></linearGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3f45"/><stop offset="1" stop-color="#23272c"/></linearGradient>
  </defs>
  <rect width="400" height="260" fill="url(#${id}s)"/>
  ${mood === 'evening' ? '<circle cx="330" cy="70" r="26" fill="#ffe7b8" opacity=".85"/>' : '<circle cx="335" cy="52" r="20" fill="#fff8dc" opacity=".9"/>'}
  <path d="M0 170 Q60 150 120 160 T240 156 T400 162 V260 H0 Z" fill="${pine2}" opacity=".55"/>
  ${tree(36, 196, 1.15, pine)}${tree(70, 200, 0.9, pine2)}${tree(352, 198, 1.2, pine)}${tree(384, 204, 0.85, pine2)}${tree(318, 206, 0.75, pine2)}
  <rect x="0" y="206" width="400" height="54" fill="url(#${id}g)"/>
  <!-- тень дома -->
  <ellipse cx="212" cy="222" rx="126" ry="7" fill="#000" opacity=".18"/>
  <!-- боковая стена -->
  <g transform="translate(200 0) skewY(${SK})">
    <rect x="0" y="130" width="118" height="84" fill="#bf9468"/>
    ${sideBoards}
    <rect x="18" y="146" width="28" height="44" fill="url(#${id}w)" stroke="#2b2f33" stroke-width="3"/>
    <rect x="64" y="146" width="40" height="44" fill="url(#${id}w)" stroke="#2b2f33" stroke-width="3"/>
    <path d="M32 146 V190 M84 146 V190" stroke="#2b2f33" stroke-width="2"/>
  </g>
  <!-- скат кровли -->
  <path d="M153 58 L271 50 L324 126 L204 134 Z" fill="url(#${id}r)"/>
  <path d="M204 134 L324 126" stroke="#1b1e22" stroke-width="2.5"/>
  <!-- фронтон -->
  <path d="M110 214 V130 L155 62 L200 130 V214 Z" fill="url(#${id}f)"/>
  ${frontBoards}
  <!-- торцевая планка кровли -->
  <path d="M104 134 L155 57 L206 134" fill="none" stroke="#2b2f33" stroke-width="5" stroke-linejoin="miter"/>
  <!-- панорамное окно во фронтоне -->
  <path d="M130 214 V146 L155 108 L180 146 V214 Z" fill="url(#${id}w)"/>
  <path d="M155 108 V214 M130 168 H180" stroke="#2b2f33" stroke-width="2.4" fill="none"/>
  <path d="M130 214 V146 L155 108 L180 146 V214 Z" fill="none" stroke="#2b2f33" stroke-width="3" stroke-linejoin="miter"/>
  ${mood === 'evening' ? '<path d="M130 214 H180 L196 236 H114 Z" fill="#ffcf7a" opacity=".22"/>' : ''}
  <!-- терраса -->
  <path d="M100 214 H200 L318 206 L330 214 L210 224 H92 Z" fill="#8a6446"/>
  <path d="M92 224 H210 L330 214 V218 L210 228 H92 Z" fill="#6e4f37"/>
  <!-- дорожка -->
  <path d="M168 228 L150 260 H196 L190 228 Z" fill="#cfc4b3" opacity=".9"/>
</svg>`;
}
module.exports = { house };
