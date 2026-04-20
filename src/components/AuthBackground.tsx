import { useEffect, useRef } from "react";
import excellenciaLogo from "@/assets/excellencia-logo.png";
import knsoftLogo from "@/assets/knsoft-logo.png";

/* ── Floating particles canvas ── */
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; r: number; dx: number; dy: number;
      opacity: number; color: string; pulseSpeed: number; pulsePhase: number;
    }

    const colors = [
      "37, 99, 235",    // Excellencia blue
      "239, 68, 68",    // Excellencia red
      "168, 85, 247",   // Purple bridge
      "59, 130, 246",   // Light blue
    ];

    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 3 + 1.5,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const alpha = 0.18 * (1 - dist / 180);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulse = Math.sin(frame * p.pulseSpeed + p.pulsePhase) * 0.15 + 1;
        const currentR = p.r * pulse;
        const currentOpacity = p.opacity * (0.85 + pulse * 0.15);

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${currentOpacity})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR * 4, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentR * 4);
        grad.addColorStop(0, `rgba(${p.color}, ${currentOpacity * 0.4})`);
        grad.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > window.innerWidth) p.dx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.dy *= -1;
      }

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-[1]" />;
};

/* ── Main background component ── */
const AuthBackground = () => (
  <>
    {/* Animated gradient base */}
    <div className="absolute inset-0 auth-gradient-bg" />

    {/* Excellencia Infinitum logo watermark — repeated tile */}
    <div
      className="absolute inset-0 z-[2] pointer-events-none opacity-40"
      style={{
        backgroundImage: `url(${excellenciaLogo})`,
        backgroundRepeat: "repeat",
        backgroundSize: "220px auto",
      }}
      aria-hidden="true"
    />

    {/* Gradient blobs – Excellencia brand colors (blue / red / purple) */}
    <div className="absolute -left-20 -top-20 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-blue-500/40 to-indigo-600/25 blur-3xl auth-float-slow" />
    <div className="absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full bg-gradient-to-tl from-red-500/35 to-rose-400/20 blur-3xl auth-float-slow-reverse" />
    <div className="absolute left-1/3 top-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/25 to-blue-400/15 blur-3xl auth-float-medium" />
    <div className="absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-gradient-to-tl from-red-400/22 to-purple-400/15 blur-3xl auth-float-slow" />

    {/* Particle network canvas */}
    <ParticleCanvas />

    {/* Dot grid – more visible */}
    <div className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.07)_1px,transparent_1px)] bg-[length:44px_44px]" />

    {/* Academic icons – increased opacity & size */}
    <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
      <svg className="absolute top-[10%] left-[7%] w-20 h-20 text-indigo-500/[0.12] auth-float-medium" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v-2H6.5a.5.5 0 0 1 0-1H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/>
      </svg>
      <svg className="absolute top-[18%] right-[10%] w-18 h-18 text-blue-500/[0.12] auth-float-slow-reverse" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3v18h18v-2H5V3H3zm4 12h2V9H7v6zm4 0h2V5h-2v10zm4 0h2V7h-2v8z"/>
      </svg>
      <svg className="absolute bottom-[16%] left-[12%] w-16 h-16 text-purple-500/[0.1] auth-float-slow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a9 9 0 0 0-9 9c0 3.03 1.53 5.82 4 7.47V22h2v-2h6v2h2v-3.53c2.47-1.65 4-4.44 4-7.47a9 9 0 0 0-9-9zm-1 14H9v-2h2v2zm4 0h-2v-2h2v2z"/>
      </svg>
      <svg className="absolute bottom-[22%] right-[8%] w-18 h-18 text-indigo-400/[0.1] auth-float-medium" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
      </svg>
      <svg className="absolute top-[50%] left-[4%] w-14 h-14 text-blue-400/[0.08] auth-float-slow-reverse" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="6" r="2"/>
        <path d="M7.5 16.5l3-3m2 0l3-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
      {/* Atom / science */}
      <svg className="absolute top-[40%] right-[5%] w-16 h-16 text-violet-400/[0.08] auth-float-medium" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
        <ellipse cx="12" cy="12" rx="10" ry="4"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>
      </svg>
      {/* Lightbulb / idea */}
      <svg className="absolute top-[70%] right-[25%] w-14 h-14 text-amber-400/[0.08] auth-float-slow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.74V17h2v-2.13l-.37-.3A5 5 0 0 1 12 4a5 5 0 0 1 2.37 9.57l-.37.3V17h2v-2.26A7 7 0 0 0 12 2z"/>
      </svg>
    </div>

    {/* Gradient waves at bottom – more visible */}
    <div className="absolute bottom-0 left-0 right-0 z-[2] h-36">
      <svg viewBox="0 0 1440 120" className="w-full h-full" preserveAspectRatio="none">
        <path
          d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,40 1440,60 L1440,120 L0,120 Z"
          fill="rgba(99, 102, 241, 0.07)"
          className="auth-wave"
        />
        <path
          d="M0,80 C240,40 600,100 960,60 C1200,30 1380,80 1440,60 L1440,120 L0,120 Z"
          fill="rgba(59, 130, 246, 0.05)"
          className="auth-wave-2"
        />
      </svg>
    </div>

    {/* Knsoft Technologies branding – bottom right */}
    <div className="absolute bottom-4 right-4 z-[5] pointer-events-none flex flex-col items-end gap-1">
      <img
        src={knsoftLogo}
        alt="Knsoft Technologies"
        className="h-10 sm:h-12 w-auto opacity-90 drop-shadow-md select-none"
      />
      <span className="text-[10px] sm:text-xs text-slate-600/80 font-medium tracking-wide">
        Powered by Knsoft Technologies
      </span>
    </div>
  </>
);

export default AuthBackground;
