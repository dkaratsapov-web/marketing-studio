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
const DEPTH = 0.42;
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

  const mats = useMemo(
    () => ({
      ink: new THREE.MeshPhysicalMaterial({ color: "#d9d9d4", roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.7 }),
      lime: new THREE.MeshPhysicalMaterial({ color: "#c4f542", emissive: "#9fd61f", emissiveIntensity: 0, roughness: 0.2, clearcoat: 1, toneMapped: false }),
    }),
    [],
  );

  useEffect(
    () => () => {
      parts.forEach((p) => p.geo.dispose());
      mats.ink.dispose();
      mats.lime.dispose();
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
    if (limeMesh) (limeMesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.1 + limeOn * 1.6;
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
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} geometry={pc.geo} material={pc.lime ? mats.lime : mats.ink} />
      ))}
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
                {f.who} · {f.does}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
