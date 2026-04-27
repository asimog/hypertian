'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMusic, type AudioFeatures } from '@/components/music-provider';
import { createEarthRenderer, type EarthRenderer } from '@/components/earth-renderer';

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
  '/pump-overlay',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SiteBackground() {
  const pathname = usePathname();
  const music = useMusic();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const featuresRef = useRef<AudioFeatures>(music.features);

  useEffect(() => {
    featuresRef.current = music.features;
  }, [music.features]);

  useEffect(() => {
    if (DISABLED_ROUTES.has(pathname) || pathname?.startsWith('/overlay')) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
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

    const canvasEl = canvas;
    const ctx = context;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastTime = performance.now();
    let idlePhase = 0;
    let rotation = 0;
    const earth: EarthRenderer | null = createEarthRenderer(256);

    const particleCount = window.innerWidth < 768 ? 96 : 210;
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
      canvasEl.width = Math.floor(width * ratio);
      canvasEl.height = Math.floor(height * ratio);
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
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
      const audio = featuresRef.current;
      const energy = audio.isPlaying ? audio.volume : 0.08;
      const bass = audio.isPlaying ? audio.bass : 0.05;
      const mid = audio.isPlaying ? audio.mid : 0.04;
      const high = audio.isPlaying ? audio.high : 0.04;
      const driftX = Math.sin(time * 0.00014) * width * 0.03;
      const driftY = Math.cos(time * 0.00012) * height * 0.04;

      ctx.clearRect(0, 0, width, height);

      const base = ctx.createLinearGradient(0, 0, 0, height);
      base.addColorStop(0, '#020407');
      base.addColorStop(0.45, '#03070d');
      base.addColorStop(1, '#02050a');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      const tealBloom = ctx.createRadialGradient(
        width * 0.5 + driftX * 0.7,
        height * 0.38 + driftY * 0.5,
        0,
        width * 0.5 + driftX * 0.7,
        height * 0.38 + driftY * 0.5,
        Math.max(width, height) * 0.42,
      );
      tealBloom.addColorStop(0, `rgba(73, 197, 182, ${0.14 + energy * 0.14})`);
      tealBloom.addColorStop(0.35, `rgba(39, 121, 167, ${0.08 + mid * 0.14})`);
      tealBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = tealBloom;
      ctx.fillRect(0, 0, width, height);

      const sideBloom = ctx.createRadialGradient(
        width * 0.78 - driftX,
        height * 0.22,
        0,
        width * 0.78 - driftX,
        height * 0.22,
        Math.max(width, height) * 0.28,
      );
      sideBloom.addColorStop(0, `rgba(118, 167, 255, ${0.1 + high * 0.16})`);
      sideBloom.addColorStop(0.45, `rgba(39, 121, 167, ${0.06 + energy * 0.1})`);
      sideBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sideBloom;
      ctx.fillRect(0, 0, width, height);

      const orbRadius = Math.min(width, height) * 0.115 + Math.sin(time * 0.0013) * 6 + bass * 38 + energy * 14;
      const cx = width * 0.5;
      const cy = height * 0.44;

      const halo = ctx.createRadialGradient(cx, cy, orbRadius * 0.9, cx, cy, orbRadius * 3.6);
      halo.addColorStop(0, `rgba(245, 251, 251, ${0.08 + energy * 0.1})`);
      halo.addColorStop(0.22, `rgba(134, 182, 255, ${0.14 + high * 0.2})`);
      halo.addColorStop(0.5, `rgba(73, 197, 182, ${0.1 + mid * 0.18})`);
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, orbRadius * 3.6, 0, Math.PI * 2);
      ctx.fill();

      drawEarthOrb(cx, cy, orbRadius, audio);
    }

    function drawEarthOrb(cx: number, cy: number, radius: number, audio: AudioFeatures) {
      const energy = audio.isPlaying ? audio.volume : 0.04;
      const bass = audio.isPlaying ? audio.bass : 0.02;
      const high = audio.isPlaying ? audio.high : 0.03;

      rotation += 0.0009 + bass * 0.012 + energy * 0.003;

      if (earth) {
        earth.redraw(rotation, energy * 0.18, high);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(earth.buffer, cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.restore();
      } else {
        const fallback = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
        fallback.addColorStop(0, '#5fbf6a');
        fallback.addColorStop(0.5, '#1f7d95');
        fallback.addColorStop(1, '#061015');
        ctx.fillStyle = fallback;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rim = ctx.createRadialGradient(cx, cy, radius * 0.86, cx, cy, radius * 1.12);
      rim.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rim.addColorStop(0.55, `rgba(134, 182, 255, ${0.18 + high * 0.3})`);
      rim.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (audio.beat) {
        ctx.save();
        ctx.strokeStyle = `rgba(245, 251, 251, ${0.4 + bass * 0.3})`;
        ctx.lineWidth = 1.6 + bass * 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1.06 + bass * 0.18), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawParticles(time: number) {
      const audio = featuresRef.current;
      const energy = audio.isPlaying ? audio.volume : 0.08;
      const bass = audio.isPlaying ? audio.bass : 0.04;
      const high = audio.isPlaying ? audio.high : 0.04;
      const centerX = width * 0.5;
      const centerY = height * 0.44;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

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
        const orbitForce = 0.0032 + energy * 0.006;
        const tangent = Math.atan2(dy, dx) + Math.PI / 2;

        particle.vx += Math.cos(tangent) * orbitForce;
        particle.vy += Math.sin(tangent) * orbitForce;
        particle.vx += (dx / distance) * 0.004;
        particle.vy += (dy / distance) * 0.004;

        const pdx = pointerX - particle.x;
        const pdy = pointerY - particle.y;
        const pointerDistance = Math.sqrt(pdx * pdx + pdy * pdy) + 0.001;
        if (pointerDistance < 180) {
          particle.vx += (pdx / pointerDistance) * (0.012 + bass * 0.018);
          particle.vy += (pdy / pointerDistance) * (0.012 + bass * 0.018);
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
        const radius = particle.size * (0.65 + lifeRatio * 0.55 + high * 1.3);
        const alpha = particle.alpha * lifeRatio * (0.8 + energy * 1.1);

        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();

        const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius * 6);
        glow.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.45})`);
        glow.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius * 6, 0, Math.PI * 2);
        ctx.fill();
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

          ctx.strokeStyle = `rgba(73, 197, 182, ${(1 - distance / 90) * (0.07 + energy * 0.08)})`;
          ctx.lineWidth = 0.55 + bass * 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    function drawGrain(time: number) {
      idlePhase += 1;
      if (idlePhase % 2 !== 0) {
        return;
      }

      ctx.save();
      ctx.globalAlpha = 0.055;
      for (let i = 0; i < 70; i += 1) {
        const x = (Math.sin(time * 0.0002 + i * 12.91) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.00016 + i * 7.37) * 0.5 + 0.5) * height;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(73,197,182,0.14)';
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      ctx.restore();
    }

    function onPointerMove(event: MouseEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;

      const burst = featuresRef.current.isPlaying ? 4 : 2;
      for (let i = 0; i < burst; i += 1) {
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

  if (DISABLED_ROUTES.has(pathname) || pathname?.startsWith('/overlay')) {
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
