import { useEffect, useRef } from "react";

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
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; r: number; dx: number; dy: number;
      opacity: number; color: string;
    }

    const colors = [
      "59, 130, 246",   // blue
      "99, 102, 241",   // indigo
      "167, 139, 250",  // purple
      "244, 114, 182",  // pink accent
    ];

    const particles: Particle[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.5 + 1,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();

        // glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(${p.color}, ${p.opacity * 0.3})`);
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

    {/* Soft gradient blobs */}
    <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-400/25 to-indigo-500/15 blur-3xl auth-float-slow" />
    <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-purple-400/20 to-pink-400/10 blur-3xl auth-float-slow-reverse" />
    <div className="absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-300/15 to-blue-200/10 blur-3xl auth-float-medium" />
    <div className="absolute right-1/4 bottom-1/3 h-56 w-56 rounded-full bg-gradient-to-tl from-violet-300/12 to-fuchsia-200/8 blur-3xl auth-float-slow" />

    {/* Particle network canvas */}
    <ParticleCanvas />

    {/* Subtle grid */}
    <div className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.035)_1px,transparent_1px)] bg-[length:48px_48px]" />

    {/* Subtle academic icons – low-opacity SVG overlay */}
    <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
      {/* Book icon */}
      <svg className="absolute top-[12%] left-[8%] w-16 h-16 text-indigo-400/[0.06] auth-float-medium" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v-2H6.5a.5.5 0 0 1 0-1H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/>
      </svg>
      {/* Graph/chart icon */}
      <svg className="absolute top-[20%] right-[12%] w-14 h-14 text-blue-400/[0.06] auth-float-slow-reverse" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3v18h18v-2H5V3H3zm4 12h2V9H7v6zm4 0h2V5h-2v10zm4 0h2V7h-2v8z"/>
      </svg>
      {/* AI / brain node */}
      <svg className="absolute bottom-[18%] left-[15%] w-12 h-12 text-purple-400/[0.05] auth-float-slow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a9 9 0 0 0-9 9c0 3.03 1.53 5.82 4 7.47V22h2v-2h6v2h2v-3.53c2.47-1.65 4-4.44 4-7.47a9 9 0 0 0-9-9zm-1 14H9v-2h2v2zm4 0h-2v-2h2v2zm1.29-5.71L15 11.59l-1.29 1.3a1 1 0 0 1-1.42-1.42l1.3-1.29-1.3-1.29a1 1 0 0 1 1.42-1.42L15 8.77l1.29-1.3a1 1 0 0 1 1.42 1.42l-1.3 1.29 1.3 1.29a1 1 0 0 1-1.42 1.42z"/>
      </svg>
      {/* Graduation cap */}
      <svg className="absolute bottom-[25%] right-[10%] w-14 h-14 text-indigo-300/[0.05] auth-float-medium" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
      </svg>
      {/* Analytics dots */}
      <svg className="absolute top-[55%] left-[5%] w-10 h-10 text-blue-300/[0.04] auth-float-slow-reverse" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="6" r="2"/>
        <path d="M7.5 16.5l3-3m2 0l3-3" stroke="currentColor" strokeWidth="1" fill="none"/>
      </svg>
    </div>

    {/* Gradient wave at bottom */}
    <div className="absolute bottom-0 left-0 right-0 z-[2] h-32">
      <svg viewBox="0 0 1440 120" className="w-full h-full" preserveAspectRatio="none">
        <path
          d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,40 1440,60 L1440,120 L0,120 Z"
          fill="rgba(99, 102, 241, 0.03)"
          className="auth-wave"
        />
        <path
          d="M0,80 C240,40 600,100 960,60 C1200,30 1380,80 1440,60 L1440,120 L0,120 Z"
          fill="rgba(59, 130, 246, 0.025)"
          className="auth-wave-2"
        />
      </svg>
    </div>
  </>
);

export default AuthBackground;
