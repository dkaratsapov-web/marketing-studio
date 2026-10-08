export const monolithVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  varying vec3 vNormalL;

  void main() {
    vNormalL = normal;
    vPosL = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/*
  Тёмный анодированный металл:
  - фейковое окружение по отражённому вектору (холодный купол, тёмный пол);
  - френель и светлые фаски по рёбрам;
  - блик от «фонаря», который следует за курсором;
  - цветной свет из шва (розовый слева, салатовый справа), зажигается сверху вниз (uIgnite)
    и разгорается при раскрытии (uOpen).
*/
export const monolithFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform float uIgnite;
  uniform float uSide;
  uniform vec3 uHalf;
  uniform vec3 uLight;
  uniform vec3 uLime;
  uniform vec3 uPink;

  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  varying vec3 vNormalL;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 R = reflect(-V, N);
    vec3 nL = normalize(vNormalL);

    // Окружение: холодный купол, тёмный пол, софтбокс сверху слева
    float sky = smoothstep(-0.2, 0.9, R.y);
    vec3 env = mix(vec3(0.012, 0.013, 0.016), vec3(0.20, 0.22, 0.26), sky);
    float box = smoothstep(0.8, 0.98, dot(R, normalize(vec3(-0.55, 0.75, 0.35))));
    env += vec3(0.55, 0.58, 0.64) * box * 0.5;

    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

    // Шлифовка: вертикальная фактура слабо модулирует блик
    float brushed = hash(floor(vPosL.y * 160.0)) * 0.018;

    // Блик от курсора, вытянутый по вертикали как на шлифованном металле
    vec3 L = normalize(uLight - vPosW);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 48.0) * (0.75 + brushed * 14.0);

    // Расстояние до ближайшего ребра на текущей грани
    vec3 an = abs(nL);
    vec3 d = uHalf - abs(vPosL);
    float ed = min(min(mix(d.x, 9.0, step(0.5, an.x)), mix(d.y, 9.0, step(0.5, an.y))),
                   mix(d.z, 9.0, step(0.5, an.z)));
    float edge = 1.0 - smoothstep(0.0, 0.014, ed);

    vec3 base = vec3(0.026, 0.028, 0.033) + brushed;
    vec3 col = base + env * (0.16 + fres * 0.9);
    col += vec3(0.82, 0.86, 0.92) * spec * (0.25 + fres * 0.8);
    col += vec3(0.72, 0.76, 0.82) * edge * (0.06 + fres * 0.4 + spec * 0.6);

    // Зажигание шва сверху вниз
    float yn = vPosL.y / (2.0 * uHalf.y) + 0.5;
    float th = 1.0 - uIgnite * 1.15;
    float lit = smoothstep(th - 0.04, th + 0.04, yn);
    // Яркая «искра» на фронте зажигания
    float spark = exp(-pow((yn - th) * 30.0, 2.0)) * step(0.001, uIgnite) * (1.0 - step(0.999, uIgnite));

    // Свет из шва: внутренняя грань половины смотрит на шов
    float inner = clamp(dot(nL, vec3(-uSide, 0.0, 0.0)), 0.0, 1.0);
    float nearSeam = exp(-abs(vPosL.x + uSide * uHalf.x) * 7.0);
    float glow = uOpen * (inner * 1.4 + nearSeam * 0.5) + edge * nearSeam * (0.25 + uOpen * 1.6);
    // Левая половина светится розовым, правая салатовым
    vec3 signal = uSide < 0.0 ? uPink : uLime;
    col += signal * (glow * lit) + vec3(1.0) * spark * nearSeam * 1.6;

    // Медленная сканирующая полоса
    float scanY = mod(uTime * 0.16, 1.6) - 0.3;
    float scan = exp(-pow((yn - scanY) * 40.0, 2.0));
    col += signal * scan * 0.14 * (0.3 + fres) * uIgnite;

    col = col / (col + vec3(0.9));
    col = pow(col, vec3(0.92));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const planeVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* Ядро света в шве, ореол и лучи, которые проливаются наружу при раскрытии */
export const seamFragment = /* glsl */ `
  uniform float uOpen;
  uniform float uIgnite;
  uniform float uGap;
  uniform float uTime;
  uniform vec2 uSize;
  uniform vec3 uLime;
  uniform vec3 uPink;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float ax = abs(p.x);

    float yn = vUv.y;
    float th = 1.0 - uIgnite * 1.15;
    float lit = smoothstep(th - 0.03, th + 0.03, yn);
    float yFade = smoothstep(0.0, 0.1, yn) * smoothstep(1.0, 0.9, yn);

    float w = 0.012 + uGap * 0.5;
    float core = exp(-pow(ax / w, 2.0));
    float halo = exp(-ax / (0.08 + uGap * 0.9)) * 0.4;

    // Горизонтальные лучи: искривлённый шум вдоль высоты, без регулярной «лесенки»
    float warp = sin(p.y * 3.1 + uTime * 0.21) * 1.7 + sin(p.y * 5.7 - uTime * 0.13);
    float n1 = 0.5 + 0.5 * sin(p.y * 13.7 + warp + uTime * 0.45);
    float n2 = 0.5 + 0.5 * sin(p.y * 31.9 - warp * 1.3 - uTime * 0.7);
    float rays = pow(n1 * n2, 2.5) * exp(-ax * 1.3) * uOpen * uOpen * 0.4;

    float flicker = 0.95 + 0.05 * sin(uTime * 3.1 + p.y * 9.0);
    float k = (core * (0.25 + uOpen * 0.6) + halo * (0.15 + uOpen * 0.8) + rays) * yFade * lit * flicker;
    // Розовый слева, салатовый справа, белое ядро в центре
    vec3 tint = mix(uPink, uLime, smoothstep(-0.25, 0.25, p.x));
    vec3 col = mix(tint, vec3(1.0), core * 0.8);
    gl_FragColor = vec4(col * k, k);
  }
`;

/* Пол: тёмная гладь с пятном света и отражением шва */
export const floorFragment = /* glsl */ `
  uniform float uOpen;
  uniform float uIgnite;
  uniform vec2 uSize;
  uniform vec3 uLime;
  uniform vec3 uPink;
  varying vec2 vUv;

  void main() {
    // x вправо, y к зрителю
    vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
    float r = length(p * vec2(1.0, 1.5));

    float pool = exp(-r * 1.5) * (0.12 + uOpen * 0.9) * uIgnite;
    float streak = exp(-abs(p.x) * (26.0 - uOpen * 14.0)) * exp(-max(p.y, 0.0) * 0.55)
                 * step(0.0, p.y) * (0.2 + uOpen * 1.1) * uIgnite;
    float horizon = exp(-r * 0.45) * 0.55;

    vec3 tint = mix(uPink, uLime, smoothstep(-0.6, 0.6, p.x));
    vec3 col = vec3(0.03) * horizon + tint * pool + mix(tint, vec3(1.0), 0.4) * streak;
    float a = clamp(horizon * 0.9 + pool + streak, 0.0, 1.0) * smoothstep(1.0, 0.55, r / (uSize.x * 0.5));
    gl_FragColor = vec4(col, a);
  }
`;

export const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpen;
  uniform vec3 uSeam;
  attribute float aSeed;
  varying float vAlpha;
  varying float vHeat;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vec3 p = position;
    p.y += mod(uTime * (0.03 + aSeed * 0.05) + aSeed * 10.0, 8.0) - 4.0;
    p.x += sin(uTime * 0.2 + aSeed * 6.28) * 0.15;

    // У шва пыль нагревается и подтягивается к свету
    float dx = p.x - uSeam.x;
    float heat = exp(-abs(dx) * 1.3) * uOpen;
    p.x -= dx * heat * 0.25;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.2 + aSeed * 2.4) * (1.0 + heat * 0.8) * uPixelRatio * (6.0 / -mv.z);
    vAlpha = (0.22 + aSeed * 0.5) * (1.0 + heat * 2.5);
    vHeat = heat;
  }
`;

export const dustFragment = /* glsl */ `
  uniform vec3 uLime;
  uniform vec3 uPink;
  varying float vAlpha;
  varying float vHeat;
  varying float vSeed;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    vec3 signal = vSeed > 0.5 ? uLime : uPink;
    vec3 col = mix(vec3(0.8), signal, clamp(0.2 + vHeat * 1.5, 0.0, 1.0));
    gl_FragColor = vec4(col * a, a);
  }
`;
