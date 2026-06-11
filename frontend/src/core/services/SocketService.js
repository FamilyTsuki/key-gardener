class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
        if (this.socket) return;
        
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 Connected to Socket.io server');
                this.registerUser();
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from Socket.io server');
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

    registerUser() {
        const token = localStorage.getItem('authToken');
        if (token && this.socket) {
            fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        localStorage.setItem('username', data.user.username);
                        localStorage.setItem('userId', data.user.id);
                        this.socket.emit('register', { userId: data.user.id, username: data.user.username });
                    }
                }).catch(err => console.error('Socket registration error', err));
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
}

export default new SocketService();
