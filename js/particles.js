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
    [BLOCK.BRICK]: [0x8B4433, 0x7B3423, 0x9B5443],
    [BLOCK.GRAVEL]: [0x888888, 0x777777, 0x999999],
};

export class Particles {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
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

    emitHearts(x, y, z, count = 12) {
        for (let i = 0; i < count; i++) {
            const size = 0.1 + Math.random() * 0.08;
            const group = new THREE.Group();

            const heartMat = new THREE.MeshBasicMaterial({ color: 0xFF2266, transparent: true });
            const sphereGeo = new THREE.SphereGeometry(size * 0.45, 6, 6);
            const leftBump = new THREE.Mesh(sphereGeo, heartMat);
            leftBump.position.set(-size * 0.35, size * 0.25, 0);
            group.add(leftBump);
            const rightBump = new THREE.Mesh(sphereGeo, heartMat);
            rightBump.position.set(size * 0.35, size * 0.25, 0);
            group.add(rightBump);

            const triGeo = new THREE.BufferGeometry();
            const s = size;
            const verts = new Float32Array([
                -s * 0.8, s * 0.2, 0,
                 s * 0.8, s * 0.2, 0,
                 0, -s * 0.9, 0,
            ]);
            triGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
            triGeo.computeVertexNormals();
            const tri = new THREE.Mesh(triGeo, heartMat);
            group.add(tri);

            const angle = Math.random() * Math.PI * 2;
            const spread = 0.8 + Math.random() * 0.5;
            group.position.set(
                x + Math.sin(angle) * spread * 0.3,
                y + 1.0 + Math.random() * 0.8,
                z + Math.cos(angle) * spread * 0.3
            );
            group.lookAt(camera.position || new THREE.Vector3(x, y + 2, z));
            this.scene.add(group);
            this.particles.push({
                mesh: group,
                vx: Math.sin(angle) * (1.5 + Math.random() * 2),
                vy: 3 + Math.random() * 4,
                vz: Math.cos(angle) * (1.5 + Math.random() * 2),
                life: 1.5 + Math.random() * 0.8,
                age: 0,
                heart: true,
                spin: (Math.random() - 0.5) * 3,
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                this.scene.remove(p.mesh);
                p.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.particles.splice(i, 1);
                continue;
            }
            if (p.heart) {
                p.vy -= 5 * dt;
                p.vx *= (1 - dt * 0.5);
                p.vz *= (1 - dt * 0.5);
                p.mesh.rotation.z += p.spin * dt;
            } else {
                p.vy -= 15 * dt;
                p.mesh.rotation.x += dt * 5;
                p.mesh.rotation.z += dt * 3;
            }
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            const alpha = 1 - p.age / p.life;
            const s = 0.5 + alpha * 0.5;
            p.mesh.scale.set(s, s, s);
            if (p.heart) {
                p.mesh.traverse(child => {
                    if (child.material) {
                        child.material.opacity = alpha;
                        child.material.transparent = true;
                    }
                });
            } else {
                p.mesh.material.opacity = alpha;
                p.mesh.material.transparent = true;
            }
        }
    }

    dispose() {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.particles = [];
    }
}
