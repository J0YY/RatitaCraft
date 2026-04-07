import * as THREE from 'three';
import { BLOCK, BLOCK_TEXTURES, TRANSPARENT, getUVs } from './textures.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 80;

const FACES = [
    { name: 'top',    dir: [ 0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uvRow: 0 },
    { name: 'bottom', dir: [ 0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uvRow: 2 },
    { name: 'front',  dir: [ 0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uvRow: 1 },
    { name: 'back',   dir: [ 0, 0,-1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], uvRow: 1 },
    { name: 'right',  dir: [ 1, 0, 0], corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], uvRow: 1 },
    { name: 'left',   dir: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], uvRow: 1 },
];

export class Chunk {
    constructor(cx, cz, world) {
        this.cx = cx;
        this.cz = cz;
        this.world = world;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null;
        this.waterMesh = null;
        this.dirty = true;
    }

    idx(x, y, z) {
        return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE)
            return BLOCK.AIR;
        return this.blocks[this.idx(x, y, z)];
    }

    setBlock(x, y, z, type) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
        this.blocks[this.idx(x, y, z)] = type;
        this.dirty = true;
    }

    getBlockWorld(wx, wy, wz) {
        return this.getBlock(wx - this.cx * CHUNK_SIZE, wy, wz - this.cz * CHUNK_SIZE);
    }

    setBlockWorld(wx, wy, wz, type) {
        this.setBlock(wx - this.cx * CHUNK_SIZE, wy, wz - this.cz * CHUNK_SIZE, type);
    }

    getNeighborBlock(lx, ly, lz) {
        if (ly < 0 || ly >= CHUNK_HEIGHT) return BLOCK.AIR;
        if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE)
            return this.blocks[this.idx(lx, ly, lz)];
        const wx = this.cx * CHUNK_SIZE + lx;
        const wz = this.cz * CHUNK_SIZE + lz;
        return this.world.getBlock(wx, ly, wz);
    }

    buildMesh(scene, material, waterMaterial) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
        if (this.waterMesh) {
            scene.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh = null;
        }

        const solidPos = [], solidNorm = [], solidUv = [], solidIdx = [];
        const waterPos = [], waterNorm = [], waterUv = [], waterIdx = [];
        let sv = 0, wv = 0;

        const ox = this.cx * CHUNK_SIZE;
        const oz = this.cz * CHUNK_SIZE;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const block = this.blocks[this.idx(x, y, z)];
                    if (block === BLOCK.AIR) continue;

                    const textures = BLOCK_TEXTURES[block];
                    if (!textures) continue;

                    const isWater = block === BLOCK.WATER;

                    for (const face of FACES) {
                        const nx = x + face.dir[0];
                        const ny = y + face.dir[1];
                        const nz = z + face.dir[2];
                        const neighbor = this.getNeighborBlock(nx, ny, nz);

                        let shouldRender = false;
                        if (isWater) {
                            shouldRender = neighbor === BLOCK.AIR || TRANSPARENT.has(neighbor);
                        } else {
                            shouldRender = TRANSPARENT.has(neighbor) && neighbor !== block;
                        }
                        if (!shouldRender) continue;

                        let texIdx;
                        if (face.uvRow === 0) texIdx = textures[0];
                        else if (face.uvRow === 2) texIdx = textures[2];
                        else texIdx = textures[1];

                        const { u0, v0, u1, v1 } = getUVs(texIdx);

                        const pos = isWater ? waterPos : solidPos;
                        const norm = isWater ? waterNorm : solidNorm;
                        const uv = isWater ? waterUv : solidUv;
                        const idx = isWater ? waterIdx : solidIdx;
                        const vc = isWater ? wv : sv;

                        for (const c of face.corners) {
                            pos.push(ox + x + c[0], y + c[1], oz + z + c[2]);
                            norm.push(face.dir[0], face.dir[1], face.dir[2]);
                        }
                        uv.push(u0, v1, u1, v1, u1, v0, u0, v0);
                        idx.push(vc, vc+1, vc+2, vc, vc+2, vc+3);

                        if (isWater) wv += 4; else sv += 4;
                    }
                }
            }
        }

        if (solidPos.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(solidPos, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(solidNorm, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(solidUv, 2));
            geo.setIndex(solidIdx);
            this.mesh = new THREE.Mesh(geo, material);
            this.mesh.matrixAutoUpdate = false;
            this.mesh.updateMatrix();
            scene.add(this.mesh);
        }

        if (waterPos.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(waterPos, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(waterNorm, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUv, 2));
            geo.setIndex(waterIdx);
            this.waterMesh = new THREE.Mesh(geo, waterMaterial);
            this.waterMesh.matrixAutoUpdate = false;
            this.waterMesh.updateMatrix();
            scene.add(this.waterMesh);
        }

        this.dirty = false;
    }

    dispose(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
        if (this.waterMesh) {
            scene.remove(this.waterMesh);
            this.waterMesh.geometry.dispose();
            this.waterMesh = null;
        }
    }
}
