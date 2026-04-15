import * as THREE from 'three';

const PLAYER_COLORS = [0x4488CC, 0xCC4444, 0x44CC44, 0xCCCC44, 0xCC44CC, 0x44CCCC, 0xFF8844, 0x8844FF];

export class RemotePlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.players = new Map();
        this.colorIndex = 0;
    }

    createPlayer(peerId, name) {
        if (this.players.has(peerId)) return;

        const group = new THREE.Group();
        const color = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
        this.colorIndex++;

        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.55;
        group.add(head);

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
            bobTimer: 0,
        });
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

        if (dist > 0.1) {
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

        const yawDiff = p.targetYaw - p.group.rotation.y;
        let wrapped = ((yawDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (wrapped < -Math.PI) wrapped += Math.PI * 2;
        p.group.rotation.y += wrapped * 0.3;
    }

    removePlayer(peerId) {
        const p = this.players.get(peerId);
        if (p) {
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
