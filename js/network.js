export class NetworkManager {
    constructor(world, player, playerNameFn, supabaseUrl, supabaseKey) {
        this.world = world;
        this.player = player;
        this.playerNameFn = playerNameFn || (() => 'Player');
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.sb = null;
        this.channel = null;
        this.connections = new Map();
        this.remotePlayers = new Map();
        this.onStatusChange = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onSeedReceived = null;
        this.onInteraction = null;
        this.onMount = null;
        this.onReady = null;
        this.syncTimer = 0;
        this.syncInterval = 1 / 20;
        this.connected = false;
        this.ready = false;
        this.playerId = null;
        this._pendingBlocks = new Map();
        this._blockFlushTimer = 0;
        this._blockFlushInterval = 2;
    }

    setStatus(msg) {
        const el = document.getElementById('mp-status');
        if (el) el.textContent = msg;
        if (this.onStatusChange) this.onStatusChange(msg);
    }

    async connect(seed) {
        if (!this.supabaseUrl || !this.supabaseKey ||
            this.supabaseUrl === 'YOUR_SUPABASE_URL') {
            this.setStatus('Multiplayer not configured');
            return;
        }

        if (!window.supabase) {
            this.setStatus('Loading Supabase...');
            await new Promise((resolve) => {
                const check = setInterval(() => {
                    if (window.supabase) { clearInterval(check); resolve(); }
                }, 100);
                setTimeout(() => { clearInterval(check); resolve(); }, 10000);
            });
        }

        if (!window.supabase) {
            this.setStatus('Failed to load Supabase');
            return;
        }

        this.playerId = crypto.randomUUID();
        this.sb = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.setStatus('Connecting...');

        await this.syncSeed(seed);
        await new Promise(r => setTimeout(r, 100));
        await this.loadBlocks();

        this.channel = this.sb.channel('ratitacraft', {
            config: {
                broadcast: { self: false },
                presence: { key: this.playerId }
            }
        });

        this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
            for (const p of newPresences) {
                if (p.id === this.playerId) continue;
                this.connections.set(p.id, { name: p.name });
                this.createRemotePlayer(p.id, p.name);
                if (this.onPlayerJoin) this.onPlayerJoin(p.id, p.name, p.hairstyle);
            }
        });

        this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
            for (const p of leftPresences) {
                if (p.id === this.playerId) continue;
                this.connections.delete(p.id);
                this.removeRemotePlayer(p.id);
                if (this.onPlayerLeave) this.onPlayerLeave(p.id);
            }
        });

        this.channel.on('broadcast', { event: 'position' }, ({ payload }) => {
            const rp = this.remotePlayers.get(payload.id);
            if (rp) {
                rp.targetPos.x = payload.x;
                rp.targetPos.y = payload.y;
                rp.targetPos.z = payload.z;
                rp.targetYaw = payload.yaw;
            }
        });

        this.channel.on('broadcast', { event: 'block' }, ({ payload }) => {
            this.world.setBlock(payload.x, payload.y, payload.z, payload.blockType);
        });

        this.channel.on('broadcast', { event: 'interaction' }, ({ payload }) => {
            if (this.onInteraction) this.onInteraction(payload);
        });

        this.channel.on('broadcast', { event: 'mount' }, ({ payload }) => {
            if (this.onMount) this.onMount(payload);
        });

        this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                this.connected = true;
                await this.channel.track({ id: this.playerId, name: this.playerNameFn(), hairstyle: parseInt(document.getElementById('hairstyle-select')?.value || '0') });
                this.ready = true;
                this.setStatus('Connected');
                if (this.onReady) this.onReady();
            } else if (status === 'CHANNEL_ERROR') {
                this.setStatus('Connection error');
            }
        });
    }

    async syncSeed(localSeed) {
        try {
            const { data } = await this.sb
                .from('world_config')
                .select('value')
                .eq('key', 'seed')
                .maybeSingle();

            if (data) {
                const remoteSeed = parseInt(data.value);
                if (this.onSeedReceived) this.onSeedReceived(remoteSeed);
            } else {
                const seedToStore = localSeed != null ? localSeed : Math.floor(Math.random() * 999999);
                await this.sb
                    .from('world_config')
                    .upsert({ key: 'seed', value: String(seedToStore) });
                if (this.onSeedReceived) this.onSeedReceived(seedToStore);
            }
        } catch (e) {
            console.warn('Seed sync failed:', e);
        }
    }

    async loadBlocks() {
        try {
            const { data } = await this.sb
                .from('blocks')
                .select('x, y, z, block_type');

            if (data) {
                for (const b of data) {
                    this.world.setBlock(b.x, b.y, b.z, b.block_type);
                }
                if (data.length > 0) {
                    this.setStatus(`Loaded ${data.length} blocks`);
                }
            }
        } catch (e) {
            console.warn('Block load failed:', e);
        }
    }

    createRemotePlayer(peerId, name) {
        const rp = {
            name: name || 'Player',
            targetPos: { x: 0, y: 0, z: 0 },
            targetYaw: 0,
            lastPos: { x: 0, y: 0, z: 0 }
        };
        this.remotePlayers.set(peerId, rp);
    }

    removeRemotePlayer(peerId) {
        this.remotePlayers.delete(peerId);
    }

    getPlayerCount() {
        return this.connected ? 1 + this.remotePlayers.size : 0;
    }

    broadcastBlock(x, y, z, blockType) {
        this.sendBlockChange(x, y, z, blockType);
    }

    sendPosition() {
        if (!this.connected) return;
        try {
            this.channel.send({
                type: 'broadcast',
                event: 'position',
                payload: {
                    id: this.playerId,
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z,
                    yaw: this.player.yaw
                }
            });
        } catch (e) {}
    }

    sendBlockChange(x, y, z, blockType) {
        if (this.connected) {
            try {
                this.channel.send({
                    type: 'broadcast',
                    event: 'block',
                    payload: { x, y, z, blockType }
                });
            } catch (e) {}
        }
        this._pendingBlocks.set(`${x},${y},${z}`, { x, y, z, block_type: blockType });
    }

    async flushBlocks() {
        if (this._pendingBlocks.size === 0 || !this.sb) return;
        const blocks = [...this._pendingBlocks.values()];
        this._pendingBlocks.clear();

        try {
            const deletes = blocks.filter(b => b.block_type === 0);
            const upserts = blocks.filter(b => b.block_type !== 0);

            if (upserts.length > 0) {
                await this.sb.from('blocks').upsert(upserts, { onConflict: 'x,y,z' });
            }
            for (const d of deletes) {
                await this.sb.from('blocks').delete()
                    .eq('x', d.x).eq('y', d.y).eq('z', d.z);
            }
        } catch (e) {
            console.warn('Block flush failed:', e);
        }
    }

    sendInteraction(action, targetType, targetName, message, fromName) {
        if (!this.connected) return;
        try {
            this.channel.send({
                type: 'broadcast',
                event: 'interaction',
                payload: { action, targetType, targetName, message, from: fromName || 'Player', id: this.playerId }
            });
        } catch (e) {}
    }

    sendMount(mounted) {
        if (!this.connected) return;
        try {
            this.channel.send({
                type: 'broadcast',
                event: 'mount',
                payload: { id: this.playerId, mounted }
            });
        } catch (e) {}
    }

    update(dt, remoteMeshManager) {
        this.syncTimer += dt;
        if (this.syncTimer >= this.syncInterval) {
            this.syncTimer = 0;
            this.sendPosition();
        }

        this._blockFlushTimer += dt;
        if (this._blockFlushTimer >= this._blockFlushInterval) {
            this._blockFlushTimer = 0;
            this.flushBlocks();
        }

        for (const [peerId, rp] of this.remotePlayers) {
            if (remoteMeshManager) {
                remoteMeshManager.updateRemote(peerId, rp);
            }
        }
    }

    disconnect() {
        this.connected = false;
        this.flushBlocks();
        if (this.channel) {
            try { this.channel.untrack(); } catch (e) {}
            try { this.channel.unsubscribe(); } catch (e) {}
            this.channel = null;
        }
        if (this.sb) {
            try { this.sb.removeAllChannels(); } catch (e) {}
        }
        this.connections.clear();
        this.remotePlayers.clear();
    }
}
