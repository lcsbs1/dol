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
  const visibleMonths = future.slice(0, 6);
  const count = Math.max(1, visibleMonths.length);
  const maxTotal = Math.max(1, ...visibleMonths.map((m) => m.total_cents));

  // Distribui os pilares 3D exatamente nos 6 slots horizontais da grade CSS
  const colWidth = (viewport.width * 0.96) / count;
  const barWidth = Math.min(0.62, Math.max(0.28, colWidth * 0.48));
  const barDepth = Math.min(0.46, barWidth * 0.85);
  const maxHeight = Math.max(1.2, viewport.height * 0.68);
  const baseY = -maxHeight * 0.5;

  useEffect(() => {
    invalidate();
  }, [viewport.width, viewport.height, invalidate, selectedMonth, future]);

  return (
    <group position={[0, baseY, 0]}>
      {visibleMonths.map((month, idx) => {
        const x = -(viewport.width * 0.96) / 2 + colWidth * (idx + 0.5);
        const hasAny = month.total_cents > 0;
        const fixedHeight = month.fixed_cents > 0
          ? Math.max(0.14, (month.fixed_cents / maxTotal) * maxHeight)
          : hasAny
            ? 0
            : 0.08;
        const instHeight = month.installment_cents > 0
          ? Math.max(0.14, (month.installment_cents / maxTotal) * maxHeight)
          : 0;
        const isSelected = selectedMonth === month.billing_month;

        return (
          <group
            key={month.billing_month}
            position={[x, 0, isSelected ? 0.16 : 0]}
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
            {/* Base: Despesas Fixas (ou placeholder discreto se zerado) */}
            {fixedHeight > 0 && (
              <mesh position={[0, fixedHeight / 2, 0]}>
                <boxGeometry args={[barWidth, fixedHeight, barDepth]} />
                <meshStandardMaterial
                  color={
                    !hasAny
                      ? isDark
                        ? "#252833"
                        : "#D8DCE6"
                      : isSelected
                        ? "#F6FBBA"
                        : "#EAF295"
                  }
                  roughness={0.42}
                  metalness={0.04}
                />
              </mesh>
            )}

            {/* Topo: Parcelamentos */}
            {instHeight > 0 && (
              <mesh
                position={[
                  0,
                  fixedHeight + instHeight / 2 + (fixedHeight > 0 ? 0.04 : 0),
                  0,
                ]}
              >
                <boxGeometry args={[barWidth, instHeight, barDepth]} />
                <meshStandardMaterial
                  color={isSelected ? "#E5D7FD" : "#D5C2FA"}
                  roughness={0.4}
                  metalness={0.05}
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
      camera={{ position: [0, 2.35, 13.5], fov: 15 }}
    >
      <ambientLight intensity={isDark ? 1.05 : 1.15} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} color="#FFFDF5" />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#D5C2FA" />

      <ResponsiveBarsGroup
        future={future}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        isDark={isDark}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minAzimuthAngle={-0.12}
        maxAzimuthAngle={0.12}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
