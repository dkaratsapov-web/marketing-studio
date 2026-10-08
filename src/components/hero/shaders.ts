export const monolithVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  varying vec3 vNormalL;

  void main() {
    vNormalL = normal;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    vPosL = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/*
  Тёмный анодированный металл:
  - фейковое окружение по отражённому вектору (холодный купол, тёмный пол);
  - френель по краям;
  - тонкая горизонтальная фактура шлифовки;
  - янтарный свет из шва, который сильнее на внутренних гранях;
  - медленная сканирующая полоса.
*/
export const monolithFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform float uSide;
  uniform vec3 uSignal;

  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;
  varying vec3 vNormalL;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 R = reflect(-V, N);

    // Окружение
    float sky = smoothstep(-0.2, 0.9, R.y);
    vec3 env = mix(vec3(0.012, 0.013, 0.016), vec3(0.20, 0.22, 0.26), sky);
    // Мягкий софтбокс сверху слева
    float box = smoothstep(0.78, 0.98, dot(R, normalize(vec3(-0.55, 0.75, 0.35))));
    env += vec3(0.55, 0.58, 0.64) * box * 0.55;

    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

    // Шлифовка
    float brushed = hash(floor(vPosL.y * 160.0)) * 0.018;

    vec3 base = vec3(0.028, 0.03, 0.035) + brushed;
    vec3 col = base + env * (0.18 + fres * 0.9);

    // Свет из шва: внутренняя грань половины смотрит на шов
    float inner = clamp(dot(normalize(vNormalL), vec3(-uSide, 0.0, 0.0)), 0.0, 1.0);
    float nearSeam = exp(-abs(vPosL.x + uSide * 0.25) * 7.0);
    float seamGlow = uOpen * (inner * 1.4 + nearSeam * 0.45);
    col += uSignal * seamGlow;

    // Сканирующая полоса
    float scanY = mod(uTime * 0.18, 1.6) - 0.3;
    float scan = exp(-pow((vPosL.y / 2.6 + 0.5 - scanY) * 40.0, 2.0));
    col += uSignal * scan * 0.22 * (0.4 + fres);

    // Фильмовый тон
    col = col / (col + vec3(0.9));
    col = pow(col, vec3(0.92));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const seamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const seamFragment = /* glsl */ `
  uniform float uOpen;
  uniform float uTime;
  uniform vec3 uSignal;
  varying vec2 vUv;

  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = exp(-x * x * 18.0);
    float halo = exp(-x * 3.2) * 0.35;
    float yFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
    float flicker = 0.94 + 0.06 * sin(uTime * 3.1 + vUv.y * 9.0);
    vec3 col = mix(uSignal, vec3(1.0, 0.93, 0.8), core * 0.7);
    float a = (core + halo) * yFade * uOpen * flicker;
    gl_FragColor = vec4(col * a, a);
  }
`;

export const dustVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p.y += mod(uTime * (0.03 + aSeed * 0.05) + aSeed * 10.0, 8.0) - 4.0;
    p.x += sin(uTime * 0.2 + aSeed * 6.28) * 0.15;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio * (6.0 / -mv.z);
    vAlpha = 0.25 + aSeed * 0.55;
  }
`;

export const dustFragment = /* glsl */ `
  uniform vec3 uSignal;
  uniform float uOpen;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    vec3 col = mix(vec3(0.62, 0.66, 0.72), uSignal, 0.35 + uOpen * 0.5);
    gl_FragColor = vec4(col * a, a);
  }
`;
