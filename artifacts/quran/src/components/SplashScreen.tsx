import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onDone: () => void;
}

// Decorative geometric SVG ornament
function IslamicOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none">
      {/* Outer ring */}
      <circle cx="100" cy="100" r="94" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="82" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />

      {/* 8-pointed star */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = 100 + 70 * Math.cos(angle);
        const y1 = 100 + 70 * Math.sin(angle);
        const x2 = 100 + 70 * Math.cos(angle + (22.5 * Math.PI) / 180);
        const y2 = 100 + 70 * Math.sin(angle + (22.5 * Math.PI) / 180);
        return (
          <line key={i} x1="100" y1="100" x2={x1} y2={y1} stroke="currentColor" strokeWidth="0.75" opacity="0.25" />
        );
      })}

      {/* Inner geometric pattern */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        const r1 = 45, r2 = 65;
        const x1 = 100 + r1 * Math.cos(a);
        const y1 = 100 + r1 * Math.sin(a);
        const x2 = 100 + r2 * Math.cos(a + (22.5 * Math.PI) / 180);
        const y2 = 100 + r2 * Math.sin(a + (22.5 * Math.PI) / 180);
        const x3 = 100 + r1 * Math.cos(a + (45 * Math.PI) / 180);
        const y3 = 100 + r1 * Math.sin(a + (45 * Math.PI) / 180);
        return (
          <polygon
            key={i}
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            stroke="currentColor"
            strokeWidth="0.75"
            fill="currentColor"
            fillOpacity="0.05"
            opacity="0.4"
          />
        );
      })}

      {/* Center circles */}
      <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="30" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 100);
    const t2 = setTimeout(() => setPhase("out"), 2600);
    const t3 = setTimeout(() => onDone(), 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== "out" ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0d2818 0%, #1a4a2e 40%, #0f3320 70%, #071a0f 100%)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(134,239,172,0.08) 0%, transparent 70%)",
            }}
          />

          {/* Top decorative line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(134,239,172,0.4), transparent)" }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(134,239,172,0.4), transparent)" }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
          />

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-0" dir="rtl">

            {/* Ornament + emblem */}
            <div className="relative w-52 h-52 flex items-center justify-center mb-4">
              {/* Rotating outer ornament */}
              <motion.div
                className="absolute inset-0 text-green-300"
                initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.1, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <IslamicOrnament className="w-full h-full" />
              </motion.div>

              {/* Slow continuous rotation */}
              <motion.div
                className="absolute inset-0 text-green-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{ opacity: 0.15 }}
              >
                <IslamicOrnament className="w-full h-full" />
              </motion.div>

              {/* Center "ق" emblem */}
              <motion.div
                className="relative z-10 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle, rgba(134,239,172,0.15) 0%, rgba(134,239,172,0.05) 100%)",
                    border: "1px solid rgba(134,239,172,0.3)",
                    boxShadow: "0 0 30px rgba(134,239,172,0.15), inset 0 0 20px rgba(134,239,172,0.05)",
                  }}
                >
                  <span
                    className="text-green-300 font-bold select-none"
                    style={{ fontFamily: "'Scheherazade New', serif", fontSize: "2.8rem", lineHeight: 1 }}
                  >
                    ق
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Title: القرآن الكريم */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
            >
              <h1
                className="text-green-100 font-bold tracking-wide"
                style={{
                  fontFamily: "'Scheherazade New', 'Amiri', serif",
                  fontSize: "clamp(2rem, 8vw, 3rem)",
                  textShadow: "0 0 40px rgba(134,239,172,0.3)",
                  letterSpacing: "0.05em",
                }}
              >
                القُرآنُ الكَريمُ
              </h1>
            </motion.div>

            {/* Decorative divider */}
            <motion.div
              className="flex items-center gap-3 my-4"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.6, ease: "easeOut" }}
            >
              <div className="h-px w-16" style={{ background: "linear-gradient(90deg, transparent, rgba(134,239,172,0.5))" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ opacity: 0.6 }} />
              <div className="w-1 h-1 rounded-full bg-green-400" style={{ opacity: 0.4 }} />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ opacity: 0.6 }} />
              <div className="h-px w-16" style={{ background: "linear-gradient(90deg, rgba(134,239,172,0.5), transparent)" }} />
            </motion.div>

            {/* Verse */}
            <motion.p
              className="text-center px-8 max-w-sm"
              style={{
                fontFamily: "'Scheherazade New', 'Amiri', serif",
                fontSize: "clamp(1rem, 3.5vw, 1.2rem)",
                color: "rgba(134,239,172,0.65)",
                lineHeight: 1.8,
                direction: "rtl",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6, ease: "easeOut" }}
            >
              إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ
            </motion.p>

            {/* Loading dots */}
            <motion.div
              className="flex gap-1.5 mt-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                  animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </motion.div>
          </div>

          {/* Corner decorations */}
          {[
            "top-6 right-6 rotate-0",
            "top-6 left-6 rotate-90",
            "bottom-6 right-6 -rotate-90",
            "bottom-6 left-6 rotate-180",
          ].map((pos, i) => (
            <motion.div
              key={i}
              className={`absolute ${pos} w-8 h-8 text-green-400`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            >
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M2 30 L2 2 L30 2" />
                <path d="M2 8 L8 2" opacity="0.5" />
                <path d="M2 14 L14 2" opacity="0.3" />
              </svg>
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
