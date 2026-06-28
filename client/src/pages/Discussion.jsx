import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { discussionApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageItem from '../components/discussion/MessageItem';
import MessageInput from '../components/discussion/MessageInput';
import Spinner from '../components/common/Spinner';
import { MessageSquare, Users, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

const formatDateHeading = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
};

const Discussion = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // ── Initial load using TanStack Query ──────────────────────────────────────
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['discussion', 1],
    queryFn: () => discussionApi.getMessages({ page: 1, limit: 40 }),
  });

  const initialized = useRef(false);

  // Synchronize state when query data changes (fixes the empty refresh bug)
  useEffect(() => {
    if (initialData?.data?.data && !initialized.current) {
      const data = initialData.data.data || [];
      const pag = initialData.data.pagination;
      setMessages(data);
      setHasMore(pag?.pages > 1);
      setTimeout(() => scrollToBottom(true), 100);
      initialized.current = true;
    }
  }, [initialData]);

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Fetch initial online count immediately if already connected
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('discussion:get_online_count');
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('discussion:get_online_count');
    };
    const onDisconnect = () => setIsConnected(false);

    const onNewMessage = (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (autoScroll) setTimeout(() => scrollToBottom(), 50);
    };

    const onEdit = (updated) => {
      setMessages((prev) => prev.map((m) => m._id === updated._id ? updated : m));
    };

    const onDelete = (payload) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === payload._id
            ? { ...m, isDeleted: true, content: '[deleted]' }
            : m
        )
      );
    };

    const onReact = (payload) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === payload._id ? { ...m, reactions: payload.reactions } : m
        )
      );
    };

    const onOnlineCount = (count) => {
      setOnlineCount(count);
    };

    const onTypingUpdate = (usersList) => {
      // Exclude current user from typing indicator list
      const others = usersList.filter((u) => u.userId !== user?._id);
      setTypingUsers(others);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('discussion:message:new', onNewMessage);
    socket.on('discussion:message:edit', onEdit);
    socket.on('discussion:message:delete', onDelete);
    socket.on('discussion:message:react', onReact);
    socket.on('discussion:online_count', onOnlineCount);
    socket.on('discussion:typing:update', onTypingUpdate);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('discussion:message:new', onNewMessage);
      socket.off('discussion:message:edit', onEdit);
      socket.off('discussion:message:delete', onDelete);
      socket.off('discussion:message:react', onReact);
      socket.off('discussion:online_count', onOnlineCount);
      socket.off('discussion:typing:update', onTypingUpdate);
    };
  }, [socket, autoScroll, user?._id]);

  // ── Scroll tracking ────────────────────────────────────────────────────────
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(nearBottom);

    if (el.scrollTop < 60 && hasMore && !loadingMore) {
      loadMore();
    }
  };

  const scrollToBottom = (instant = false) => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  // ── Load more (pagination) ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const nextPage = page + 1;
      const res = await discussionApi.getMessages({ page: nextPage, limit: 40 });
      const older = res.data.data || [];
      const pag = res.data.pagination;
      setMessages((prev) => [...older, ...prev]);
      setPage(nextPage);
      setHasMore(nextPage < pag?.pages);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch {
      toast.error('Failed to load older messages');
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async ({ content, replyTo: replyToId }) => {
    try {
      await discussionApi.createMessage({ content, replyTo: replyToId });
      setReplyTo(null);
      setAutoScroll(true);
      setTimeout(() => scrollToBottom(), 50);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send message');
      throw e;
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = async (id, content) => {
    try {
      await discussionApi.editMessage(id, { content });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to edit message');
      throw e;
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await discussionApi.deleteMessage(id);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete message');
    }
  };

  // ── React ─────────────────────────────────────────────────────────────────
  const handleReact = async (id, emoji) => {
    if (!user) return;
    try {
      await discussionApi.reactMessage(id, emoji);
    } catch (e) {
      toast.error('Failed to react');
    }
  };

  // ── Grouping and separator calculation ─────────────────────────────────────
  let lastDateHeader = null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header - responsive flex layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-text-primary leading-tight">Community Discussion</h1>
            <p className="text-2xs sm:text-xs text-text-muted mt-0.5">Open forum · discuss problems, tips & strategies</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isConnected && onlineCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-secondary border border-border px-3 py-1 rounded-full whitespace-nowrap">
              <Users className="w-3.5 h-3.5 text-accent-blue" />
              <span><strong>{onlineCount}</strong> online</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${
            isConnected
              ? 'text-accent-green border-accent-green/30 bg-accent-green/10'
              : 'text-text-faint border-border bg-bg-secondary'
          }`}>
            {isConnected
              ? <><Wifi className="w-3 h-3" /> Live</>
              : <><WifiOff className="w-3 h-3" /> Offline</>}
          </div>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-bg-card mb-2 relative theme-transition"
        style={{ minHeight: 0 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Load more top indicator */}
            {loadingMore && (
              <div className="flex justify-center py-3">
                <Spinner size="sm" />
              </div>
            )}
            {!hasMore && messages.length > 0 && (
              <div className="text-center py-4">
                <p className="text-2xs text-text-faint">Beginning of the discussion</p>
              </div>
            )}

            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                <MessageSquare className="w-12 h-12 text-text-faint" />
                <p className="text-text-muted text-sm">No messages yet. Be the first to say something!</p>
              </div>
            )}

            <div className="py-2 space-y-0.5">
              {messages
                .filter((msg) => !msg.isDeleted)
                .map((msg, index, arr) => {
                  const msgDateStr = new Date(msg.createdAt).toDateString();
                  const showHeader = msgDateStr !== lastDateHeader;
                  lastDateHeader = msgDateStr;

                  // Check for consecutive back-to-back messages from the same user in the visible list
                  const prevMsg = arr[index - 1];
                  const isConsecutive =
                    prevMsg &&
                    prevMsg.author?._id === msg.author?._id &&
                    !showHeader &&
                    !msg.replyTo &&
                    (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) < 5 * 60 * 1000;

                  return (
                    <div key={msg._id}>
                      {showHeader && (
                        <div className="flex items-center my-4 px-4 select-none">
                          <div className="flex-grow h-px bg-border" />
                          <span className="mx-3 text-2xs font-semibold text-text-muted tracking-wider uppercase bg-bg-secondary px-2.5 py-1 rounded-full border border-border">
                            {formatDateHeading(msg.createdAt)}
                          </span>
                          <div className="flex-grow h-px bg-border" />
                        </div>
                      )}
                      <MessageItem
                        message={msg}
                        currentUser={user}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReact={handleReact}
                        onReply={(m) => setReplyTo(m)}
                        isConsecutive={isConsecutive}
                      />
                    </div>
                  );
                })}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => { setAutoScroll(true); scrollToBottom(); }}
          className="absolute bottom-28 right-8 btn btn-secondary btn-sm shadow-card-hover"
        >
          ↓ New messages
        </button>
      )}

      {/* Typing Indicator */}
      <div className="h-6 flex items-center px-2 mb-1">
        {typingUsers.length > 0 && (
          <p className="text-xs text-text-muted italic flex items-center gap-2">
            <span className="flex gap-0.5 items-center mt-0.5">
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>
              <strong>{typingUsers.map((u) => u.name).join(', ')}</strong>
              {typingUsers.length === 1 ? ' is ' : ' are '} typing...
            </span>
          </p>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0">
        {user ? (
          <div className="card p-3">
            <div className="flex items-center gap-2 mb-2">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-2xs font-semibold text-accent-blue flex-shrink-0">
                  {user.name?.[0]}
                </div>
              )}
              <span className="text-xs text-text-muted font-medium">{user.name}</span>
            </div>
            <MessageInput
              onSend={handleSend}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </div>
        ) : (
          <div className="card p-4 flex items-center justify-between gap-4 border-dashed">
            <div>
              <p className="text-sm font-medium text-text-primary">Join the discussion</p>
              <p className="text-xs text-text-muted mt-0.5">Sign in to post messages, react, and reply to others.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
              <Link to="/signup" className="btn btn-secondary btn-sm hidden sm:inline-flex">Sign Up</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discussion;
