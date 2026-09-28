import { io } from 'socket.io-client';

let socketInstance = null;

const getSocketUrl = () => {
  const raw = import.meta.env.VITE_SERVER_URL || '';
  if (raw) {
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
};

const SOCKET_URL = getSocketUrl();

export const connectSocket = (token) => {
  if (!token) {
    console.warn('[Socket] Cannot connect without auth token');
    return null;
  }

  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
  }

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socketInstance.on('connect', () => {
    console.log('[Socket] Connected with ID:', socketInstance.id);
  });

  socketInstance.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket };
