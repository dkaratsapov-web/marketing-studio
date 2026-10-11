"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { botsState } from "./botsState";
import styles from "./MessageStream.module.css";

type Kind = "me" | "bot" | "alert";
type Phrase = { text: string; kind: Kind };

/** Цвета пузыря и текста по типу: запрос клиента салатовый, ответ бота тёмный, уведомление розовое */
const LOOK: Record<Kind, { body: string; ink: string }> = {
  me: { body: "#c4f542", ink: "#050505" },
  bot: { body: "#1b1c22", ink: "#ffffff" },
  alert: { body: "#ff4d9d", ink: "#050505" },
};

const H = 0.44; // высота пузыря в единицах сцены
const PX = 128; // высота текстуры текста в пикселях

/**
 * Один пузырь: объёмная плашка с закруглениями и «хвостиком» (острый угол снизу, как в
 * мессенджере) и текст на лицевой стороне. Ширина по длине текста.
 */
function makeBubble(text: string, kind: Kind, font: string) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `600 ${PX * 0.42}px ${font}`;
  const pad = PX * 0.42;
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = tw + pad * 2;
  c.height = PX;
  ctx.font = `600 ${PX * 0.42}px ${font}`;
  ctx.fillStyle = LOOK[kind].ink;
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, PX * 0.53);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const w = (c.width / PX) * H;
  const r = H * 0.46;
  const t = 0.05; // радиус угла с хвостиком
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -H / 2;
  // У клиента хвостик справа снизу, у бота и уведомления слева снизу
  const bl = kind === "me" ? r : t;
  const br = kind === "me" ? t : r;
  s.moveTo(x0 + bl, y0);
  s.lineTo(x0 + w - br, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + br);
  s.lineTo(x0 + w, y0 + H - r);
  s.quadraticCurveTo(x0 + w, y0 + H, x0 + w - r, y0 + H);
  s.lineTo(x0 + r, y0 + H);
  s.quadraticCurveTo(x0, y0 + H, x0, y0 + H - r);
  s.lineTo(x0, y0 + bl);
  s.quadraticCurveTo(x0, y0, x0 + bl, y0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 4, curveSegments: 10 });
  geo.center();
  return { geo, tex, w };
}

function useMaterials() {
  const mats = useMemo(() => {
    const make = (kind: Kind) =>
      new THREE.MeshPhysicalMaterial({
        color: LOOK[kind].body,
        roughness: kind === "bot" ? 0.22 : 0.32,
        metalness: kind === "bot" ? 0.35 : 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
      });
    return { me: make("me"), bot: make("bot"), alert: make("alert") } as Record<Kind, THREE.MeshPhysicalMaterial>;
  }, []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

/** Пузырь в сцене: плашка и плоскость с текстом чуть впереди лицевой стороны */
function Bubble({ phrase, font, mats }: { phrase: Phrase; font: string; mats: Record<Kind, THREE.Material> }) {
  const b = useMemo(() => makeBubble(phrase.text, phrase.kind, font), [phrase, font]);
  const plane = useMemo(() => new THREE.PlaneGeometry(b.w, H), [b]);
  const textMat = useMemo(() => new THREE.MeshBasicMaterial({ map: b.tex, transparent: true }), [b]);
  useEffect(
    () => () => {
      b.geo.dispose();
      b.tex.dispose();
      plane.dispose();
      textMat.dispose();
    },
    [b, plane, textMat],
  );
  return (
    <>
      <mesh geometry={b.geo} material={mats[phrase.kind]} />
      <mesh geometry={plane} material={textMat} position={[0, 0, 0.072]} />
    </>
  );
}

/**
 * Спираль: пузыри поднимаются по винтовой линии вокруг окна чата. Скролл ускоряет поток,
 * курсор наклоняет его. Пузыри сзади тонут в тумане, у краев спирали появляются и тают.
 */
function Helix({ phrases, font, still }: { phrases: Phrase[]; font: string; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const mats = useMaterials();
  const { size } = useThree();
  const narrow = size.width < 640;
  const list = narrow ? phrases.slice(0, 12) : phrases;
  const R = narrow ? 2 : 2.25;
  const span = narrow ? 6.4 : 7.2;
  const seeds = useMemo(() => list.map((_, i) => ({ h: i / list.length, a: i * 2.399, r: 0.85 + ((i * 37) % 10) / 33 })), [list]);
  const boost = useRef(0);
  const clock = useRef(still ? 3 : 0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const scroll = Math.min(1, window.scrollY / window.innerHeight);
    boost.current = THREE.MathUtils.damp(boost.current, scroll, 4, dt);
    if (!still) clock.current += dt * (1 + boost.current * 3);
    const t = clock.current;
    const g = group.current;
    if (g) {
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.18 - state.pointer.y * 0.12, 3, dt);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -0.12 + state.pointer.x * 0.08, 3, dt);
    }
    seeds.forEach((s, i) => {
      const m = items.current[i];
      if (!m) return;
      const u = (s.h + t * 0.028) % 1;
      const ang = s.a + u * Math.PI * 3 + t * 0.12;
      const rr = R * s.r * (1 + boost.current * 0.35);
      m.position.set(Math.cos(ang) * rr, (u - 0.5) * span, Math.sin(ang) * rr);
      // Сбоку пузырь разворачивается ребром: видно, что он объёмный
      m.rotation.y = Math.cos(ang) * 0.55;
      m.rotation.z = Math.sin(t * 0.7 + i) * 0.06;
      const k = THREE.MathUtils.smoothstep(u, 0, 0.12) * (1 - THREE.MathUtils.smoothstep(u, 0.86, 1));
      m.scale.setScalar(Math.max(0.001, k) * (narrow ? 1.15 : 0.82));
    });
  });

  return (
    <group ref={group}>
      {list.map((p, i) => (
        <group key={p.text} ref={(el) => void (items.current[i] = el)}>
          <Bubble phrase={p} font={font} mats={mats} />
        </group>
      ))}
      <Burst font={font} mats={mats} still={still} narrow={narrow} />
    </group>
  );
}

type Shot = { id: number; phrase: Phrase; side: number; y: number };

/** Сообщение из живого чата: вылетает из-за окна чата наружу и уходит в поток */
function Flyer({ shot, font, mats, done }: { shot: Shot; font: string; mats: Record<Kind, THREE.Material>; done: (id: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const age = useRef(0);
  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    age.current += Math.min(delta, 1 / 20);
    const p = Math.min(1, age.current / 2.4);
    const e = 1 - Math.pow(1 - p, 3);
    m.position.set(shot.side * (0.6 + e * 2.6), shot.y + e * 1.6, 0.9 - e * 1.6);
    m.rotation.y = shot.side * e * 0.9;
    const k = Math.min(1, p * 6) * (1 - THREE.MathUtils.smoothstep(p, 0.7, 1));
    m.scale.setScalar(Math.max(0.001, k * 1.1));
    if (p >= 1) done(shot.id);
  });
  return (
    <group ref={ref} scale={0.001}>
      <Bubble phrase={shot.phrase} font={font} mats={mats} />
    </group>
  );
}

function Burst({ font, mats, still, narrow }: { font: string; mats: Record<Kind, THREE.Material>; still: boolean; narrow: boolean }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const seen = useRef(botsState.sent);
  useFrame(() => {
    if (still || botsState.sent === seen.current) return;
    seen.current = botsState.sent;
    const { text, kind } = botsState.last;
    if (!text) return;
    // Клиент пишет справа, бот отвечает слева, как в самом чате
    const side = kind === "me" ? 1 : -1;
    setShots((s) => [...s.slice(-3), { id: botsState.sent, phrase: { text, kind }, side: narrow ? side * 0.6 : side, y: kind === "me" ? -0.4 : -1 }]);
  });
  return (
    <>
      {shots.map((s) => (
        <Flyer key={s.id} shot={s} font={font} mats={mats} done={(id) => setShots((all) => all.filter((x) => x.id !== id))} />
      ))}
    </>
  );
}

/**
 * Поток сообщений вокруг живого чата первого экрана: объёмные пузыри поднимаются по
 * спирали, а каждое сообщение, отправленное в чате, вылетает из окна и вливается в поток.
 */
export default function MessageStream({ phrases }: { phrases: Phrase[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [font, setFont] = useState<string | null>(null);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    // Текст в текстурах рисуем фирменным шрифтом, поэтому ждём его загрузки
    const family = getComputedStyle(document.body).fontFamily;
    document.fonts.ready.then(() => setFont(family));
    const io = new IntersectionObserver((es) => setVisible(es[es.length - 1].isIntersecting), { rootMargin: "100px" });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.host} aria-hidden="true">
      {font ? (
        <Canvas
          className={styles.canvas}
          dpr={[1, 1.75]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: [0, 0, 9], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(0x000000, 0);
            scene.fog = new THREE.Fog(0x050505, 7.5, 12.5);
          }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 5, 6]} intensity={2.2} />
          <pointLight position={[-4, -2, 3]} intensity={18} color="#c4f542" distance={12} />
          <pointLight position={[4, 2, -3]} intensity={14} color="#ff4d9d" distance={12} />
          <Helix phrases={phrases} font={font} still={still} />
        </Canvas>
      ) : null}
    </div>
  );
}
