/**
 * Фоны первых экранов отраслевых страниц. У каждой отрасли свой свет:
 * рестораны — огни свечей не в фокусе, автобизнес — следы фар на длинной выдержке,
 * стройка — чертёжная сетка и размерные линии. Текстовая колонка слева всегда темнее.
 */

/** Рестораны: тёплые круги боке поднимаются, как огни свечей в зале. По скроллу вечер: огней больше */
export const CANDLES = `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float asp = uRes.x / uRes.y;
  vec3 col = vec3(0.);
  for (int i = 0; i < 26; i++) {
    float f = float(i);
    float h1 = hash(vec2(f, 1.3)), h2 = hash(vec2(f, 7.1)), h3 = hash(vec2(f, 3.7));
    float depth = 0.4 + h3 * 0.6;
    vec2 c = vec2((0.25 + h1 * 0.8) * asp, fract(h2 + uTime * 0.012 * depth) * 1.4 - 0.2);
    c += (uPtr - 0.5) * 0.05 * depth;
    float r = 0.035 + depth * 0.075;
    float d = length(uv - c);
    float disc = smoothstep(r, r * 0.86, d);
    float rim = 0.55 + 0.45 * smoothstep(r * 0.55, r, d);
    float flick = 0.75 + 0.25 * sin(uTime * (1.7 + h1 * 2.3) + f * 3.1) * sin(uTime * 1.1 + h2 * 9.);
    // Вечер наступает: огни зажигаются по очереди с прогрессом
    float on = smoothstep(h3 - 0.08, h3 + 0.02, 0.35 + uProg * 0.75);
    vec3 warm = mix(vec3(1., .58, .22), vec3(1., .84, .58), h2);
    col += warm * disc * rim * flick * on * (0.2 + 0.12 * (1. - depth));
  }
  // Текстовая колонка слева темнее
  float side = smoothstep(0.15, 0.75, gl_FragCoord.x / uRes.x);
  col *= 0.25 + 0.75 * side;
  float a = clamp(max(col.r, max(col.g, col.b)), 0., 1.);
  gl_FragColor = vec4(col, a);
}`;

/** Автобизнес: полосы фар на длинной выдержке. Белые фары едут на зрителя, розовые стопы уходят вдаль */
export const TRAILS = `
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float asp = uRes.x / uRes.y;
  vec2 vp = vec2(0.74 * asp, 0.5) + (uPtr - 0.5) * vec2(0.06, 0.03);
  vec2 q = uv - vp;
  float r = length(q);
  float ang = atan(q.y, q.x);
  vec3 col = vec3(0.);
  float speed = 0.35 + uProg * 0.9;
  for (int i = 0; i < 9; i++) {
    float f = float(i);
    float la = -3.14159 * (0.12 + 0.76 * (f + 0.5) / 9.);
    float h = hash(vec2(f, 2.9));
    float w = 0.0015 + r * 0.01;
    float dist = abs(sin(ang - la)) * r;
    float line = exp(-dist / w) * step(0., cos(ang - la));
    bool oncoming = la > -1.5708;
    // Перспектива: штрихи по логарифму расстояния, ускоряются к зрителю
    float s = fract(log(r + 0.02) * 1.6 + (oncoming ? -1. : 1.) * uTime * speed * (0.6 + h * 0.6) + h * 5.);
    float dash = smoothstep(0., 0.08, s) * smoothstep(0.75, 0.25, s);
    vec3 tint = oncoming ? vec3(1., .96, .9) : vec3(1., .3, .6);
    col += tint * line * dash * smoothstep(0.02, 0.25, r) * (0.55 + 0.35 * h);
  }
  // Тонкий горизонт и свечение у точки схода
  col += vec3(1., .8, .6) * exp(-abs(q.y) * 220.) * 0.06 * smoothstep(0.9, 0.0, abs(q.x));
  col += vec3(1., .85, .7) * exp(-r * 9.) * 0.08;
  float side = smoothstep(0.2, 0.8, gl_FragCoord.x / uRes.x);
  col *= 0.15 + 0.85 * side;
  col = min(col, vec3(1.));
  float a = clamp(max(col.r, max(col.g, col.b)), 0., 1.);
  gl_FragColor = vec4(col, a);
}`;

/** Стройка: чертёжная сетка уходит в перспективу и медленно плывёт, над ней парят размерные линии */
export const BLUEPRINT = `
float gridLine(vec2 c, float w){
  vec2 g = abs(fract(c - 0.5) - 0.5) / w;
  return 1. - min(min(g.x, g.y), 1.);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float asp = uRes.x / uRes.y;
  vec3 col = vec3(0.);
  float horizon = 0.62 + (uPtr.y - 0.5) * 0.03 - uProg * 0.08;
  float y = horizon - uv.y;
  if (y > 0.002) {
    float z = 0.35 / y;
    float rot = -0.35 + uProg * 0.25 + (uPtr.x - 0.5) * 0.08;
    vec2 p = vec2((uv.x - 0.72 * asp) * z, z + uTime * 0.12);
    p = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * p;
    float fade = exp(-z * 0.3) * smoothstep(0.02, 0.2, y);
    float minor = gridLine(p * 2., 0.035 * z);
    float major = gridLine(p * 0.4, 0.018 * z);
    col += vec3(1.) * minor * 0.16 * fade;
    col += vec3(.77, .96, .26) * major * 0.26 * fade;
  }
  // Размерные линии с засечками, парят и медленно поднимаются
  for (int i = 0; i < 7; i++) {
    float f = float(i);
    float h1 = hash(vec2(f, 4.2)), h2 = hash(vec2(f, 8.8)), h3 = hash(vec2(f, 1.9));
    float yy = fract(h1 + uTime * 0.008 * (0.5 + h3)) * 1.1 - 0.05;
    float x0 = (0.45 + h2 * 0.4) * asp, len = 0.12 + h3 * 0.22;
    float x1 = min(x0 + len, asp * 0.98);
    float inX = step(x0, uv.x) * step(uv.x, x1);
    float ln = exp(-abs(uv.y - yy) * 900.) * inX;
    float tick = (exp(-abs(uv.x - x0) * 900.) + exp(-abs(uv.x - x1) * 900.)) * step(abs(uv.y - yy), 0.012);
    float life = sin(fract(h1 + uTime * 0.008 * (0.5 + h3)) * 3.14159);
    col += vec3(1.) * (ln * 0.35 + tick * 0.5) * life;
  }
  float side = smoothstep(0.3, 0.75, gl_FragCoord.x / uRes.x);
  col *= 0.12 + 0.88 * side;
  col = min(col, vec3(1.));
  float a = clamp(max(col.r, max(col.g, col.b)), 0., 1.);
  gl_FragColor = vec4(col, a);
}`;
