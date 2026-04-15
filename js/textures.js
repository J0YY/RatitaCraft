const BLOCK = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4,
    WOOD: 5, LEAVES: 6, WATER: 7, COBBLESTONE: 8,
    PLANKS: 9, BEDROCK: 10, SNOW: 11, GLASS: 12,
    COAL_ORE: 13, IRON_ORE: 14, GOLD_ORE: 15, RED_FLOWER: 16,
    YELLOW_FLOWER: 17, TALL_GRASS: 18, GRAVEL: 19, BRICK: 20,
    APPLE: 21, BANANA: 22, CAMPFIRE: 23
};

const BLOCK_TEXTURES = {
    [BLOCK.GRASS]:       [0,  1,  2],
    [BLOCK.DIRT]:        [2,  2,  2],
    [BLOCK.STONE]:       [3,  3,  3],
    [BLOCK.SAND]:        [4,  4,  4],
    [BLOCK.WOOD]:        [6,  5,  6],
    [BLOCK.LEAVES]:      [7,  7,  7],
    [BLOCK.WATER]:       [8,  8,  8],
    [BLOCK.COBBLESTONE]: [9,  9,  9],
    [BLOCK.PLANKS]:      [10, 10, 10],
    [BLOCK.BEDROCK]:     [11, 11, 11],
    [BLOCK.SNOW]:        [12, 12, 12],
    [BLOCK.GLASS]:       [13, 13, 13],
    [BLOCK.COAL_ORE]:    [14, 14, 14],
    [BLOCK.IRON_ORE]:    [15, 15, 15],
    [BLOCK.GOLD_ORE]:    [16, 16, 16],
    [BLOCK.RED_FLOWER]:  [17, 17, 17],
    [BLOCK.YELLOW_FLOWER]:[18, 18, 18],
    [BLOCK.TALL_GRASS]:  [19, 19, 19],
    [BLOCK.GRAVEL]:      [20, 20, 20],
    [BLOCK.BRICK]:       [21, 21, 21],
    [BLOCK.APPLE]:       [22, 22, 22],
    [BLOCK.BANANA]:      [23, 23, 23],
    [BLOCK.CAMPFIRE]:    [24, 24, 24],
};

const BLOCK_NAMES = {
    [BLOCK.GRASS]: 'Grass', [BLOCK.DIRT]: 'Dirt', [BLOCK.STONE]: 'Stone',
    [BLOCK.SAND]: 'Sand', [BLOCK.WOOD]: 'Wood', [BLOCK.LEAVES]: 'Leaves',
    [BLOCK.COBBLESTONE]: 'Cobble', [BLOCK.PLANKS]: 'Planks',
    [BLOCK.BEDROCK]: 'Bedrock', [BLOCK.GLASS]: 'Glass',
    [BLOCK.COAL_ORE]: 'Coal', [BLOCK.IRON_ORE]: 'Iron', [BLOCK.GOLD_ORE]: 'Gold',
    [BLOCK.RED_FLOWER]: 'Rose', [BLOCK.YELLOW_FLOWER]: 'Dandelion',
    [BLOCK.TALL_GRASS]: 'Grass', [BLOCK.GRAVEL]: 'Gravel', [BLOCK.BRICK]: 'Brick',
    [BLOCK.APPLE]: 'Apple', [BLOCK.BANANA]: 'Banana', [BLOCK.CAMPFIRE]: 'Campfire',
};

const TRANSPARENT = new Set([BLOCK.AIR, BLOCK.WATER, BLOCK.GLASS, BLOCK.LEAVES,
    BLOCK.RED_FLOWER, BLOCK.YELLOW_FLOWER, BLOCK.TALL_GRASS, BLOCK.APPLE, BLOCK.BANANA]);

const NON_SOLID = new Set([BLOCK.AIR, BLOCK.WATER, BLOCK.RED_FLOWER,
    BLOCK.YELLOW_FLOWER, BLOCK.TALL_GRASS, BLOCK.APPLE, BLOCK.BANANA, BLOCK.CAMPFIRE]);

const HOTBAR_BLOCKS = [
    BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.SAND,
    BLOCK.WOOD, BLOCK.PLANKS, BLOCK.COBBLESTONE, BLOCK.BRICK, BLOCK.GLASS
];

const FOOD_BLOCKS = new Set([BLOCK.APPLE, BLOCK.BANANA]);

const TEX = 16;
const COLS = 8;
const ROWS = 5;

function srand(x, y) {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

function createAtlas() {
    const c = document.createElement('canvas');
    c.width = TEX * COLS;
    c.height = TEX * ROWS;
    const g = c.getContext('2d');

    function slot(i, fn) {
        const cx = (i % COLS) * TEX, cy = Math.floor(i / COLS) * TEX;
        g.save(); g.translate(cx, cy); fn(g, TEX); g.restore();
    }

    function fillNoise(g, s, base, dark, light, threshold = 0.7, ox = 0, oy = 0) {
        g.fillStyle = base; g.fillRect(0, 0, s, s);
        for (let x = 0; x < s; x++)
            for (let y = 0; y < s; y++)
                if (srand(x + ox, y + oy) > threshold)
                    { g.fillStyle = srand(x, y) > 0.5 ? dark : light; g.fillRect(x, y, 1, 1); }
    }

    slot(0, (g, s) => { fillNoise(g, s, '#5B8C32', '#4A7A28', '#6B9C3E', 0.7, 100, 100); });
    slot(1, (g, s) => {
        fillNoise(g, s, '#8B6B4A', '#7A5C3D', '#9C7B5A', 0.8, 200, 200);
        g.fillStyle = '#5B8C32'; g.fillRect(0, 0, s, 3);
        for (let x = 0; x < s; x++) {
            const h = 3 + Math.floor(srand(x + 300, 50) * 3);
            g.fillStyle = '#5B8C32'; g.fillRect(x, 0, 1, h);
            if (srand(x + 400, 50) > 0.5) { g.fillStyle = '#4A7A28'; g.fillRect(x, h - 1, 1, 1); }
        }
    });
    slot(2, (g, s) => { fillNoise(g, s, '#8B6B4A', '#7A5C3D', '#9C7B5A', 0.7, 200, 200); });
    slot(3, (g, s) => {
        fillNoise(g, s, '#8A8A8A', '#6A6A6A', '#9A9A9A', 0.85, 500, 500);
        g.fillStyle = '#707070';
        g.fillRect(2, 4, 6, 1); g.fillRect(8, 10, 5, 1); g.fillRect(4, 14, 4, 1);
    });
    slot(4, (g, s) => { fillNoise(g, s, '#D4C484', '#C4B474', '#E4D494', 0.6, 600, 600); });
    slot(5, (g, s) => {
        fillNoise(g, s, '#6B4C2A', '#5B3C1A', '#7B5C3A', 0.3, 700, 700);
        for (let x = 0; x < s; x += 3) { g.fillStyle = '#4A2C0A'; g.fillRect(x, 0, 1, s); }
    });
    slot(6, (g, s) => {
        g.fillStyle = '#B8945A'; g.fillRect(0, 0, s, s);
        for (let r = 2; r < s / 2; r += 2) {
            g.strokeStyle = r % 4 === 0 ? '#8B6B3A' : '#A08050';
            g.lineWidth = 1; g.beginPath(); g.arc(s/2, s/2, r, 0, Math.PI * 2); g.stroke();
        }
        g.fillStyle = '#6B4C2A'; g.fillRect(s/2-1, s/2-1, 2, 2);
    });
    slot(7, (g, s) => { fillNoise(g, s, '#3B7A1A', '#2B6A0A', '#4B8A2A', 0.6, 800, 800); });
    slot(8, (g, s) => { fillNoise(g, s, '#3366AA', '#2255AA', '#4477BB', 0.5, 900, 900); });
    slot(9, (g, s) => {
        g.fillStyle = '#7A7A7A'; g.fillRect(0, 0, s, s);
        [[0,0,6,5],[7,0,9,4],[6,5,5,5],[12,4,4,6],[0,6,5,5],[0,12,7,4],[8,10,5,6],[14,10,2,6]]
            .forEach(([sx,sy,sw,sh]) => {
                g.fillStyle = srand(sx,sy)>0.5?'#8A8A8A':'#6A6A6A';
                g.fillRect(sx,sy,sw,sh);
                g.strokeStyle='#555555'; g.lineWidth=1; g.strokeRect(sx,sy,sw,sh);
            });
    });
    slot(10, (g, s) => {
        g.fillStyle = '#BC9458'; g.fillRect(0, 0, s, s);
        for (let py = 0; py < s; py += 4) {
            for (let x = 0; x < s; x++)
                for (let y = py; y < py + 3 && y < s; y++)
                    if (srand(x+1000,y+1000) > 0.8) { g.fillStyle='#AC8448'; g.fillRect(x,y,1,1); }
            g.fillStyle = '#8A6B3A'; g.fillRect(0, py + 3, s, 1);
        }
    });
    slot(11, (g, s) => { fillNoise(g, s, '#444444', '#333333', '#555555', 0.5, 1100, 1100); });
    slot(12, (g, s) => { fillNoise(g, s, '#F0F0F0', '#E0E0E8', '#FFFFFF', 0.7, 1200, 1200); });
    slot(13, (g, s) => {
        g.fillStyle = 'rgba(200,220,255,0.3)'; g.fillRect(0, 0, s, s);
        g.strokeStyle = '#C0D0E0'; g.lineWidth = 1;
        g.strokeRect(0,0,s,s); g.strokeRect(4,4,s-8,s-8);
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(1,1,3,3);
    });
    slot(14, (g, s) => {
        fillNoise(g, s, '#8A8A8A', '#6A6A6A', '#9A9A9A', 0.85, 500, 500);
        [[3,3],[8,6],[5,11],[11,3],[2,8],[12,12]].forEach(([sx,sy]) => {
            g.fillStyle = '#222222'; g.fillRect(sx,sy,2,2);
            g.fillStyle = '#333333'; g.fillRect(sx+1,sy,1,1);
        });
    });
    slot(15, (g, s) => {
        fillNoise(g, s, '#8A8A8A', '#6A6A6A', '#9A9A9A', 0.85, 500, 500);
        [[3,3],[9,5],[5,10],[12,2],[2,8],[11,12]].forEach(([sx,sy]) => {
            g.fillStyle = '#D4AA7A'; g.fillRect(sx,sy,2,2);
            g.fillStyle = '#C49A6A'; g.fillRect(sx+1,sy,1,1);
        });
    });
    slot(16, (g, s) => {
        fillNoise(g, s, '#8A8A8A', '#6A6A6A', '#9A9A9A', 0.85, 500, 500);
        [[4,4],[9,7],[5,11],[12,4],[3,9],[10,13]].forEach(([sx,sy]) => {
            g.fillStyle = '#FFD700'; g.fillRect(sx,sy,2,2);
            g.fillStyle = '#DAA520'; g.fillRect(sx+1,sy,1,1);
        });
    });
    slot(17, (g, s) => {
        g.clearRect(0, 0, s, s);
        g.fillStyle = '#2D5A1E'; g.fillRect(7, 8, 2, 8);
        g.fillStyle = '#3B7A1A'; g.fillRect(5, 9, 3, 2); g.fillRect(8, 10, 3, 2);
        g.fillStyle = '#CC2222'; g.fillRect(6, 4, 4, 4);
        g.fillStyle = '#FF3333'; g.fillRect(7, 5, 2, 2);
        g.fillStyle = '#FFDD00'; g.fillRect(7, 6, 2, 1);
    });
    slot(18, (g, s) => {
        g.clearRect(0, 0, s, s);
        g.fillStyle = '#2D5A1E'; g.fillRect(7, 8, 2, 8);
        g.fillStyle = '#3B7A1A'; g.fillRect(5, 10, 3, 2); g.fillRect(8, 9, 3, 2);
        g.fillStyle = '#FFDD00'; g.fillRect(6, 4, 4, 4);
        g.fillStyle = '#FFEE44'; g.fillRect(7, 5, 2, 2);
        g.fillStyle = '#CC9900'; g.fillRect(7, 6, 2, 1);
    });
    slot(19, (g, s) => {
        g.clearRect(0, 0, s, s);
        for (let x = 3; x < 13; x += 2) {
            const h = 6 + Math.floor(srand(x, 50) * 8);
            g.fillStyle = srand(x, 60) > 0.5 ? '#3B7A1A' : '#4A8A2A';
            g.fillRect(x, s - h, 2, h);
            g.fillStyle = '#2D6A0A';
            g.fillRect(x + 1, s - h + 1, 1, h - 1);
        }
    });
    slot(20, (g, s) => {
        g.fillStyle = '#888888'; g.fillRect(0, 0, s, s);
        for (let i = 0; i < 30; i++) {
            const px = Math.floor(srand(i + 1300, 0) * s);
            const py = Math.floor(srand(0, i + 1300) * s);
            const sz = 1 + Math.floor(srand(i, i) * 3);
            g.fillStyle = srand(i + 50, i + 50) > 0.5 ? '#999999' : '#777777';
            g.fillRect(px, py, sz, sz);
        }
    });
    slot(21, (g, s) => {
        g.fillStyle = '#8B4433'; g.fillRect(0, 0, s, s);
        const brickColor = ['#9B5443', '#7B3423', '#8B4433'];
        for (let row = 0; row < 4; row++) {
            const y = row * 4;
            const offset = (row % 2) * 4;
            for (let col = -1; col < 3; col++) {
                const x = col * 8 + offset;
                g.fillStyle = brickColor[(row + col) % 3];
                g.fillRect(x + 1, y + 1, 7, 3);
            }
            g.fillStyle = '#666655';
            g.fillRect(0, y, s, 1);
            for (let col = -1; col < 3; col++) {
                const x = col * 8 + offset;
                g.fillStyle = '#666655';
                g.fillRect(x, y, 1, 4);
            }
        }
    });
    // 22: Apple
    slot(22, (g, s) => {
        g.clearRect(0, 0, s, s);
        g.fillStyle = '#2D5A1E'; g.fillRect(7, 2, 2, 5);
        g.fillStyle = '#CC2222'; g.fillRect(4, 5, 8, 8);
        g.fillStyle = '#EE3333'; g.fillRect(5, 6, 6, 6);
        g.fillStyle = '#FF6666'; g.fillRect(6, 7, 2, 2);
    });
    // 23: Banana
    slot(23, (g, s) => {
        g.clearRect(0, 0, s, s);
        g.fillStyle = '#FFE033'; g.fillRect(4, 5, 8, 7);
        g.fillStyle = '#FFD700'; g.fillRect(5, 4, 6, 8);
        g.fillStyle = '#E6C200'; g.fillRect(5, 10, 6, 2);
        g.fillStyle = '#8B6B2A'; g.fillRect(7, 2, 2, 3);
    });
    // 24: Campfire
    slot(24, (g, s) => {
        g.clearRect(0, 0, s, s);
        g.fillStyle = '#6B4C2A'; g.fillRect(2, 10, 4, 5); g.fillRect(10, 10, 4, 5);
        g.fillStyle = '#8B6B3A'; g.fillRect(3, 9, 10, 2);
        g.fillStyle = '#FF6600'; g.fillRect(5, 4, 6, 6);
        g.fillStyle = '#FFAA00'; g.fillRect(6, 5, 4, 4);
        g.fillStyle = '#FFDD44'; g.fillRect(7, 6, 2, 2);
    });

    return c;
}

function getUVs(textureIndex) {
    const col = textureIndex % COLS;
    const row = Math.floor(textureIndex / COLS);
    return {
        u0: col / COLS,
        v0: 1 - (row + 1) / ROWS,
        u1: (col + 1) / COLS,
        v1: 1 - row / ROWS,
    };
}

export { BLOCK, BLOCK_TEXTURES, BLOCK_NAMES, TRANSPARENT, NON_SOLID, HOTBAR_BLOCKS, FOOD_BLOCKS, TEX, COLS, ROWS, createAtlas, getUVs };
