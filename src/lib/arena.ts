import { drawNormiePixels, GRID_SIZE, countActivePixels, PixelCoord } from './pixels';
import { EffectsSystem } from './effects';

export class ArenaRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public effects: EffectsSystem;

  public playerPixels: string | null = null;
  public opponentPixels: string | null = null;
  public playerOriginalCount = 0;
  public opponentOriginalCount = 0;

  private playerImg: HTMLImageElement | null = null;
  private opponentImg: HTMLImageElement | null = null;

  private running = false;

  public playerPos = { x: 0, y: 0 };
  public opponentPos = { x: 0, y: 0 };
  public pixelScale = 4;

  public playerOffset = { x: 0, y: 0 };
  public opponentOffset = { x: 0, y: 0 };

  private shakeX = 0;
  private shakeY = 0;
  private shakeDuration = 0;
  private shakeIntensity = 0;
  private _shakeStart = 0;

  private _time = 0;
  private resizeListener: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.effects = new EffectsSystem(canvas);

    this._resizeCanvas();
    this.resizeListener = () => this._resizeCanvas();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.stop();
  }

  private _resizeCanvas() {
    const container = this.canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this._calculateLayout();
  }

  private _calculateLayout() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Increased pixel scale to make arena characters significantly larger
    this.pixelScale = Math.max(4, Math.min(8, Math.floor(h / (GRID_SIZE * 1.5))));
    const spriteSize = GRID_SIZE * this.pixelScale;

    this.playerPos = {
      x: w * 0.28 - spriteSize / 2,
      y: h * 0.5 - spriteSize / 2,
    };

    this.opponentPos = {
      x: w * 0.72 - spriteSize / 2,
      y: h * 0.5 - spriteSize / 2,
    };
  }

  public playerIsGhost = false;
  public opponentIsGhost = false;

  public setFighters(
    playerPixels: string | null,
    opponentPixels: string | null,
    playerIsGhost = false,
    opponentIsGhost = false
  ): void {
    this.playerPixels = playerPixels;
    this.opponentPixels = opponentPixels;
    this.playerOriginalCount = playerPixels ? countActivePixels(playerPixels) : 0;
    this.opponentOriginalCount = opponentPixels ? countActivePixels(opponentPixels) : 0;
    this.playerIsGhost = playerIsGhost;
    this.opponentIsGhost = opponentIsGhost;
  }

  public updatePixels(side: 'player' | 'opponent', newPixels: string): void {
    if (side === 'player') {
      this.playerPixels = newPixels;
    } else {
      this.opponentPixels = newPixels;
    }
  }

  public spawnPixelDebris(side: 'player' | 'opponent', removedCoords: PixelCoord[]): void {
    const pos = side === 'player' ? this.playerPos : this.opponentPos;
    this.effects.spawnPixelDebris(removedCoords, pos.x, pos.y, this.pixelScale);
  }

  public async loadFighterImages(playerUrl: string, opponentUrl: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const loadImg = (url: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });

    const [pImg, oImg] = await Promise.all([
      loadImg(playerUrl),
      loadImg(opponentUrl),
    ]);
    this.playerImg = pImg;
    this.opponentImg = oImg;
  }

  public start(): void {
    this.running = true;
    this.effects.start();
    this._render();
  }

  public stop(): void {
    this.running = false;
    this.effects.stop();
  }

  public shake(intensity = 5, duration = 300): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this._shakeStart = performance.now();
  }

  public fireAttack(
    attackerSide: 'player' | 'opponent',
    type: 'laser' | 'orb' | 'drain' | 'wave',
    impactCoords: PixelCoord | null,
    onImpact: () => void,
    abilityName?: string
  ): void {
    const attackerPos = attackerSide === 'player' ? this.playerPos : this.opponentPos;
    const targetPos = attackerSide === 'player' ? this.opponentPos : this.playerPos;
    const spriteSize = GRID_SIZE * this.pixelScale;

    const startX = attackerPos.x + spriteSize / 2;
    const startY = attackerPos.y + spriteSize / 2;
    
    let targetX = targetPos.x + spriteSize / 2;
    let targetY = targetPos.y + spriteSize / 2;
    if (impactCoords) {
      targetX = targetPos.x + impactCoords.x * this.pixelScale;
      targetY = targetPos.y + impactCoords.y * this.pixelScale;
    }

    const color = attackerSide === 'player' ? '#00f0ff' : '#ff2d6b';
    if (abilityName) {
      this.effects.showFloatingText(startX, startY - 40, abilityName, color, 14);
    }
    this.effects.spawnProjectile(startX, startY, targetX, targetY, type, color, onImpact);
  }

  public dodgeAnimation(side: 'player' | 'opponent', pixels: string | null): void {
    const isPlayer = side === 'player';
    const offset = isPlayer ? this.playerOffset : this.opponentOffset;
    const pos = isPlayer ? this.playerPos : this.opponentPos;
    const dir = isPlayer ? -1 : 1;
    const color = isPlayer ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 45, 107, 0.5)';

    // Dash back
    offset.x = 60 * dir;
    
    // Spawn ghost at old position
    if (pixels) {
      this.effects.spawnGhost(pos.x, pos.y, pixels, this.pixelScale, color);
    }
    
    // Tween back to center
    const returnSpeed = 0.15;
    const animate = () => {
      offset.x += (0 - offset.x) * returnSpeed;
      if (Math.abs(offset.x) > 1) {
        requestAnimationFrame(animate);
      } else {
        offset.x = 0;
      }
    };
    requestAnimationFrame(animate);
  }

  public flinchAnimation(side: 'player' | 'opponent'): void {
    const isPlayer = side === 'player';
    const offset = isPlayer ? this.playerOffset : this.opponentOffset;
    const dir = isPlayer ? -1 : 1;

    // Flinch back quickly
    offset.x = 20 * dir;
    
    // Snap back
    setTimeout(() => {
      offset.x = 0;
    }, 100);
  }

  public damageEffect(side: 'player' | 'opponent', damage: number, isCrit: boolean, removedCoords: PixelCoord[] = []): void {
    const pos = side === 'player' ? this.playerPos : this.opponentPos;
    const spriteSize = GRID_SIZE * this.pixelScale;
    let impactX = pos.x + spriteSize / 2;
    let impactY = pos.y + spriteSize / 2;

    if (removedCoords && removedCoords.length > 0) {
      let sumX = 0, sumY = 0;
      for (const coord of removedCoords) {
        sumX += coord.x;
        sumY += coord.y;
      }
      impactX = pos.x + (sumX / removedCoords.length) * this.pixelScale;
      impactY = pos.y + (sumY / removedCoords.length) * this.pixelScale;
      this.spawnPixelDebris(side, removedCoords);
    }

    const particleCount = isCrit ? 20 : 8;
    this.effects.spawnDamagePixels(impactX, impactY, particleCount, '#48494b');

    const textColor = isCrit ? '#fbbf24' : '#ff2d6b';
    const textSize = isCrit ? 22 : 16;
    this.effects.showFloatingText(impactX, impactY - 30, `-${damage}`, textColor, textSize);

    if (isCrit) {
      this.effects.spawnCritBurst(impactX, impactY);
      this.effects.flash('rgba(255, 45, 107, 0.3)');
      this.shake(8, 400);
    } else {
      this.shake(4, 200);
      this.flinchAnimation(side);
    }
  }

  public healEffect(side: 'player' | 'opponent', amount: number): void {
    const pos = side === 'player' ? this.playerPos : this.opponentPos;
    const spriteSize = GRID_SIZE * this.pixelScale;
    const centerX = pos.x + spriteSize / 2;
    const centerY = pos.y + spriteSize / 2;

    this.effects.spawnHealParticles(centerX, centerY);
    this.effects.showFloatingText(centerX, centerY - 30, `+${amount}`, '#22c55e', 16);
  }

  public buffEffect(side: 'player' | 'opponent', buff: any): void {
    const pos = side === 'player' ? this.playerPos : this.opponentPos;
    const spriteSize = GRID_SIZE * this.pixelScale;
    const centerX = pos.x + spriteSize / 2;
    const centerY = pos.y + spriteSize / 2;

    this.effects.spawnBuffSparkles(centerX, centerY, '#a855f7');
    this.effects.showFloatingText(centerX, centerY - 30, `${buff.stat.toUpperCase()} ↑`, '#a855f7', 14);
  }

  public dodgeEffect(side: 'player' | 'opponent'): void {
    const pos = side === 'player' ? this.playerPos : this.opponentPos;
    const spriteSize = GRID_SIZE * this.pixelScale;
    const centerX = pos.x + spriteSize / 2;
    const centerY = pos.y + spriteSize / 2;

    this.effects.spawnDodgeEffect(centerX, centerY);
    this.effects.showFloatingText(centerX, centerY - 30, 'DODGED!', '#00f0ff', 16);
  }

  private _render() {
    if (!this.running) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this._time += 0.016;

    // Update shake
    if (this.shakeDuration > 0) {
      const elapsed = performance.now() - this._shakeStart;
      if (elapsed < this.shakeDuration) {
        const decay = 1 - elapsed / this.shakeDuration;
        this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2 * decay;
        this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2 * decay;
      } else {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDuration = 0;
      }
    }

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Clear
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(-10, -10, w + 20, h + 20);

    this._drawArenaBackground(w, h);

    // Draw fighters
    this._drawFighterFromPixels('player');
    this._drawFighterFromPixels('opponent');

    // Effects
    this.effects.render(drawNormiePixels);

    ctx.restore();

    requestAnimationFrame(() => this._render());
  }

  private _drawArenaBackground(w: number, h: number) {
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 45, 107, 0.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w / 2, h - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    const playerGrad = ctx.createRadialGradient(w * 0.35, h * 0.5, 20, w * 0.35, h * 0.5, 150);
    playerGrad.addColorStop(0, 'rgba(0, 240, 255, 0.06)');
    playerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = playerGrad;
    ctx.fillRect(0, 0, w / 2, h);

    const oppGrad = ctx.createRadialGradient(w * 0.65, h * 0.5, 20, w * 0.65, h * 0.5, 150);
    oppGrad.addColorStop(0, 'rgba(255, 45, 107, 0.06)');
    oppGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = oppGrad;
    ctx.fillRect(w / 2, 0, w / 2, h);
  }

  private _drawFighterFromPixels(side: 'player' | 'opponent') {
    const ctx = this.ctx;
    const pos = side === 'player' ? { ...this.playerPos } : { ...this.opponentPos };
    const offset = side === 'player' ? this.playerOffset : this.opponentOffset;
    
    pos.x += offset.x;
    pos.y += offset.y;
    
    const pixels = side === 'player' ? this.playerPixels : this.opponentPixels;
    const img = side === 'player' ? this.playerImg : this.opponentImg;
    const spriteSize = GRID_SIZE * this.pixelScale;
    const originalCount = side === 'player' ? this.playerOriginalCount : this.opponentOriginalCount;

    const breatheOffset = Math.sin(this._time * 2 + (side === 'opponent' ? Math.PI : 0)) * 2;

    const currentCount = pixels ? countActivePixels(pixels) : originalCount;
    const density = originalCount > 0 ? currentCount / originalCount : 1;
    const shadowScale = 0.3 + density * 0.7;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.15 + density * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(
      pos.x + spriteSize / 2,
      pos.y + spriteSize + 10 + breatheOffset,
      (spriteSize / 2.5) * shadowScale,
      8 * shadowScale,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    const isGhost = side === 'player' ? this.playerIsGhost : this.opponentIsGhost;

    if (pixels) {
      ctx.save();
      if (isGhost) {
        ctx.globalAlpha = 0.65;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(0, 30, 45, 0.4)';
      } else {
        ctx.fillStyle = '#e3e5e4';
      }
      ctx.fillRect(pos.x, pos.y + breatheOffset, spriteSize, spriteSize);

      const pixelColor = isGhost ? '#00f0ff' : '#48494b';
      drawNormiePixels(ctx, pixels, pos.x, pos.y + breatheOffset, this.pixelScale, pixelColor, null);
      ctx.restore();

      if (density < 0.7) {
        const glowIntensity = (1 - density) * 0.4;
        const dangerColor = `rgba(255, 45, 107, ${glowIntensity * (0.5 + Math.sin(this._time * 4) * 0.3)})`;
        ctx.strokeStyle = dangerColor;
        ctx.lineWidth = 2 + (1 - density) * 3;
        ctx.strokeRect(pos.x - 2, pos.y + breatheOffset - 2, spriteSize + 4, spriteSize + 4);
      }
    } else if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pos.x, pos.y + breatheOffset, spriteSize, spriteSize);
      ctx.imageSmoothingEnabled = true;
    }

    const glowColor = side === 'player' ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 45, 107, 0.25)';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pos.x - 1, pos.y + breatheOffset - 1, spriteSize + 2, spriteSize + 2);

    const labelColor = side === 'player' ? '#00f0ff' : '#ff2d6b';
    ctx.fillStyle = labelColor;
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(
      side === 'player' ? 'YOU' : 'ENEMY',
      pos.x + spriteSize / 2,
      pos.y + breatheOffset - 12
    );

    if (pixels && originalCount > 0) {
      const countText = `${currentCount}/${originalCount} px`;
      ctx.fillStyle = density > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(255,45,107,0.5)';
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText(countText, pos.x + spriteSize / 2, pos.y + spriteSize + breatheOffset + 24);
    }
  }

  public getCenterPos(side: 'player' | 'opponent'): { x: number; y: number } {
    const pos = side === 'player' ? this.playerPos : this.opponentPos;
    const spriteSize = GRID_SIZE * this.pixelScale;
    return { x: pos.x + spriteSize / 2, y: pos.y + spriteSize / 2 };
  }

  public getPos(side: 'player' | 'opponent'): { x: number; y: number } {
    return side === 'player' ? { ...this.playerPos } : { ...this.opponentPos };
  }
}
