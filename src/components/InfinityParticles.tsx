import React, { useEffect, useRef } from 'react';

const GLYPHS = ['.', '·', '+', 'x', '-', ':', '1', '0'];

export function InfinityParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // High density resolution
    const width = 240;
    const height = 240;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    class Particle {
      seed1: number;
      seed2: number;
      seed3: number;
      glyph: string;
      infT: number;
      infOffsetX: number;
      infOffsetY: number;
      infOffsetZ: number;
      silR: number;
      silTheta: number;
      silY: number;
      color: string;
      size: number;
      
      constructor() {
        this.seed1 = Math.random() * Math.PI * 2;
        this.seed2 = Math.random() * Math.PI * 2;
        this.seed3 = Math.random() * Math.PI * 2;

        const g = Math.random();
        if (g > 0.6) {
            this.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        } else {
            this.glyph = 'dot';
        }

        this.infT = Math.random() * Math.PI * 2;
        
        // Concentrate particles structurally for the infinity symbol (sharper crossover density)
        const radialOffset = Math.pow(Math.random(), 3) * 6; 
        const angleOffset = Math.random() * Math.PI * 2;
        this.infOffsetX = Math.cos(angleOffset) * radialOffset;
        this.infOffsetY = Math.sin(angleOffset) * radialOffset;
        this.infOffsetZ = (Math.random() - 0.5) * 4;

        // Finer, atmospheric silhouette
        this.silY = (Math.random() - 0.5) * 100; 
        this.silTheta = Math.random() * Math.PI * 2;
        this.silR = 2 + 16 * Math.pow(Math.random(), 2) * Math.cos(this.silY * 0.03);

        // Holographic, computational muted teal-gray palette
        const colors = [
            'rgba(94, 234, 212, 0.4)', // teal-300
            'rgba(45, 212, 191, 0.3)', // teal-400
            'rgba(148, 163, 184, 0.5)', // slate-400
            'rgba(56, 189, 248, 0.25)'  // sky-400
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Much smaller particles for delicate hairline texture
        this.size = 1.5 + Math.random() * 2.5;
      }

      getPos(loopPhase: number) {
        // --- SHAPE A: Infinity Hologram ---
        const a = 50; 
        const currT = this.infT + loopPhase * 2; 
        
        let tx = (a * Math.cos(currT)) / (1 + Math.pow(Math.sin(currT), 2));
        let ty = (a * Math.sin(currT) * Math.cos(currT)) / (1 + Math.pow(Math.sin(currT), 2));
        let tz = Math.sin(currT * 2) * 14;

        tx += this.infOffsetX;
        ty += this.infOffsetY;
        tz += this.infOffsetZ;

        const rotX = -0.50; // Pitch
        const rotY = 0.30;  // Yaw
        let y1 = ty * Math.cos(rotX) - tz * Math.sin(rotX);
        let z1 = ty * Math.sin(rotX) + tz * Math.cos(rotX);
        let infX = tx * Math.cos(rotY) + z1 * Math.sin(rotY);
        let infZ = -tx * Math.sin(rotY) + z1 * Math.cos(rotY);
        let infY = y1;

        // --- SHAPE B: Abstract Digital Column ---
        const sT = this.silTheta + loopPhase;
        const sY = this.silY + Math.sin(loopPhase * 2 + this.seed2) * 12; // breathing
        const sR = this.silR + Math.sin(loopPhase * 3 + this.seed1) * 6;
        
        let silX = Math.cos(sT) * sR;
        let silZ = Math.sin(sT) * sR;
        let silY = sY;
        
        let sy1 = silY * Math.cos(-0.3) - silZ * Math.sin(-0.3);
        let sz1 = silY * Math.sin(-0.3) + silZ * Math.cos(-0.3);
        silY = sy1;
        silZ = sz1;

        // --- MORPHING LOGIC (Seamless 8-second pacing) ---
        let v = 0;
        let phase = loopPhase / (Math.PI * 2); // 0.0 to 1.0
        
        if (phase < 0.20) {
            v = 0; // Hold Infinity
        } else if (phase < 0.45) {
            let f = (phase - 0.20) / 0.25;
            v = f * f * (3 - 2 * f); // Ease out/in
        } else if (phase < 0.55) {
            v = 1; // Hold Digital Column
        } else if (phase < 0.80) {
            let f = (phase - 0.55) / 0.25;
            v = 1 - (f * f * (3 - 2 * f)); // Ease out/in
        } else {
            v = 0; // Hold Infinity
        }

        // --- CLOUD SWELLING DURING TRANSITIONS ---
        const transitionSwell = Math.sin(v * Math.PI) * 25; 
        const nx = Math.sin(loopPhase * 2 + this.seed1) * transitionSwell;
        const ny = Math.cos(loopPhase * 3 + this.seed2) * transitionSwell;
        const nz = Math.sin(loopPhase * 2 + this.seed3) * transitionSwell;

        let finalX = infX * (1 - v) + silX * v + nx;
        let finalY = infY * (1 - v) + silY * v + ny;
        let finalZ = infZ * (1 - v) + silZ * v + nz;

        // Base ambient drift
        finalX += Math.sin(loopPhase + this.seed1) * 3;
        finalY += Math.cos(loopPhase + this.seed2) * 3;
        finalZ += Math.sin(loopPhase * 2 + this.seed3) * 3;

        return { x: finalX, y: finalY, z: finalZ };
      }

      draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, loopPhase: number) {
        const pos = this.getPos(loopPhase);
        
        const focalLength = 220;
        const zOff = pos.z + 140; 
        if (zOff <= 0) return;
        
        const scale = focalLength / zOff;
        const px = centerX + pos.x * scale;
        const py = centerY + pos.y * scale;
        
        const drawSize = Math.max(0.1, this.size * scale);
        
        // Depth Fade (closer = brighter, further = faded)
        const depthAlpha = Math.min(1, Math.max(0.02, (1 - (pos.z / 70))));

        // Individual flickering
        const shimmer = (Math.sin(loopPhase * 5 + this.seed1 * 10) + 1) / 2;
        const alpha = depthAlpha * (0.25 + shimmer * 0.65);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        
        if (this.glyph === 'dot') {
            ctx.beginPath();
            ctx.arc(px, py, drawSize * 0.15, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.font = `300 ${drawSize * 0.8}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.glyph, px, py);
        }
      }
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 2800; i++) {
        particles.push(new Particle());
    }

    let animationFrameId: number;
    // 8-second seamless loop duration
    const DURATION = 8000;
    
    // We want the cycle to always start precisely at 0 when the component mounts
    const startTime = Date.now();

    const render = () => {
        const elapsed = Date.now() - startTime;
        const loopPhase = ((elapsed % DURATION) / DURATION) * Math.PI * 2;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.globalCompositeOperation = 'lighter';

        const centerX = width / 2;
        const centerY = height / 2;

        particles.forEach(p => {
           p.draw(ctx, centerX, centerY, loopPhase);
        });

        animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="relative w-56 h-56 flex items-center justify-center mb-0 pointer-events-none select-none">
      <div className="absolute inset-0 bg-teal-600/10 blur-[45px] rounded-full mix-blend-plus-lighter opacity-40" />
      <canvas 
        ref={canvasRef} 
        style={{ width: 240, height: 240 }} 
        className="block relative z-10"
      />
    </div>
  );
}
