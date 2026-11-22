"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { FutureMonthCommitment } from "@/lib/finance/types";

interface Commitments3DSceneProps {
  future: FutureMonthCommitment[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
  isDark: boolean;
}

function ResponsiveBarsGroup({
  future,
  selectedMonth,
  onSelectMonth,
  isDark,
}: Commitments3DSceneProps) {
  const { viewport, invalidate } = useThree();
  const maxTotal = Math.max(1, ...future.map((m) => m.total_cents));
  const totalWidth = Math.max(1, future.length) * 0.78 + 0.4;
  const scale = Math.max(0.45, Math.min(1, (viewport.width * 0.86) / totalWidth));

  useEffect(() => {
    invalidate();
  }, [scale, invalidate, selectedMonth]);

  return (
    <group position={[0, -0.75 * scale, 0]} scale={[scale, scale, scale]}>
      {future.map((month, idx) => {
        const x = (idx - (future.length - 1) / 2) * 0.78;
        const fixedHeight = Math.max(0.08, (month.fixed_cents / maxTotal) * 2.1);
        const instHeight = (month.installment_cents / maxTotal) * 2.1;
        const isSelected = selectedMonth === month.billing_month;

        return (
          <group
            key={month.billing_month}
            position={[x, 0, isSelected ? 0.22 : 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectMonth(month.billing_month);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            {/* Base: Despesas Fixas */}
            <mesh position={[0, fixedHeight / 2, 0]}>
              <boxGeometry args={[0.46, fixedHeight, 0.46]} />
              <meshStandardMaterial
                color={isSelected ? "#3B82F6" : isDark ? "#334155" : "#94A3B8"}
                roughness={0.35}
                metalness={0.12}
              />
            </mesh>

            {/* Topo: Parcelamentos */}
            {instHeight > 0.02 && (
              <mesh position={[0, fixedHeight + instHeight / 2 + 0.04, 0]}>
                <boxGeometry args={[0.46, instHeight, 0.46]} />
                <meshStandardMaterial
                  color={isSelected ? "#34D399" : "#10B981"}
                  roughness={0.3}
                  metalness={0.15}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function Commitments3DScene({
  future,
  selectedMonth,
  onSelectMonth,
  isDark,
}: Commitments3DSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 2.7, 5.1], fov: 36 }}
    >
      <ambientLight intensity={isDark ? 0.9 : 1.1} />
      <directionalLight position={[4, 6, 4]} intensity={1.45} />
      <directionalLight position={[-4, 2, -2]} intensity={0.45} color="#60A5FA" />

      <ResponsiveBarsGroup
        future={future}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        isDark={isDark}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
