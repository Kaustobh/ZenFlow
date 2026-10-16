"use client"

import React, { useState, useEffect } from "react"
import { KumikoLogo } from "./KumikoLogo"
import { useCanvasStore } from "../../lib/crdt/canvasStore"
import { acoustics } from "../../lib/audio/atelierAcoustics"

interface AtelierLoadingScreenProps {
  onComplete?: () => void
}

export const AtelierLoadingScreen: React.FC<AtelierLoadingScreenProps> = ({ onComplete }) => {
  const atmosphere = useCanvasStore((state) => state.atmosphere)
  const isHearth = atmosphere === "hearth"

  // Animation Phase: "intro" -> "ignited" -> "expanding" -> "finished"
  const [phase, setPhase] = useState<"intro" | "ignited" | "expanding" | "finished">("intro")

  useEffect(() => {
    // Stage 1: Assemble and ignite the Cinnabar core (400ms)
    const t1 = setTimeout(() => {
      setPhase("ignited")
      acoustics.playAnchorSnap()
    }, 420)

    // Stage 2: Iris Aperture expands outward from center (680ms)
    const t2 = setTimeout(() => {
      setPhase("expanding")
    }, 680)

    // Stage 3: Completed and unmounted (1050ms)
    const t3 = setTimeout(() => {
      setPhase("finished")
      if (onComplete) onComplete()
    }, 1080)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onComplete])

  // Instant skip on click or keypress
  const handleSkip = () => {
    setPhase("expanding")
    setTimeout(() => {
      setPhase("finished")
      if (onComplete) onComplete()
    }, 180)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.code === "Space") {
        handleSkip()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (phase === "finished") return null

  const isExpanding = phase === "expanding"
  const isIgnited = phase === "ignited" || phase === "expanding"

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex items-center justify-center cursor-pointer select-none overflow-hidden transition-all duration-400 ease-out ${
        isExpanding ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
      }`}
      style={{
        clipPath: isExpanding
          ? "circle(150% at 50% 50%)"
          : "circle(100% at 50% 50%)",
        transition: "clip-path 480ms cubic-bezier(0.16, 1, 0.3, 1), opacity 380ms 100ms ease-out",
      }}
    >
      {/* Background Substrate Plane */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isHearth ? "bg-[#141312]" : "bg-[#faf9f5]"
        }`}
      />

      {/* Subtle Atelier Spatial Grid */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-30 ${
          isHearth ? "atelier-grid-hearth" : "atelier-grid-morning"
        }`}
        style={{ backgroundSize: "32px 32px" }}
      />

      {/* Center Kinetic Logo Entity */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 ease-out ${
          isExpanding
            ? "scale-115 opacity-0 blur-sm"
            : isIgnited
            ? "scale-105 opacity-100"
            : "scale-100 opacity-95"
        }`}
      >
        {/* The Kumiko Tesseract */}
        <div className="relative">
          <KumikoLogo size={88} animated theme={atmosphere} />

          {/* Ambient Cinnabar Core Glow Halo */}
          <div
            className={`absolute inset-0 -z-10 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
              isIgnited ? "opacity-60 scale-130" : "opacity-0 scale-75"
            }`}
            style={{
              background: isHearth
                ? "radial-gradient(circle, rgba(194,94,62,0.6) 0%, rgba(20,19,18,0) 70%)"
                : "radial-gradient(circle, rgba(194,94,62,0.45) 0%, rgba(250,249,245,0) 70%)",
            }}
          />
        </div>

        {/* Minimal Wordmark (No Metrics, Clean Typography) */}
        <div
          className={`mt-4 flex items-center gap-1.5 transition-all duration-400 ${
            isIgnited ? "opacity-90 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          <span
            className={`text-xs font-bold tracking-[0.25em] uppercase font-sans ${
              isHearth ? "text-stone-300" : "text-stone-800"
            }`}
          >
            ZenFlow
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#c25e3e]" />
        </div>
      </div>
    </div>
  )
}
