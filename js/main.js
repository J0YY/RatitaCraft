import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { DayNightCycle } from './daynight.js';
import { Particles } from './particles.js';
import { SoundManager } from './sound.js';
import { BLOCK, HOTBAR_BLOCKS, BLOCK_NAMES, createAtlas } from './textures.js';
import { CHUNK_SIZE } from './chunk.js';
import { RatManager } from './rats.js';
import { AgentManager } from './agents.js';
import { NetworkManager } from './network.js';
import { RemotePlayerManager } from './remoteplayer.js';
import { Minimap } from './minimap.js';
import SimplexNoise from './noise.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 60, 96);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 100, 30);
scene.add(dirLight);

const atlasCanvas = createAtlas();
const texture = new THREE.CanvasTexture(atlasCanvas);
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.colorSpace = THREE.SRGBColorSpace;

const solidMaterial = new THREE.MeshLambertMaterial({ map: texture, side: THREE.FrontSide });
const waterMaterial = new THREE.MeshLambertMaterial({
    map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.6
});

let worldSeed = undefined;
const world = new World(scene, worldSeed);
world.init({ solid: solidMaterial, water: waterMaterial });

const player = new Player(camera, world);
const dayNight = new DayNightCycle(scene, ambientLight, dirLight);
const particles = new Particles(scene);
const sound = new SoundManager();
const ratManager = new RatManager(scene, world);
const agentManager = new AgentManager(scene, world);
const remotePlayerManager = new RemotePlayerManager(scene);
const network = new NetworkManager(world, player);
const minimap = new Minimap(world);

const startH = world.getHeight(8, 8);
const waterSurface = 21;
player.position.set(8, Math.max(startH, waterSurface) + 2, 8);

player.onBreak = (x, y, z, blockType) => {
    particles.emit(x, y, z, blockType);
    sound.breakBlock(blockType);
    network.sendBlockChange(x, y, z, BLOCK.AIR);
};
player.onPlace = (x, y, z) => {
    sound.placeBlock();
    network.sendBlockChange(x, y, z, HOTBAR_BLOCKS[player.selectedBlock]);
};
player.onFootstep = () => { sound.footstep(); };
player.onJump = () => { sound.jump(); };
player.onLand = () => { sound.land(); };
player.onSlotChange = () => { updateHotbar(); };

const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
const highlightMesh = new THREE.LineSegments(highlightEdges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
highlightMesh.visible = false;
scene.add(highlightMesh);

const menuEl = document.getElementById('menu');
const crosshairEl = document.getElementById('crosshair');
const hotbarEl = document.getElementById('hotbar');
const debugEl = document.getElementById('debug');
const interactionEl = document.getElementById('interaction-popup');

function setupHotbar() {
    hotbarEl.innerHTML = '';
    HOTBAR_BLOCKS.forEach((blockId, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot' + (i === player.selectedBlock ? ' active' : '');
        const num = document.createElement('span');
        num.className = 'number';
        num.textContent = i + 1;
        slot.appendChild(num);

        const texMap = { 1:0, 2:2, 3:3, 4:4, 5:5, 9:10, 8:9, 20:21, 12:13 };
        const defaultTex = texMap[blockId] !== undefined ? texMap[blockId] : 0;
        const atlasCols = 8;
        const col = defaultTex % atlasCols;
        const row = Math.floor(defaultTex / atlasCols);
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        c.style.width = '36px'; c.style.height = '36px';
        c.style.imageRendering = 'pixelated';
        const cx = c.getContext('2d');
        cx.drawImage(atlasCanvas, col * 16, row * 16, 16, 16, 0, 0, 16, 16);
        slot.appendChild(c);

        const label = document.createElement('div');
        label.style.cssText = 'position:absolute;bottom:1px;right:2px;font-size:8px;color:#ccc;text-shadow:1px 1px #000;';
        label.textContent = BLOCK_NAMES[blockId] || '';
        slot.appendChild(label);

        hotbarEl.appendChild(slot);
    });
}

function updateHotbar() {
    const slots = hotbarEl.querySelectorAll('.slot');
    slots.forEach((s, i) => s.className = 'slot' + (i === player.selectedBlock ? ' active' : ''));
}

let locked = false;

menuEl.addEventListener('click', (e) => {
    if (e.target.closest('.multiplayer-section')) return;
    e.stopPropagation();
    renderer.domElement.requestPointerLock();
    sound.init();
    sound.resume();
});

document.addEventListener('pointerlockchange', () => {
    locked = !!document.pointerLockElement;
    menuEl.style.display = locked ? 'none' : 'flex';
    crosshairEl.style.display = locked ? 'block' : 'none';
    hotbarEl.style.display = locked ? 'flex' : 'none';
    debugEl.style.display = locked ? 'block' : 'none';
    minimap.canvas.style.display = locked ? 'block' : 'none';
});

function tryInteract() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    const checkPos = camera.position.clone().add(forward.multiplyScalar(2.5));

    const nearRat = ratManager.getRatAt(checkPos, 2.5);
    if (nearRat && nearRat.pet()) {
        sound.squeak();
        showInteraction(`Pet ${nearRat.name}! Squeak!`, true);
        return;
    }

    const nearAgent = agentManager.getAgentAt(checkPos, 3.5);
    if (nearAgent) {
        nearAgent.interact();
        sound.playTone(400, 0.1, 'sine', 0.06);
        return;
    }
}

document.addEventListener('keydown', (e) => {
    if (!locked) return;
    if (e.code === 'KeyT') {
        const agent = agentManager.spawnAgent(player.position);
        if (agent) {
            agent.showMessage('Hello!', 3);
        }
    }
    if (e.code === 'KeyE') {
        tryInteract();
    }
});

document.addEventListener('mousedown', (e) => {
    if (!locked) return;
    sound.resume();

    if (e.button === 0) player.breakBlock();
    if (e.button === 2) player.placeBlock();
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('wheel', (e) => {
    if (!locked) return;
    if (e.deltaY > 0) player.selectedBlock = (player.selectedBlock + 1) % HOTBAR_BLOCKS.length;
    else player.selectedBlock = (player.selectedBlock - 1 + HOTBAR_BLOCKS.length) % HOTBAR_BLOCKS.length;
    updateHotbar();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function showInteraction(msg, forced = false) {
    interactionEl.textContent = msg;
    interactionEl.style.display = 'block';
    showInteraction._forced = forced;
    clearTimeout(showInteraction._timer);
    showInteraction._timer = setTimeout(() => {
        interactionEl.style.display = 'none';
        showInteraction._forced = false;
    }, forced ? 2000 : 500);
}

document.getElementById('btn-host').addEventListener('click', (e) => {
    e.stopPropagation();
    network.host();
});

document.getElementById('btn-join').addEventListener('click', (e) => {
    e.stopPropagation();
    const code = document.getElementById('join-code').value.trim();
    if (code) network.join(code);
});

document.getElementById('btn-copy').addEventListener('click', (e) => {
    e.stopPropagation();
    const code = document.getElementById('room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        document.getElementById('btn-copy').textContent = 'Copied!';
        setTimeout(() => { document.getElementById('btn-copy').textContent = 'Copy'; }, 1500);
    });
});

network.onPlayerJoin = (peerId, name) => {
    remotePlayerManager.createPlayer(peerId, name);
};
network.onPlayerLeave = (peerId) => {
    remotePlayerManager.removePlayer(peerId);
};
network.onSeedReceived = (seed) => {
    world.seed = seed;
    world.noise = new SimplexNoise(seed);
    world.noise2 = new SimplexNoise(seed + 1);
    world.noise3 = new SimplexNoise(seed + 2);
    world.noise4 = new SimplexNoise(seed + 3);
    world.noise5 = new SimplexNoise(seed + 4);
    world.noise6 = new SimplexNoise(seed + 5);
    for (const chunk of world.chunks.values()) {
        chunk.dispose(scene);
    }
    world.chunks.clear();
    const h = world.getHeight(Math.floor(player.position.x), Math.floor(player.position.z));
    player.position.y = h + 2;
};

setupHotbar();

let lastTime = performance.now();
let frames = 0, fps = 0, fpsTimer = 0;

function gameLoop() {
    requestAnimationFrame(gameLoop);
    try {

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    frames++;
    fpsTimer += dt;
    if (fpsTimer >= 1) { fps = frames; frames = 0; fpsTimer = 0; }

    if (locked) {
        player.update(dt);
    }

    dayNight.update(dt, player.position);
    world.update(player.position.x, player.position.z);
    particles.update(dt);
    ratManager.update(dt, player.position);
    agentManager.update(dt, player.position);
    network.update(dt, remotePlayerManager);

    const remotePositions = [];
    for (const [pid, rp] of network.remotePlayers) {
        remotePositions.push({ x: rp.targetPos.x, z: rp.targetPos.z });
    }
    minimap.update(dt, player.position, agentManager.agents, ratManager.rats);
    minimap.setRemotePlayers(remotePositions);

    if (locked) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        const checkPos = camera.position.clone().add(forward.multiplyScalar(3));

        const nearRat = ratManager.getRatAt(checkPos, 3);
        const nearAgent = agentManager.getAgentAt(checkPos, 4);

        if (showInteraction._forced) {
            // don't overwrite forced popup
        } else if (nearRat) {
            showInteraction(`Press E to pet ${nearRat.name}`);
        } else if (nearAgent) {
            showInteraction(`Press E to talk to ${nearAgent.name}`);
        } else if (interactionEl.style.display === 'block') {
            interactionEl.style.display = 'none';
        }
    }

    const agentMessages = agentManager.getAgentMessages();
    let agentMsgStr = '';
    for (const m of agentMessages) {
        agentMsgStr += `<br><span style="color:#aaf">${m.name}: ${m.message}</span>`;
    }

    if (player.targetBlock) {
        highlightMesh.visible = true;
        highlightMesh.position.set(
            player.targetBlock.x + 0.5,
            player.targetBlock.y + 0.5,
            player.targetBlock.z + 0.5
        );
        const pulse = 0.8 + Math.sin(now * 0.005) * 0.2;
        highlightMesh.material.opacity = pulse;
        highlightMesh.material.transparent = true;
    } else {
        highlightMesh.visible = false;
    }

    const cx = Math.floor(player.position.x / CHUNK_SIZE);
    const cz = Math.floor(player.position.z / CHUNK_SIZE);
    const rats = ratManager.rats.length;
    const agents = agentManager.agents.length;
    const players = network.connections.size;
    debugEl.innerHTML = `FPS: ${fps}<br>XYZ: ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)}<br>Chunk: ${cx} ${cz}<br>Time: ${dayNight.getTimeString()}${player.flying ? '<br>FLYING' : ''}${player.inWater ? '<br>SWIMMING' : ''}<br>Rats: ${rats} | Agents: ${agents} | Players: ${players}${agentMsgStr}`;

    renderer.render(scene, camera);
} catch (e) {
    debugEl.classList.add('error');
    debugEl.style.display = 'block';
    debugEl.style.zIndex = '200';
    debugEl.innerHTML = 'RENDER ERROR: ' + e.message;
}
}
gameLoop();
