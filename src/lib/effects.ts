import { PixelCoord } from './pixels';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  decay: number;
  gravity: number;
  type: 'debris' | 'pixel' | 'spark' | 'heal' | 'sparkle' | 'line';
  rotation?: number;
  rotationSpeed?: number;
  points?: { x: number; y: number }[];
  width?: number;
}

export interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  type: 'laser' | 'orb' | 'drain' | 'wave';
  color: string;
  distanceToTravel: number;
  distanceTraveled: number;
  onImpact?: () => void;
  active: boolean;
  lastTrailAt: number;
}

export interface Ghost {
  x: number;
  y: number;
  pixels: string;
  scale: number;
  color: string;
  life: number;
  decay: number;
}

export interface FlashEffect {
  color: string;
  life: number;
  decay: number;
}

export interface TextEffect {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  decay: number;
  vy: number;
}

export class EffectsSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public particles: Particle[] = [];
  public projectiles: Projectile[] = [];
  public ghosts: Ghost[] = [];
  public flashEffects: FlashEffect[] = [];
  public textEffects: TextEffect[] = [];
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
  }

  public start(): void {
    this.running = true;
    this._loop();
  }

  public stop(): void {
    this.running = false;
  }

  /**
   * Spawn pixel debris at exact screen positions from removed pixel coords
   * This is the key effect — real pixels flying off the sprite
   */
  public spawnPixelDebris(removedCoords: PixelCoord[], spriteX: number, spriteY: number, pixelScale: number): void {
    for (const coord of removedCoords) {
      const screenX = spriteX + coord.x * pixelScale + pixelScale / 2;
      const screenY = spriteY + coord.y * pixelScale + pixelScale / 2;

      // Each removed pixel becomes a flying debris particle
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;

      this.particles.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: pixelScale * 0.8,
        color: '#48494b',
        life: 1.0,
        decay: 0.008 + Math.random() * 0.012,
        gravity: 0.06,
        type: 'debris',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  /**
   * Spawn big explosion at center (for crits)
   */
  public spawnDamagePixels(x: number, y: number, count: number, color: string = '#48494b'): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      const size = 2 + Math.random() * 4;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size,
        color,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.08,
        type: 'pixel',
      });
    }
  }

  public spawnCritBurst(x: number, y: number): void {
    const colors = ['#fbbf24', '#f59e0b', '#ff2d6b', '#ffffff'];
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 3 + Math.random() * 6;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.02 + Math.random() * 0.015,
        gravity: 0.05,
        type: 'spark',
      });
    }
  }

  public spawnHealParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(1 + Math.random() * 2),
        size: 3 + Math.random() * 3,
        color: '#22c55e',
        life: 1.0,
        decay: 0.015,
        gravity: -0.02,
        type: 'heal',
      });
    }
  }

  public spawnBuffSparkles(x: number, y: number, color: string = '#00f0ff'): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 40;
      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.5 + Math.random()),
        size: 2 + Math.random() * 3,
        color,
        life: 1.0,
        decay: 0.01 + Math.random() * 0.01,
        gravity: -0.03,
        type: 'sparkle',
      });
    }
  }

  /**
   * Spawn dodge whoosh effect
   */
  public spawnDodgeEffect(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 2,
        size: 2 + Math.random() * 3,
        color: '#00f0ff',
        life: 1.0,
        decay: 0.04,
        gravity: 0,
        type: 'sparkle',
      });
    }
  }

  public showFloatingText(x: number, y: number, text: string, color: string = '#ff2d6b', size = 18): void {
    this.textEffects.push({
      x,
      y,
      text,
      color,
      size,
      life: 1.0,
      decay: 0.02,
      vy: -1.5,
    });
  }

  public flash(color: string = 'rgba(255, 45, 107, 0.3)', duration = 200): void {
    this.flashEffects.push({
      color,
      life: 1.0,
      decay: 1 / (duration / 16.67),
    });
  }

  /**
   * Spawn a traveling projectile
   */
  public spawnProjectile(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    type: 'laser' | 'orb' | 'drain' | 'wave',
    color: string,
    onImpact: () => void
  ): void {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Projectile speed depends on type
    const speed = type === 'orb' ? 8 : (type === 'laser' ? 25 : 12);

    this.projectiles.push({
      x: startX,
      y: startY,
      targetX,
      targetY,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      type,
      color,
      distanceToTravel: distance,
      distanceTraveled: 0,
      onImpact,
      active: true,
      lastTrailAt: 0,
    });
  }

  /**
   * Spawn a fading ghost of a sprite (for dodging)
   */
  public spawnGhost(x: number, y: number, pixels: string, scale: number, color: string): void {
    this.ghosts.push({
      x, y,
      pixels,
      scale,
      color,
      life: 1.0,
      decay: 0.04,
    });
  }

  public render(drawNormiePixelsFn: Function): void {
    const ctx = this.ctx;

    // Ghosts
    for (const ghost of this.ghosts) {
      ctx.save();
      ctx.globalAlpha = ghost.life * 0.5;
      drawNormiePixelsFn(ctx, ghost.pixels, ghost.x, ghost.y, ghost.scale, ghost.color, null);
      ctx.restore();
    }

    // Flash effects
    for (const flash of this.flashEffects) {
      ctx.save();
      ctx.fillStyle = flash.color.replace(/[\d.]+\)$/, `${flash.life * 0.5})`);
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;

      if (p.type === 'sparkle' || p.type === 'heal') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = p.color;

      if (p.type === 'pixel' || p.type === 'debris') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Projectiles
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      
      ctx.save();
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = proj.color;

      if (proj.type === 'laser') {
        ctx.translate(proj.x, proj.y);
        ctx.rotate(Math.atan2(proj.vy, proj.vx));
        ctx.fillRect(-15, -2, 30, 4);
      } else if (proj.type === 'orb') {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating text
    for (const t of this.textEffects) {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.font = `bold ${t.size}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';

      // Draw thick dark border stroke first
      ctx.strokeStyle = '#050508';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);

      // Draw main filled text with glow shadow
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  public update(): void {
    // Particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed;
      }
    }

    // Floating text
    for (const t of this.textEffects) {
      t.y += t.vy;
      t.life -= t.decay;
    }

    // Flashes
    for (const f of this.flashEffects) {
      f.life -= f.decay;
    }

    // Ghosts
    for (const g of this.ghosts) {
      g.life -= g.decay;
    }

    // Projectiles
    for (const proj of this.projectiles) {
      if (!proj.active) continue;

      proj.x += proj.vx;
      proj.y += proj.vy;
      
      const stepDist = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
      proj.distanceTraveled += stepDist;

      // Trail effects
      if (proj.distanceTraveled - proj.lastTrailAt > 10) {
        proj.lastTrailAt = proj.distanceTraveled;
        this.particles.push({
          x: proj.x + (Math.random() - 0.5) * 10,
          y: proj.y + (Math.random() - 0.5) * 10,
          vx: proj.vx * 0.1,
          vy: proj.vy * 0.1,
          size: proj.type === 'laser' ? 2 : 4,
          color: proj.color,
          life: 1.0,
          decay: proj.type === 'laser' ? 0.1 : 0.05,
          gravity: 0,
          type: 'sparkle',
        });
      }

      // Check impact
      if (proj.distanceTraveled >= proj.distanceToTravel) {
        proj.active = false;
        if (proj.onImpact) proj.onImpact();
      }
    }

    // Filter alive
    this.particles = this.particles.filter(p => p.life > 0);
    this.textEffects = this.textEffects.filter(t => t.life > 0);
    this.flashEffects = this.flashEffects.filter(f => f.life > 0);
    this.ghosts = this.ghosts.filter(g => g.life > 0);
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  public hasActiveEffects(): boolean {
    return this.particles.length > 0 || this.textEffects.length > 0 || this.flashEffects.length > 0 || this.projectiles.length > 0;
  }

  private _loop(): void {
    if (!this.running) return;
    this.update();
    requestAnimationFrame(() => this._loop());
  }
}
