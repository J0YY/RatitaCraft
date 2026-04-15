import * as THREE from 'three';
import SimplexNoise from './noise.js';
import { BLOCK } from './textures.js';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';

const RENDER_DISTANCE = 6;
const SEA_LEVEL = 20;

export class World {
    constructor(scene, seed) {
        this.scene = scene;
        this.chunks = new Map();
        this.seed = seed !== undefined ? seed : Math.random() * 10000;
        this.noise = new SimplexNoise(this.seed);
        this.noise2 = new SimplexNoise(this.seed + 1);
        this.noise3 = new SimplexNoise(this.seed + 2);
        this.noise4 = new SimplexNoise(this.seed + 3);
        this.noise5 = new SimplexNoise(this.seed + 4);
        this.noise6 = new SimplexNoise(this.seed + 5);
        this.material = null;
        this.waterMaterial = null;
    }

    init(materials) {
        this.material = materials.solid;
        this.waterMaterial = materials.water;
    }

    key(cx, cz) { return `${cx},${cz}`; }

    getBlock(wx, wy, wz) {
        if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK.AIR;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const chunk = this.chunks.get(this.key(cx, cz));
        if (!chunk) return BLOCK.AIR;
        return chunk.getBlockWorld(wx, wy, wz);
    }

    setBlock(wx, wy, wz, type) {
        if (wy < 0 || wy >= CHUNK_HEIGHT) return;
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const chunk = this.chunks.get(this.key(cx, cz));
        if (!chunk) return;
        chunk.setBlockWorld(wx, wy, wz, type);

        const lx = wx - cx * CHUNK_SIZE;
        const lz = wz - cz * CHUNK_SIZE;
        const neighbors = [];
        if (lx === 0) neighbors.push([cx - 1, cz]);
        if (lx === CHUNK_SIZE - 1) neighbors.push([cx + 1, cz]);
        if (lz === 0) neighbors.push([cx, cz - 1]);
        if (lz === CHUNK_SIZE - 1) neighbors.push([cx, cz + 1]);
        for (const [nx, nz] of neighbors) {
            const nc = this.chunks.get(this.key(nx, nz));
            if (nc) nc.dirty = true;
        }
    }

    getHeight(wx, wz) {
        const scale = 0.01;
        const h1 = this.noise.octave2D(wx * scale, wz * scale, 4, 0.5) * 20;
        const h2 = this.noise2.octave2D(wx * scale * 0.5, wz * scale * 0.5, 3, 0.5) * 10;
        const detail = this.noise3.noise2D(wx * 0.05, wz * 0.05) * 5;
        return Math.floor(SEA_LEVEL + h1 + h2 + detail);
    }

    isCave(wx, wy, wz) {
        if (wy <= 1 || wy >= CHUNK_HEIGHT - 2) return false;
        const scale = 0.05;
        const n1 = this.noise4.noise2D(wx * scale + wy * 0.1, wz * scale);
        const n2 = this.noise5.noise2D(wy * scale, wx * scale + wz * 0.1);
        const n3 = this.noise6.noise2D(wz * scale + wx * 0.1, wy * scale);
        const density = (n1 + n2 + n3) / 3;
        return density > 0.35;
    }

    getOreType(wx, wy, wz) {
        if (wy > 16) {
            const n = this.noise6.noise2D(wx * 0.15, wz * 0.15 + wy * 0.15);
            if (n > 0.7) return BLOCK.GOLD_ORE;
        }
        if (wy > 8) {
            const n = this.noise5.noise2D(wx * 0.12, wz * 0.12 + wy * 0.12);
            if (n > 0.6) return BLOCK.IRON_ORE;
        }
        const n = this.noise4.noise2D(wx * 0.1, wz * 0.1 + wy * 0.1);
        if (n > 0.55) return BLOCK.COAL_ORE;
        return null;
    }

    generateChunkData(chunk) {
        const { cx, cz } = chunk;
        const ox = cx * CHUNK_SIZE;
        const oz = cz * CHUNK_SIZE;

        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const wx = ox + x;
                const wz = oz + z;
                const height = this.getHeight(wx, wz);

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let block = BLOCK.AIR;

                    if (y === 0) {
                        block = BLOCK.BEDROCK;
                    } else if (y < 3 && this.noise.noise2D(wx * 5.3 + y * 7.1, wz * 5.3) > 0) {
                        block = BLOCK.BEDROCK;
                    } else if (y < height - 4) {
                        if (this.isCave(wx, y, wz)) {
                            block = BLOCK.AIR;
                        } else {
                            block = BLOCK.STONE;
                            const ore = this.getOreType(wx, y, wz);
                            if (ore) block = ore;
                        }
                    } else if (y < height) {
                        if (this.isCave(wx, y, wz)) {
                            block = BLOCK.AIR;
                        } else if (height < SEA_LEVEL + 2) {
                            block = BLOCK.SAND;
                        } else if (y < height - 1 && this.noise4.noise2D(wx * 0.2, wz * 0.2) > 0.7) {
                            block = BLOCK.GRAVEL;
                        } else {
                            block = BLOCK.DIRT;
                        }
                    } else if (y === height) {
                        if (height < SEA_LEVEL) {
                            block = BLOCK.SAND;
                        } else if (height > SEA_LEVEL + 20) {
                            block = BLOCK.SNOW;
                        } else {
                            block = BLOCK.GRASS;
                        }
                    } else if (y <= SEA_LEVEL && y > height) {
                        block = BLOCK.WATER;
                    }

                    chunk.setBlock(x, y, z, block);
                }
            }
        }

        this.generateTrees(chunk);
        this.generateFlora(chunk);
        this.generateFoodTrees(chunk);
    }

    generateFlora(chunk) {
        const { cx, cz } = chunk;
        const ox = cx * CHUNK_SIZE;
        const oz = cz * CHUNK_SIZE;

        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const wx = ox + x;
                const wz = oz + z;
                const height = this.getHeight(wx, wz);
                if (height <= SEA_LEVEL || height > SEA_LEVEL + 18) continue;

                const surfaceBlock = chunk.getBlock(x, height, z);
                if (surfaceBlock !== BLOCK.GRASS) continue;

                const floraNoise = this.noise6.noise2D(wx * 1.5, wz * 1.5);
                if (floraNoise > 0.5 && height + 1 < CHUNK_HEIGHT) {
                    chunk.setBlock(x, height + 1, z, BLOCK.TALL_GRASS);
                } else if (floraNoise > 0.3 && height + 1 < CHUNK_HEIGHT) {
                    const flowerNoise = this.noise5.noise2D(wx * 3, wz * 3);
                    if (flowerNoise > 0.3) {
                        chunk.setBlock(x, height + 1, z, BLOCK.RED_FLOWER);
                    } else if (flowerNoise > 0.0) {
                        chunk.setBlock(x, height + 1, z, BLOCK.YELLOW_FLOWER);
                    }
                }
            }
        }
    }

    generateFoodTrees(chunk) {
        const { cx, cz } = chunk;
        const ox = cx * CHUNK_SIZE;
        const oz = cz * CHUNK_SIZE;

        for (let z = 2; z < CHUNK_SIZE - 2; z++) {
            for (let x = 2; x < CHUNK_SIZE - 2; x++) {
                const wx = ox + x;
                const wz = oz + z;
                const height = this.getHeight(wx, wz);
                if (height <= SEA_LEVEL + 1 || height > SEA_LEVEL + 16) continue;

                const treeNoise = this.noise6.noise2D(wx * 1.2, wz * 1.2);
                if (treeNoise < 0.75) continue;
                if (this.noise5.noise2D(wx * 3, wz * 3) > 0.3) continue;

                const surfaceBlock = chunk.getBlock(x, height, z);
                if (surfaceBlock !== BLOCK.GRASS) continue;

                const isApple = this.noise4.noise2D(wx * 5, wz * 5) > 0;
                const trunkH = 3 + Math.floor(Math.abs(this.noise2.noise2D(wx * 4, wz * 4)) * 2);

                for (let ty = 1; ty <= trunkH; ty++) {
                    if (height + ty < CHUNK_HEIGHT)
                        chunk.setBlock(x, height + ty, z, BLOCK.WOOD);
                }

                const leafBase = height + trunkH - 1;
                const leafTop = height + trunkH + 1;
                for (let ly = leafBase; ly <= leafTop; ly++) {
                    const dist = ly < leafTop ? 2 : 1;
                    for (let lx = -dist; lx <= dist; lx++) {
                        for (let lz = -dist; lz <= dist; lz++) {
                            if (Math.abs(lx) === dist && Math.abs(lz) === dist) continue;
                            const fx = x + lx, fz = z + lz;
                            if (fx >= 0 && fx < CHUNK_SIZE && fz >= 0 && fz < CHUNK_SIZE && ly < CHUNK_HEIGHT) {
                                if (chunk.getBlock(fx, ly, fz) === BLOCK.AIR)
                                    chunk.setBlock(fx, ly, fz, BLOCK.LEAVES);
                            }
                        }
                    }
                }

                const fruitType = isApple ? BLOCK.APPLE : BLOCK.BANANA;
                const fruitY = height + trunkH;
                const fruitOffsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                const offset = fruitOffsets[Math.floor(Math.abs(this.noise.noise2D(wx * 7, wz * 7)) * 4)];
                const fx2 = x + offset[0], fz2 = z + offset[1];
                if (fx2 >= 0 && fx2 < CHUNK_SIZE && fz2 >= 0 && fz2 < CHUNK_SIZE && fruitY + 1 < CHUNK_HEIGHT) {
                    if (chunk.getBlock(fx2, fruitY + 1, fz2) === BLOCK.AIR)
                        chunk.setBlock(fx2, fruitY + 1, fz2, fruitType);
                }
            }
        }
    }

    generateTrees(chunk) {
        const { cx, cz } = chunk;
        const ox = cx * CHUNK_SIZE;
        const oz = cz * CHUNK_SIZE;

        for (let z = 2; z < CHUNK_SIZE - 2; z++) {
            for (let x = 2; x < CHUNK_SIZE - 2; x++) {
                const wx = ox + x;
                const wz = oz + z;
                const height = this.getHeight(wx, wz);

                if (height <= SEA_LEVEL + 1 || height > SEA_LEVEL + 18) continue;

                const treeNoise = this.noise3.noise2D(wx * 0.8, wz * 0.8);
                if (treeNoise < 0.6) continue;

                if (this.noise.noise2D(wx * 2.5, wz * 2.5) > 0.2) continue;

                const surfaceBlock = chunk.getBlock(x, height, z);
                if (surfaceBlock !== BLOCK.GRASS && surfaceBlock !== BLOCK.DIRT) continue;

                const trunkHeight = 4 + Math.floor(Math.abs(this.noise2.noise2D(wx * 3, wz * 3)) * 3);

                for (let ty = 1; ty <= trunkHeight; ty++) {
                    if (height + ty < CHUNK_HEIGHT)
                        chunk.setBlock(x, height + ty, z, BLOCK.WOOD);
                }

                const leafBase = height + trunkHeight - 2;
                const leafTop = height + trunkHeight + 2;

                for (let ly = leafBase; ly <= leafTop; ly++) {
                    const dist = ly < leafTop ? 2 : 1;
                    for (let lx = -dist; lx <= dist; lx++) {
                        for (let lz = -dist; lz <= dist; lz++) {
                            if (Math.abs(lx) === dist && Math.abs(lz) === dist) continue;
                            if (lx === 0 && lz === 0 && ly < height + trunkHeight) continue;
                            const fx = x + lx, fz = z + lz;
                            if (fx >= 0 && fx < CHUNK_SIZE && fz >= 0 && fz < CHUNK_SIZE && ly < CHUNK_HEIGHT) {
                                if (chunk.getBlock(fx, ly, fz) === BLOCK.AIR)
                                    chunk.setBlock(fx, ly, fz, BLOCK.LEAVES);
                            }
                        }
                    }
                }
            }
        }
    }

    update(px, pz) {
        const pcx = Math.floor(px / CHUNK_SIZE);
        const pcz = Math.floor(pz / CHUNK_SIZE);

        const needed = new Set();
        for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
            for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
                const cx = pcx + dx;
                const cz = pcz + dz;
                const key = this.key(cx, cz);
                needed.add(key);
                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(cx, cz, this);
                    this.generateChunkData(chunk);
                    this.chunks.set(key, chunk);
                }
            }
        }

        const toDelete = [];
        for (const [key, chunk] of this.chunks) {
            if (!needed.has(key)) {
                chunk.dispose(this.scene);
                toDelete.push(key);
            }
        }
        for (const key of toDelete) this.chunks.delete(key);

        let built = 0;
        for (const [key, chunk] of this.chunks) {
            if (chunk.dirty) {
                chunk.buildMesh(this.scene, this.material, this.waterMaterial);
                built++;
                if (built >= 4) break;
            }
        }
    }

    isBlockSolid(wx, wy, wz) {
        const b = this.getBlock(wx, wy, wz);
        return b !== BLOCK.AIR && b !== BLOCK.WATER && b !== BLOCK.RED_FLOWER
            && b !== BLOCK.YELLOW_FLOWER && b !== BLOCK.TALL_GRASS
            && b !== BLOCK.APPLE && b !== BLOCK.BANANA && b !== BLOCK.CAMPFIRE;
    }
}
