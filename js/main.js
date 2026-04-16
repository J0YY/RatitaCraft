import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { DayNightCycle } from './daynight.js';
import { Particles } from './particles.js';
import { SoundManager } from './sound.js';
import { BLOCK, HOTBAR_BLOCKS, BLOCK_NAMES, FOOD_BLOCKS, createAtlas } from './textures.js';
import { CHUNK_SIZE } from './chunk.js';
import { RatManager } from './rats.js';
import { AgentManager } from './agents.js';
import { NetworkManager } from './network.js';
import { RemotePlayerManager } from './remoteplayer.js';
import { Minimap } from './minimap.js';
import { askGLM } from './chat.js';
import { AnimalManager } from './animals.js';
import SimplexNoise from './noise.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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
const particles = new Particles(scene, camera);
const sound = new SoundManager();
const ratManager = new RatManager(scene, world);
const agentManager = new AgentManager(scene, world);
const remotePlayerManager = new RemotePlayerManager(scene);
const network = new NetworkManager(world, player, getPlayerName, SUPABASE_URL, SUPABASE_ANON_KEY);
const minimap = new Minimap(world);
const animalManager = new AnimalManager(scene, world);

const spawnPos = new THREE.Vector3(8, 50, 8);
const startH = world.getHeight(8, 8);
const waterSurface = 21;
spawnPos.set(8, Math.max(startH, waterSurface) + 2, 8);
player.position.copy(spawnPos);

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
player.onEat = (type, heal) => {
    if (heal > 0) {
        addChatMessage(`Ate ${type.replace('_', ' ')} (+${heal} hunger)`);
        sound.playTone(500, 0.15, 'sine', 0.06);
    }
};
player.onHealthChange = () => { updateHealthBar(); };
player.onHungerChange = () => { updateHealthBar(); };

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
const interactionMenu = document.getElementById('interaction-menu');
const chatLogEl = document.getElementById('chat-log');
const playerListEl = document.getElementById('player-list');
const touchControls = document.getElementById('touch-controls');
const scopeOverlay = document.getElementById('scope-overlay');

let interactionTarget = null;
let interactionType = null;

const chatMessages = [];

function addChatMessage(msg, duration = 8) {
    chatMessages.push({ msg, timer: duration });
    if (chatMessages.length > 8) chatMessages.shift();
    renderChatLog();
}

function renderChatLog() {
    chatLogEl.innerHTML = '';
    for (const m of chatMessages) {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.textContent = m.msg;
        chatLogEl.appendChild(div);
    }
}

function updateChatLog(dt) {
    let changed = false;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
        chatMessages[i].timer -= dt;
        if (chatMessages[i].timer <= 0) {
            chatMessages.splice(i, 1);
            changed = true;
        }
    }
    if (changed) renderChatLog();
}

function updatePlayerList() {
    playerListEl.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'pl-title';
    title.textContent = `Players (${network.getPlayerCount()})`;
    playerListEl.appendChild(title);
    const self = document.createElement('div');
    self.className = 'pl-name self';
    self.textContent = getPlayerName();
    playerListEl.appendChild(self);
    for (const [peerId, rp] of network.remotePlayers) {
        const el = document.createElement('div');
        el.className = 'pl-name';
        el.textContent = rp.name || 'Player';
        playerListEl.appendChild(el);
    }
}

function getPlayerName() {
    return document.getElementById('player-name').value || 'Player';
}

function updateHealthBar() {
    const hb = document.getElementById('health-bar');
    const hungerb = document.getElementById('hunger-bar');
    const ht = document.getElementById('health-text');
    if (hb) hb.style.width = Math.max(0, player.health / player.maxHealth * 100) + '%';
    if (hungerb) hungerb.style.width = Math.max(0, player.hunger / player.maxHunger * 100) + '%';
    if (ht) ht.textContent = `❤ ${player.health} | 🍖 ${player.hunger}`;
    const inv = document.getElementById('inv-text');
    if (inv) {
        const foods = player.getFoodTypes();
        inv.textContent = foods.length > 0 ? foods.map(f => `${f.replace('_',' ')} x${player.inventory[f]}`).join(', ') : 'No food (Q to eat)';
    }
    if (player.isDead) {
        const deathEl = document.getElementById('death-screen');
        if (deathEl) deathEl.style.display = 'flex';
    }
}

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
let interactionMenuOpen = false;

menuEl.addEventListener('click', (e) => {
    if (e.target.closest('button, input, select')) return;
    e.stopPropagation();
    if (!network.ready) return;
    if (isMobile) {
        startMobileGame();
    } else {
        renderer.domElement.requestPointerLock();
    }
    sound.init();
    sound.resume();
});

function startMobileGame() {
    locked = true;
    menuEl.style.display = 'none';
    crosshairEl.style.display = 'block';
    hotbarEl.style.display = 'flex';
    debugEl.style.display = 'block';
    minimap.canvas.style.display = 'block';
    chatLogEl.style.display = 'block';
    playerListEl.style.display = 'block';
    touchControls.style.display = 'block';
    const hb = document.getElementById('hud-bars');
    if (hb) hb.style.display = 'flex';
    updatePlayerList();
    document.body.requestFullscreen?.().catch(() => {});
}

document.addEventListener('pointerlockchange', () => {
    locked = !!document.pointerLockElement;
    if (interactionMenuOpen) return;
    if (isMobile) return;
    menuEl.style.display = locked ? 'none' : 'flex';
    crosshairEl.style.display = locked ? 'block' : 'none';
    hotbarEl.style.display = locked ? 'flex' : 'none';
    debugEl.style.display = locked ? 'block' : 'none';
    minimap.canvas.style.display = locked ? 'block' : 'none';
    chatLogEl.style.display = locked ? 'block' : 'none';
    playerListEl.style.display = locked ? 'block' : 'none';
    const hb = document.getElementById('hud-bars');
    if (hb) hb.style.display = locked ? 'flex' : 'none';
    if (locked) updatePlayerList();
    if (!locked) {
        interactionMenu.style.display = 'none';
        interactionTarget = null;
    }
});

function findInteractionTarget() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    const checkPos = camera.position.clone().add(forward.multiplyScalar(3));

    const nearRat = ratManager.getRatAt(checkPos, 2.5);
    if (nearRat) return { type: 'rat', target: nearRat };

    const nearAgent = agentManager.getAgentAt(checkPos, 3.5);
    if (nearAgent) return { type: 'agent', target: nearAgent };

    const nearAnimal = animalManager.getAnimalAt(checkPos, 3.5);
    if (nearAnimal) return { type: 'animal', target: nearAnimal };

    const nearPlayer = remotePlayerManager.getPlayerAt(checkPos, 3.5);
    if (nearPlayer) return { type: 'player', target: nearPlayer };

    return null;
}

function openInteractionMenu() {
    const found = findInteractionTarget();
    if (!found) return;

    interactionTarget = found.target;
    interactionType = found.type;
    interactionMenuOpen = true;

    const isRat = found.type === 'rat';
    const isAnimal = found.type === 'animal';
    const isPlayer = found.type === 'player';
    const title = interactionMenu.querySelector('.im-title');
    const emoji = isRat ? '🐀' : isAnimal ? '🍗' : '🧑';
    title.textContent = `${emoji} ${found.target.name || found.target.type}`;

    const showAgentBtns = !isRat && !isAnimal;
    interactionMenu.querySelectorAll('.agent-btn').forEach(b => b.style.display = showAgentBtns ? 'block' : 'none');
    interactionMenu.querySelectorAll('.rat-btn').forEach(b => {
        if (isRat) {
            b.style.display = 'block';
            if (b.dataset.action === 'keep' && found.target.isKept) {
                b.textContent = '💕 Following you';
                b.disabled = true;
                b.style.opacity = '0.5';
            } else {
                b.disabled = false;
                b.style.opacity = '1';
                if (b.dataset.action === 'pet') b.textContent = '🤚 Pet';
                if (b.dataset.action === 'feed') b.textContent = '🧀 Feed';
                if (b.dataset.action === 'keep') b.textContent = '💕 Keep';
            }
        } else {
            b.style.display = 'none';
        }
    });
    interactionMenu.querySelectorAll('.animal-btn').forEach(b => b.style.display = isAnimal ? 'block' : 'none');
    const chatSection = interactionMenu.querySelector('.agent-chat');
    if (chatSection) chatSection.style.display = (!isRat && !isAnimal) ? 'flex' : 'none';

    interactionMenu.style.display = 'block';
    if (!isMobile) document.exitPointerLock();
    setTimeout(() => {
        const chatInput = document.getElementById('chat-input');
        if (chatInput && !isRat && !isAnimal) chatInput.focus();
    }, 100);
}

function closeInteractionMenu() {
    interactionMenu.style.display = 'none';
    interactionTarget = null;
    interactionType = null;
    interactionMenuOpen = false;
    if (!isMobile) renderer.domElement.requestPointerLock();
}

interactionMenu.querySelectorAll('.im-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!interactionTarget) return;

        const action = btn.dataset.action;
        if (interactionType === 'agent') {
            if (action === 'hit') {
                interactionTarget.hit();
                sound.playTone(200, 0.15, 'square', 0.08);
                addChatMessage(`You hit ${interactionTarget.name}`);
            } else if (action === 'kiss') {
                interactionTarget.kiss();
                sound.playTone(600, 0.2, 'sine', 0.06);
                particles.emitHearts(interactionTarget.getPosition().x, interactionTarget.getPosition().y, interactionTarget.getPosition().z);
                addChatMessage(`You blew a kiss at ${interactionTarget.name} 💕`);
            } else if (action === 'wave') {
                interactionTarget.wave();
                sound.playTone(440, 0.1, 'sine', 0.05);
                addChatMessage(`You wave at ${interactionTarget.name}`);
            }
            network.sendInteraction(action, 'agent', interactionTarget.name, undefined, getPlayerName());
        } else if (interactionType === 'player') {
            const rpName = interactionTarget.name || 'Player';
            if (action === 'hit') {
                sound.playTone(200, 0.15, 'square', 0.08);
                addChatMessage(`You hit ${rpName}`);
                network.sendInteraction('hit', 'player', null, undefined, getPlayerName());
            } else if (action === 'kiss') {
                sound.playTone(600, 0.2, 'sine', 0.06);
                const ppos = interactionTarget.group.position;
                particles.emitHearts(ppos.x, ppos.y, ppos.z);
                addChatMessage(`You blew a kiss at ${rpName} 💕`);
                network.sendInteraction('kiss', 'player', null, undefined, getPlayerName());
            } else if (action === 'wave') {
                sound.playTone(440, 0.1, 'sine', 0.05);
                addChatMessage(`You wave at ${rpName}`);
                network.sendInteraction('wave', 'player', null, undefined, getPlayerName());
            }
        } else if (interactionType === 'rat') {
            if (action === 'pet') {
                if (interactionTarget.pet()) {
                    showInteraction(`${interactionTarget.name} nuzzles your hand! 💕`, true);
                    sound.squeak();
                    addChatMessage(`You pet ${interactionTarget.name}`);
                } else {
                    showInteraction(`${interactionTarget.name} isn't ready yet...`, true);
                }
            } else if (action === 'feed') {
                interactionTarget.feed();
                showInteraction(`${interactionTarget.name} munches happily! 🧀`, true);
                sound.squeak();
                addChatMessage(`You feed ${interactionTarget.name}`);
            } else if (action === 'keep') {
                interactionTarget.keep();
                showInteraction(`${interactionTarget.name} will follow you! 💕`, true);
                sound.squeak();
                addChatMessage(`${interactionTarget.name} is now following you!`);
            }
        } else if (interactionType === 'animal') {
            const pos = interactionTarget.getPosition();
            const drop = interactionTarget.damage(1);
            if (drop) {
                player.addFood(drop);
                addChatMessage(`Got ${drop.replace('_', ' ')}`);
                sound.playTone(300, 0.2, 'square', 0.06);
            }
            updateHealthBar();
        }
        closeInteractionMenu();
    });
});

document.getElementById('chat-send').addEventListener('click', (e) => {
    e.stopPropagation();
    sendChatMessage();
});

document.getElementById('chat-input').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || !interactionTarget) return;
    input.value = '';

    const target = interactionTarget;
    const iType = interactionType;

    if (iType === 'agent') {
        addChatMessage(`You → ${target.name}: ${msg}`);
        target.showMessage(`You: ${msg}`, 5);
        network.sendInteraction('message', 'agent', target.name, msg, getPlayerName());
        const response = await askGLM(target.name, getPlayerName(), msg);
        if (target.alive) {
            target.showMessage(response, 6);
            addChatMessage(`${target.name}: ${response}`);
        }
    }
    closeInteractionMenu();
}

document.addEventListener('keydown', (e) => {
    if (!locked) return;
    if (e.code === 'KeyT') {
        const agent = agentManager.spawnAgent(player.position);
        if (agent) agent.showMessage('Hello!', 3);
    }
    if (e.code === 'KeyE') {
        if (interactionMenu.style.display === 'block') {
            closeInteractionMenu();
        } else {
            openInteractionMenu();
        }
    }
    if (e.code === 'KeyV') {
        player.toggleScope();
        scopeOverlay.style.display = player.scoped ? 'block' : 'none';
        crosshairEl.style.display = player.scoped ? 'none' : 'block';
    }
    if (e.code === 'KeyB') {
        if (player.inBoat) {
            player.exitBoat();
            addChatMessage('Left boat');
        } else {
            player.enterBoat();
            if (player.inBoat) addChatMessage('Rowing! Use WASD to move ⛵');
            else addChatMessage('Stand on water to use boat');
        }
    }
    if (e.code === 'Escape' && interactionMenu.style.display === 'block') {
        closeInteractionMenu();
    }
});

document.addEventListener('mousedown', (e) => {
    if (!locked) return;
    if (interactionMenu.style.display === 'block') return;
    sound.resume();
    if (player.isDead) return;
    if (e.button === 0) {
        if (player.targetBlock && player.targetBlock.block === BLOCK.CAMPFIRE) {
            cookNearby();
        }
        player.breakBlock();
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        const checkPos = camera.position.clone().add(forward.multiplyScalar(3));
        const nearAnimal = animalManager.getAnimalAt(checkPos, 3.5);
        if (nearAnimal) {
            const pos = nearAnimal.getPosition();
            const drop = nearAnimal.damage(1);
            if (drop) {
                player.addFood(drop);
                addChatMessage(`Got ${drop.replace('_', ' ')}`);
                sound.playTone(300, 0.2, 'square', 0.06);
                updateHealthBar();
            }
        }
    }
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

function cookNearby() {
    const px = Math.floor(player.position.x);
    const py = Math.floor(player.position.y);
    const pz = Math.floor(player.position.z);
    const rawTypes = ['raw_chicken', 'raw_beef', 'raw_pork'];
    const cookedTypes = ['cooked_chicken', 'cooked_beef', 'cooked_pork'];
    for (const raw of rawTypes) {
        if (player.inventory[raw] > 0) {
            player.inventory[raw]--;
            if (player.inventory[raw] <= 0) delete player.inventory[raw];
            const idx = rawTypes.indexOf(raw);
            player.addFood(cookedTypes[idx]);
            addChatMessage(`Cooked ${raw.replace('_', ' ')}!`);
            sound.playTone(400, 0.1, 'sine', 0.05);
            sound.playTone(600, 0.1, 'sine', 0.05);
            updateHealthBar();
            return;
        }
    }
    addChatMessage('No raw meat to cook');
}

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

// ── Touch Controls ──

if (isMobile) {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickThumb = document.getElementById('joystick-thumb');
    const lookZone = document.getElementById('look-zone');

    let joystickTouchId = null;
    let joystickOriginX = 0, joystickOriginY = 0;
    let lookTouchId = null;
    let lookLastX = 0, lookLastY = 0;

    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        joystickTouchId = t.identifier;
        const rect = joystickZone.getBoundingClientRect();
        joystickOriginX = rect.left + rect.width / 2;
        joystickOriginY = rect.top + rect.height / 2;
    });

    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== joystickTouchId) continue;
            let dx = (t.clientX - joystickOriginX) / 45;
            let dy = (t.clientY - joystickOriginY) / 45;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 1) { dx /= len; dy /= len; }
            player.touchMoveX = dx;
            player.touchMoveZ = -dy;
            joystickThumb.style.transform = `translate(calc(-50% + ${dx * 40}px), calc(-50% + ${dy * 40}px))`;
        }
    });

    const joystickEnd = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === joystickTouchId) {
                joystickTouchId = null;
                player.touchMoveX = 0;
                player.touchMoveZ = 0;
                joystickThumb.style.transform = 'translate(-50%, -50%)';
            }
        }
    };
    joystickZone.addEventListener('touchend', joystickEnd);
    joystickZone.addEventListener('touchcancel', joystickEnd);

    lookZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        lookTouchId = t.identifier;
        lookLastX = t.clientX;
        lookLastY = t.clientY;
    });

    lookZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== lookTouchId) continue;
            const dx = t.clientX - lookLastX;
            const dy = t.clientY - lookLastY;
            player.mouseDX += dx;
            player.mouseDY += dy;
            lookLastX = t.clientX;
            lookLastY = t.clientY;
        }
    });

    const lookEnd = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookTouchId) lookTouchId = null;
        }
    };
    lookZone.addEventListener('touchend', lookEnd);
    lookZone.addEventListener('touchcancel', lookEnd);

    // Touch buttons
    const tbJump = document.getElementById('tb-jump');
    tbJump.addEventListener('touchstart', (e) => { e.preventDefault(); player.touchJump = true; });
    tbJump.addEventListener('touchend', (e) => { e.preventDefault(); player.touchJump = false; });
    tbJump.addEventListener('touchcancel', (e) => { player.touchJump = false; });

    document.getElementById('tb-break').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.isDead) return;
        player.breakBlock();
        sound.resume();
    });

    document.getElementById('tb-place').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.isDead) return;
        player.placeBlock();
        sound.resume();
    });

    document.getElementById('tb-scope').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.toggleScope();
        scopeOverlay.style.display = player.scoped ? 'block' : 'none';
        crosshairEl.style.display = player.scoped ? 'none' : 'block';
    });

    document.getElementById('tb-boat').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.inBoat) {
            player.exitBoat();
            addChatMessage('Left boat');
        } else {
            player.enterBoat();
            if (player.inBoat) addChatMessage('Rowing! ⛵');
            else addChatMessage('Stand on water to use boat');
        }
    });

    document.getElementById('tb-eat').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.eatFood();
        sound.resume();
    });

    document.getElementById('tb-interact').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (interactionMenu.style.display === 'block') {
            closeInteractionMenu();
        } else {
            openInteractionMenu();
        }
    });

    // Hotbar slot tapping
    hotbarEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const slot = e.target.closest('.slot');
        if (!slot) return;
        const idx = Array.from(hotbarEl.children).indexOf(slot);
        if (idx >= 0 && idx < HOTBAR_BLOCKS.length) {
            player.selectedBlock = idx;
            updateHotbar();
        }
    });
}

// ── Network callbacks ──

network.onPlayerJoin = (peerId, name) => {
    remotePlayerManager.createPlayer(peerId, name);
    updatePlayerList();
};
network.onPlayerLeave = (peerId) => {
    remotePlayerManager.removePlayer(peerId);
    updatePlayerList();
};
network.onSeedReceived = (seed) => {
    world.seed = seed;
    world.noise = new SimplexNoise(seed);
    world.noise2 = new SimplexNoise(seed + 1);
    world.noise3 = new SimplexNoise(seed + 2);
    world.noise4 = new SimplexNoise(seed + 3);
    world.noise5 = new SimplexNoise(seed + 4);
    world.noise6 = new SimplexNoise(seed + 5);
    for (const chunk of world.chunks.values()) chunk.dispose(scene);
    world.chunks.clear();
    const h = world.getHeight(Math.floor(player.position.x), Math.floor(player.position.z));
    player.position.y = h + 2;
};

network.onInteraction = (data) => {
    const fromName = data.from || 'Player';
    if (data.action === 'wave') {
        showInteraction(`${fromName} waves at you! 👋`, true);
        addChatMessage(`${fromName} waves at you`);
    } else if (data.action === 'hit') {
        showInteraction(`${fromName} hit you! 👊`, true);
        sound.playTone(200, 0.15, 'square', 0.08);
        player.damage(5);
        addChatMessage(`${fromName} hit you!`);
    } else if (data.action === 'kiss') {
        showInteraction(`${fromName} blew a kiss! 😘`, true);
        particles.emitHearts(player.position.x, player.position.y, player.position.z);
        addChatMessage(`${fromName} blew a kiss! 💕`);
    } else if (data.action === 'message' && data.message) {
        showInteraction(`${fromName}: ${data.message}`, true);
        addChatMessage(`${fromName}: ${data.message}`);
    }
};

setupHotbar();
updateHealthBar();
network.connect(world.seed);

network.onReady = () => {
    const prompt = document.getElementById('click-prompt');
    if (prompt) prompt.innerHTML = isMobile ? 'tap anywhere to play ✨' : 'click anywhere to play ✨';
};

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
        if (player.isDead) {
            if (player.respawnTimer <= 0) {
                player.respawn(spawnPos);
                const deathEl = document.getElementById('death-screen');
                if (deathEl) deathEl.style.display = 'none';
                updateHealthBar();
            }
        }
        player.update(dt);
        updateChatLog(dt);
    }

    dayNight.update(dt, player.position);
    world.update(player.position.x, player.position.z);
    particles.update(dt);
    ratManager.update(dt, player.position);
    agentManager.update(dt, player.position);
    animalManager.update(dt, player.position);
    network.update(dt, remotePlayerManager);

    const remotePositions = [];
    for (const [pid, rp] of network.remotePlayers) {
        remotePositions.push({ x: rp.targetPos.x, z: rp.targetPos.z });
    }
    minimap.update(dt, player.position, agentManager.agents, ratManager.rats);
    minimap.setRemotePlayers(remotePositions);

    if (locked && interactionMenu.style.display === 'none' && !player.isDead) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        const checkPos = camera.position.clone().add(forward.multiplyScalar(3));

        const nearRat = ratManager.getRatAt(checkPos, 3);
        const nearAgent = agentManager.getAgentAt(checkPos, 4);
        const nearAnimal = animalManager.getAnimalAt(checkPos, 3.5);
        const nearPlayer = remotePlayerManager.getPlayerAt(checkPos, 3.5);

        if (showInteraction._forced) {
        } else if (nearRat) {
            showInteraction(`${isMobile ? 'Tap' : 'Press E'} → ${nearRat.name} ${nearRat.isKept ? '(following)' : ''} 🐀`);
        } else if (nearAnimal) {
            showInteraction(`${isMobile ? 'Tap ⚔' : 'Press E'} → ${nearAnimal.type} 🍗`);
        } else if (nearPlayer) {
            showInteraction(`${isMobile ? 'Tap' : 'Press E'} → ${nearPlayer.name} 🧑`);
        } else if (nearAgent) {
            showInteraction(`${isMobile ? 'Tap' : 'Press E'} → ${nearAgent.name} 🧑`);
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
    const animals = animalManager.animals.length;
    const players = network.getPlayerCount();
    const scopeStr = player.scoped ? ' | SCOPE' : '';
    const boatStr = player.inBoat ? ' | BOAT' : '';
    debugEl.innerHTML = `FPS: ${fps}<br>XYZ: ${player.position.x.toFixed(1)} ${player.position.y.toFixed(1)} ${player.position.z.toFixed(1)}<br>Chunk: ${cx} ${cz}<br>Time: ${dayNight.getTimeString()}${player.flying ? '<br>FLYING' : ''}${player.inWater ? '<br>SWIMMING' : ''}${boatStr}${scopeStr}<br>Rats: ${rats} | Agents: ${agents} | Animals: ${animals} | Players: ${players}${agentMsgStr}`;

    renderer.render(scene, camera);
} catch (e) {
    debugEl.classList.add('error');
    debugEl.style.display = 'block';
    debugEl.style.zIndex = '200';
    debugEl.innerHTML = 'RENDER ERROR: ' + e.message;
}
}
gameLoop();
