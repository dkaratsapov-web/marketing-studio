"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MARK } from "@/components/logoGeometry";
import { aboutState } from "./aboutState";
import type { ABOUT } from "@/content/about";
import styles from "./MarkScene.module.css";

type Floors = (typeof ABOUT)["building"]["floors"];

const SCALE = 0.032;
const DEPTH = 0.62;
/** Шаг этажей большого знака: брусок 6,98 и зазор 4,65 в единицах знака */
const PITCH = 11.628 * SCALE;
/** Сетка окон: 8 окон по ширине на один повтор текстуры, 9 этажей по высоте */
const WIN_W = 0.15;
const COLS = 8;
const ROWS = 9;

/**
 * Фасад: окна по сетке этажей. Карта цвета — светлая стена и тёмное стекло, карта свечения —
 * часть окон горит тёплым светом, как вечером в офисе. Рисуется один раз на холсте.
 */
function facadeTextures() {
  const cw = 64;
  const ch = 64;
  const make = () => {
    const c = document.createElement("canvas");
    c.width = cw * COLS;
    c.height = ch * ROWS;
    return c;
  };
  const base = make();
  const glow = make();
  const b = base.getContext("2d")!;
  const g = glow.getContext("2d")!;
  b.fillStyle = "#f1f1ec";
  b.fillRect(0, 0, base.width, base.height);
  g.fillStyle = "#000";
  g.fillRect(0, 0, glow.width, glow.height);
  const rnd = mulberry32(7);
  for (let r = 0; r < ROWS; r++)
    for (let k = 0; k < COLS; k++) {
      // Окно по центру ячейки: этаж занимает 60% шага, окно чуть меньше этажа
      const x = k * cw + cw * 0.22;
      const y = r * ch + ch * 0.3;
      const w = cw * 0.56;
      const h = ch * 0.4;
      const glass = b.createLinearGradient(x, y, x + w, y + h);
      glass.addColorStop(0, "#2a2d33");
      glass.addColorStop(1, "#15171b");
      b.fillStyle = glass;
      b.fillRect(x, y, w, h);
      b.fillStyle = "rgba(255,255,255,0.18)";
      b.fillRect(x + w * 0.48, y, 2, h);
      if (rnd() < 0.42) {
        g.fillStyle = rnd() < 0.8 ? "#ffd9a0" : "#e8f7c0";
        g.fillRect(x, y, w, h);
      }
    }
  const toTex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Координаты крышек экструзии равны координатам фигуры: период — этаж по высоте и окно по ширине
    t.repeat.set(1 / (WIN_W * COLS), 1 / (PITCH * ROWS));
    t.offset.y = 0.5 / ROWS;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: toTex(base, true), glow: toTex(glow, true) };
}
const { clamp, smoothstep, lerp, damp } = THREE.MathUtils;
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

/** Разбор пути знака на отдельные бруски: каждый подпуть M…Z — один многоугольник */
function pieces(d: string) {
  return d
    .split("Z")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((sub) => {
      const pts = [...sub.matchAll(/([0-9.]+) ([0-9.]+)/g)].map((m) => new THREE.Vector2(Number(m[1]), Number(m[2])));
      const top = Math.min(...pts.map((p) => p.y));
      // Координаты в сцене: центр знака в нуле, ось Y вверх
      const v = pts.map((p) => new THREE.Vector2((p.x - MARK.w / 2) * SCALE, (MARK.h / 2 - p.y) * SCALE));
      // После отражения оси Y обход может стать по часовой: выравниваем, иначе грани вывернутся
      if (THREE.ShapeUtils.isClockWise(v)) v.reverse();
      const shape = new THREE.Shape(v);
      return { shape, top };
    });
}

/** Волна сборки по высоте бруска: снизу вверх пять волн, по одной на отдел */
const waveOf = (top: number) => (top > 78 ? 0 : top > 55 ? 1 : top > 44 ? 2 : top > 20 ? 3 : 4);

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Piece = {
  geo: THREE.ExtrudeGeometry;
  wave: number;
  lime: boolean;
  from: THREE.Vector3;
  fromQ: THREE.Quaternion;
  delay: number;
};

/**
 * Знак «Этажи» собирается из брусков. Каждый брусок буквы К — объёмная деталь из белой
 * глянцевой керамики, салатовый этаж светится. В начале детали разбросаны по сцене и
 * медленно вращаются; по скроллу они волнами снизу вверх влетают на свои места, каждая
 * волна — отдел, его подпись загорается рядом. Курсор слегка поворачивает знак.
 */
function Mark({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<THREE.PointLight>(null);
  const roof = useRef<THREE.Group>(null);
  const smooth = useRef({ p: still ? 1 : 0, px: 0, py: 0 });
  const pointer = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const ident = useMemo(() => new THREE.Quaternion(), []);
  const { size } = useThree();

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const parts = useMemo<Piece[]>(() => {
    const rnd = mulberry32(23);
    const make = (d: string, lime: boolean) =>
      pieces(d).map(({ shape, top }) => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3 });
        geo.translate(0, 0, -DEPTH / 2);
        const from = new THREE.Vector3((rnd() - 0.5) * 7, (rnd() - 0.5) * 5 - 1.5, -3 - rnd() * 5);
        const fromQ = new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 3, (rnd() - 0.5) * 3, (rnd() - 0.5) * 2));
        return { geo, wave: waveOf(top), lime, from, fromQ, delay: rnd() * 0.35 };
      });
    return [...make(MARK.large.ink, false), ...make(MARK.large.lime, true)];
  }, []);

  const mats = useMemo(() => {
    const tex = facadeTextures();
    return {
      tex,
      // Лицевая сторона этажа с окнами и боковины без окон
      facade: new THREE.MeshPhysicalMaterial({ map: tex.map, emissiveMap: tex.glow, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 0.7 }),
      side: new THREE.MeshPhysicalMaterial({ color: "#d4d4cf", roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.7 }),
      lime: new THREE.MeshPhysicalMaterial({ color: "#c4f542", map: tex.map, emissive: "#9fd61f", emissiveIntensity: 0, roughness: 0.25, clearcoat: 1, toneMapped: false }),
      limeSide: new THREE.MeshPhysicalMaterial({ color: "#c4f542", emissive: "#9fd61f", emissiveIntensity: 0, roughness: 0.2, clearcoat: 1, toneMapped: false }),
      plinth: new THREE.MeshStandardMaterial({ color: "#1b1b1f", roughness: 0.8 }),
      mast: new THREE.MeshStandardMaterial({ color: "#d9d9d4", roughness: 0.4 }),
    };
  }, []);

  useEffect(
    () => () => {
      parts.forEach((p) => p.geo.dispose());
      mats.tex.map.dispose();
      mats.tex.glow.dispose();
      [mats.facade, mats.side, mats.lime, mats.limeSide, mats.plinth, mats.mast].forEach((m) => m.dispose());
    },
    [parts, mats],
  );

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    s.p = still ? 1 : damp(s.p, aboutState.progress, 5, dt);
    s.px = damp(s.px, pointer.current.x, 3, dt);
    s.py = damp(s.py, pointer.current.y, 3, dt);
    const t = still ? 0 : state.clock.elapsedTime;
    const narrow = size.width < 560;

    const g = group.current;
    if (g) {
      g.position.set(narrow ? -0.62 : -0.85, 0.05, 0);
      g.scale.setScalar(narrow ? 0.7 : 1);
      g.rotation.y = -0.32 + s.px * 0.22 + Math.sin(t * 0.3) * 0.04;
      g.rotation.x = 0.06 - s.py * 0.12;
    }

    // Каждая волна занимает свой отрезок прогресса, бруски внутри волны с небольшим разбросом
    const waveDone = [0, 0, 0, 0, 0];
    parts.forEach((pc, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const start = 0.04 + pc.wave * 0.17 + pc.delay * 0.08;
      const k = still ? 1 : clamp((s.p - start) / 0.16, 0, 1);
      const e = k < 1 ? easeOutBack(k) : 1;
      // До сборки деталь медленно кувыркается на месте
      const drift = (1 - k) * 0.6;
      m.position.set(
        lerp(pc.from.x, 0, e) + Math.sin(t * 0.6 + i) * drift * 0.15,
        lerp(pc.from.y, 0, e) + Math.cos(t * 0.5 + i) * drift * 0.15,
        lerp(pc.from.z, 0, e),
      );
      q.copy(pc.fromQ).slerp(ident, Math.min(1, e));
      m.quaternion.copy(q);
      if (drift > 0) m.rotateY(t * 0.4 * drift);
      waveDone[pc.wave] = Math.max(waveDone[pc.wave], 0) + k / 4;
    });

    // Салатовый этаж разгорается, когда собран
    const limeOn = still ? 1 : smoothstep(s.p, 0.42, 0.6);
    const limeMesh = meshes.current[parts.length - 1];
    if (limeMesh) for (const m of limeMesh.material as THREE.MeshPhysicalMaterial[]) m.emissiveIntensity = 0.1 + limeOn * 1.6;
    // Окна загораются вслед за сборкой, к концу горит весь вечерний офис
    const inkMesh = meshes.current[0];
    if (inkMesh) (inkMesh.material as THREE.MeshPhysicalMaterial[])[0].emissiveIntensity = 0.05 + smoothstep(s.p, 0.2, 0.95) * 0.9;
    if (roof.current) {
      const r = still ? 1 : easeOutBack(clamp((s.p - 0.86) / 0.12, 0, 1));
      roof.current.scale.set(1, Math.max(r, 0.001), 1);
      roof.current.visible = r > 0.002;
    }
    if (glow.current) glow.current.intensity = limeOn * 6;

    // Подписи отделов: справа от знака на высоте своей волны
    const rows = [87, 64, 50, 27, 6];
    for (let w = 0; w < 5; w++) {
      const el = aboutState.labels[w];
      if (!el || !g) continue;
      const on = clamp((s.p - (0.04 + w * 0.17)) / 0.18, 0, 1);
      tmp.set((MARK.w / 2 + 6) * SCALE, (MARK.h / 2 - rows[w]) * SCALE, 0);
      g.localToWorld(tmp);
      tmp.project(state.camera);
      el.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translateY(-50%)`;
      el.style.setProperty("--on", (still ? 1 : on).toFixed(3));
    }
    if (aboutState.display) aboutState.display.textContent = String(Math.min(5, Math.max(1, Math.ceil((s.p - 0.04) / 0.17 + 0.01))));
  });

  return (
    <group ref={group}>
      {parts.map((pc, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} geometry={pc.geo} material={pc.lime ? [mats.lime, mats.limeSide] : [mats.facade, mats.side]} />
      ))}
      {/* Фундамент: стоит с самого начала, этажи садятся на него */}
      <mesh position={[0, -MARK.h / 2 * SCALE - 0.09, 0]} material={mats.plinth}>
        <boxGeometry args={[MARK.w * SCALE + 0.5, 0.14, DEPTH + 0.5]} />
      </mesh>
      {/* Крыша: техэтаж и антенна над левой колонной, появляются последними */}
      <group ref={roof} position={[(-MARK.w / 2 + 14.4) * SCALE, (MARK.h / 2) * SCALE, 0]}>
        <mesh position={[0, 0.09, 0]} material={mats.side}>
          <boxGeometry args={[0.5, 0.18, DEPTH * 0.7]} />
        </mesh>
        <mesh position={[0.1, 0.48, 0]} material={mats.mast}>
          <cylinderGeometry args={[0.012, 0.018, 0.62, 8]} />
        </mesh>
        <mesh position={[0.1, 0.8, 0]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color="#ff4d9d" toneMapped={false} />
        </mesh>
      </group>
      <pointLight ref={glow} position={[0, 0, 1.2]} color="#c4f542" distance={4} intensity={0} />
    </group>
  );
}

/** Окружение для отражений: светлая студия, а не тёмный купол главной. Цепляется к сцене */
function Studio() {
  const { gl } = useThree();
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return tex;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return <primitive attach="environment" object={env} />;
}

/** Холст со знаком и подписи отделов поверх */
export default function MarkScene({ floors }: { floors: Floors }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const io = new IntersectionObserver((es) => setVisible(es[es.length - 1].isIntersecting), { rootMargin: "100px" });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.host}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 7.4], fov: 32, near: 0.05, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        aria-hidden="true"
      >
        <Studio />
        <ambientLight intensity={0.05} />
        <directionalLight position={[-4, 5, 4]} intensity={2.2} />
        <directionalLight position={[5, -3, 1]} intensity={0.9} color="#ff4d9d" />
        <Mark still={still} />
      </Canvas>
      <p className={styles.display} aria-hidden="true">
        Отдел <b ref={(el) => void (aboutState.display = el)}>1</b> из 5
      </p>
      <ol className={styles.labels}>
        {floors.map((f, i) => (
          <li key={f.no} ref={(el) => void (aboutState.labels[i] = el)} className={styles.label}>
            <span className={styles.text}>
              <b>{f.name}</b>
              <span>
                {f.does}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
