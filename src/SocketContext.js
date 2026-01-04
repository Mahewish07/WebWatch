import React, { createContext, useMemo, useContext } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  // ⚠️ IMPORTANT: 'localhost' हटाकर अपना Laptop IP डालें (e.g. 192.168.1.5)
  // ताकि Phone भी कनेक्ट हो सके।
  const socket = useMemo(() => io('https://10.25.3.211:5000'), []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};