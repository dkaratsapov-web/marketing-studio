"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CARS } from "@/content/diauto";
import { ringState } from "./ringState";
import styles from "./RingScene.module.css";

const N = CARS.length;
const STEP = (Math.PI * 2) / N;
const W = 1.24;
const H = (W * 627) / 480;
const R = 2.8;
const FLOOR = -H / 2 - 0.08;
const { clamp, smoothstep, lerp, damp } = THREE.MathUtils;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const price = new Intl.NumberFormat("ru-RU");

/** Прямоугольник со скруглёнными углами; UV растянуты на всю карточку */
function cardGeometry() {
  const r = 0.06;
  const s = new THREE.Shape();
  const x = -W / 2;
  const y = -H / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + W - r, y);
  s.quadraticCurveTo(x + W, y, x + W, y + r);
  s.lineTo(x + W, y + H - r);
  s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
  s.lineTo(x + r, y + H);
  s.quadraticCurveTo(x, y + H, x, y + H - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 6);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
  return g;
}

/** Градиент для отражения: плотно у кромки карточки, к середине сходит на нет */
function fadeTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.45, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}

/** Пятно света на полу: красное, цвет бренда клиента */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(198,40,40,0.55)");
  g.addColorStop(0.55, "rgba(198,40,40,0.12)");
  g.addColorStop(1, "rgba(198,40,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Псевдослучайный разброс колоды, одинаковый при каждом заходе */
const JITTER = CARS.map((_, i) => ({ x: Math.sin(i * 12.9) * 0.09, rz: Math.sin(i * 7.3) * 0.07 }));

/**
 * Витрина ДиАвто69. Сначала карточки лежат колодой, как посты в канале. По скроллу колода
 * раздаётся по кругу: каждая карточка уезжает по дуге на своё место, и кольцо начинает
 * поворачиваться. Ближняя к зрителю карточка светлее и чуть крупнее, её модель и цена
 * выводятся под сценой. У карточек отражение на тёмном полу.
 */
function Ring({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const cards = useRef<(THREE.Group | null)[]>([]);
  const fronts = useRef<(THREE.Mesh | null)[]>([]);
  const mirrors = useRef<(THREE.Mesh | null)[]>([]);
  const smooth = useRef({ p: still ? 0.45 : 0, px: 0, py: 0, front: -1, t0: -1 });
  const pointer = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const assets = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const fade = fadeTexture();
    const maps = CARS.map((c) => {
      const t = loader.load(c.img.src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    });
    return {
      geo: cardGeometry(),
      fade,
      glow: glowTexture(),
      maps,
      face: maps.map((map) => new THREE.MeshBasicMaterial({ map, toneMapped: false })),
      mirror: maps.map((map) => new THREE.MeshBasicMaterial({ map, alphaMap: fade, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })),
      back: new THREE.MeshBasicMaterial({ color: "#1d1d21" }),
    };
  }, []);

  useEffect(
    () => () => {
      assets.geo.dispose();
      assets.fade.dispose();
      assets.glow.dispose();
      assets.maps.forEach((t) => t.dispose());
      assets.face.forEach((m) => m.dispose());
      assets.mirror.forEach((m) => m.dispose());
      assets.back.dispose();
    },
    [assets],
  );

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    let theta: number;

    if (still) {
      s.p = 1;
      theta = 0;
    } else if (ringState.auto) {
      // Без закрепления: колода раздаётся за пару секунд, дальше кольцо крутится само
      if (s.t0 < 0) s.t0 = time;
      const t = time - s.t0;
      s.p = clamp(t / 2.2, 0, 1);
      theta = Math.max(0, t - 2.4) * 0.32;
    } else {
      s.p = damp(s.p, ringState.progress, 6, dt);
      theta = smoothstep(s.p, 0.42, 1) * STEP * (N - 1);
    }
    s.px = damp(s.px, pointer.current.x, 3, dt);
    s.py = damp(s.py, pointer.current.y, 3, dt);

    const g = group.current;
    if (g) {
      const narrow = size.width < 560;
      g.scale.setScalar(narrow ? 1.12 : 1);
      g.rotation.x = 0.1 + s.py * 0.05;
      g.rotation.z = s.px * -0.03;
      g.rotation.y = -theta + s.px * 0.12;
    }

    // Раздача: карточка уходит из колоды по дуге на своё место, глубокие карточки чуть позже
    let best = 0;
    let bestCos = -2;
    for (let i = 0; i < N; i++) {
      const c = cards.current[i];
      if (!c) continue;
      const k = still ? 1 : clamp((s.p - 0.04 - i * 0.026) / 0.2, 0, 1);
      const e = easeInOut(k);
      const target = wrap(i * STEP);
      const ang = lerp(0, target, e);
      const rad = R + (1 - e) * (0.55 - i * 0.045);
      c.position.set(Math.sin(ang) * rad + (1 - e) * JITTER[i].x, Math.sin(k * Math.PI) * 0.22, Math.cos(ang) * rad);
      c.rotation.set(0, ang, (1 - e) * JITTER[i].rz);

      // Ближняя к зрителю карточка ярче и крупнее
      const world = wrap(ang - theta);
      const cos = Math.cos(world);
      if (e > 0.5 && cos > bestCos) {
        bestCos = cos;
        best = i;
      }
      const focus = Math.pow(Math.max(0, cos), 6);
      const dealt = smoothstep(s.p, 0.25, 0.42);
      c.scale.setScalar(1 + focus * 0.1 * dealt);
      const light = lerp(1 - i * 0.04, 0.32 + 0.68 * Math.pow(Math.max(0, (cos + 1) / 2), 2.2), dealt);
      const front = fronts.current[i];
      if (front) (front.material as THREE.MeshBasicMaterial).color.setScalar(light);
      const mirror = mirrors.current[i];
      if (mirror) {
        mirror.position.y = FLOOR * 2 - c.position.y * 2;
        (mirror.material as THREE.MeshBasicMaterial).opacity = 0.24 * light * e;
      }
    }

    // Подпись под сценой: меняем текст только при смене ближней карточки
    if (best !== s.front && smoothstep(s.p, 0.25, 0.42) > 0.5) {
      s.front = best;
      const car = CARS[best];
      const cap = ringState.caption;
      if (cap.no) cap.no.textContent = String(best + 1).padStart(2, "0");
      if (cap.name) cap.name.textContent = car.name;
      if (cap.meta) cap.meta.textContent = `${car.year}, ${car.country}`;
      if (cap.price) cap.price.textContent = `${price.format(car.price)} ₽`;
    }
  });

  return (
    <group ref={group}>
      {CARS.map((car, i) => (
        <group key={i} ref={(g) => void (cards.current[i] = g)}>
          <mesh ref={(m) => void (fronts.current[i] = m)} geometry={assets.geo} material={assets.face[i]} />
          <mesh geometry={assets.geo} material={assets.back} rotation={[0, Math.PI, 0]} position={[0, 0, -0.004]} />
          <mesh ref={(m) => void (mirrors.current[i] = m)} geometry={assets.geo} material={assets.mirror[i]} scale={[1, -1, 1]} position={[0, FLOOR * 2, 0]} />
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR - 0.01, 0]}>
        <planeGeometry args={[R * 2.5, R * 2.5]} />
        <meshBasicMaterial map={assets.glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]}>
        <ringGeometry args={[R + 0.32, R + 0.335, 128]} />
        <meshBasicMaterial color="#c4f542" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Холст витрины и подпись ближней карточки */
export default function RingScene({ total, note }: { total: number; note: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const first = CARS[0];

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.host}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 1.2, 8.6], fov: 36, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, -0.42, 0);
        }}
        aria-hidden="true"
      >
        <Ring still={still} />
      </Canvas>
      <div className={styles.caption} aria-hidden="true">
        <span className={styles.no}>
          <b ref={(el) => void (ringState.caption.no = el)}>01</b> / {String(CARS.length).padStart(2, "0")}
        </span>
        <span className={styles.car}>
          <b ref={(el) => void (ringState.caption.name = el)}>{first.name}</b>
          <span ref={(el) => void (ringState.caption.meta = el)}>
            {first.year}, {first.country}
          </span>
        </span>
        <span className={styles.price} ref={(el) => void (ringState.caption.price = el)}>
          {price.format(first.price)} ₽
        </span>
      </div>
      <p className={styles.note}>
        Из каталога на {total} авто. {note}
      </p>
    </div>
  );
}
