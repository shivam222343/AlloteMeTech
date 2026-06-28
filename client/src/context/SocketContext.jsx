import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

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

    const handleProgressUpdate = () => {
      queryClient.invalidateQueries(['user-progress']);
      queryClient.invalidateQueries(['user-progress-all']);
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['scheduled']);
      queryClient.invalidateQueries(['favorites']);
      queryClient.invalidateQueries(['company-problems']);
      queryClient.invalidateQueries(['topic-problems']);
      queryClient.invalidateQueries(['topics']);
      queryClient.invalidateQueries(['companies']);
      queryClient.invalidateQueries(['recommendation']);
    };

    newSocket.on('progressUpdated', handleProgressUpdate);

    setSocket(newSocket);

    return () => {
      newSocket.off('progressUpdated', handleProgressUpdate);
      newSocket.close();
    };
  }, [user, loading, queryClient]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

