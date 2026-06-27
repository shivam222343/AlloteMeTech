import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    let newSocket;
    if (user && user._id) {
      newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        query: { userId: user._id },
        withCredentials: true,
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) newSocket.close();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
