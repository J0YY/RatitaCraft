import * as THREE from 'three';
import { BLOCK } from './textures.js';

const BLOCK_COLORS = {
    [BLOCK.GRASS]: [0x5B8C32, 0x4A7A28, 0x8B6B4A],
    [BLOCK.DIRT]: [0x8B6B4A, 0x7A5C3D, 0x9C7B5A],
    [BLOCK.STONE]: [0x8A8A8A, 0x6A6A6A, 0x9A9A9A],
    [BLOCK.SAND]: [0xD4C484, 0xC4B474, 0xE4D494],
    [BLOCK.WOOD]: [0x6B4C2A, 0x5B3C1A, 0x7B5C3A],
    [BLOCK.LEAVES]: [0x3B7A1A, 0x2B6A0A, 0x4B8A2A],
    [BLOCK.COBBLESTONE]: [0x7A7A7A, 0x8A8A8A, 0x6A6A6A],
    [BLOCK.PLANKS]: [0xBC9458, 0xAC8448, 0x8A6B3A],
    [BLOCK.BEDROCK]: [0x444444, 0x333333, 0x555555],
    [BLOCK.SNOW]: [0xF0F0F0, 0xE0E0E8, 0xFFFFFF],
    [BLOCK.GLASS]: [0xC0D0E0, 0xA0B0C0, 0xE0F0FF],
};

export class Particles {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    emit(x, y, z, blockType, count = 12) {
        const colors = BLOCK_COLORS[blockType] || [0x888888, 0x666666, 0xaaaaaa];
        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const color = colors[Math.floor(Math.random() * colors.length)];
            const mat = new THREE.MeshLambertMaterial({ color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                x + 0.5 + (Math.random() - 0.5) * 0.6,
                y + 0.5 + (Math.random() - 0.5) * 0.6,
                z + 0.5 + (Math.random() - 0.5) * 0.6
            );
            this.scene.add(mesh);
            this.particles.push({
                mesh,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 5 + 2,
                vz: (Math.random() - 0.5) * 4,
                life: 0.8 + Math.random() * 0.5,
                age: 0,
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            p.vy -= 15 * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.mesh.rotation.x += dt * 5;
            p.mesh.rotation.z += dt * 3;
            const alpha = 1 - p.age / p.life;
            p.mesh.material.opacity = alpha;
            p.mesh.material.transparent = true;
            const s = 0.5 + alpha * 0.5;
            p.mesh.scale.set(s, s, s);
        }
    }

    dispose() {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        }
        this.particles = [];
    }
}
