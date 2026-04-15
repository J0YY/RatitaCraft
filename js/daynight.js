import * as THREE from 'three';

export class DayNightCycle {
    constructor(scene, ambientLight, dirLight) {
        this.scene = scene;
        this.ambientLight = ambientLight;
        this.dirLight = dirLight;
        this.time = 0.25;
        this.speed = 0.005;
        this.dayLength = 300;
        this.paused = false;

        this.dayColor = new THREE.Color(0x87CEEB);
        this.sunsetColor = new THREE.Color(0xFF7733);
        this.nightColor = new THREE.Color(0x1a1a3e);
        this.dawnColor = new THREE.Color(0xFFAA66);

        this.sunLight = new THREE.Color(0xffffff);
        this.moonLight = new THREE.Color(0x4466aa);
        this.sunsetLight = new THREE.Color(0xffaa66);

        this.starField = null;
        this.cloudLayer = null;
        this.createStars();
        this.createClouds();
    }

    createStars() {
        const geo = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < 1500; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 180;
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                Math.abs(r * Math.cos(phi)),
                r * Math.sin(phi) * Math.sin(theta)
            );
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xffffff, size: 0.5, sizeAttenuation: true,
            transparent: true, opacity: 0
        });
        this.starField = new THREE.Points(geo, mat);
        this.starField.visible = false;
        this.scene.add(this.starField);
    }

    createClouds() {
        const cloudGeo = new THREE.PlaneGeometry(400, 400, 1, 1);
        const cloudCanvas = document.createElement('canvas');
        cloudCanvas.width = 256;
        cloudCanvas.height = 256;
        const cctx = cloudCanvas.getContext('2d');

        const imgData = cctx.createImageData(256, 256);
        for (let x = 0; x < 256; x++) {
            for (let y = 0; y < 256; y++) {
                const i = (y * 256 + x) * 4;
                const nx = x / 256;
                const ny = y / 256;
                const v = Math.sin(nx * 12) * Math.cos(ny * 10) * 0.3 +
                          Math.sin(nx * 5 + ny * 7) * 0.3 +
                          Math.sin(nx * 25) * Math.sin(ny * 25) * 0.1;
                const alpha = Math.max(0, Math.min(1, (v + 0.2) * 1.5)) * 160;
                imgData.data[i] = 255;
                imgData.data[i + 1] = 255;
                imgData.data[i + 2] = 255;
                imgData.data[i + 3] = alpha;
            }
        }
        cctx.putImageData(imgData, 0, 0);

        const cloudTex = new THREE.CanvasTexture(cloudCanvas);
        cloudTex.wrapS = THREE.RepeatWrapping;
        cloudTex.wrapT = THREE.RepeatWrapping;
        const cloudMat = new THREE.MeshBasicMaterial({
            map: cloudTex, transparent: true, opacity: 0.5,
            side: THREE.DoubleSide, depthWrite: false, depthTest: true
        });
        this.cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
        this.cloudLayer.rotation.x = -Math.PI / 2;
        this.cloudLayer.position.y = 80;
        this.cloudLayer.renderOrder = 999;
        this.scene.add(this.cloudLayer);
    }

    update(dt, playerPos) {
        if (!this.paused) {
            this.time += dt / this.dayLength;
            if (this.time > 1) this.time -= 1;
        }

        const t = this.time;
        const sunAngle = t * Math.PI * 2;

        const sunX = Math.cos(sunAngle) * 100;
        const sunY = Math.sin(sunAngle) * 100;
        this.dirLight.position.set(sunX, sunY, 30);

        const sunHeight = Math.sin(sunAngle);

        let skyR, skyG, skyB, lightIntensity, ambientIntensity;
        const dayR = 0x87 / 255, dayG = 0xCE / 255, dayB = 0xEB / 255;
        const nightR = 0x1a / 255, nightG = 0x1a / 255, nightB = 0x3e / 255;

        if (sunHeight > 0.2) {
            skyR = dayR; skyG = dayG; skyB = dayB;
            this.dirLight.color.setRGB(1, 1, 1);
            lightIntensity = 0.8 + sunHeight * 0.2;
            ambientIntensity = 0.6;
        } else if (sunHeight > -0.1) {
            const f = Math.max(0, (sunHeight + 0.1) / 0.3);
            skyR = nightR + (dayR - nightR) * f;
            skyG = nightG + (dayG - nightG) * f;
            skyB = nightB + (dayB - nightB) * f;
            const sunsetF = Math.max(0, 1 - Math.abs(f - 0.5) * 4);
            skyR += sunsetF * 0.3;
            skyG += sunsetF * 0.15;
            this.dirLight.color.setRGB(
                0.3 + f * 0.7,
                0.3 + f * 0.5 + sunsetF * 0.3,
                0.5 + f * 0.5
            );
            lightIntensity = 0.2 + f * 0.6;
            ambientIntensity = 0.2 + f * 0.4;
        } else {
            skyR = nightR + (dayR - nightR) * 0.25;
            skyG = nightG + (dayG - nightG) * 0.25;
            skyB = nightB + (dayB - nightB) * 0.25;
            this.dirLight.color.setRGB(0.35, 0.45, 0.7);
            lightIntensity = 0.4;
            ambientIntensity = 0.45;
        }

        this.scene.background.setRGB(skyR, skyG, skyB);
        this.scene.fog.color.setRGB(skyR, skyG, skyB);
        this.dirLight.intensity = lightIntensity;
        this.ambientLight.intensity = ambientIntensity;

        const showStars = sunHeight < 0.05;
        this.starField.visible = showStars;
        if (showStars) {
            const starAlpha = Math.min(1, (0.05 - sunHeight) * 10);
            this.starField.material.opacity = starAlpha;
        }

        if (this.cloudLayer && playerPos) {
            this.cloudLayer.position.x = playerPos.x;
            this.cloudLayer.position.z = playerPos.z;
            this.cloudLayer.material.opacity = 0.4 + ambientIntensity * 0.2;
            this.cloudLayer.material.map.offset.x += dt * 0.003;
            this.cloudLayer.material.map.offset.y += dt * 0.001;
        }
    }

    getTimeString() {
        const hours = Math.floor(this.time * 24) % 24;
        const minutes = Math.floor((this.time * 24 * 60) % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    isDay() {
        return Math.sin(this.time * Math.PI * 2) > 0;
    }
}
