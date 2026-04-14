import * as THREE from 'three';
import { BLOCK } from './textures.js';

const RAT_COLORS = [
    { body: 0x8B7D6B, belly: 0xC4B8A8, ear: 0xFFAAAA, eye: 0x111111, nose: 0xFF8888, tail: 0xD4A0A0 },
    { body: 0xAAAAAA, belly: 0xDDDDDD, ear: 0xFFBBBB, eye: 0x111111, nose: 0xFF9999, tail: 0xE0B0B0 },
    { body: 0x6B5B4B, belly: 0xA89888, ear: 0xFF9999, eye: 0x111111, nose: 0xFF7777, tail: 0xC09090 },
    { body: 0xD4C4B4, belly: 0xF0E8E0, ear: 0xFFCCCC, eye: 0x111111, nose: 0xFFAAAA, tail: 0xE8C8C8 },
    { body: 0x555555, belly: 0x888888, ear: 0xDD8888, eye: 0x111111, nose: 0xFF6666, tail: 0x997777 },
];

const RAT_NAMES = [
    'Whiskers', 'Nibbles', 'Squeaky', 'Peanut', 'Cinnamon',
    'Mochi', 'Cookie', 'Button', 'Pip', 'Hazel',
    'Ginger', 'Waffle', 'Sprout', 'Noodle', 'Biscuit',
    'Maple', 'Pudding', 'Toffee', 'Clover', 'Poppy'
];

export class Rat {
    constructor(scene, world, x, y, z) {
        this.scene = scene;
        this.world = world;
        this.group = new THREE.Group();
        this.alive = true;

        const colors = RAT_COLORS[Math.floor(Math.random() * RAT_COLORS.length)];
        this.name = RAT_NAMES[Math.floor(Math.random() * RAT_NAMES.length)];

        this.bodyW = 0.35;
        this.bodyH = 0.22;
        this.bodyD = 0.5;

        const bodyGeo = new THREE.BoxGeometry(this.bodyW, this.bodyH, this.bodyD);
        const bodyMat = new THREE.MeshLambertMaterial({ color: colors.body });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.15;
        this.group.add(body);

        const bellyGeo = new THREE.BoxGeometry(this.bodyW - 0.04, this.bodyH - 0.06, this.bodyD - 0.06);
        const bellyMat = new THREE.MeshLambertMaterial({ color: colors.belly });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.y = 0.11;
        this.group.add(belly);

        const headGeo = new THREE.BoxGeometry(0.28, 0.24, 0.28);
        const headMat = new THREE.MeshLambertMaterial({ color: colors.body });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 0.2, -0.32);
        this.group.add(head);

        const earGeo = new THREE.BoxGeometry(0.1, 0.12, 0.06);
        const earMat = new THREE.MeshLambertMaterial({ color: colors.ear });
        const earL = new THREE.Mesh(earGeo, earMat);
        earL.position.set(-0.12, 0.34, -0.32);
        this.group.add(earL);
        const earR = new THREE.Mesh(earGeo, earMat);
        earR.position.set(0.12, 0.34, -0.32);
        this.group.add(earR);

        const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const eyeMat = new THREE.MeshLambertMaterial({ color: colors.eye });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.08, 0.24, -0.46);
        this.group.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.08, 0.24, -0.46);
        this.group.add(eyeR);

        const noseGeo = new THREE.BoxGeometry(0.05, 0.04, 0.04);
        const noseMat = new THREE.MeshLambertMaterial({ color: colors.nose });
        this.nose = new THREE.Mesh(noseGeo, noseMat);
        this.nose.position.set(0, 0.18, -0.46);
        this.group.add(this.nose);

        const tailGeo = new THREE.BoxGeometry(0.03, 0.03, 0.45);
        const tailMat = new THREE.MeshLambertMaterial({ color: colors.tail });
        this.tail = new THREE.Mesh(tailGeo, tailMat);
        this.tail.position.set(0, 0.14, 0.42);
        this.group.add(this.tail);

        const legGeo = new THREE.BoxGeometry(0.06, 0.1, 0.06);
        const legMat = new THREE.MeshLambertMaterial({ color: colors.body });
        const positions = [[-0.1, 0.05, -0.15], [0.1, 0.05, -0.15], [-0.1, 0.05, 0.15], [0.1, 0.05, 0.15]];
        this.legs = [];
        for (const p of positions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(p[0], p[1], p[2]);
            this.group.add(leg);
            this.legs.push(leg);
        }

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 128;
        nameCanvas.height = 32;
        const nctx = nameCanvas.getContext('2d');
        nctx.font = 'bold 18px monospace';
        nctx.fillStyle = '#ffffff';
        nctx.textAlign = 'center';
        nctx.shadowColor = '#000000';
        nctx.shadowBlur = 4;
        nctx.fillText(this.name, 64, 22);
        const nameTex = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
        this.nametag = new THREE.Sprite(nameMat);
        this.nametag.scale.set(0.8, 0.2, 1);
        this.nametag.position.y = 0.55;
        this.group.add(this.nametag);

        this.group.position.set(x, y, z);
        scene.add(this.group);

        this.velocity = new THREE.Vector3();
        this.targetAngle = Math.random() * Math.PI * 2;
        this.group.rotation.y = this.targetAngle + Math.PI;
        this.state = 'idle';
        this.stateTimer = Math.random() * 3;
        this.walkSpeed = 1.2;
        this.onGround = false;
        this.wanderCenter = new THREE.Vector3(x, y, z);
        this.wanderRadius = 8;
        this.squeakTimer = 0;
        this.petCooldown = 0;
        this.isPet = false;
        this.petTimer = 0;
        this.isKept = false;
        this.isFed = false;
        this.fedTimer = 0;
        this.followTarget = null;
    }

    update(dt, playerPos) {
        if (!this.alive) return;
        dt = Math.min(dt, 0.05);

        this.stateTimer -= dt;
        this.squeakTimer -= dt;
        this.petCooldown -= dt;
        this.petTimer -= dt;
        this.fedTimer -= dt;

        if (this.petTimer <= 0) this.isPet = false;
        if (this.fedTimer <= 0) this.isFed = false;

        if (this.isKept && playerPos) {
            this.followTarget = playerPos;
        }

        if (this.followTarget && this.isKept) {
            const dx = this.followTarget.x - this.group.position.x;
            const dz = this.followTarget.z - this.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 4) {
                this.targetAngle = Math.atan2(dx, dz);
                const speed = this.walkSpeed * 1.3 * dt;
                const nx = this.group.position.x + Math.sin(this.targetAngle) * speed;
                const nz = this.group.position.z + Math.cos(this.targetAngle) * speed;
                this.group.position.x = nx;
                this.group.position.z = nz;
                this.collideHorizontal();

                const targetRot = this.targetAngle + Math.PI;
                const angleDiff = targetRot - this.group.rotation.y;
                let wrapped = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                if (wrapped < -Math.PI) wrapped += Math.PI * 2;
                this.group.rotation.y += wrapped * Math.min(1, dt * 8);

                this.wiggleLegs(dt * 10);
                this.wiggleTail(dt);
                this.state = 'walk';
            } else if (dist > 2) {
                if (this.stateTimer <= 0) {
                    const r = Math.random();
                    if (r < 0.5) {
                        this.state = 'idle';
                        this.stateTimer = 1 + Math.random() * 2;
                    } else {
                        this.state = 'sniff';
                        this.stateTimer = 0.5 + Math.random();
                    }
                }
            } else {
                if (this.stateTimer <= 0) {
                    this.state = 'idle';
                    this.stateTimer = 1 + Math.random() * 2;
                }
            }
        } else if (this.isPet) {
            this.state = 'idle';
            this.stateTimer = 0.5;
        } else if (this.stateTimer <= 0) {
            const r = Math.random();
            if (r < 0.3) {
                this.state = 'idle';
                this.stateTimer = 1 + Math.random() * 3;
            } else if (r < 0.8) {
                this.state = 'walk';
                this.targetAngle = Math.random() * Math.PI * 2;
                this.stateTimer = 1 + Math.random() * 4;
            } else {
                this.state = 'sniff';
                this.stateTimer = 0.5 + Math.random();
            }
        }

        if (this.state === 'walk') {
            const speed = this.walkSpeed * dt;
            const dx = Math.sin(this.targetAngle) * speed;
            const dz = Math.cos(this.targetAngle) * speed;
            const nx = this.group.position.x + dx;
            const nz = this.group.position.z + dz;

            const dist = Math.sqrt(
                (nx - this.wanderCenter.x) ** 2 +
                (nz - this.wanderCenter.z) ** 2
            );
            if (dist > this.wanderRadius) {
                this.targetAngle = Math.atan2(
                    this.wanderCenter.x - nx,
                    this.wanderCenter.z - nz
                ) + (Math.random() - 0.5);
            } else {
                const px = this.group.position.x;
                const pz = this.group.position.z;
                this.group.position.x = nx;
                this.group.position.z = nz;
                this.collideHorizontal();
                const movedX = Math.abs(this.group.position.x - px);
                const movedZ = Math.abs(this.group.position.z - pz);
                if (movedX < 0.0001 && movedZ < 0.0001) {
                    this.targetAngle += Math.PI * (0.5 + Math.random());
                }
            }

            const targetRot = this.targetAngle + Math.PI;
            const angleDiff = targetRot - this.group.rotation.y;
            let wrapped = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (wrapped < -Math.PI) wrapped += Math.PI * 2;
            this.group.rotation.y += wrapped * Math.min(1, dt * 8);

            this.wiggleLegs(dt * 10);
            this.wiggleTail(dt);
        } else if (this.state === 'sniff') {
            this.wiggleNose();
        } else {
            this.wiggleTail(dt * 2);
        }

        this.velocity.y += -20 * dt;
        this.group.position.y += this.velocity.y * dt;

        const bx = Math.floor(this.group.position.x);
        const bz = Math.floor(this.group.position.z);
        const by = Math.floor(this.group.position.y - 0.1);
        if (this.world.isBlockSolid(bx, by, bz)) {
            this.group.position.y = by + 1;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        this.nametag.visible = true;
    }

    wiggleLegs(speed) {
        const t = performance.now() * 0.01 * speed;
        this.legs[0].position.y = 0.05 + Math.sin(t) * 0.03;
        this.legs[1].position.y = 0.05 + Math.sin(t + Math.PI) * 0.03;
        this.legs[2].position.y = 0.05 + Math.sin(t + Math.PI) * 0.03;
        this.legs[3].position.y = 0.05 + Math.sin(t) * 0.03;
    }

    wiggleTail(speed) {
        this.tail.rotation.y = Math.sin(performance.now() * 0.005 * speed) * 0.5;
    }

    wiggleNose() {
        const s = 1 + Math.sin(performance.now() * 0.02) * 0.05;
        this.nose.scale.set(s, 1, s);
    }

    collideHorizontal() {
        const hw = 0.15;
        const minX = this.group.position.x - hw, maxX = this.group.position.x + hw;
        const minY = this.group.position.y, maxY = this.group.position.y + 0.3;
        const minZ = this.group.position.z - hw, maxZ = this.group.position.z + hw;

        const bMinX = Math.floor(minX), bMaxX = Math.floor(maxX);
        const bMinY = Math.floor(minY), bMaxY = Math.floor(maxY);
        const bMinZ = Math.floor(minZ), bMaxZ = Math.floor(maxZ);

        for (let bx = bMinX; bx <= bMaxX; bx++) {
            for (let by = bMinY; by <= bMaxY; by++) {
                for (let bz = bMinZ; bz <= bMaxZ; bz++) {
                    if (!this.world.isBlockSolid(bx, by, bz)) continue;
                    const overlapX = Math.min(maxX, bx + 1) - Math.max(minX, bx);
                    const overlapZ = Math.min(maxZ, bz + 1) - Math.max(minZ, bz);
                    if (overlapX <= 0 || overlapZ <= 0) continue;
                    if (overlapX < overlapZ) {
                        this.group.position.x = (this.group.position.x > bx + 0.5) ? bx + 1 + hw : bx - hw;
                    } else {
                        this.group.position.z = (this.group.position.z > bz + 0.5) ? bz + 1 + hw : bz - hw;
                    }
                }
            }
        }
    }

    pet() {
        if (this.petCooldown > 0) return false;
        this.isPet = true;
        this.petTimer = 3;
        this.petCooldown = 5;
        return true;
    }

    feed() {
        this.isFed = true;
        this.fedTimer = 30;
        this.petCooldown = 0;
        this.isPet = true;
        this.petTimer = 5;
        return true;
    }

    keep() {
        this.isKept = true;
        this.wanderRadius = 0;
        return true;
    }

    getPosition() {
        return this.group.position;
    }

    dispose() {
        this.alive = false;
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }
}

export class RatManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.rats = [];
        this.maxRats = 12;
        this.spawnTimer = 0;
        this.spawnInterval = 15;
    }

    update(dt, playerPos) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && this.rats.length < this.maxRats) {
            this.spawnTimer = 0;
            this.trySpawnNearPlayer(playerPos);
        }

        for (let i = this.rats.length - 1; i >= 0; i--) {
            const rat = this.rats[i];
            const dist = rat.getPosition().distanceTo(playerPos);
            if (dist > 60 && !rat.isKept) {
                rat.dispose();
                this.rats.splice(i, 1);
                continue;
            }
            rat.update(dt, playerPos);
        }
    }

    trySpawnNearPlayer(playerPos) {
        for (let attempt = 0; attempt < 10; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            const sx = playerPos.x + Math.cos(angle) * dist;
            const sz = playerPos.z + Math.sin(angle) * dist;

            const height = this.world.getHeight(Math.floor(sx), Math.floor(sz));
            if (height <= 20) continue;

            const block = this.world.getBlock(Math.floor(sx), height, Math.floor(sz));
            if (block !== BLOCK.GRASS && block !== BLOCK.DIRT) continue;

            const above1 = this.world.getBlock(Math.floor(sx), height + 1, Math.floor(sz));
            const above2 = this.world.getBlock(Math.floor(sx), height + 2, Math.floor(sz));
            if (above1 !== BLOCK.AIR || above2 !== BLOCK.AIR) continue;

            const rat = new Rat(this.scene, this.world, sx, height + 1, sz);
            this.rats.push(rat);
            return;
        }
    }

    getRatAt(pos, maxDist = 2.0) {
        let closest = null;
        let closestDist = maxDist;
        for (const rat of this.rats) {
            if (!rat.alive) continue;
            const d = rat.getPosition().distanceTo(pos);
            if (d < closestDist) {
                closestDist = d;
                closest = rat;
            }
        }
        return closest;
    }

    dispose() {
        for (const rat of this.rats) rat.dispose();
        this.rats = [];
    }
}
