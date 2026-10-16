"use client"

import React from "react"
import { useCanvasStore } from "../../lib/crdt/canvasStore"

interface KumikoLogoProps {
  size?: number
  className?: string
  animated?: boolean
  simplified?: boolean
  theme?: "morning" | "hearth"
}

export const KumikoLogo: React.FC<KumikoLogoProps> = ({
  size = 28,
  className = "",
  animated = false,
  simplified = false,
  theme,
}) => {
  const storeAtmosphere = useCanvasStore((state) => state.atmosphere)
  const atmosphere = theme || storeAtmosphere || "morning"
  const isHearth = atmosphere === "hearth"

  const uid = React.useId().replace(/:/g, "")

  const topFacetGradient = isHearth ? (
    <linearGradient id={`facetTop-${uid}`} x1="50" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#3c3733" />
      <stop offset="100%" stopColor="#25221f" />
    </linearGradient>
  ) : (
    <linearGradient id={`facetTop-${uid}`} x1="50" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="100%" stopColor="#f3ede2" />
    </linearGradient>
  )

  const leftFacetGradient = isHearth ? (
    <linearGradient id={`facetLeft-${uid}`} x1="15" y1="30" x2="50" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#221e1c" />
      <stop offset="100%" stopColor="#141211" />
    </linearGradient>
  ) : (
    <linearGradient id={`facetLeft-${uid}`} x1="15" y1="30" x2="50" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#ede5d5" />
      <stop offset="100%" stopColor="#dfd4bf" />
    </linearGradient>
  )

  const rightFacetGradient = isHearth ? (
    <linearGradient id={`facetRight-${uid}`} x1="85" y1="30" x2="50" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#191716" />
      <stop offset="100%" stopColor="#0c0b0a" />
    </linearGradient>
  ) : (
    <linearGradient id={`facetRight-${uid}`} x1="85" y1="30" x2="50" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#e2d6be" />
      <stop offset="100%" stopColor="#cfbf9e" />
    </linearGradient>
  )

  const outerStroke = isHearth ? "#78716c" : "#44403c"
  const ridgeStroke = isHearth ? "#57534e" : "#78716c"
  const latticeStroke = isHearth ? "rgba(231, 229, 228, 0.4)" : "rgba(41, 37, 36, 0.35)"

  const isSmall = size <= 22 || simplified

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="ZenFlow Kumiko Tesseract Logo"
    >
      <defs>
        {topFacetGradient}
        {leftFacetGradient}
        {rightFacetGradient}

        {/* Cinnabar Nucleus Radial Bloom */}
        <radialGradient id={`cinnabarGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="35%" stopColor="#e07a5f" />
          <stop offset="75%" stopColor="#c25e3e" />
          <stop offset="100%" stopColor="#8c351c" />
        </radialGradient>

        <filter id={`softGlow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Isometric Solid Base Facets */}
      <g className={animated ? "kumiko-fade-in" : ""}>
        {/* Top Plinth */}
        <polygon
          points="50,10 85,30 50,50 15,30"
          fill={`url(#facetTop-${uid})`}
          stroke={ridgeStroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Left Flank */}
        <polygon
          points="15,30 50,50 50,90 15,70"
          fill={`url(#facetLeft-${uid})`}
          stroke={ridgeStroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right Flank */}
        <polygon
          points="50,50 85,30 85,70 50,90"
          fill={`url(#facetRight-${uid})`}
          stroke={ridgeStroke}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>

      {/* 2. Internal Kumiko Joinery Grid (Suppressed on micro sizes <= 22px for optical clarity) */}
      {!isSmall && (
        <g
          stroke={latticeStroke}
          strokeWidth="0.9"
          strokeLinecap="round"
          className={animated ? "kumiko-lattice-draw" : ""}
        >
          {/* Top Face Lattice */}
          <line x1="32.5" y1="20" x2="67.5" y2="40" />
          <line x1="67.5" y1="20" x2="32.5" y2="40" />

          {/* Left Face Lattice */}
          <line x1="15" y1="50" x2="50" y2="70" />
          <line x1="32.5" y1="40" x2="32.5" y2="80" />

          {/* Right Face Lattice */}
          <line x1="85" y1="50" x2="50" y2="70" />
          <line x1="67.5" y1="40" x2="67.5" y2="80" />
        </g>
      )}

      {/* 3. Outer Hexagon Shield Contour */}
      <polygon
        points="50,10 85,30 85,70 50,90 15,70 15,30"
        fill="none"
        stroke={outerStroke}
        strokeWidth={isSmall ? "2.5" : "1.8"}
        strokeLinejoin="round"
        className={animated ? "kumiko-hex-draw" : ""}
      />

      {/* 4. Suspended Kyoto Cinnabar Nucleus Seed */}
      <polygon
        points="50,43 57,50 50,57 43,50"
        fill={`url(#cinnabarGlow-${uid})`}
        filter={`url(#softGlow-${uid})`}
        stroke="#fca5a5"
        strokeWidth="0.5"
        className={animated ? "kumiko-cinnabar-pulse" : ""}
      />
    </svg>
  )
}
