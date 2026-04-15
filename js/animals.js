import * as THREE from 'three';

const ANIMAL_TYPES = ['chicken', 'cow', 'pig'];
const ANIMAL_CONFIG = {
    chicken: { bodyColor: 0xFFFFFF, headColor: 0xFFFFFF, beakColor: 0xFFAA00, size: 0.3, hp: 1, drops: 'raw_chicken' },
    cow: { bodyColor: 0x8B6B4A, headColor: 0x8B6B4A, size: 0.6, hp: 3, drops: 'raw_beef' },
    pig: { bodyColor: 0xFFAAAA, headColor: 0xFFAAAA, size: 0.5, hp: 2, drops: 'raw_pork' },
};

export class Animal {
    constructor(scene, world, x, y, z, type) {
        this.scene = scene;
        this.world = world;
        this.type = type;
        this.group = new THREE.Group();
        this.alive = true;
        this.hp = ANIMAL_CONFIG[type].hp;

        const cfg = ANIMAL_CONFIG[type];
        const s = cfg.size;

        const bodyGeo = new THREE.BoxGeometry(s, s * 0.7, s * 1.2);
        const bodyMat = new THREE.MeshLambertMaterial({ color: cfg.bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = s * 0.5;
        this.group.add(body);

        const headGeo = new THREE.BoxGeometry(s * 0.6, s * 0.6, s * 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: cfg.headColor });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, s * 0.7, -s * 0.7);
        this.group.add(head);

        if (type === 'chicken') {
            const beakGeo = new THREE.BoxGeometry(0.05, 0.03, 0.08);
            const beakMat = new THREE.MeshLambertMaterial({ color: cfg.beakColor });
            const beak = new THREE.Mesh(beakGeo, beakMat);
            beak.position.set(0, s * 0.65, -s * 1.05);
            this.group.add(beak);
        }

        if (type === 'cow') {
            const spotGeo = new THREE.BoxGeometry(s * 0.3, s * 0.2, s * 0.3);
            const spotMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
            const spot = new THREE.Mesh(spotGeo, spotMat);
            spot.position.set(s * 0.15, s * 0.6, 0);
            this.group.add(spot);
        }

        const legGeo = new THREE.BoxGeometry(s * 0.2, s * 0.5, s * 0.2);
        const legMat = new THREE.MeshLambertMaterial({ color: type === 'pig' ? 0xFF9999 : cfg.bodyColor });
        this.legs = [];
        const offsets = [[-s*0.3, s*0.1, -s*0.3],[s*0.3, s*0.1, -s*0.3],[-s*0.3, s*0.1, s*0.3],[s*0.3, s*0.1, s*0.3]];
        for (const p of offsets) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(p[0], p[1], p[2]);
            this.group.add(leg);
            this.legs.push(leg);
        }

        this.group.position.set(x, y, z);
        scene.add(this.group);

        this.velocity = new THREE.Vector3();
        this.targetAngle = Math.random() * Math.PI * 2;
        this.group.rotation.y = this.targetAngle;
        this.state = 'idle';
        this.stateTimer = Math.random() * 3;
        this.walkSpeed = type === 'chicken' ? 1.5 : 0.8;
        this.onGround = false;
        this.wanderCenter = new THREE.Vector3(x, y, z);
        this.wanderRadius = 12;
        this.hurtTimer = 0;
        this.deathTimer = 0;
    }

    update(dt) {
        if (!this.alive) return;
        dt = Math.min(dt, 0.05);

        this.stateTimer -= dt;
        this.hurtTimer -= dt;

        if (this.deathTimer > 0) {
            this.deathTimer -= dt;
            this.group.rotation.z += dt * 3;
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            return;
        }

        if (this.stateTimer <= 0) {
            const r = Math.random();
            if (r < 0.4) {
                this.state = 'idle';
                this.stateTimer = 1 + Math.random() * 3;
            } else {
                this.state = 'walk';
                this.targetAngle = Math.random() * Math.PI * 2;
                this.stateTimer = 1 + Math.random() * 3;
            }
        }

        if (this.state === 'walk') {
            const speed = this.walkSpeed * dt;
            const dx = Math.sin(this.targetAngle) * speed;
            const dz = Math.cos(this.targetAngle) * speed;
            const nx = this.group.position.x + dx;
            const nz = this.group.position.z + dz;
            const dist = Math.sqrt((nx - this.wanderCenter.x) ** 2 + (nz - this.wanderCenter.z) ** 2);
            if (dist > this.wanderRadius) {
                this.targetAngle = Math.atan2(this.wanderCenter.x - nx, this.wanderCenter.z - nz) + (Math.random() - 0.5);
            } else {
                this.group.position.x = nx;
                this.group.position.z = nz;
            }
            const targetRot = this.targetAngle;
            const angleDiff = targetRot - this.group.rotation.y;
            let wrapped = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            if (wrapped < -Math.PI) wrapped += Math.PI * 2;
            this.group.rotation.y += wrapped * Math.min(1, dt * 6);
            const t = performance.now() * 0.01;
            this.legs[0].position.y = this.type === 'cow' ? 0.1 : 0.15 * 0.5;
            this.legs[0].position.y += Math.sin(t) * 0.03;
            this.legs[1].position.y += Math.sin(t + Math.PI) * 0.03;
            this.legs[2].position.y += Math.sin(t + Math.PI) * 0.03;
            this.legs[3].position.y += Math.sin(t) * 0.03;
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

        if (this.group.position.y < -20) {
            this.alive = false;
        }

        if (this.hurtTimer > 0) {
            const flash = Math.sin(performance.now() * 0.03) > 0;
            this.group.visible = flash;
        } else {
            this.group.visible = true;
        }
    }

    damage(amount) {
        if (this.deathTimer > 0) return null;
        this.hp -= amount;
        this.hurtTimer = 0.3;
        this.targetAngle += Math.PI;
        if (this.hp <= 0) {
            this.deathTimer = 0.5;
            return ANIMAL_CONFIG[this.type].drops;
        }
        return null;
    }

    getPosition() { return this.group.position; }

    dispose() {
        this.alive = false;
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}

export class AnimalManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.animals = [];
        this.maxAnimals = 15;
        this.spawnTimer = 0;
        this.spawnInterval = 20;
    }

    update(dt, playerPos) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && this.animals.length < this.maxAnimals) {
            this.spawnTimer = 0;
            this.trySpawn(playerPos);
        }
        for (let i = this.animals.length - 1; i >= 0; i--) {
            const a = this.animals[i];
            if (!a.alive) {
                a.dispose();
                this.animals.splice(i, 1);
                continue;
            }
            a.update(dt);
            if (a.getPosition().distanceTo(playerPos) > 80 && a.deathTimer <= 0) {
                a.dispose();
                this.animals.splice(i, 1);
            }
        }
    }

    trySpawn(playerPos) {
        for (let attempt = 0; attempt < 5; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 25;
            const sx = playerPos.x + Math.cos(angle) * dist;
            const sz = playerPos.z + Math.sin(angle) * dist;
            const height = this.world.getHeight(Math.floor(sx), Math.floor(sz));
            if (height <= 20) continue;
            const type = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
            this.animals.push(new Animal(this.scene, this.world, sx, height + 1, sz, type));
            return;
        }
    }

    getAnimalAt(pos, maxDist = 3.0) {
        let closest = null;
        let closestDist = maxDist;
        for (const a of this.animals) {
            if (!a.alive || a.deathTimer > 0) continue;
            const d = a.getPosition().distanceTo(pos);
            if (d < closestDist) { closestDist = d; closest = a; }
        }
        return closest;
    }

    dispose() {
        for (const a of this.animals) a.dispose();
        this.animals = [];
    }
}
