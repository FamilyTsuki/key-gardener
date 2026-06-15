class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        if (this.socket) return;
        
        if (typeof io !== 'undefined') {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            this.socket = io({
                auth: { token }
            });

            this.socket.on('connect_error', (err) => {
                console.error("Socket connection error:", err.message);
            });

            for (const [event, callbacks] of this.listeners.entries()) {
                for (const callback of callbacks) {
                    this.socket.on(event, callback);
                }
            }
        } else {
            console.error('Socket.io library not loaded.');
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    registerUser() {
        this.disconnect();
        this.connect();
    }
}

export default new SocketService();
