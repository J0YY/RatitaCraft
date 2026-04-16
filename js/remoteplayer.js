import * as THREE from 'three';

const PLAYER_COLORS = [0x4488CC, 0xCC4444, 0x44CC44, 0xCCCC44, 0xCC44CC, 0x44CCCC, 0xFF8844, 0x8844FF];

const HAIRSTYLES = [
    { name: 'short', color: null },
    { name: 'spiky', color: null },
    { name: 'long', color: null },
    { name: 'mohawk', color: null },
    { name: 'curly', color: null },
    { name: 'bald', color: null },
];

function randomHairstyle() {
    return Math.floor(Math.random() * HAIRSTYLES.length);
}

function addHairStyle(group, style, color) {
    const hairMat = new THREE.MeshLambertMaterial({ color });
    switch (style) {
        case 0: { // short
            const g = new THREE.BoxGeometry(0.42, 0.12, 0.42);
            const m = new THREE.Mesh(g, hairMat);
            m.position.set(0, 1.78, 0);
            group.add(m);
            break;
        }
        case 1: { // spiky
            for (let i = 0; i < 5; i++) {
                const g = new THREE.BoxGeometry(0.08, 0.18 + Math.random() * 0.1, 0.08);
                const m = new THREE.Mesh(g, hairMat);
                m.position.set(-0.12 + i * 0.06, 1.85, -0.05);
                m.rotation.x = -0.2;
                group.add(m);
            }
            break;
        }
        case 2: { // long
            const top = new THREE.BoxGeometry(0.44, 0.1, 0.44);
            const tm = new THREE.Mesh(top, hairMat);
            tm.position.set(0, 1.8, 0);
            group.add(tm);
            const back = new THREE.BoxGeometry(0.42, 0.5, 0.1);
            const bm = new THREE.Mesh(back, hairMat);
            bm.position.set(0, 1.5, -0.18);
            group.add(bm);
            break;
        }
        case 3: { // mohawk
            for (let i = 0; i < 6; i++) {
                const g = new THREE.BoxGeometry(0.06, 0.22, 0.3);
                const m = new THREE.Mesh(g, hairMat);
                m.position.set(-0.1 + i * 0.04, 1.87, 0);
                group.add(m);
            }
            break;
        }
        case 4: { // curly
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = 0.22;
                const g = new THREE.BoxGeometry(0.12, 0.12, 0.12);
                const m = new THREE.Mesh(g, hairMat);
                m.position.set(Math.cos(angle) * r, 1.75, Math.sin(angle) * r);
                group.add(m);
            }
            const topG = new THREE.BoxGeometry(0.15, 0.1, 0.15);
            const topM = new THREE.Mesh(topG, hairMat);
            topM.position.set(0, 1.83, 0);
            group.add(topM);
            break;
        }
        case 5: // bald
        default:
            break;
    }
}

export class RemotePlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.players = new Map();
        this.colorIndex = 0;
        this.hairstyleIndex = randomHairstyle();
    }

    createPlayer(peerId, name, hairstyle) {
        if (this.players.has(peerId)) return;

        const group = new THREE.Group();
        const color = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
        this.colorIndex++;

        const hairColor = PLAYER_COLORS[(this.colorIndex + 3) % PLAYER_COLORS.length];
        const hs = (hairstyle !== undefined && hairstyle !== null) ? hairstyle : (this.hairstyleIndex % HAIRSTYLES.length);
        if (hairstyle === undefined || hairstyle === null) {
            this.hairstyleIndex = (this.hairstyleIndex + 1) % HAIRSTYLES.length;
        }

        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.55;
        group.add(head);

        addHairStyle(group, hs, hairColor);

        const mouthGeo = new THREE.BoxGeometry(0.14, 0.04, 0.02);
        const mouthMat = new THREE.MeshLambertMaterial({ color: 0xCC7777 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 1.46, -0.21);
        group.add(mouth);

        const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
        const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
        eyeL.position.set(-0.1, 1.58, -0.21);
        group.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
        eyeR.position.set(0.1, 1.58, -0.21);
        group.add(eyeR);

        const pupilGeo = new THREE.BoxGeometry(0.03, 0.03, 0.01);
        const pupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const pL = new THREE.Mesh(pupilGeo, pupilMat);
        pL.position.z = -0.015;
        eyeL.add(pL);
        const pR = new THREE.Mesh(pupilGeo, pupilMat);
        pR.position.z = -0.015;
        eyeR.add(pR);

        const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        group.add(body);

        const pantsGeo = new THREE.BoxGeometry(0.38, 0.45, 0.23);
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x334488 });
        const pants = new THREE.Mesh(pantsGeo, pantsMat);
        pants.position.y = 0.62;
        group.add(pants);

        const legGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.1, 0.2, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.1, 0.2, 0);
        group.add(rightLeg);

        const armGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
        const leftArm = new THREE.Mesh(armGeo, bodyMat);
        leftArm.position.set(-0.28, 1.05, 0);
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, bodyMat);
        rightArm.position.set(0.28, 1.05, 0);
        group.add(rightArm);

        const handGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const handMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const leftHand = new THREE.Mesh(handGeo, handMat);
        leftHand.position.set(0, -0.25, 0);
        leftArm.add(leftHand);
        const rightHand = new THREE.Mesh(handGeo, handMat);
        rightHand.position.set(0, -0.25, 0);
        rightArm.add(rightHand);

        const displayName = name || 'Player';
        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 48;
        const nctx = nameCanvas.getContext('2d');
        nctx.font = 'bold 22px monospace';
        nctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        nctx.textAlign = 'center';
        nctx.shadowColor = '#000000';
        nctx.shadowBlur = 4;
        nctx.fillText(displayName, 128, 32);
        const nameTex = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
        const nametag = new THREE.Sprite(nameMat);
        nametag.scale.set(1.2, 0.3, 1);
        nametag.position.y = 2.1;
        group.add(nametag);

        group.position.set(8, 50, 8);
        this.scene.add(group);

        this.players.set(peerId, {
            group,
            name: displayName,
            targetPos: { x: 8, y: 50, z: 8 },
            targetYaw: 0,
            leftLeg,
            rightLeg,
            leftArm,
            rightArm,
            mouth,
            bobTimer: 0,
            anim: null,
            animTimer: 0,
            mounted: false,
            horse: null,
        });
    }

    playAnimation(peerId, anim) {
        const p = this.players.get(peerId);
        if (!p) return;
        p.anim = anim;
        p.animTimer = 0;
    }

    setMounted(peerId, mounted) {
        const p = this.players.get(peerId);
        if (!p) return;
        if (mounted && !p.horse) {
            const horse = this.createHorse();
            horse.position.copy(p.group.position);
            horse.rotation.y = p.group.rotation.y;
            this.scene.add(horse);
            p.horse = horse;
            p.mounted = true;
            p.group.position.y += 1.2;
        } else if (!mounted && p.horse) {
            this.scene.remove(p.horse);
            p.horse.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
            p.horse = null;
            p.mounted = false;
        }
    }

    createHorse() {
        const group = new THREE.Group();
        const bodyColor = 0x8B5A2B;
        const mat = new THREE.MeshLambertMaterial({ color: bodyColor });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x5C3A1E });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.4), mat);
        body.position.set(0, 0.9, 0);
        group.add(body);

        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.35), mat);
        neck.position.set(0, 1.35, -0.55);
        neck.rotation.x = 0.5;
        group.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), mat);
        head.position.set(0, 1.6, -0.85);
        group.add(head);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.25), new THREE.MeshLambertMaterial({ color: 0x6B4423 }));
        nose.position.set(0, 1.5, -1.15);
        group.add(nose);

        const earGeo = new THREE.BoxGeometry(0.06, 0.15, 0.06);
        const earL = new THREE.Mesh(earGeo, darkMat);
        earL.position.set(-0.1, 1.8, -0.8);
        group.add(earL);
        const earR = new THREE.Mesh(earGeo, darkMat);
        earR.position.set(0.1, 1.8, -0.8);
        group.add(earR);

        const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.5), darkMat);
        mane.position.set(0, 1.5, -0.3);
        group.add(mane);

        const tailGeo = new THREE.BoxGeometry(0.06, 0.06, 0.6);
        const tail = new THREE.Mesh(tailGeo, darkMat);
        tail.position.set(0, 1.0, 0.85);
        tail.rotation.x = 0.3;
        group.add(tail);

        const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
        const offsets = [[-0.2, 0.35, -0.45], [0.2, 0.35, -0.45], [-0.2, 0.35, 0.45], [0.2, 0.35, 0.45]];
        const legs = [];
        for (const [x, y, z] of offsets) {
            const leg = new THREE.Mesh(legGeo, mat);
            leg.position.set(x, y, z);
            group.add(leg);
            legs.push(leg);
        }
        const hoofGeo = new THREE.BoxGeometry(0.17, 0.08, 0.17);
        const hoofMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        for (const [x, y, z] of offsets) {
            const hoof = new THREE.Mesh(hoofGeo, hoofMat);
            hoof.position.set(x, y - 0.38, z);
            group.add(hoof);
        }

        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
        saddle.position.set(0, 1.29, 0);
        group.add(saddle);

        group.userData.legs = legs;
        group.userData.tail = tail;
        return group;
    }

    updateRemote(peerId, rp) {
        let p = this.players.get(peerId);
        if (!p) {
            this.createPlayer(peerId, rp.name);
            p = this.players.get(peerId);
            if (!p) return;
        }

        p.targetPos.x = rp.targetPos.x;
        p.targetPos.y = rp.targetPos.y;
        p.targetPos.z = rp.targetPos.z;
        p.targetYaw = rp.targetYaw;

        const dx = p.targetPos.x - p.group.position.x;
        const dy = p.targetPos.y - p.group.position.y;
        const dz = p.targetPos.z - p.group.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const isAnimating = p.anim !== null;
        if (isAnimating) {
            p.animTimer += 0.016;
        }

        if (isAnimating) {
            this.updateAnimation(p);
        } else if (dist > 0.1) {
            p.group.position.x += dx * 0.3;
            p.group.position.y += dy * 0.3;
            p.group.position.z += dz * 0.3;
            p.bobTimer += 0.15;
            const bob = Math.sin(p.bobTimer) * 0.08;
            p.leftLeg.rotation.x = bob;
            p.rightLeg.rotation.x = -bob;
            p.leftArm.rotation.x = -bob * 0.6;
            p.rightArm.rotation.x = bob * 0.6;
        } else {
            p.leftLeg.rotation.x *= 0.9;
            p.rightLeg.rotation.x *= 0.9;
            p.leftArm.rotation.x *= 0.9;
            p.rightArm.rotation.x *= 0.9;
        }

        if (p.horse) {
            p.horse.position.x = p.group.position.x;
            p.horse.position.z = p.group.position.z;
            p.horse.rotation.y = p.group.rotation.y;

            const gy = p.targetPos.y;
            const horseY = gy - 0.5;
            p.horse.position.y += (horseY - p.horse.position.y) * 0.3;
            p.group.position.y = p.horse.position.y + 1.8;

            const legs = p.horse.userData.legs;
            const tail = p.horse.userData.tail;
            if (dist > 0.1 && legs) {
                const t = performance.now() * 0.012;
                legs[0].rotation.x = Math.sin(t) * 0.4;
                legs[1].rotation.x = Math.sin(t + Math.PI) * 0.4;
                legs[2].rotation.x = Math.sin(t + Math.PI) * 0.4;
                legs[3].rotation.x = Math.sin(t) * 0.4;
                if (tail) tail.rotation.y = Math.sin(t * 0.8) * 0.3;
            } else if (legs) {
                legs.forEach(l => l.rotation.x *= 0.9);
                if (tail) tail.rotation.y *= 0.95;
            }
        }

        const yawDiff = p.targetYaw - p.group.rotation.y;
        let wrapped = ((yawDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (wrapped < -Math.PI) wrapped += Math.PI * 2;
        p.group.rotation.y += wrapped * 0.3;
    }

    updateAnimation(p) {
        const t = p.animTimer;
        const done = () => {
            p.anim = null;
            p.animTimer = 0;
            p.leftArm.rotation.set(0, 0, 0);
            p.rightArm.rotation.set(0, 0, 0);
            p.mouth.scale.set(1, 1, 1);
            p.mouth.position.z = -0.21;
        };

        switch (p.anim) {
            case 'wave': {
                if (t > 1.2) { done(); return; }
                p.rightArm.rotation.x = -2.2;
                p.rightArm.rotation.z = Math.sin(t * 10) * 0.5;
                p.leftArm.rotation.x *= 0.9;
                break;
            }
            case 'hit': {
                if (t > 0.4) { done(); return; }
                const swing = t / 0.4;
                p.rightArm.rotation.x = -1.5 + swing * 3.0;
                p.rightArm.rotation.z = 0;
                p.leftArm.rotation.x *= 0.9;
                break;
            }
            case 'kiss': {
                if (t > 1.0) { done(); return; }
                const lean = Math.sin(t * 3) * 0.08;
                p.group.position.z += Math.sin(p.group.rotation.y) * lean * 0.3;
                p.mouth.scale.set(1, 0.5 + Math.sin(t * 6) * 0.3, 1.2);
                p.leftArm.rotation.x = -0.5;
                p.leftArm.rotation.z = 0.3;
                p.rightArm.rotation.x = -0.5;
                p.rightArm.rotation.z = -0.3;
                break;
            }
            default:
                done();
        }
    }

    removePlayer(peerId) {
        const p = this.players.get(peerId);
        if (p) {
            if (p.horse) {
                this.scene.remove(p.horse);
                p.horse.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
            }
            this.scene.remove(p.group);
            p.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this.players.delete(peerId);
        }
    }

    getPlayerAt(pos, maxDist = 3.0) {
        let closest = null;
        let closestDist = maxDist;
        for (const [peerId, p] of this.players) {
            const d = p.group.position.distanceTo(pos);
            if (d < closestDist) { closestDist = d; closest = { peerId, ...p, group: p.group }; }
        }
        return closest;
    }

    dispose() {
        for (const peerId of this.players.keys()) {
            this.removePlayer(peerId);
        }
    }
}
