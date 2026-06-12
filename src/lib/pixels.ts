export const GRID_SIZE = 40;
export const TOTAL_PIXELS = GRID_SIZE * GRID_SIZE; // 1600

export interface PixelCoord {
  x: number;
  y: number;
}

export interface DestructionResult {
  newPixels: string;
  removed: PixelCoord[];
}

export interface RestorationResult {
  newPixels: string;
  restored: PixelCoord[];
}

/**
 * Parse a 1600-char binary string into a 2D boolean array
 */
export function parsePixels(pixelString: string): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx = y * GRID_SIZE + x;
      row.push(pixelString[idx] === '1');
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Count active (on) pixels
 */
export function countActivePixels(pixelString: string): number {
  let count = 0;
  for (let i = 0; i < pixelString.length; i++) {
    if (pixelString[i] === '1') count++;
  }
  return count;
}

/**
 * Get all active pixel coordinates
 */
export function getActivePixelCoords(pixelString: string): PixelCoord[] {
  const coords: PixelCoord[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx = y * GRID_SIZE + x;
      if (pixelString[idx] === '1') {
        coords.push({ x, y });
      }
    }
  }
  return coords;
}

/**
 * Get a random active pixel coordinate (for targeting attacks)
 */
export function getRandomActivePixel(pixelString: string): PixelCoord {
  const active = getActivePixelCoords(pixelString);
  if (active.length === 0) return { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
  return active[Math.floor(Math.random() * active.length)];
}

/**
 * Draw a Normie on a canvas from pixel data
 */
export function drawNormiePixels(
  ctx: CanvasRenderingContext2D,
  pixelString: string,
  offsetX: number,
  offsetY: number,
  scale: number,
  onColor: string = '#48494b',
  offColor: string | null = null
): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx = y * GRID_SIZE + x;
      const isOn = pixelString[idx] === '1';
      if (isOn) {
        ctx.fillStyle = onColor;
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
      } else if (offColor) {
        ctx.fillStyle = offColor;
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
      }
    }
  }
}

/**
 * Remove random pixels from a pixel string (damage visualization)
 */
export function removeRandomPixels(pixelString: string, count: number): DestructionResult {
  const activeCoords = getActivePixelCoords(pixelString);
  const toRemove: PixelCoord[] = [];
  const chars = pixelString.split('');

  const shuffled = [...activeCoords].sort(() => Math.random() - 0.5);
  const removeCount = Math.min(count, shuffled.length);

  for (let i = 0; i < removeCount; i++) {
    const coord = shuffled[i];
    const idx = coord.y * GRID_SIZE + coord.x;
    chars[idx] = '0';
    toRemove.push(coord);
  }

  return {
    newPixels: chars.join(''),
    removed: toRemove,
  };
}

/**
 * Remove a cluster of connected pixels near a center point (for AoE attacks)
 * Removes pixels closest to the center point first
 */
export function removePixelCluster(pixelString: string, centerX: number, centerY: number, count: number): DestructionResult {
  const activeCoords = getActivePixelCoords(pixelString);
  const chars = pixelString.split('');
  const removed: PixelCoord[] = [];

  // Sort by distance to center
  const sorted = [...activeCoords].sort((a, b) => {
    const distA = Math.sqrt((a.x - centerX) ** 2 + (a.y - centerY) ** 2);
    const distB = Math.sqrt((b.x - centerX) ** 2 + (b.y - centerY) ** 2);
    return distA - distB;
  });

  const removeCount = Math.min(count, sorted.length);
  for (let i = 0; i < removeCount; i++) {
    const coord = sorted[i];
    const idx = coord.y * GRID_SIZE + coord.x;
    chars[idx] = '0';
    removed.push(coord);
  }

  return { newPixels: chars.join(''), removed };
}

/**
 * Remove pixels from one side (directional attack)
 * side: 'left', 'right', 'top', 'bottom'
 */
export function removePixelsFromSide(pixelString: string, side: 'left' | 'right' | 'top' | 'bottom', count: number): DestructionResult {
  const activeCoords = getActivePixelCoords(pixelString);
  const chars = pixelString.split('');
  const removed: PixelCoord[] = [];

  // Sort by position based on attack direction
  const sorted = [...activeCoords].sort((a, b) => {
    switch (side) {
      case 'left': return a.x - b.x;
      case 'right': return b.x - a.x;
      case 'top': return a.y - b.y;
      case 'bottom': return b.y - a.y;
      default: return Math.random() - 0.5;
    }
  });

  const removeCount = Math.min(count, sorted.length);
  for (let i = 0; i < removeCount; i++) {
    const coord = sorted[i];
    const idx = coord.y * GRID_SIZE + coord.x;
    chars[idx] = '0';
    removed.push(coord);
  }

  return { newPixels: chars.join(''), removed };
}

/**
 * Get pixel density (percentage of pixels remaining)
 */
export function getPixelDensity(pixelString: string, originalCount: number): number {
  const current = countActivePixels(pixelString);
  return originalCount > 0 ? current / originalCount : 0;
}

/**
 * Restore pixels that were previously destroyed
 */
export function restorePixels(currentPixels: string, originalPixels: string, count: number): RestorationResult {
  if (!currentPixels || !originalPixels) return { newPixels: currentPixels, restored: [] };

  const chars = currentPixels.split('');
  const candidates: { x: number; y: number; idx: number }[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx = y * GRID_SIZE + x;
      if (originalPixels[idx] === '1' && chars[idx] === '0') {
        candidates.push({ x, y, idx });
      }
    }
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const restoreCount = Math.min(count, shuffled.length);
  const restored: PixelCoord[] = [];

  for (let i = 0; i < restoreCount; i++) {
    const coord = shuffled[i];
    chars[coord.idx] = '1';
    restored.push({ x: coord.x, y: coord.y });
  }

  return {
    newPixels: chars.join(''),
    restored,
  };
}
