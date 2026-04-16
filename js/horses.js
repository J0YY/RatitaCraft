import * as THREE from 'three';

export class Horse {
    constructor(scene, world, x, y, z) {
        this.scene = scene;
        this.world = world;
        this.group = new THREE.Group();
        this.alive = true;
        this.mounted = false;
        this.type = 'horse';

        const bodyColor = 0x8B5A2B;
        const mat = new THREE.MeshLambertMaterial({ color: bodyColor });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x5C3A1E });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.4), mat);
        body.position.set(0, 0.9, 0);
        this.group.add(body);

        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), mat);
        neck.position.set(0, 1.35, -0.55);
        neck.rotation.x = 0.5;
        this.group.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), mat);
        head.position.set(0, 1.6, -0.85);
        this.group.add(head);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.25), new THREE.MeshLambertMaterial({ color: 0x6B4423 }));
        nose.position.set(0, 1.5, -1.15);
        this.group.add(nose);

        const earGeo = new THREE.BoxGeometry(0.06, 0.15, 0.06);
        const earL = new THREE.Mesh(earGeo, darkMat);
        earL.position.set(-0.1, 1.8, -0.8);
        this.group.add(earL);
        const earR = new THREE.Mesh(earGeo, darkMat);
        earR.position.set(0.1, 1.8, -0.8);
        this.group.add(earR);

        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), darkMat);
        mane.position.set(0, 1.5, -0.3);
        this.group.add(mane);

        const tailGeo = new THREE.BoxGeometry(0.06, 0.06, 0.6);
        this.tail = new THREE.Mesh(tailGeo, darkMat);
        this.tail.position.set(0, 1.0, 0.85);
        this.tail.rotation.x = 0.3;
        this.group.add(this.tail);

        const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
        const offsets = [[-0.2, 0.35, -0.45], [0.2, 0.35, -0.45], [-0.2, 0.35, 0.45], [0.2, 0.35, 0.45]];
        this.legs = [];
        for (const [lx, ly, lz] of offsets) {
            const leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(lx, ly, lz);
            this.group.add(leg);
            this.legs.push(leg);
        }

        const hoofGeo = new THREE.BoxGeometry(0.17, 0.08, 0.17);
        const hoofMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        for (const [hx, hy, hz] of offsets) {
            const hoof = new THREE.Mesh(hoofGeo, hoofMat);
            hoof.position.set(hx, hy - 0.38, hz);
            this.group.add(hoof);
        }

        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
        saddle.position.set(0, 1.29, 0);
        this.group.add(saddle);

        this.group.position.set(x, y, z);
        scene.add(this.group);

        this.velocity = new THREE.Vector3();
        this.targetAngle = Math.random() * Math.PI * 2;
        this.group.rotation.y = this.targetAngle;
        this.state = 'idle';
        this.stateTimer = Math.random() * 3;
        this.walkSpeed = 1.0;
        this.onGround = false;
        this.wanderCenter = new THREE.Vector3(x, y, z);
        this.wanderRadius = 15;
    }

    update(dt) {
        if (!this.alive || this.mounted) return;
        dt = Math.min(dt, 0.05);

        this.stateTimer -= dt;

        if (this.stateTimer <= 0) {
            const r = Math.random();
            if (r < 0.5) {
                this.state = 'idle';
                this.stateTimer = 2 + Math.random() * 4;
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
            this.legs[0].rotation.x = Math.sin(t) * 0.3;
            this.legs[1].rotation.x = Math.sin(t + Math.PI) * 0.3;
            this.legs[2].rotation.x = Math.sin(t + Math.PI) * 0.3;
            this.legs[3].rotation.x = Math.sin(t) * 0.3;
            this.tail.rotation.y = Math.sin(t * 0.8) * 0.3;
        } else {
            for (const leg of this.legs) leg.rotation.x *= 0.9;
            this.tail.rotation.y *= 0.95;
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

        if (this.group.position.y < -20) this.alive = false;
    }

    getPosition() { return this.group.position; }

    mount() {
        this.mounted = true;
        this.group.visible = false;
    }

    dismount(x, y, z) {
        this.mounted = false;
        this.group.visible = true;
        this.group.position.set(x, y, z);
        this.wanderCenter.set(x, y, z);
        this.stateTimer = 0;
    }

    dispose() {
        this.alive = false;
        this.scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}

export class HorseManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.horses = [];
        this.maxHorses = 5;
        this.spawnTimer = 0;
        this.spawnInterval = 30;
    }

    update(dt, playerPos) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && this.horses.length < this.maxHorses) {
            this.spawnTimer = 0;
            this.trySpawn(playerPos);
        }
        for (let i = this.horses.length - 1; i >= 0; i--) {
            const h = this.horses[i];
            if (!h.alive) {
                h.dispose();
                this.horses.splice(i, 1);
                continue;
            }
            h.update(dt);
            if (h.getPosition().distanceTo(playerPos) > 100 && !h.mounted) {
                h.dispose();
                this.horses.splice(i, 1);
            }
        }
    }

    trySpawn(playerPos) {
        for (let attempt = 0; attempt < 5; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 30;
            const sx = playerPos.x + Math.cos(angle) * dist;
            const sz = playerPos.z + Math.sin(angle) * dist;
            const height = this.world.getHeight(Math.floor(sx), Math.floor(sz));
            if (height <= 20) continue;
            this.horses.push(new Horse(this.scene, this.world, sx, height + 1, sz));
            return;
        }
    }

    getHorseAt(pos, maxDist = 3.5) {
        let closest = null;
        let closestDist = maxDist;
        for (const h of this.horses) {
            if (!h.alive || h.mounted) continue;
            const d = h.getPosition().distanceTo(pos);
            if (d < closestDist) { closestDist = d; closest = h; }
        }
        return closest;
    }

    getMountedHorse() {
        return this.horses.find(h => h.mounted) || null;
    }

    dispose() {
        for (const h of this.horses) h.dispose();
        this.horses = [];
    }
}
