import { Platform } from 'react-native';

// Configurable Go backend URLs
// For Android Emulator: 10.0.2.2 points to host machine
// For iOS Simulator: localhost or 127.0.0.1
// For Physical Mobile Devices: Set your Wi-Fi LAN IP (e.g. 192.168.1.X:8090)
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
const PORT = '8090';

export const API_CONFIG = {
  HTTP_BASE: `http://${DEFAULT_HOST}:${PORT}`,
  WS_BASE: `ws://${DEFAULT_HOST}:${PORT}/ws`,
  
  // Custom setter for LAN Wi-Fi testing on physical devices
  setCustomHost: (host: string) => {
    API_CONFIG.HTTP_BASE = `http://${host}:${PORT}`;
    API_CONFIG.WS_BASE = `ws://${host}:${PORT}/ws`;
  },
};

