export class NetworkManager {
    constructor(world, player) {
        this.world = world;
        this.player = player;
        this.peer = null;
        this.connections = new Map();
        this.isHost = false;
        this.roomCode = null;
        this.remotePlayers = new Map();
        this.onStatusChange = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onSeedReceived = null;
        this.syncTimer = 0;
        this.syncInterval = 1 / 20;
        this._sentHello = new Set();
    }

    setStatus(msg) {
        const el = document.getElementById('mp-status');
        if (el) el.textContent = msg;
        if (this.onStatusChange) this.onStatusChange(msg);
    }

    host() {
        if (typeof Peer === 'undefined') { this.setStatus('Multiplayer unavailable - PeerJS not loaded'); return; }
        this.isHost = true;
        const id = 'ratita-' + Math.random().toString(36).substring(2, 8);
        this.roomCode = id;
        this.peer = new Peer(id);

        this.peer.on('open', () => {
            this.setStatus('Hosting...');
            const display = document.getElementById('room-code-display');
            const codeEl = document.getElementById('room-code');
            if (display && codeEl) {
                codeEl.textContent = id;
                display.style.display = 'flex';
            }
        });

        this.peer.on('connection', (conn) => {
            this.setupConnection(conn);
            this.setStatus('Player connected!');
        });

        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                this.roomCode = 'ratita-' + Math.random().toString(36).substring(2, 8);
                this.peer.destroy();
                this.host();
            } else {
                this.setStatus('Error: ' + err.type);
            }
        });
    }

    join(code) {
        if (typeof Peer === 'undefined') { this.setStatus('Multiplayer unavailable - refresh page'); return; }
        this.isHost = false;
        this.roomCode = code;
        this.setStatus('Connecting...');
        this.peer = new Peer();

        this.peer.on('open', () => {
            const conn = this.peer.connect(code);
            this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
            this.setStatus('Error: ' + err.type);
        });
    }

    setupConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.setStatus('Connected to ' + conn.peer);
            if (this.isHost) {
                conn.send({ type: 'hello', name: 'Host', seed: this.world.seed });
            } else {
                conn.send({ type: 'hello', name: 'Player' });
            }
            this._sentHello.add(conn.peer);
        });

        conn.on('data', (data) => {
            this.handleMessage(conn.peer, data);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.removeRemotePlayer(conn.peer);
            this.setStatus('Player disconnected');
            if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
        });
    }

    handleMessage(peerId, data) {
        switch (data.type) {
            case 'hello':
                this.createRemotePlayer(peerId, data.name);
                if (this.onPlayerJoin) this.onPlayerJoin(peerId, data.name);
                if (data.seed !== undefined && !this.isHost) {
                    if (this.onSeedReceived) this.onSeedReceived(data.seed);
                }
                break;
            case 'position':
                if (this.remotePlayers.has(peerId)) {
                    const rp = this.remotePlayers.get(peerId);
                    rp.targetPos.x = data.x;
                    rp.targetPos.y = data.y;
                    rp.targetPos.z = data.z;
                    rp.targetYaw = data.yaw;
                }
                break;
            case 'block':
                this.world.setBlock(data.x, data.y, data.z, data.blockType);
                this.broadcastBlock(data.x, data.y, data.z, data.blockType, peerId);
                break;
            case 'initial-sync':
                if (!this.isHost) {
                    for (const b of data.blocks) {
                        this.world.setBlock(b.x, b.y, b.z, b.type);
                    }
                }
                break;
        }
    }

    createRemotePlayer(peerId, name) {
        const rp = { name: name || 'Player', targetPos: { x: 0, y: 0, z: 0 }, targetYaw: 0, lastPos: { x: 0, y: 0, z: 0 } };
        this.remotePlayers.set(peerId, rp);
    }

    removeRemotePlayer(peerId) {
        this.remotePlayers.delete(peerId);
    }

    broadcastBlock(x, y, z, blockType, excludePeer) {
        const msg = { type: 'block', x, y, z, blockType };
        for (const [id, conn] of this.connections) {
            if (id !== excludePeer) {
                try { conn.send(msg); } catch (e) {}
            }
        }
    }

    sendPosition() {
        if (this.connections.size === 0) return;
        const msg = {
            type: 'position',
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z,
            yaw: this.player.yaw,
        };
        for (const conn of this.connections.values()) {
            try { conn.send(msg); } catch (e) {}
        }
    }

    sendBlockChange(x, y, z, blockType) {
        const msg = { type: 'block', x, y, z, blockType };
        for (const conn of this.connections.values()) {
            try { conn.send(msg); } catch (e) {}
        }
    }

    update(dt, remoteMeshManager) {
        this.syncTimer += dt;
        if (this.syncTimer >= this.syncInterval) {
            this.syncTimer = 0;
            this.sendPosition();
        }

        for (const [peerId, rp] of this.remotePlayers) {
            if (remoteMeshManager) {
                remoteMeshManager.updateRemote(peerId, rp);
            }
        }
    }

    disconnect() {
        for (const conn of this.connections.values()) {
            try { conn.close(); } catch (e) {}
        }
        this.connections.clear();
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
    }
}
