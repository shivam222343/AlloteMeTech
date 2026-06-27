import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for auth to resolve

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'https://allotemetech.onrender.com';

    const token = localStorage.getItem('token');

    // Connect for all users — guests get read-only (no auth token sent)
    const newSocket = io(socketUrl, {
      query: user?._id ? { userId: user._id } : {},
      auth: token ? { token } : {},
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, loading]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
