"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { saraState } from "./saraState";
import styles from "./VoiceOrb.module.css";

/** Шум Перлина 3D (Ashima, MIT) для смещения точек сферы */
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERT = `
uniform float uTime; uniform float uVoice; uniform float uDone; uniform float uPx;
varying float vD;
${NOISE}
void main(){
  vec3 n = normalize(position);
  // Дыхание в покое и всплески от голоса: высокие частоты шума, пока звучит речь
  float calm = snoise(n * 1.4 + uTime * 0.25) * 0.06;
  float speech = snoise(n * 3.2 + vec3(0.0, uTime * 1.8, 0.0)) * (0.08 + 0.32 * uVoice);
  float d = calm + speech * (1.0 - uDone * 0.7);
  vD = d;
  vec3 p = n * (1.0 + d);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * (1.6 + d * 5.0) * (3.6 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform float uDone; varying float vD;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.1, r);
  // Тихие точки белые, всплески розовые; разобранная фраза окрашивает сферу салатовым
  vec3 base = mix(vec3(0.92), vec3(1.0, 0.3, 0.62), smoothstep(0.02, 0.22, vD));
  vec3 col = mix(base, vec3(0.77, 0.96, 0.26), uDone * 0.85);
  gl_FragColor = vec4(col * a, a * 0.85);
}`;

/**
 * Сфера голоса: тысячи точек на сфере смещаются шумом. В покое она дышит, пока звучит
 * фраза, всплёскивает и розовеет, когда фраза разобрана, успокаивается и становится
 * салатовой. Громкость и разбор приходят из первого экрана через saraState.
 */
function Orb({ still }: { still: boolean }) {
  const mesh = useRef<THREE.Points>(null);
  const smooth = useRef({ v: 0, d: still ? 1 : 0 });
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 48), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTime: { value: 0 }, uVoice: { value: 0 }, uDone: { value: 0 }, uPx: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    s.v = THREE.MathUtils.damp(s.v, still ? 0 : saraState.voice, 10, dt);
    s.d = THREE.MathUtils.damp(s.d, still ? 1 : saraState.done, 4, dt);
    const m = mesh.current;
    if (!m) return;
    const u = (m.material as THREE.ShaderMaterial).uniforms;
    u.uTime.value = still ? 2 : state.clock.elapsedTime;
    u.uVoice.value = s.v;
    u.uDone.value = s.d;
    u.uPx.value = state.gl.getPixelRatio();
    m.rotation.y += dt * (0.08 + s.v * 0.25);
    m.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
  });

  return <points ref={mesh} geometry={geo} material={mat} />;
}

export default function VoiceOrb() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const io = new IntersectionObserver((es) => setVisible(es[es.length - 1].isIntersecting), { rootMargin: "100px" });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.host} aria-hidden="true">
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.5]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 3.6], fov: 40 }}
        gl={{ antialias: false, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Orb still={still} />
      </Canvas>
    </div>
  );
}
