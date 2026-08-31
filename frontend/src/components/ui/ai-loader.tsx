import * as React from "react";

interface LoaderProps {
  size?: number;
  text?: string;
}

export const AiLoader: React.FC<LoaderProps> = ({ size = 180, text = "INTENTLOCK" }) => {
  const letters = text.split("");

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-b from-[#1a3379] via-[#0f172a] to-black text-white select-none pointer-events-auto">
      <div
        className="relative flex items-center justify-center font-sans tracking-widest text-sm font-semibold select-none transform-gpu"
        style={{ width: size, height: size, willChange: 'transform' }}
      >
        {letters.map((letter, index) => (
          <span
            key={index}
            className="inline-block text-white opacity-40 animate-loaderLetter transform-gpu"
            style={{
              animationDelay: `${index * 0.1}s`,
              willChange: 'transform, opacity',
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </span>
        ))}

        <div className="absolute inset-0 rounded-full animate-loaderCircle pointer-events-none transform-gpu" style={{ willChange: 'transform' }}></div>
      </div>

      <style>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(0deg) translateZ(0);
          }
          100% {
            transform: rotate(360deg) translateZ(0);
          }
        }

        @keyframes loaderLetter {
          0%,
          100% {
            opacity: 0.4;
            transform: translateY(0) translateZ(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.15) translateZ(0);
          }
          40% {
            opacity: 0.7;
            transform: translateY(0) translateZ(0);
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
          backface-visibility: hidden;
          box-shadow:
            0 6px 12px 0 #38bdf8 inset,
            0 12px 18px 0 #005dff inset,
            0 36px 36px 0 #1e40af inset,
            0 0 3px 1.2px rgba(56, 189, 248, 0.3),
            0 0 6px 1.8px rgba(0, 93, 255, 0.2);
        }

        .animate-loaderLetter {
          animation: loaderLetter 3s infinite;
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export const Component = AiLoader;
