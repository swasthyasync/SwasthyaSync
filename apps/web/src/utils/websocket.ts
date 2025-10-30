// WebSocket utility for real-time communication
const { io } = require('socket.io-client');
type Socket = any;

const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL || 'http://localhost:4000';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(WEBSOCKET_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  // Chat methods
  sendMessage(message: string, threadId: string, userId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('chat-message', {
        message,
        threadId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  onMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('chat-message', callback);
    }
  }

  onTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('typing', callback);
    }
  }

  sendTyping(threadId: string, userId: string, isTyping: boolean) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        threadId,
        userId,
        isTyping,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
