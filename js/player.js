import * as THREE from 'three';
import { CHUNK_HEIGHT } from './chunk.js';
import { HOTBAR_BLOCKS, BLOCK, FOOD_BLOCKS } from './textures.js';

const GRAVITY = -28;
const WATER_GRAVITY = -4;
const SWIM_SPEED = 4;
const JUMP_VEL = 9;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 6.5;
const FLY_SPEED = 15;
const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.75;
const EYE_HEIGHT = 1.62;
const REACH = 7;
const SCOPE_REACH = 50;
const BOAT_SPEED = 8;

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;
        this.position = new THREE.Vector3(8, 50, 8);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.yaw = 0;
        this.pitch = 0;
        this.onGround = false;
        this.wasOnGround = false;
        this.flying = false;
        this.sprinting = false;
        this.inWater = false;

        this.keys = {};
        this.mouseDX = 0;
        this.mouseDY = 0;

        this.selectedBlock = 0;
        this.targetBlock = null;
        this.targetNormal = null;

        this.sensitivity = 0.002;

        this.walkTimer = 0;
        this.footstepInterval = 0.45;
        this.footstepTimer = 0;
        this.baseFov = 75;
        this.targetFov = 75;
        this.currentFov = 75;
        this.bobAmount = 0;
        this.headBob = 0;

        this.health = 100;
        this.maxHealth = 100;
        this.hunger = 100;
        this.maxHunger = 100;
        this.hungerTimer = 0;
        this.hungerRate = 30;
        this.isDead = false;
        this.respawnTimer = 0;
        this.inventory = {};
        this.selectedFood = null;

        this.onBreak = null;
        this.onPlace = null;
        this.onFootstep = null;
        this.onJump = null;
        this.onLand = null;
        this.onSlotChange = null;
        this.onHealthChange = null;
        this.onHungerChange = null;
        this.onEat = null;

        this.scoped = false;
        this.inBoat = false;
        this.boatYaw = 0;

        this.touchMoveX = 0;
        this.touchMoveZ = 0;
        this.touchJump = false;

        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyF') this.flying = !this.flying;
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                this.selectedBlock = parseInt(e.code.charAt(5)) - 1;
                if (this.onSlotChange) this.onSlotChange();
            }
            if (e.code === 'KeyQ') {
                this.eatFood();
            }
        });
        document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouseDX += e.movementX;
                this.mouseDY += e.movementY;
            }
        });
    }

    addFood(type, amount = 1) {
        if (!this.inventory[type]) this.inventory[type] = 0;
        this.inventory[type] += amount;
    }

    hasFood() {
        return Object.keys(this.inventory).some(k => this.inventory[k] > 0);
    }

    getFoodTypes() {
        return Object.keys(this.inventory).filter(k => this.inventory[k] > 0);
    }

    eatFood() {
        if (this.isDead) return;
        const types = this.getFoodTypes();
        if (types.length === 0) return;
        const type = types[0];
        const heal = this.getFoodHeal(type);
        this.inventory[type]--;
        if (this.inventory[type] <= 0) delete this.inventory[type];
        this.hunger = Math.min(this.maxHunger, this.hunger + heal);
        if (this.hunger > 80) this.health = Math.min(this.maxHealth, this.health + Math.floor((heal) / 2));
        if (this.onEat) this.onEat(type, heal);
        if (this.onHungerChange) this.onHungerChange();
        if (this.onHealthChange) this.onHealthChange();
    }

    getFoodHeal(type) {
        const heals = { apple: 10, banana: 8, raw_chicken: 5, raw_beef: 8, raw_pork: 7, cooked_chicken: 20, cooked_beef: 25, cooked_pork: 22 };
        return heals[type] || 10;
    }

    damage(amount) {
        if (this.isDead || this.flying) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.respawnTimer = 3;
        }
        if (this.onHealthChange) this.onHealthChange();
    }

    respawn(spawnPos) {
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        this.isDead = false;
        this.position.copy(spawnPos);
        this.velocity.set(0, 0, 0);
        this.inventory = {};
        if (this.onHealthChange) this.onHealthChange();
        if (this.onHungerChange) this.onHungerChange();
    }

    update(dt) {
        dt = Math.min(dt, 0.05);

        if (this.isDead) {
            this.respawnTimer -= dt;
            return;
        }

        this.hungerTimer += dt;
        if (this.hungerTimer >= this.hungerRate) {
            this.hungerTimer = 0;
            this.hunger = Math.max(0, this.hunger - 1);
            if (this.hunger <= 0) this.damage(1);
            if (this.onHungerChange) this.onHungerChange();
        }

        this.yaw -= this.mouseDX * this.sensitivity;
        this.pitch -= this.mouseDY * this.sensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        this.mouseDX = 0;
        this.mouseDY = 0;

        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        this.sprinting = !this.flying && (this.keys['ShiftLeft'] || this.keys['ShiftRight']);
        const speed = this.flying ? FLY_SPEED : (this.sprinting ? SPRINT_SPEED : WALK_SPEED);

        const move = new THREE.Vector3(0, 0, 0);
        if (this.keys['KeyW']) move.add(forward);
        if (this.keys['KeyS']) move.sub(forward);
        if (this.keys['KeyD']) move.add(right);
        if (this.keys['KeyA']) move.sub(right);
        if (this.touchMoveX !== 0 || this.touchMoveZ !== 0) {
            move.add(right.clone().multiplyScalar(this.touchMoveX));
            move.add(forward.clone().multiplyScalar(this.touchMoveZ));
        }
        if (move.length() > 0) move.normalize().multiplyScalar(speed);

        const isMoving = move.length() > 0.1;
        this.velocity.x = move.x;
        this.velocity.z = move.z;

        if (this.inBoat) {
            this.updateBoat(dt);
            this.position.x += this.velocity.x * dt;
            this.position.z += this.velocity.z * dt;
            this.position.y = 20.5;
        } else {

        this.inWater = this.world.getBlock(
            Math.floor(this.position.x),
            Math.floor(this.position.y + EYE_HEIGHT),
            Math.floor(this.position.z)
        ) === BLOCK.WATER;

        if (this.flying) {
            this.velocity.y = 0;
            if (this.keys['Space']) this.velocity.y = FLY_SPEED;
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.velocity.y = -FLY_SPEED;
        } else if (this.inWater) {
            this.velocity.y += WATER_GRAVITY * dt;
            this.velocity.y = Math.max(this.velocity.y, -3);
            if (this.keys['Space'] || this.touchJump) this.velocity.y = SWIM_SPEED;
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.velocity.y = -SWIM_SPEED * 0.5;
        } else {
            this.velocity.y += GRAVITY * dt;
            if ((this.keys['Space'] || this.touchJump) && this.onGround) {
                this.velocity.y = JUMP_VEL;
                this.onGround = false;
                if (this.onJump) this.onJump();
            }
        }

        this.wasOnGround = this.onGround;
        this.onGround = false;

        this.position.x += this.velocity.x * dt;
        this.collide('x');
        this.position.y += this.velocity.y * dt;
        this.collide('y');
        this.position.z += this.velocity.z * dt;
        this.collide('z');
        } // end else (not in boat)

        if (!this.wasOnGround && this.onGround) {
            if (this.onLand) this.onLand();
            const fallSpeed = Math.abs(this.velocity.y);
            if (fallSpeed > 15) this.damage(Math.floor((fallSpeed - 15) * 3));
        }

        if (!this.flying && this.position.y < -10) {
            this.damage(100);
        }

        if (isMoving && this.onGround && !this.flying) {
            this.walkTimer += dt * (this.sprinting ? 1.4 : 1.0);
            this.footstepTimer += dt;
            this.bobAmount = Math.min(this.bobAmount + dt * 6, 1);
            if (this.footstepTimer >= this.footstepInterval / (this.sprinting ? 1.4 : 1)) {
                this.footstepTimer = 0;
                if (this.onFootstep) this.onFootstep();
            }
        } else {
            this.bobAmount = Math.max(this.bobAmount - dt * 4, 0);
            this.footstepTimer = 0;
        }

        this.headBob = Math.sin(this.walkTimer * 8) * 0.06 * this.bobAmount;

        this.targetFov = this.scoped ? 30 : (this.sprinting && isMoving ? this.baseFov + 12 : this.baseFov);
        this.currentFov += (this.targetFov - this.currentFov) * Math.min(1, dt * 8);
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();

        this.camera.position.set(
            this.position.x,
            this.position.y + EYE_HEIGHT + this.headBob,
            this.position.z
        );
        this.raycast();
    }

    collide(axis) {
        const hw = PLAYER_WIDTH / 2;
        const minX = this.position.x - hw, maxX = this.position.x + hw;
        const minY = this.position.y, maxY = this.position.y + PLAYER_HEIGHT;
        const minZ = this.position.z - hw, maxZ = this.position.z + hw;

        const bMinX = Math.floor(minX), bMaxX = Math.floor(maxX);
        const bMinY = Math.floor(minY), bMaxY = Math.floor(maxY);
        const bMinZ = Math.floor(minZ), bMaxZ = Math.floor(maxZ);

        for (let bx = bMinX; bx <= bMaxX; bx++) {
            for (let by = bMinY; by <= bMaxY; by++) {
                for (let bz = bMinZ; bz <= bMaxZ; bz++) {
                    if (!this.world.isBlockSolid(bx, by, bz)) continue;

                    const overlapX = Math.min(maxX, bx + 1) - Math.max(minX, bx);
                    const overlapY = Math.min(maxY, by + 1) - Math.max(minY, by);
                    const overlapZ = Math.min(maxZ, bz + 1) - Math.max(minZ, bz);

                    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) continue;

                    if (axis === 'x') {
                        if (this.velocity.x > 0) this.position.x = bx - hw - 0.001;
                        else this.position.x = bx + 1 + hw + 0.001;
                        this.velocity.x = 0;
                    } else if (axis === 'y') {
                        if (this.velocity.y > 0) {
                            this.position.y = by - PLAYER_HEIGHT;
                        } else {
                            this.position.y = by + 1;
                            this.onGround = true;
                        }
                        this.velocity.y = 0;
                    } else if (axis === 'z') {
                        if (this.velocity.z > 0) this.position.z = bz - hw - 0.001;
                        else this.position.z = bz + 1 + hw + 0.001;
                        this.velocity.z = 0;
                    }
                }
            }
        }
    }

    raycast() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);

        const pos = this.camera.position.clone();
        const step = 0.05;
        const reach = this.scoped ? SCOPE_REACH : REACH;
        let prev = pos.clone();

        for (let t = 0; t < reach; t += step) {
            const point = pos.clone().add(dir.clone().multiplyScalar(t));
            const bx = Math.floor(point.x);
            const by = Math.floor(point.y);
            const bz = Math.floor(point.z);

            const block = this.world.getBlock(bx, by, bz);
            if (block !== BLOCK.AIR && block !== BLOCK.WATER) {
                this.targetBlock = { x: bx, y: by, z: bz, block };
                const pbx = Math.floor(prev.x);
                const pby = Math.floor(prev.y);
                const pbz = Math.floor(prev.z);
                this.targetNormal = { x: pbx - bx, y: pby - by, z: pbz - bz };
                return;
            }
            prev.copy(point);
        }
        this.targetBlock = null;
        this.targetNormal = null;
    }

    breakBlock() {
        if (!this.targetBlock) return;
        const { x, y, z, block } = this.targetBlock;
        if (block === BLOCK.BEDROCK) return;

        if (block === BLOCK.APPLE) {
            this.addFood('apple');
            if (this.onEat) this.onEat('apple', 0);
        } else if (block === BLOCK.BANANA) {
            this.addFood('banana');
            if (this.onEat) this.onEat('banana', 0);
        }

        this.world.setBlock(x, y, z, 0);
        if (this.onBreak) this.onBreak(x, y, z, block);
    }

    placeBlock() {
        if (!this.targetBlock || !this.targetNormal) return;
        const n = this.targetNormal;
        const px = this.targetBlock.x + n.x;
        const py = this.targetBlock.y + n.y;
        const pz = this.targetBlock.z + n.z;

        if (py < 0 || py >= CHUNK_HEIGHT) return;

        const hw = PLAYER_WIDTH / 2;
        const pMinX = this.position.x - hw, pMaxX = this.position.x + hw;
        const pMinY = this.position.y, pMaxY = this.position.y + PLAYER_HEIGHT;
        const pMinZ = this.position.z - hw, pMaxZ = this.position.z + hw;

        const overlapX = Math.min(pMaxX, px + 1) - Math.max(pMinX, px);
        const overlapY = Math.min(pMaxY, py + 1) - Math.max(pMinY, py);
        const overlapZ = Math.min(pMaxZ, pz + 1) - Math.max(pMinZ, pz);

        if (overlapX > 0 && overlapY > 0 && overlapZ > 0) return;

        this.world.setBlock(px, py, pz, HOTBAR_BLOCKS[this.selectedBlock]);
        if (this.onPlace) this.onPlace(px, py, pz);
    }

    toggleScope() {
        this.scoped = !this.scoped;
        this.targetFov = this.scoped ? 30 : this.baseFov;
        this.currentFov = this.camera.fov;
        this.camera.fov = this.scoped ? 30 : this.baseFov;
        this.camera.updateProjectionMatrix();
    }

    enterBoat() {
        if (this.flying) return;
        const below = this.world.getBlock(
            Math.floor(this.position.x),
            Math.floor(this.position.y - 0.5),
            Math.floor(this.position.z)
        );
        if (below !== BLOCK.WATER) return;
        this.inBoat = true;
        this.boatYaw = this.yaw;
    }

    exitBoat() {
        this.inBoat = false;
    }

    updateBoat(dt) {
        if (!this.inBoat) return;
        this.velocity.y = -1 * dt;

        const forward = new THREE.Vector3(-Math.sin(this.boatYaw), 0, -Math.cos(this.boatYaw));
        const right = new THREE.Vector3(Math.cos(this.boatYaw), 0, -Math.sin(this.boatYaw));
        const move = new THREE.Vector3(0, 0, 0);
        if (this.keys['KeyW']) move.add(forward);
        if (this.keys['KeyS']) move.sub(forward);
        if (this.keys['KeyD']) move.add(right);
        if (this.keys['KeyA']) move.sub(right);
        if (this.touchMoveX !== 0 || this.touchMoveZ !== 0) {
            move.add(right.clone().multiplyScalar(this.touchMoveX));
            move.add(forward.clone().multiplyScalar(this.touchMoveZ));
        }
        if (move.length() > 0) move.normalize().multiplyScalar(BOAT_SPEED);
        this.velocity.x = move.x;
        this.velocity.z = move.z;

        this.yaw = this.boatYaw;
        this.camera.rotation.y = this.yaw;

        const waterY = 20.5;
        if (this.position.y < waterY) this.position.y = waterY;
    }
}
