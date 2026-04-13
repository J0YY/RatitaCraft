const SAVE_PREFIX = 'ratitacraft_save_';

export function saveWorld(world, playerPos, seed) {
    const saves = JSON.parse(localStorage.getItem('ratitacraft_saves') || '[]');
    const name = 'World ' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    const timestamp = Date.now();

    const chunks = [];
    for (const chunk of world.chunks.values()) {
        chunks.push({
            cx: chunk.cx,
            cz: chunk.cz,
            blocks: Array.from(chunk.blocks),
        });
    }
    try {
        localStorage.setItem(SAVE_PREFIX + timestamp, JSON.stringify(chunks));
    } catch (e) {
        return false;
    }

    const saveData = {
        name,
        seed,
        playerX: playerPos.x,
        playerY: playerPos.y,
        playerZ: playerPos.z,
        timestamp,
    };
    saves.push(saveData);
    localStorage.setItem('ratitacraft_saves', JSON.stringify(saves));
    return name;
}

export function loadWorldList() {
    return JSON.parse(localStorage.getItem('ratitacraft_saves') || '[]');
}

export function loadWorldData(timestamp) {
    const data = localStorage.getItem(SAVE_PREFIX + timestamp);
    if (!data) return null;
    return JSON.parse(data);
}

export function deleteWorld(timestamp) {
    const saves = JSON.parse(localStorage.getItem('ratitacraft_saves') || '[]');
    const filtered = saves.filter(s => s.timestamp !== timestamp);
    localStorage.setItem('ratitacraft_saves', JSON.stringify(filtered));
    localStorage.removeItem(SAVE_PREFIX + timestamp);
}

export function populateLoadSelect() {
    const select = document.getElementById('load-select');
    if (!select) return;
    select.innerHTML = '<option value="">Load world...</option>';
    const saves = loadWorldList();
    for (const save of saves) {
        const opt = document.createElement('option');
        opt.value = save.timestamp;
        opt.textContent = save.name;
        select.appendChild(opt);
    }
}
