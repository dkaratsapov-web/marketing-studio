"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { StaticImageData } from "next/image";
import { ipapaState } from "./ipapaState";
import styles from "./ExplodeScene.module.css";

type Layer = { img: StaticImageData; name: string };

/** Телефон 390 × 844 в единицах сцены */
const PW = 1.5;
const PH = (PW * 844) / 390;
const DEPTH = 0.16;
const SPACING = 0.62;
const { clamp, smoothstep, damp, lerp } = THREE.MathUtils;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Скруглённый прямоугольник: корпус и экраны. UV растянуты на весь прямоугольник */
function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function screenGeometry(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(rounded(w, h, r), 12);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  return g;
}

/**
 * Разнесённый вид телефона, как на инженерном чертеже. Сначала телефон стоит прямо и на нём
 * заставка магазина. По скроллу он поворачивается в три четверти, и экраны приложения по
 * одному отслаиваются от корпуса вперёд: витрина, каталог, карточка, трейд-ин. Каждый слой
 * подписан, подпись проецируется из сцены в DOM. Курсор слегка поворачивает всю сборку.
 */
function Phone({ layers, still }: { layers: Layer[]; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<THREE.PointLight>(null);
  const smooth = useRef({ p: still ? 1 : 0, px: 0, py: 0, t0: -1 });
  const pointer = useRef({ x: 0, y: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
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
    const body = new THREE.ExtrudeGeometry(rounded(PW + 0.1, PH + 0.1, 0.26), { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 16 });
    body.translate(0, 0, -DEPTH);
    const maps = layers.map((l) => {
      const t = loader.load(l.img.src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    });
    return {
      body,
      screen: screenGeometry(PW, PH, 0.2),
      glass: screenGeometry(PW + 0.02, PH + 0.02, 0.21),
      maps,
      titanium: new THREE.MeshPhysicalMaterial({ color: "#3a3b42", metalness: 0.85, roughness: 0.32, clearcoat: 0.4, envMapIntensity: 1.1 }),
      bezel: new THREE.MeshBasicMaterial({ color: "#050506" }),
      faces: maps.map((map) => new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, side: THREE.DoubleSide })),
    };
  }, [layers]);

  useEffect(
    () => () => {
      assets.body.dispose();
      assets.screen.dispose();
      assets.glass.dispose();
      assets.maps.forEach((t) => t.dispose());
      assets.faces.forEach((m) => m.dispose());
      assets.titanium.dispose();
      assets.bezel.dispose();
    },
    [assets],
  );

  const n = layers.length;

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    if (still) s.p = 0.85;
    else if (ipapaState.auto) {
      // Без закрепления: разобрать, подержать, собрать обратно
      if (s.t0 < 0) s.t0 = time;
      const c = ((time - s.t0) % 9) / 9;
      s.p = c < 0.45 ? smoothstep(c, 0.05, 0.45) * 0.9 : c < 0.75 ? 0.9 : 0.9 * (1 - smoothstep(c, 0.75, 0.98));
    } else s.p = damp(s.p, ipapaState.progress, 6, dt);
    s.px = damp(s.px, pointer.current.x, 3, dt);
    s.py = damp(s.py, pointer.current.y, 3, dt);
    const p = s.p;

    // Поворот в три четверти за первую четверть прогресса
    const turn = ease(smoothstep(p, 0.02, 0.28));
    const g = group.current;
    if (g) {
      const narrow = size.width < 560;
      g.scale.setScalar(narrow ? 0.78 : 1);
      g.rotation.y = lerp(0, -0.72, turn) + s.px * 0.14 + (still ? 0 : Math.sin(time * 0.4) * 0.02);
      g.rotation.x = lerp(0, 0.18, turn) - s.py * 0.08;
      g.position.x = lerp(0, narrow ? -0.35 : -0.8, turn);
      g.position.y = Math.sin(time * 0.8) * (still ? 0 : 0.03);
    }

    // Слои отслаиваются по очереди: заставка остаётся на корпусе, остальные выходят вперёд
    for (let i = 0; i < n; i++) {
      const m = sheets.current[i];
      if (!m) continue;
      const k = i === 0 ? 1 : ease(clamp((p - 0.22 - (i - 1) * 0.15) / 0.2, 0, 1));
      m.position.z = 0.012 + i * 0.004 + k * i * SPACING;
      m.position.x = k * i * 0.06;
      (m.material as THREE.MeshBasicMaterial).opacity = i === 0 ? 1 : k;
      m.visible = i === 0 || k > 0.01;

      const el = ipapaState.labels[i];
      if (el && g) {
        // Подписи лесенкой по высоте, чтобы не налезали друг на друга
        tmp.set(PW / 2 + 0.06, PH / 2 - 0.3 - i * (PH - 0.6) / Math.max(1, n - 1), m.position.z);
        g.localToWorld(tmp);
        tmp.project(state.camera);
        el.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-tmp.y * 0.5 + 0.5) * size.height).toFixed(1)}px)`;
        el.style.setProperty("--on", (i === 0 ? turn : k).toFixed(3));
      }
    }
    if (glow.current) glow.current.intensity = 2 + smoothstep(p, 0.2, 0.9) * 6;
  });

  return (
    <group ref={group}>
      <mesh geometry={assets.body} material={assets.titanium} />
      <mesh geometry={assets.glass} material={assets.bezel} position={[0, 0, 0.006]} />
      {layers.map((l, i) => (
        <mesh key={l.name} ref={(m) => void (sheets.current[i] = m)} geometry={assets.screen} material={assets.faces[i]} renderOrder={i} />
      ))}
      <pointLight ref={glow} position={[1.2, 0.4, 1.5]} color="#ff3b3b" distance={6} intensity={2} />
    </group>
  );
}

/** Окружение для отражений титана: студийный свет */
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

/** Холст телефона и подписи слоёв поверх */
export default function ExplodeScene({ layers }: { layers: Layer[] }) {
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
        camera={{ position: [0, 0, 7.2], fov: 34, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        aria-hidden="true"
      >
        <Studio />
        <ambientLight intensity={0.15} />
        <directionalLight position={[-3, 4, 5]} intensity={1.6} />
        <Phone layers={layers} still={still} />
      </Canvas>
      <ol className={styles.labels} aria-hidden="true">
        {layers.map((l, i) => (
          <li key={l.name} ref={(el) => void (ipapaState.labels[i] = el)} className={styles.label}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {l.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
