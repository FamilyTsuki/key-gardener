import { AuthService } from "./auth.service.js";

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    /**
     * Performs the connects operation.
     */
    connect() {
        if (this.socket) return;
        
        if (typeof io !== 'undefined') {
            if (!AuthService.isAuthenticated()) return;

            this.socket = io({
                withCredentials: true
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

    /**
     * Registers an event handler callback.
     * @param {any} event - The event.
     * @param {any} callback - The callback.
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    /**
     * Performs the offs operation.
     * @param {any} event - The event.
     * @param {any} callback - The callback.
     */
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

    /**
     * Emits an event to the socket or listeners.
     * @param {any} event - The event.
     * @param {any} data - The data.
     */
    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    /**
     * Performs the disconnects operation.
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Registers the user.
     */
    registerUser() {
        this.disconnect();
        this.connect();
    }
}

export default new SocketService();
