import type { WebSocketMessage } from '@shared/types';

export type { WebSocketMessage };

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private reconnectInterval: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isDestroyed = false;
  private handleUnload: () => void;

  constructor() {
    // Add error handling for window unload events
    if (typeof window !== 'undefined') {
      this.handleUnload = this.handleUnload.bind(this);
      window.addEventListener('beforeunload', this.handleUnload);
      window.addEventListener('unload', this.handleUnload);
    }
    this.connect();
  }

  private handleUnload = () => {
    this.destroy();
  };

  private connect() {
    // Don't reconnect if the client has been destroyed
    if (this.isDestroyed) return;
    
    try {
      // Check if we're in a valid environment to create WebSocket connections
      if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
        console.warn('WebSocket not available in this environment');
        return;
      }
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        if (this.isDestroyed) return;
        console.log('WebSocket connected');
        this.reconnectDelay = 1000; // Reset delay on successful connection
        this.emit('connection', { status: 'connected' });
      };
      
      this.ws.onmessage = (event) => {
        if (this.isDestroyed) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.emit(message.type, message.data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        if (this.isDestroyed) return;
        console.log('WebSocket disconnected');
        this.emit('connection', { status: 'disconnected' });
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        if (this.isDestroyed) return;
        console.error('WebSocket error:', error);
        this.emit('connection', { status: 'error', error });
      };
    } catch (error) {
      if (this.isDestroyed) return;
      console.error('Failed to create WebSocket connection:', error);
      // Only schedule reconnect if it's not a DOMException or similar critical error
      if (!(error instanceof DOMException)) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    // Don't schedule reconnection if destroyed
    if (this.isDestroyed) return;
    
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }
    
    this.reconnectInterval = setTimeout(() => {
      if (this.isDestroyed) return;
      console.log('Attempting to reconnect WebSocket...');
      this.connect();
    }, this.reconnectDelay);
    
    // Increase delay for next reconnect attempt
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  on(type: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  off(type: string, callback: (data: unknown) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(type: string, data: unknown) {
    if (this.isDestroyed) return;
    const listeners = this.listeners.get(type);
    if (listeners) {
      // Use try-catch to prevent listener errors from crashing the WebSocket client
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  disconnect() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.warn('Error closing WebSocket:', error);
      }
      this.ws = null;
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.disconnect();
    this.listeners.clear();
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleUnload);
      window.removeEventListener('unload', this.handleUnload);
    }
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (this.isDestroyed || !this.ws) return 'disconnected';
    
    try {
      switch (this.ws.readyState) {
        case WebSocket.OPEN:
          return 'connected';
        case WebSocket.CONNECTING:
          return 'connecting';
        default:
          return 'disconnected';
      }
    } catch (error) {
      console.warn('Error getting WebSocket status:', error);
      return 'disconnected';
    }
  }
}

export const wsClient = new WebSocketClient();
