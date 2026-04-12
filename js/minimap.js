import { BLOCK } from './textures.js';
import { CHUNK_SIZE } from './chunk.js';

const MAP_SIZE = 150;
const MAP_RANGE = 80;
const SEA_LEVEL = 20;

const BLOCK_COLORS = {
    [BLOCK.GRASS]: '#5B8C32',
    [BLOCK.DIRT]: '#8B6B4A',
    [BLOCK.STONE]: '#8A8A8A',
    [BLOCK.SAND]: '#D4C484',
    [BLOCK.WOOD]: '#6B4C2A',
    [BLOCK.LEAVES]: '#3B7A1A',
    [BLOCK.WATER]: '#3366AA',
    [BLOCK.COBBLESTONE]: '#7A7A7A',
    [BLOCK.PLANKS]: '#BC9458',
    [BLOCK.BEDROCK]: '#444444',
    [BLOCK.SNOW]: '#F0F0F0',
    [BLOCK.GLASS]: '#C0D0E0',
    [BLOCK.COAL_ORE]: '#555555',
    [BLOCK.IRON_ORE]: '#9A8A7A',
    [BLOCK.GOLD_ORE]: '#AA9944',
    [BLOCK.RED_FLOWER]: '#CC2222',
    [BLOCK.YELLOW_FLOWER]: '#FFDD00',
    [BLOCK.TALL_GRASS]: '#4A8A2A',
    [BLOCK.GRAVEL]: '#888888',
    [BLOCK.BRICK]: '#8B4433',
};

export class Minimap {
    constructor(world) {
        this.world = world;
        this.canvas = document.createElement('canvas');
        this.canvas.width = MAP_SIZE;
        this.canvas.height = MAP_SIZE;
        this.canvas.id = 'minimap';
        this.ctx = this.canvas.getContext('2d');
        this.updateTimer = 0;
        this.updateInterval = 0.5;
        this.playerPositions = [];
        this.agentPositions = [];
        this.ratPositions = [];
        document.body.appendChild(this.canvas);
    }

    update(dt, playerPos, agents, rats) {
        this.updateTimer += dt;
        if (this.updateTimer < this.updateInterval) return;
        this.updateTimer = 0;

        this.agentPositions = agents.map(a => ({ x: a.getPosition().x, z: a.getPosition().z, name: a.name }));
        this.ratPositions = rats.map(r => ({ x: r.getPosition().x, z: r.getPosition().z }));

        const px = playerPos.x;
        const pz = playerPos.z;

        const imageData = this.ctx.createImageData(MAP_SIZE, MAP_SIZE);
        const data = imageData.data;

        for (let my = 0; my < MAP_SIZE; my++) {
            for (let mx = 0; mx < MAP_SIZE; mx++) {
                const wx = Math.floor(px + (mx - MAP_SIZE / 2) * (MAP_RANGE * 2 / MAP_SIZE));
                const wz = Math.floor(pz + (my - MAP_SIZE / 2) * (MAP_RANGE * 2 / MAP_SIZE));

                const height = this.world.getHeight(wx, wz);
                let block;
                if (height < SEA_LEVEL) {
                    block = BLOCK.WATER;
                } else {
                    block = this.world.getBlock(wx, height, wz);
                    if (block === BLOCK.AIR) block = BLOCK.GRASS;
                }

                const color = BLOCK_COLORS[block] || '#888888';
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);

                const shade = 0.7 + (height / 60) * 0.3;

                const idx = (my * MAP_SIZE + mx) * 4;
                data[idx] = Math.min(255, Math.floor(r * shade));
                data[idx + 1] = Math.min(255, Math.floor(g * shade));
                data[idx + 2] = Math.min(255, Math.floor(b * shade));
                data[idx + 3] = 200;
            }
        }

        this.ctx.putImageData(imageData, 0, 0);

        for (const rat of this.ratPositions) {
            const rx = (rat.x - px) / (MAP_RANGE * 2) * MAP_SIZE + MAP_SIZE / 2;
            const ry = (rat.z - pz) / (MAP_RANGE * 2) * MAP_SIZE + MAP_SIZE / 2;
            if (rx < 0 || rx >= MAP_SIZE || ry < 0 || ry >= MAP_SIZE) continue;
            this.ctx.fillStyle = '#FFAA44';
            this.ctx.fillRect(rx - 1, ry - 1, 2, 2);
        }

        for (const agent of this.agentPositions) {
            const ax = (agent.x - px) / (MAP_RANGE * 2) * MAP_SIZE + MAP_SIZE / 2;
            const ay = (agent.z - pz) / (MAP_RANGE * 2) * MAP_SIZE + MAP_SIZE / 2;
            if (ax < 0 || ax >= MAP_SIZE || ay < 0 || ay >= MAP_SIZE) continue;
            this.ctx.fillStyle = '#44CCFF';
            this.ctx.fillRect(ax - 2, ay - 2, 4, 4);
        }

        for (const pp of this.playerPositions) {
            const ppx = (pp.x - px) / (MAP_RANGE * 2) * MAP_SIZE + MAP_SIZE / 2;
            const ppy = (pp.z - pz) / (MAP_RANGE * 2) * MAP_SIZE + MAP_SIZE / 2;
            if (ppx < 0 || ppx >= MAP_SIZE || ppy < 0 || ppy >= MAP_SIZE) continue;
            this.ctx.fillStyle = '#44FF44';
            this.ctx.fillRect(ppx - 2, ppy - 2, 5, 5);
        }

        this.ctx.fillStyle = '#FF4444';
        this.ctx.beginPath();
        this.ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
    }

    setRemotePlayers(positions) {
        this.playerPositions = positions;
    }

    dispose() {
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
