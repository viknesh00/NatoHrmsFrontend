// SPDX-License-Identifier: Apache-2.0
// Adapted from Spectrum UI's event-badge-3d: https://ui.spectrumhq.in/docs/badge
// See licenses/Spectrum-UI-Apache-2.0.txt.
// Uses local geometry and a personalized canvas texture in place of the demo assets.
import { Component, Suspense, useEffect, useMemo, useCallback, useRef, useState, type ReactNode } from "react";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { BallCollider, CuboidCollider, Physics, RigidBody, type RapierRigidBody, useRopeJoint, useSphericalJoint } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { CanvasTexture, CatmullRomCurve3, Color, SRGBColorSpace, Vector2, Vector3 } from "three";
import { readCanvasColors } from "@/theme/canvasColors";

type BadgeIdentity = {
  name: string;
  title: string;
  initials: string;
};

type EventBadgeProps = BadgeIdentity & {
  fallback: ReactNode;
  paletteKey: string;
};

class BadgeErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function makeBadgeTexture({ name, title, initials }: BadgeIdentity) {
  const palette = getComputedStyle(document.documentElement);
  const deep = palette.getPropertyValue("--primary").trim() || "#2f7659";
  const light = palette.getPropertyValue("--accent").trim() || "#51bc8f";
  const colors = readCanvasColors({
    "--card": "#faf9f5",
    "--foreground": "#162026",
    "--muted-foreground": "#676c73",
    "--border": "#e3e5ea",
  });
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 810;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The badge needs a 2D canvas texture.");

  context.fillStyle = colors["--card"];
  context.fillRect(0, 0, 600, 810);
  const gradient = context.createLinearGradient(0, 0, 600, 330);
  gradient.addColorStop(0, "#162026");
  gradient.addColorStop(1, deep);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 600, 355);
  context.fillStyle = light;
  context.fillRect(0, 355, 600, 8);

  context.fillStyle = "#ffffff";
  context.font = '600 26px "Albert Sans Variable", sans-serif';
  context.fillText("NATOBOTICS", 48, 95);
  context.globalAlpha = 0.38;
  context.strokeStyle = light;
  for (let x = 312; x < 780; x += 24) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x - 180, 355);
    context.stroke();
  }
  context.globalAlpha = 1;

  context.beginPath();
  context.arc(104, 355, 63, 0, Math.PI * 2);
  context.fillStyle = light;
  context.fill();
  context.fillStyle = "#162026";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '700 42px "Albert Sans Variable", sans-serif';
  context.fillText(initials, 104, 357, 103);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = colors["--foreground"];
  context.font = '600 55px "Aleo Variable", Georgia, serif';
  context.fillText(name, 48, 513, 504);
  context.fillStyle = colors["--muted-foreground"];
  context.font = '500 25px "Albert Sans Variable", sans-serif';
  context.fillText(title, 48, 560, 504);
  context.fillStyle = colors["--border"];
  context.fillRect(48, 689, 504, 2);
  context.fillStyle = colors["--muted-foreground"];
  context.font = '600 18px "Albert Sans Variable", sans-serif';
  context.fillText("DIGITAL BUSINESS CARD", 48, 737);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, deep };
}

type LanyardProps = {
  artwork: ReturnType<typeof makeBadgeTexture>;
  onReady: () => void;
  dragged: boolean;
  setDragged: (dragged: boolean) => void;
};

const ANCHOR_Y = 2.9;
const ROPE_SEGMENT_LENGTH = 0.38;
const INITIAL_SEGMENT_DROP = ROPE_SEGMENT_LENGTH - 0.01;
const BADGE_ATTACHMENT_Y = 1.36;

function Lanyard({ artwork, onReady, dragged, setDragged }: LanyardProps) {
  const fixed = useRef<RapierRigidBody>(null);
  const first = useRef<RapierRigidBody>(null);
  const second = useRef<RapierRigidBody>(null);
  const third = useRef<RapierRigidBody>(null);
  const badge = useRef<RapierRigidBody>(null);
  const target = useRef<Vector3 | null>(null);
  const { width, height } = useThree(state => state.size);

  const curve = useMemo(() => new CatmullRomCurve3(
    Array.from({ length: 4 }, () => new Vector3()), false, "chordal",
  ), []);
  const strap = useMemo(() => new MeshLineGeometry(), []);
  const strapMaterial = useMemo(() => new MeshLineMaterial({ lineWidth: 0.072, resolution: new Vector2(1, 1) }), []);
  const pointer = useMemo(() => new Vector3(), []);
  const ray = useMemo(() => new Vector3(), []);

  useEffect(() => { onReady(); }, [onReady]);
  useEffect(() => () => { strap.dispose(); strapMaterial.dispose(); }, [strap, strapMaterial]);
  useEffect(() => { strapMaterial.color = new Color(artwork.deep); }, [artwork.deep, strapMaterial]);
  useEffect(() => { strapMaterial.resolution.set(width, height); }, [strapMaterial, width, height]);

  useRopeJoint(fixed, first, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useRopeJoint(first, second, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useRopeJoint(second, third, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useSphericalJoint(third, badge, [[0, 0, 0], [0, BADGE_ATTACHMENT_Y, 0]]);

  useFrame(({ pointer: cursor, camera, viewport }) => {
    const body = badge.current;
    const anchor = fixed.current;
    const p1 = first.current;
    const p2 = second.current;
    const p3 = third.current;
    if (!body || !anchor || !p1 || !p2 || !p3) return;

    if (target.current) {
      pointer.set(cursor.x, cursor.y, 0.5).unproject(camera);
      ray.copy(pointer).sub(camera.position).normalize();
      pointer.copy(camera.position).addScaledVector(ray, -camera.position.z / ray.z).sub(target.current);
      const dragLimit = Math.max(0, viewport.width / 2 - 0.98);
      pointer.x = Math.max(-dragLimit, Math.min(dragLimit, pointer.x));
      pointer.y = Math.max(-1.7, Math.min(1.45, pointer.y));
      pointer.z = 0;
      body.setNextKinematicTranslation(pointer);
      [p1, p2, p3].forEach(segment => segment.wakeUp());
    }

    curve.points[0].copy(anchor.translation());
    curve.points[1].copy(p1.translation());
    curve.points[2].copy(p2.translation());
    curve.points[3].copy(p3.translation());
    strap.setPoints(curve.getPoints(24));
  });

  function startDrag(event: ThreeEvent<PointerEvent>) {
    if (!badge.current) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture(event.pointerId);
    target.current = event.point.clone().sub(badge.current.translation());
    setDragged(true);
  }

  function endDrag(event: ThreeEvent<PointerEvent>) {
    if (!target.current) return;
    event.stopPropagation();
    (event.target as Element).releasePointerCapture(event.pointerId);
    target.current = null;
    setDragged(false);
  }

  return (
    <>
      <RigidBody ref={fixed} type="fixed" position={[0, ANCHOR_Y, 0]} colliders={false} />
      <RigidBody ref={first} position={[0.08, ANCHOR_Y - INITIAL_SEGMENT_DROP, 0]} colliders={false} linearDamping={2}><BallCollider args={[0.045]} /></RigidBody>
      <RigidBody ref={second} position={[0.13, ANCHOR_Y - 2 * INITIAL_SEGMENT_DROP, 0]} colliders={false} linearDamping={2}><BallCollider args={[0.045]} /></RigidBody>
      <RigidBody ref={third} position={[0.16, ANCHOR_Y - 3 * INITIAL_SEGMENT_DROP, 0]} colliders={false} linearDamping={2}><BallCollider args={[0.045]} /></RigidBody>
      <RigidBody ref={badge} position={[0.16, ANCHOR_Y - 3 * INITIAL_SEGMENT_DROP - BADGE_ATTACHMENT_Y, 0]} type={dragged ? "kinematicPosition" : "dynamic"} colliders={false} linearDamping={2} angularDamping={5} enabledRotations={[false, false, true]}>
        <CuboidCollider args={[0.96, 1.27, 0.04]} />
        <group onPointerDown={startDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <RoundedBox args={[1.94, 2.6, 0.09]} radius={0.065} smoothness={4}>
            <meshStandardMaterial color={artwork.deep} roughness={0.44} />
          </RoundedBox>
          <mesh position={[0, 0, 0.046]}>
            <planeGeometry args={[1.87, 2.53]} />
            <meshBasicMaterial map={artwork.texture} toneMapped={false} />
          </mesh>
          <RoundedBox args={[0.32, 0.24, 0.13]} position={[0, 1.31, 0.014]} smoothness={3} radius={0.052}>
            <meshStandardMaterial color="#9fa8b0" metalness={0.68} roughness={0.33} />
          </RoundedBox>
        </group>
      </RigidBody>
      <mesh geometry={strap} material={strapMaterial} frustumCulled={false} />
    </>
  );
}

function BadgeScene({ name, title, initials, paletteKey, fallback }: EventBadgeProps) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const [dragged, setDragged] = useState(false);
  const [artwork, setArtwork] = useState<ReturnType<typeof makeBadgeTexture> | null>(null);

  useEffect(() => {
    const next = makeBadgeTexture({ name, title, initials });
    setArtwork(next);
    return () => next.texture.dispose();
  }, [name, title, initials, paletteKey]);

  if (!artwork) return fallback;

  return (
    <>
      {!ready && fallback}
      <div className="event-badge-canvas" aria-hidden="true" data-ready={ready} data-dragging={dragged}>
        <Canvas dpr={[1, 1.4]} camera={{ position: [0, 0.15, 9.7], fov: 32 }} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={1.8} />
          <directionalLight position={[2, 5, 4]} intensity={2.2} />
          <Suspense fallback={null}>
            <Physics gravity={[0, -16, 0]} timeStep={1 / 60}>
              <Lanyard artwork={artwork} onReady={markReady} dragged={dragged} setDragged={setDragged} />
            </Physics>
          </Suspense>
        </Canvas>
      </div>
    </>
  );
}

export default function EventBadge3D(props: EventBadgeProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!motion.matches && typeof WebGL2RenderingContext !== "undefined");
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  if (!enabled) return props.fallback;

  return <BadgeErrorBoundary fallback={props.fallback}><BadgeScene {...props} /></BadgeErrorBoundary>;
}
