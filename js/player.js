import * as THREE from 'three';
import { CHUNK_HEIGHT } from './chunk.js';
import { HOTBAR_BLOCKS, BLOCK, NON_SOLID } from './textures.js';

const GRAVITY = -28;
const JUMP_VEL = 9;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 6.5;
const FLY_SPEED = 15;
const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.75;
const EYE_HEIGHT = 1.62;
const REACH = 7;

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

        this.onBreak = null;
        this.onPlace = null;
        this.onFootstep = null;
        this.onJump = null;
        this.onLand = null;

        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyF') this.flying = !this.flying;
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                this.selectedBlock = parseInt(e.code.charAt(5)) - 1;
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

    update(dt) {
        dt = Math.min(dt, 0.05);

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
        if (move.length() > 0) move.normalize().multiplyScalar(speed);

        const isMoving = move.length() > 0.1;
        this.velocity.x = move.x;
        this.velocity.z = move.z;

        if (this.flying) {
            this.velocity.y = 0;
            if (this.keys['Space']) this.velocity.y = FLY_SPEED;
            if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.velocity.y = -FLY_SPEED;
        } else {
            this.velocity.y += GRAVITY * dt;
            if (this.keys['Space'] && this.onGround) {
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

        if (!this.wasOnGround && this.onGround) {
            if (this.onLand) this.onLand();
        }

        if (!this.flying && this.position.y < -10) {
            this.position.y = 50;
            this.velocity.y = 0;
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

        this.targetFov = this.sprinting && isMoving ? this.baseFov + 12 : this.baseFov;
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
        let prev = pos.clone();

        for (let t = 0; t < REACH; t += step) {
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
}
