const BASE_URL = 'https://api.normies.art';

export interface RawFighterData {
  id: number;
  traits: { trait_type: string; value: any }[];
  raw: any;
  canvasInfo: { level: number; actionPoints: number; customized: boolean };
  pixelCount: number;
  agentInfo: any;
  imageUrl: string;
  pngUrl: string;
  owner?: string;
  isGhost?: boolean;
  agentPersona?: any;
}

// Procedural seed random
function seedRandom(seed: number) {
  let s = seed;
  return function() {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
}

// Generate a nice deterministic 40x40 pixel character silhouette based on ID
export function generateProceduralPixels(id: number): string {
  const chars = new Array(1600).fill('0');
  const random = seedRandom(id);

  // Draw symmetric humanoid/monster body
  for (let y = 8; y < 32; y++) {
    for (let x = 10; x <= 20; x++) {
      let active = false;
      const distToCenter = Math.sqrt((x - 20) ** 2 + (y - 18) ** 2);
      
      if (y < 22) {
        // Head / upper torso
        if (distToCenter < 7) {
          active = random() > 0.15;
        }
      } else {
        // Torso / legs
        const torsoDist = Math.abs(x - 20);
        if (torsoDist < 5 && y < 28) {
          active = random() > 0.2;
        } else if (y >= 28 && (x === 14 || x === 15 || x === 16 || x === 20)) {
          // Legs
          active = random() > 0.3;
        }
      }

      // Feature overlays (eyes and mouth)
      if (y === 15 && (x === 17 || x === 18)) {
        active = false; // Left eye hole
      }
      if (y === 19 && x >= 17 && x <= 20) {
        active = false; // Mouth hole
      }

      if (active) {
        const idx1 = y * 40 + x;
        const idx2 = y * 40 + (40 - x - 1); // mirrored
        chars[idx1] = '1';
        chars[idx2] = '1';
      }
    }
  }

  // Count active pixels and ensure it's not empty
  let count = 0;
  for (let i = 0; i < 1600; i++) {
    if (chars[i] === '1') count++;
  }
  if (count < 200) {
    // Fill central core as fallback
    for (let y = 15; y < 25; y++) {
      for (let x = 15; x < 25; x++) {
        chars[y * 40 + x] = '1';
      }
    }
  }

  return chars.join('');
}

// Generate fallback fighter details deterministically
export function getMockFighterData(id: number): RawFighterData {
  const random = seedRandom(id);

  const types = ['Human', 'Cat', 'Alien', 'Agent'];
  const genders = ['Male', 'Female'];
  const ages = ['Young', 'Adult', 'Ancient'];
  const hairStyles = ['Mohawk', 'Spiky Hair', 'Wild Hair', 'Top Hat', 'Fedora', 'Bald', 'Ponytail', 'Short Hair', 'Long Hair', 'Crazy Hair'];
  const expressions = ['Neutral', 'Slight Smile', 'Serious', 'Content', 'Peaceful', 'Confident', 'Friendly'];
  const accessories = ['Top Hat', 'Fedora', 'Cowboy Hat', 'Beanie', 'Cap', 'Bandana', 'Earring', 'Gold Chain', 'No Accessories'];
  const eyesList = ['Classic Shades', 'Big Shades', 'VR Headset', '3D Glasses', 'Eye Patch', 'No Glasses'];

  const type = types[Math.floor(random() * types.length)];
  const gender = genders[Math.floor(random() * genders.length)];
  const age = ages[Math.floor(random() * ages.length)];
  const hairStyle = hairStyles[Math.floor(random() * hairStyles.length)];
  const expression = expressions[Math.floor(random() * expressions.length)];
  const accessory = accessories[Math.floor(random() * accessories.length)];
  const eyes = eyesList[Math.floor(random() * eyesList.length)];

  const canvasLevel = Math.floor(random() * 5) + 1;
  const ap = Math.floor(random() * 100);
  const customized = random() > 0.7;

  // Count procedural pixels
  const pixels = generateProceduralPixels(id);
  let pixelCount = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] === '1') pixelCount++;
  }

  const traits = [
    { trait_type: 'Type', value: type },
    { trait_type: 'Gender', value: gender },
    { trait_type: 'Age', value: age },
    { trait_type: 'Hair Style', value: hairStyle },
    { trait_type: 'Expression', value: expression },
    { trait_type: 'Accessory', value: accessory },
    { trait_type: 'Eyes', value: eyes },
    { trait_type: 'Pixel Count', value: pixelCount }
  ];

  return {
    id,
    traits,
    raw: {},
    canvasInfo: { level: canvasLevel, actionPoints: ap, customized },
    pixelCount,
    agentInfo: null,
    imageUrl: `${BASE_URL}/normie/${id}/image.svg`,
    pngUrl: `${BASE_URL}/normie/${id}/image.png`,
  };
}

export async function getPixels(id: number, isGhost = false): Promise<string> {
  try {
    const url = isGhost 
      ? `${BASE_URL}/normie/${id}/original/pixels`
      : `${BASE_URL}/normie/${id}/pixels`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      if (isGhost) {
        const res2 = await fetch(`${BASE_URL}/normie/${id}/pixels`, { signal: AbortSignal.timeout(2000) });
        if (res2.ok) return await res2.text();
      }
      throw new Error();
    }
    return await res.text();
  } catch {
    return generateProceduralPixels(id);
  }
}

export async function getTraits(id: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/normie/${id}/traits`);
  if (!res.ok) throw new Error();
  return await res.json();
}

export function getImageSvgUrl(id: number): string {
  return `${BASE_URL}/normie/${id}/image.svg`;
}

export function getImagePngUrl(id: number): string {
  return `${BASE_URL}/normie/${id}/image.png`;
}

export async function loadFighterData(id: number, isGhost = false): Promise<RawFighterData> {
  if (isGhost) {
    try {
      const traitsRes = await fetch(`${BASE_URL}/normie/${id}/traits`, { signal: AbortSignal.timeout(3000) }).then(r => r.json()).catch(() => null);
      return {
        id,
        traits: traitsRes?.attributes || getMockFighterData(id).traits,
        raw: traitsRes?.raw || {},
        canvasInfo: { level: 1, actionPoints: 0, customized: false },
        pixelCount: 400, // standard ghost hp
        agentInfo: null,
        imageUrl: `${BASE_URL}/history/burned/${id}/image.svg`,
        pngUrl: `${BASE_URL}/history/burned/${id}/image.png`,
        owner: 'Burned Token (0x0000...0000)',
        isGhost: true,
      };
    } catch {
      const mock = getMockFighterData(id);
      mock.owner = 'Burned Token (0x0000...0000)';
      mock.isGhost = true;
      mock.imageUrl = `${BASE_URL}/history/burned/${id}/image.svg`;
      return mock;
    }
  }

  try {
    const [traitsRes, canvasRes, metadataRes, ownerRes, bindingRes] = await Promise.allSettled([
      fetch(`${BASE_URL}/normie/${id}/traits`, { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
      fetch(`${BASE_URL}/normie/${id}/canvas/info`, { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
      fetch(`${BASE_URL}/normie/${id}/metadata`, { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
      fetch(`${BASE_URL}/normie/${id}/owner`, { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
      fetch(`${BASE_URL}/agents/binding/${id}`, { signal: AbortSignal.timeout(4000) }).then(r => r.json())
    ]);

    const traits = traitsRes.status === 'fulfilled' ? traitsRes.value : null;
    const canvas = canvasRes.status === 'fulfilled' ? canvasRes.value : { level: 1, actionPoints: 0, customized: false };
    const metadata = metadataRes.status === 'fulfilled' ? metadataRes.value : null;
    const owner = ownerRes.status === 'fulfilled' ? ownerRes.value?.owner : undefined;
    const binding = bindingRes.status === 'fulfilled' ? bindingRes.value?.binding : null;

    let pixelCount = 527;
    if (metadata?.attributes) {
      const pc = metadata.attributes.find((a: any) => a.trait_type === 'Pixel Count');
      if (pc) pixelCount = pc.value;
    }

    let agentPersona = null;
    if (binding) {
      try {
        const infoRes = await fetch(`${BASE_URL}/agents/info/${id}`, { signal: AbortSignal.timeout(3000) });
        if (infoRes.ok) agentPersona = await infoRes.json();
      } catch (e) {
        console.error('Failed to load agent persona details', e);
      }
    }

    if (!traits) throw new Error('Traits missing, falling back');

    return {
      id,
      traits: traits.attributes || [],
      raw: traits.raw,
      canvasInfo: canvas,
      pixelCount,
      agentInfo: binding,
      imageUrl: getImageSvgUrl(id),
      pngUrl: getImagePngUrl(id),
      owner,
      isGhost: false,
      agentPersona,
    };
  } catch {
    return getMockFighterData(id);
  }
}

export async function getHolderNormies(address: string): Promise<number[]> {
  try {
    const res = await fetch(`${BASE_URL}/holders/${address}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tokenIds || []).map((id: any) => parseInt(id));
  } catch {
    return [];
  }
}

export async function getNormieOwner(id: number): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/normie/${id}/owner`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.owner || null;
  } catch {
    return null;
  }
}

export async function getBurnedTokens(): Promise<number[]> {
  try {
    const res = await fetch(`${BASE_URL}/history/burned-tokens?limit=100`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return (data || []).map((item: any) => parseInt(item.tokenId));
  } catch {
    return [13, 42, 69, 100, 205, 333, 404, 711, 1024, 1337, 2048, 5000, 7777];
  }
}

export async function getBurnedTokenInfo(id: number): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/history/burned/${id}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getBurnedTokenImageUrl(id: number): string {
  return `${BASE_URL}/history/burned/${id}/image.svg`;
}

export async function getAgentInfo(id: number): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/agents/info/${id}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getAgentBinding(id: number): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/agents/binding/${id}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.binding || null;
  } catch {
    return null;
  }
}

export async function getAgentCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/agents/count`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  } catch {
    return 137;
  }
}

export async function getCanvasDiff(id: number): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/normie/${id}/canvas/diff`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getVersionHistory(id: number): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/history/normie/${id}/versions`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function getVersionImageUrl(id: number, version: number): string {
  return `${BASE_URL}/history/normie/${id}/version/${version}/image.svg`;
}

export function getOriginalImageUrl(id: number): string {
  return `${BASE_URL}/normie/${id}/original/image.svg`;
}

export async function getGlobalStats(): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/history/stats`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      totalBurnCommitments: 42,
      totalBurnedTokens: 118,
      totalTransforms: 87,
      totalActionPointsDistributed: "2450"
    };
  }
}

export async function getCanvasStatus(): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/canvas/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      paused: false,
      maxBurnPercent: 4,
      tierThresholds: [490, 890],
      tierMinPercents: [1, 2, 3]
    };
  }
}

export async function getAgentsList(limit = 24, cursor?: string): Promise<any> {
  try {
    let url = `${BASE_URL}/agents/list?limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const items = [
      { agentId: "1", tokenId: "42", name: "Pixelpriest", type: "Alien", registeredBy: "0x1234...5678", registeredAt: "1747200000" },
      { agentId: "2", tokenId: "100", name: "Nekobot", type: "Cat", registeredBy: "0x8888...9999", registeredAt: "1747210000" },
      { agentId: "3", tokenId: "1337", name: "CyberSoldier", type: "Agent", registeredBy: "0xaaaa...bbbb", registeredAt: "1747220000" },
      { agentId: "4", tokenId: "250", name: "AlphaNorm", type: "Human", registeredBy: "0xcccc...dddd", registeredAt: "1747230000" },
    ];
    return { items, hasMore: false };
  }
}

export async function getOriginalPixels(id: number): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/normie/${id}/original/pixels`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error();
    return await res.text();
  } catch {
    return generateProceduralPixels(id);
  }
}

export async function getApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

