'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
  alpha: number;
};

const DISABLED_ROUTES = new Set([
  '/x-overlay',
  '/youtube-overlay',
  '/twitch-overlay',
  '/pump-overlay',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SiteBackground() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (DISABLED_ROUTES.has(pathname)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastTime = performance.now();
    let idlePhase = 0;

    const particleCount = 210;
    const particles: Particle[] = [];

    const palette = [
      [73, 197, 182],
      [39, 121, 167],
      [109, 225, 214],
      [126, 167, 255],
    ] as const;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      pointerX = width * 0.5;
      pointerY = height * 0.45;
    }

    function spawn(randomizePosition: boolean): Particle {
      const cx = width * 0.5;
      const cy = height * 0.42;
      const angle = Math.random() * Math.PI * 2;
      const radius = randomizePosition ? Math.random() * Math.max(width, height) * 0.45 : 18 + Math.random() * 42;
      return {
        x: randomizePosition ? cx + Math.cos(angle) * radius : pointerX + (Math.random() - 0.5) * 28,
        y: randomizePosition ? cy + Math.sin(angle) * radius : pointerY + (Math.random() - 0.5) * 28,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 0.8 + Math.random() * 2.8,
        life: 180 + Math.random() * 260,
        maxLife: 180 + Math.random() * 260,
        hue: Math.random(),
        alpha: 0.2 + Math.random() * 0.55,
      };
    }

    function drawBackdrop(time: number) {
      const driftX = Math.sin(time * 0.00014) * width * 0.03;
      const driftY = Math.cos(time * 0.00012) * height * 0.04;

      context.clearRect(0, 0, width, height);

      const base = context.createLinearGradient(0, 0, 0, height);
      base.addColorStop(0, '#020407');
      base.addColorStop(0.45, '#03070d');
      base.addColorStop(1, '#02050a');
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);

      const tealBloom = context.createRadialGradient(
        width * 0.5 + driftX * 0.7,
        height * 0.38 + driftY * 0.5,
        0,
        width * 0.5 + driftX * 0.7,
        height * 0.38 + driftY * 0.5,
        Math.max(width, height) * 0.42,
      );
      tealBloom.addColorStop(0, 'rgba(73, 197, 182, 0.18)');
      tealBloom.addColorStop(0.35, 'rgba(39, 121, 167, 0.12)');
      tealBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = tealBloom;
      context.fillRect(0, 0, width, height);

      const sideBloom = context.createRadialGradient(
        width * 0.78 - driftX,
        height * 0.22,
        0,
        width * 0.78 - driftX,
        height * 0.22,
        Math.max(width, height) * 0.28,
      );
      sideBloom.addColorStop(0, 'rgba(118, 167, 255, 0.14)');
      sideBloom.addColorStop(0.45, 'rgba(39, 121, 167, 0.08)');
      sideBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = sideBloom;
      context.fillRect(0, 0, width, height);

      const orbRadius = 72 + Math.sin(time * 0.0013) * 6;
      const orb = context.createRadialGradient(
        width * 0.5,
        height * 0.44,
        0,
        width * 0.5,
        height * 0.44,
        orbRadius * 3.4,
      );
      orb.addColorStop(0, 'rgba(73, 197, 182, 0.12)');
      orb.addColorStop(0.4, 'rgba(39, 121, 167, 0.09)');
      orb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = orb;
      context.beginPath();
      context.arc(width * 0.5, height * 0.44, orbRadius * 3.4, 0, Math.PI * 2);
      context.fill();
    }

    function drawParticles(time: number) {
      const centerX = width * 0.5;
      const centerY = height * 0.44;

      context.save();
      context.globalCompositeOperation = 'screen';

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life -= 1.2;

        if (particle.life <= 0) {
          particles[index] = spawn(true);
          continue;
        }

        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const orbitForce = 0.0032;
        const tangent = Math.atan2(dy, dx) + Math.PI / 2;

        particle.vx += Math.cos(tangent) * orbitForce;
        particle.vy += Math.sin(tangent) * orbitForce;
        particle.vx += (dx / distance) * 0.004;
        particle.vy += (dy / distance) * 0.004;

        const pdx = pointerX - particle.x;
        const pdy = pointerY - particle.y;
        const pointerDistance = Math.sqrt(pdx * pdx + pdy * pdy) + 0.001;
        if (pointerDistance < 180) {
          particle.vx += (pdx / pointerDistance) * 0.012;
          particle.vy += (pdy / pointerDistance) * 0.012;
        }

        particle.vx *= 0.985;
        particle.vy *= 0.985;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (
          particle.x < -80 ||
          particle.x > width + 80 ||
          particle.y < -80 ||
          particle.y > height + 80
        ) {
          particles[index] = spawn(true);
          continue;
        }

        const lifeRatio = clamp(particle.life / particle.maxLife, 0, 1);
        const paletteIndex = Math.floor(particle.hue * palette.length) % palette.length;
        const color = palette[paletteIndex];
        const radius = particle.size * (0.65 + lifeRatio * 0.55);
        const alpha = particle.alpha * lifeRatio;

        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fill();

        const glow = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius * 6);
        glow.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.45})`);
        glow.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(particle.x, particle.y, radius * 6, 0, Math.PI * 2);
        context.fill();
      }

      for (let i = 0; i < particles.length; i += 12) {
        const a = particles[i];
        for (let j = i + 1; j < Math.min(i + 10, particles.length); j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 90) {
            continue;
          }

          context.strokeStyle = `rgba(73, 197, 182, ${(1 - distance / 90) * 0.08})`;
          context.lineWidth = 0.6;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      context.restore();
    }

    function drawGrain(time: number) {
      idlePhase += 1;
      if (idlePhase % 2 !== 0) {
        return;
      }

      context.save();
      context.globalAlpha = 0.055;
      for (let i = 0; i < 70; i += 1) {
        const x = (Math.sin(time * 0.0002 + i * 12.91) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.00016 + i * 7.37) * 0.5 + 0.5) * height;
        context.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(73,197,182,0.14)';
        context.fillRect(x, y, 1.2, 1.2);
      }
      context.restore();
    }

    function onPointerMove(event: MouseEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;

      for (let i = 0; i < 2; i += 1) {
        particles.push(spawn(false));
      }

      while (particles.length > particleCount + 40) {
        particles.shift();
      }
    }

    resize();

    for (let index = 0; index < particleCount; index += 1) {
      particles.push(spawn(true));
    }

    function animate(now: number) {
      const delta = now - lastTime;
      lastTime = now;

      drawBackdrop(now);
      drawParticles(now + delta);
      drawGrain(now);

      animationFrame = window.requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onPointerMove);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [pathname]);

  if (DISABLED_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="site-background-shell">
        <div className="site-background-vignette" />
        <div className="site-background-grid" />
        <canvas className="site-background-canvas" ref={canvasRef} />
      </div>
      <div aria-hidden="true" className="site-background-glass" />
    </>
  );
}
