import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const TabGuardContext = createContext(null);

const generateTabId = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const TabGuardProvider = ({ children }) => {
  const { user } = useAuth();
  const [tabId] = useState(generateTabId);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Keep refs to state variables so listeners always have fresh values without re-running useEffect
  const isDuplicateRef = useRef(isDuplicate);
  useEffect(() => {
    isDuplicateRef.current = isDuplicate;
  }, [isDuplicate]);

  const channelRef = useRef(null);
  const isCheckingRef = useRef(isChecking);
  useEffect(() => {
    isCheckingRef.current = isChecking;
  }, [isChecking]);

  const broadcast = (msg) => {
    if (!user) return;
    const userId = user._id;
    const messagePayload = { ...msg, senderTabId: tabId, timestamp: Date.now() };

    // BroadcastChannel attempt
    if (channelRef.current) {
      try {
        channelRef.current.postMessage(messagePayload);
      } catch (e) {
        console.error('Failed to postMessage on BroadcastChannel:', e);
      }
    }

    // Storage event fallback
    try {
      localStorage.setItem(`alloteme_lock_message_${userId}`, JSON.stringify(messagePayload));
    } catch (e) {
      console.error('Failed to write storage message for fallback:', e);
    }
  };

  const claimActive = () => {
    if (!user) return;
    const userId = user._id;
    const lockData = { tabId, timestamp: Date.now() };
    localStorage.setItem(`alloteme_active_lock_${userId}`, JSON.stringify(lockData));
    setIsDuplicate(false);
    setIsChecking(false);
    broadcast({ type: 'TAKE_LOCK' });
  };

  const checkOwnership = () => {
    if (!user) {
      setIsChecking(false);
      setIsDuplicate(false);
      return;
    }

    setIsChecking(true);
    const userId = user._id;
    let lock = null;

    try {
      const rawLock = localStorage.getItem(`alloteme_active_lock_${userId}`);
      if (rawLock) lock = JSON.parse(rawLock);
    } catch (e) {
      console.error('Failed to parse lock:', e);
    }

    const checkTimeout = 300; // wait 300ms for response
    let hasReceivedResponse = false;
    let pingTimeoutId;

    // Stale lock detection (10 seconds timeout)
    if (lock && Date.now() - lock.timestamp > 10000) {
      claimActive();
      return;
    }

    const tempHandler = (msg) => {
      if (msg.senderTabId !== tabId && msg.type === 'ACTIVE_TAB_EXISTS') {
        hasReceivedResponse = true;
        setIsDuplicate(true);
        setIsChecking(false);
        clearTimeout(pingTimeoutId);
        removeTempListeners();
      }
    };

    const handleChannelMessage = (e) => tempHandler(e.data);
    const handleStorageFallbackMessage = (e) => {
      if (e.key === `alloteme_lock_message_${userId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          tempHandler(parsed);
        } catch (err) {}
      }
    };

    const removeTempListeners = () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleChannelMessage);
      }
      window.removeEventListener('storage', handleStorageFallbackMessage);
    };

    if (channelRef.current) {
      channelRef.current.addEventListener('message', handleChannelMessage);
    }
    window.addEventListener('storage', handleStorageFallbackMessage);

    // Send REQUEST_ACTIVE_TAB
    broadcast({ type: 'REQUEST_ACTIVE_TAB' });

    pingTimeoutId = setTimeout(() => {
      removeTempListeners();
      if (!hasReceivedResponse) {
        claimActive();
      }
    }, checkTimeout);
  };

  useEffect(() => {
    if (!user) {
      setIsDuplicate(false);
      setIsChecking(false);
      return;
    }

    const userId = user._id;

    // Initialize BroadcastChannel scoped to userId
    try {
      channelRef.current = new BroadcastChannel(`alloteme_tab_lock_channel_${userId}`);
    } catch (e) {
      console.warn('BroadcastChannel not supported. Using storage event fallbacks.');
    }

    const processMessage = (msg) => {
      if (msg.senderTabId === tabId) return;

      const currentLock = (() => {
        try {
          const raw = localStorage.getItem(`alloteme_active_lock_${userId}`);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      const isCurrentlyActive = currentLock && currentLock.tabId === tabId && !isDuplicateRef.current;

      switch (msg.type) {
        case 'REQUEST_ACTIVE_TAB':
          if (isCurrentlyActive) {
            broadcast({ type: 'ACTIVE_TAB_EXISTS' });
          }
          break;

        case 'TAKE_LOCK':
          if (msg.senderTabId !== tabId) {
            setIsDuplicate(true);
          }
          break;

        case 'RELEASE_LOCK':
          if (isDuplicateRef.current) {
            // Auto claim after a slight random delay to resolve collisions
            setTimeout(() => {
              checkOwnership();
            }, Math.random() * 200);
          }
          break;

        case 'HEARTBEAT':
          // Optional log/analytics placeholder
          break;

        default:
          break;
      }
    };

    const handleChannelMessage = (e) => processMessage(e.data);
    const handleStorageMessage = (e) => {
      if (e.key === `alloteme_lock_message_${userId}` && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          processMessage(msg);
        } catch (err) {}
      }

      if (e.key === `alloteme_active_lock_${userId}`) {
        if (!e.newValue) {
          if (isDuplicateRef.current) {
            setTimeout(() => {
              checkOwnership();
            }, Math.random() * 200);
          }
        } else {
          try {
            const newLock = JSON.parse(e.newValue);
            if (newLock.tabId !== tabId) {
              setIsDuplicate(true);
            }
          } catch {}
        }
      }
    };

    if (channelRef.current) {
      channelRef.current.addEventListener('message', handleChannelMessage);
    }
    window.addEventListener('storage', handleStorageMessage);

    // Run startup check
    checkOwnership();

    // Heartbeat every 3 seconds to keep lock fresh
    const heartbeatInterval = setInterval(() => {
      const lockData = (() => {
        try {
          const raw = localStorage.getItem(`alloteme_active_lock_${userId}`);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (lockData && lockData.tabId === tabId && !isDuplicateRef.current) {
        localStorage.setItem(`alloteme_active_lock_${userId}`, JSON.stringify({ tabId, timestamp: Date.now() }));
        broadcast({ type: 'HEARTBEAT' });
      }
    }, 3000);

    const handleUnload = () => {
      const lockData = (() => {
        try {
          const raw = localStorage.getItem(`alloteme_active_lock_${userId}`);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (lockData && lockData.tabId === tabId) {
        localStorage.removeItem(`alloteme_active_lock_${userId}`);
        broadcast({ type: 'RELEASE_LOCK' });
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleChannelMessage);
        channelRef.current.close();
        channelRef.current = null;
      }
      window.removeEventListener('storage', handleStorageMessage);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);

  return (
    <TabGuardContext.Provider value={{ isDuplicate, isChecking, claimActive, checkOwnership }}>
      {children}
    </TabGuardContext.Provider>
  );
};

export const useTabGuard = () => {
  const context = useContext(TabGuardContext);
  if (!context) {
    throw new Error('useTabGuard must be used within a TabGuardProvider');
  }
  return context;
};
