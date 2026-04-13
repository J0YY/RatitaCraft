import * as THREE from 'three';
import { HOTBAR_BLOCKS, BLOCK } from './textures.js';

const AGENT_NAMES = [
    'Ratty', 'Scabbers', 'Templeton', 'Remy', 'Ratatouille',
    'Splat', 'Dodge', 'Fidget', 'Jitter', 'Patches',
    'Scurry', 'Cheddar', 'Gouda', 'Brie', 'Swiss'
];

const AGENT_SKINS = [
    { shirt: 0x4488CC, pants: 0x334488, skin: 0xDEB887, hair: 0x4A3728 },
    { shirt: 0xCC4444, pants: 0x883333, skin: 0xD2A679, hair: 0x222222 },
    { shirt: 0x44CC44, pants: 0x338833, skin: 0xC49A6C, hair: 0x8B4513 },
    { shirt: 0xCCCC44, pants: 0x888833, skin: 0xE0C8A8, hair: 0x333333 },
    { shirt: 0xCC44CC, pants: 0x883388, skin: 0xDEB887, hair: 0x1A1A1A },
];

const AGENT_STATES = { WANDER: 0, MINE: 1, PLACE: 2, IDLE: 3, LOOK_AT_PLAYER: 4 };

export class AgentPlayer {
    constructor(scene, world, x, y, z, agentId) {
        this.scene = scene;
        this.world = world;
        this.agentId = agentId;
        this.group = new THREE.Group();
        this.alive = true;

        const skin = AGENT_SKINS[agentId % AGENT_SKINS.length];
        this.name = AGENT_NAMES[agentId % AGENT_NAMES.length];
        this.skin = skin;

        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: skin.skin });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 1.55;
        this.group.add(this.head);

        const hairGeo = new THREE.BoxGeometry(0.42, 0.15, 0.42);
        const hairMat = new THREE.MeshLambertMaterial({ color: skin.hair });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.72;
        this.group.add(hair);

        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
        const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const eyePupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        this.leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
        this.leftEye.position.set(-0.1, 1.58, -0.21);
        this.group.add(this.leftEye);
        this.rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
        this.rightEye.position.set(0.1, 1.58, -0.21);
        this.group.add(this.rightEye);

        const pupilGeo = new THREE.BoxGeometry(0.03, 0.03, 0.01);
        this.leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
        this.leftPupil.position.set(0, 0, -0.015);
        this.leftEye.add(this.leftPupil);
        this.rightPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
        this.rightPupil.position.set(0, 0, -0.015);
        this.rightEye.add(this.rightPupil);

        const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
        const bodyMat = new THREE.MeshLambertMaterial({ color: skin.shirt });
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = 1.1;
        this.group.add(this.body);

        const pantsGeo = new THREE.BoxGeometry(0.38, 0.45, 0.23);
        const pantsMat = new THREE.MeshLambertMaterial({ color: skin.pants });
        const pants = new THREE.Mesh(pantsGeo, pantsMat);
        pants.position.y = 0.62;
        this.group.add(pants);

        const legGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.leftLeg.position.set(-0.1, 0.2, 0);
        this.group.add(this.leftLeg);
        this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rightLeg.position.set(0.1, 0.2, 0);
        this.group.add(this.rightLeg);

        const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
        this.leftArm = new THREE.Mesh(armGeo, bodyMat);
        this.leftArm.position.set(-0.28, 1.05, 0);
        this.group.add(this.leftArm);
        this.rightArm = new THREE.Mesh(armGeo, bodyMat);
        this.rightArm.position.set(0.28, 1.05, 0);
        this.group.add(this.rightArm);

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 48;
        const nctx = nameCanvas.getContext('2d');
        nctx.font = 'bold 24px monospace';
        nctx.fillStyle = '#' + skin.shirt.toString(16).padStart(6, '0');
        nctx.textAlign = 'center';
        nctx.shadowColor = '#000000';
        nctx.shadowBlur = 4;
        nctx.fillText(this.name, 128, 32);
        const nameTex = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
        this.nametag = new THREE.Sprite(nameMat);
        this.nametag.scale.set(1.2, 0.3, 1);
        this.nametag.position.y = 2.1;
        this.group.add(this.nametag);

        this.group.position.set(x, y, z);
        scene.add(this.group);

        this.velocity = new THREE.Vector3();
        this.yaw = Math.random() * Math.PI * 2;
        this.targetYaw = this.yaw;
        this.state = AGENT_STATES.IDLE;
        this.stateTimer = 1 + Math.random() * 2;
        this.walkSpeed = 2.0;
        this.onGround = false;
        this.targetBlock = null;
        this.placeTarget = null;
        this.wanderCenter = new THREE.Vector3(x, y, z);
        this.wanderRadius = 15;

        this.message = '';
        this.messageTimer = 0;

        this.bobTimer = 0;

        this.speechBubble = null;
        this.animTimer = 0;
        this.currentAnim = null;
    }

    showMessage(msg, duration = 3) {
        this.message = msg;
        this.messageTimer = duration;
        this.updateSpeechBubble();
    }

    updateSpeechBubble() {
        if (this.speechBubble) {
            this.group.remove(this.speechBubble);
            this.speechBubble.material.map.dispose();
            this.speechBubble.material.dispose();
            this.speechBubble = null;
        }
        if (!this.message || this.messageTimer <= 0) return;

        const c = document.createElement('canvas');
        c.width = 256; c.height = 64;
        const ctx = c.getContext('2d');

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(4, 4, 248, 56, 8);
        } else {
            ctx.rect(4, 4, 248, 56);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.message, 128, 32);

        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        this.speechBubble = new THREE.Sprite(mat);
        this.speechBubble.scale.set(2.0, 0.5, 1);
        this.speechBubble.position.y = 2.7;
        this.group.add(this.speechBubble);
    }

    update(dt, playerPos) {
        if (!this.alive) return;
        dt = Math.min(dt, 0.05);

        this.stateTimer -= dt;
        this.messageTimer -= dt;
        if (this.messageTimer <= 0 && this.speechBubble) {
            this.group.remove(this.speechBubble);
            this.speechBubble.material.map.dispose();
            this.speechBubble.material.dispose();
            this.speechBubble = null;
        }

        if (this.stateTimer <= 0) {
            this.pickNewState(playerPos);
        }

        switch (this.state) {
            case AGENT_STATES.WANDER:
                this.doWander(dt);
                break;
            case AGENT_STATES.MINE:
                this.doMine(dt);
                break;
            case AGENT_STATES.PLACE:
                this.doPlace(dt);
                break;
            case AGENT_STATES.LOOK_AT_PLAYER:
                this.doLookAtPlayer(dt, playerPos);
                break;
            case AGENT_STATES.IDLE:
            default:
                break;
        }

        this.velocity.y += -25 * dt;
        this.group.position.y += this.velocity.y * dt;

        this.onGround = false;
        const bx = Math.floor(this.group.position.x);
        const bz = Math.floor(this.group.position.z);
        const by = Math.floor(this.group.position.y);
        if (this.world.isBlockSolid(bx, by, bz)) {
            this.group.position.y = by + 1;
            this.velocity.y = 0;
            this.onGround = true;
        }

        if (!this.onGround && this.velocity.y < 0) {
            for (let checkY = by; checkY >= by - 2; checkY--) {
                if (this.world.isBlockSolid(bx, checkY, bz)) {
                    this.group.position.y = checkY + 1;
                    this.velocity.y = 0;
                    this.onGround = true;
                    break;
                }
            }
        }

        const angleDiff = this.targetYaw - this.yaw;
        let wrapped = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (wrapped < -Math.PI) wrapped += Math.PI * 2;
        this.yaw += wrapped * Math.min(1, dt * 6);
        this.group.rotation.y = this.yaw;

        if (this.state === AGENT_STATES.WANDER && !this.currentAnim) {
            this.bobTimer += dt * 8;
            const bob = Math.sin(this.bobTimer) * 0.08;
            this.leftLeg.rotation.x = bob;
            this.rightLeg.rotation.x = -bob;
            this.leftArm.rotation.x = -bob * 0.6;
            this.rightArm.rotation.x = bob * 0.6;
        } else if (!this.currentAnim) {
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
        }

        this.updateAnims(dt);

        if (this.group.position.y < -20) {
            const h = this.world.getHeight(
                Math.floor(this.wanderCenter.x),
                Math.floor(this.wanderCenter.z)
            );
            this.group.position.set(this.wanderCenter.x, h + 2, this.wanderCenter.z);
            this.velocity.set(0, 0, 0);
        }
    }

    pickNewState(playerPos) {
        const distToPlayer = playerPos ? this.group.position.distanceTo(playerPos) : 999;

        if (distToPlayer < 5 && Math.random() < 0.5) {
            this.state = AGENT_STATES.LOOK_AT_PLAYER;
            this.stateTimer = 2 + Math.random() * 3;
            const greetings = ['Hi!', ':)', '*waves*', 'Hello!', '*nods*'];
            this.showMessage(greetings[Math.floor(Math.random() * greetings.length)]);
            return;
        }

        const r = Math.random();
        if (r < 0.15) {
            this.state = AGENT_STATES.IDLE;
            this.stateTimer = 2 + Math.random() * 3;
            const idles = ['*yawns*', '*stretches*', '...', '*looks around*'];
            this.showMessage(idles[Math.floor(Math.random() * idles.length)]);
        } else if (r < 0.75) {
            this.state = AGENT_STATES.WANDER;
            this.targetYaw = Math.random() * Math.PI * 2;
            this.stateTimer = 3 + Math.random() * 5;
        } else if (r < 0.88) {
            this.state = AGENT_STATES.MINE;
            this.findBlockToMine();
            this.stateTimer = 2 + Math.random() * 2;
            this.showMessage('*mining*');
        } else {
            this.state = AGENT_STATES.PLACE;
            this.findPlaceTarget();
            this.stateTimer = 1 + Math.random() * 2;
            this.showMessage('*building*');
        }
    }

    doWander(dt) {
        const speed = this.walkSpeed * dt;
        const dx = Math.sin(this.targetYaw) * speed;
        const dz = Math.cos(this.targetYaw) * speed;
        const nx = this.group.position.x + dx;
        const nz = this.group.position.z + dz;

        const dist = Math.sqrt(
            (nx - this.wanderCenter.x) ** 2 +
            (nz - this.wanderCenter.z) ** 2
        );

        if (dist > this.wanderRadius) {
            this.targetYaw = Math.atan2(
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
                this.targetYaw += Math.PI * (0.5 + Math.random());
            }
        }
    }

    collideHorizontal() {
        const hw = 0.2;
        const minX = this.group.position.x - hw, maxX = this.group.position.x + hw;
        const minY = this.group.position.y, maxY = this.group.position.y + 1.6;
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

                    const testY = Math.min(maxY, by + 1) - Math.max(minY, by);
                    if (testY <= 0) continue;

                    if (overlapX < overlapZ) {
                        this.group.position.x = (this.group.position.x > bx + 0.5) ? bx + 1 + hw : bx - hw;
                    } else {
                        this.group.position.z = (this.group.position.z > bz + 0.5) ? bz + 1 + hw : bz - hw;
                    }
                }
            }
        }
    }

    doMine(dt) {
        if (this.targetBlock) {
            this.rightArm.rotation.x = -1.2 + Math.sin(performance.now() * 0.015) * 0.4;
            this.mineTimer = (this.mineTimer || 0) + dt;
            if (this.mineTimer >= 1.5) {
                this.executeMine();
                this.mineTimer = 0;
            }
        } else {
            this.mineTimer = 0;
        }
    }

    doPlace(dt) {
        if (this.placeTarget) {
            this.rightArm.rotation.x = -0.8;
        }
    }

    doLookAtPlayer(dt, playerPos) {
        if (!playerPos) return;
        const dx = playerPos.x - this.group.position.x;
        const dz = playerPos.z - this.group.position.z;
        this.targetYaw = Math.atan2(dx, dz);
    }

    findBlockToMine() {
        const px = this.group.position.x;
        const py = this.group.position.y;
        const pz = this.group.position.z;

        for (let attempt = 0; attempt < 8; attempt++) {
            const dx = Math.floor((Math.random() - 0.5) * 6);
            const dz = Math.floor((Math.random() - 0.5) * 6);
            const dy = Math.floor((Math.random() - 0.5) * 3);

            const bx = Math.floor(px) + dx;
            const by = Math.floor(py) + dy;
            const bz = Math.floor(pz) + dz;

            const block = this.world.getBlock(bx, by, bz);
            if (block !== BLOCK.AIR && block !== BLOCK.WATER && block !== BLOCK.BEDROCK) {
                this.targetBlock = { x: bx, y: by, z: bz, block };
                const dx2 = bx + 0.5 - px;
                const dz2 = bz + 0.5 - pz;
                this.targetYaw = Math.atan2(dx2, dz2);
                return;
            }
        }
        this.targetBlock = null;
    }

    findPlaceTarget() {
        const px = this.group.position.x;
        const py = this.group.position.y;
        const pz = this.group.position.z;

        const dx = Math.floor((Math.random() - 0.5) * 4);
        const dz = Math.floor((Math.random() - 0.5) * 4);
        const bx = Math.floor(px) + dx;
        const bz = Math.floor(pz) + dz;
        const by = Math.floor(py);

        if (this.world.getBlock(bx, by, bz) === BLOCK.AIR && this.world.isBlockSolid(bx, by - 1, bz)) {
            const blockType = HOTBAR_BLOCKS[Math.floor(Math.random() * HOTBAR_BLOCKS.length)];
            this.world.setBlock(bx, by, bz, blockType);
            this.placeTarget = { x: bx, y: by, z: bz };
        }
    }

    executeMine() {
        if (!this.targetBlock) return false;
        const { x, y, z, block } = this.targetBlock;
        if (block !== BLOCK.BEDROCK) {
            this.world.setBlock(x, y, z, BLOCK.AIR);
            this.targetBlock = null;
            return true;
        }
        return false;
    }

    interact() {
        const responses = [
            `${this.name}: Squeak!`,
            `${this.name}: What's up?`,
            `${this.name}: Nice day!`,
            `${this.name}: *scurries*`,
            `${this.name}: Found any cheese?`,
            `${this.name}: Hehe :3`,
            `${this.name}: *nibbles*`,
            `${this.name}: Rat power!`,
        ];
        this.showMessage(responses[Math.floor(Math.random() * responses.length)], 4);
        this.state = AGENT_STATES.LOOK_AT_PLAYER;
        this.stateTimer = 3;
    }

    playAnim(type, duration = 1) {
        this.currentAnim = type;
        this.animTimer = duration;
    }

    updateAnims(dt) {
        if (this.animTimer > 0) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) this.currentAnim = null;
        }
        if (this.currentAnim === 'hit') {
            this.group.position.x += Math.sin(performance.now() * 0.03) * 0.003;
            this.head.rotation.z = Math.sin(performance.now() * 0.02) * 0.3;
        } else if (this.currentAnim === 'kiss') {
            this.head.rotation.z = Math.sin(performance.now() * 0.01) * 0.1;
            this.rightArm.rotation.x = -1.5;
        } else if (this.currentAnim === 'wave') {
            this.rightArm.rotation.x = -1.2 + Math.sin(performance.now() * 0.01) * 0.5;
        }
    }

    hit() {
        this.playAnim('hit', 0.8);
        const responses = ['*ow!*', 'Hey!', '*squeak!* That hurt!', 'Ouch!', '*rubs head*'];
        this.showMessage(responses[Math.floor(Math.random() * responses.length)], 3);
    }

    kiss() {
        this.playAnim('kiss', 2);
        const responses = ['*blushes*', 'Oh my!', 'S-squeak?!', '*tail wiggles*'];
        this.showMessage(responses[Math.floor(Math.random() * responses.length)], 4);
    }

    wave() {
        this.playAnim('wave', 1.5);
        const responses = ['*waves back*', 'Hey there!', '*squeak hello*'];
        this.showMessage(responses[Math.floor(Math.random() * responses.length)], 3);
    }

    getPosition() {
        return this.group.position;
    }

    dispose() {
        this.alive = false;
        if (this.speechBubble) {
            this.group.remove(this.speechBubble);
            this.speechBubble.material.map.dispose();
            this.speechBubble.material.dispose();
            this.speechBubble = null;
        }
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

export class AgentManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.agents = [];
        this.nextId = 0;
    }

    spawnAgent(playerPos) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 12;
        const sx = playerPos.x + Math.cos(angle) * dist;
        const sz = playerPos.z + Math.sin(angle) * dist;
        const height = this.world.getHeight(Math.floor(sx), Math.floor(sz));

        if (height <= 20) return null;

        const agent = new AgentPlayer(this.scene, this.world, sx, height + 1, sz, this.nextId++);
        this.agents.push(agent);
        return agent;
    }

    update(dt, playerPos) {
        for (let i = this.agents.length - 1; i >= 0; i--) {
            const agent = this.agents[i];
            if (!agent.alive) {
                this.agents.splice(i, 1);
                continue;
            }
            agent.update(dt, playerPos);

            if (agent.messageTimer > 0) {
                agent.nametag.visible = true;
            }

            const dist = agent.getPosition().distanceTo(playerPos);
            if (dist > 80) {
                agent.dispose();
                this.agents.splice(i, 1);
            }
        }
    }

    getAgentAt(pos, maxDist = 3.0) {
        let closest = null;
        let closestDist = maxDist;
        for (const agent of this.agents) {
            if (!agent.alive) continue;
            const d = agent.getPosition().distanceTo(pos);
            if (d < closestDist) {
                closestDist = d;
                closest = agent;
            }
        }
        return closest;
    }

    getAgentMessages() {
        const msgs = [];
        for (const agent of this.agents) {
            if (agent.messageTimer > 0 && agent.message) {
                msgs.push({ name: agent.name, message: agent.message, timer: agent.messageTimer });
            }
        }
        return msgs;
    }

    dispose() {
        for (const agent of this.agents) agent.dispose();
        this.agents = [];
    }
}
