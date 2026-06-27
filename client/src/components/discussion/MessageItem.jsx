import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Reply, SmilePlus, Check, X } from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';
import MentionRenderer from './MentionRenderer';

const EMOJI_PICKER = [
  '👍', '👎', '❤️', '🔥', '😂', '😮', '😢', '😡',
  '🎉', '👏', '🙏', '💯', '🚀', '💡', '🎯', '✅',
  '🤔', '👀', '✨', '💻', '🙌', '🌟', '⚠️', '😅'
];

const MessageItem = ({ message, currentUser, onEdit, onDelete, onReact, onReply, isConsecutive }) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [openBelow, setOpenBelow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const editRef = useRef(null);
  const emojiRef = useRef(null);
  const hoverRef = useRef(null);

  const handleEmojiClick = (e) => {
    e.stopPropagation();
    if (!showEmojiPicker) {
      const rect = e.currentTarget.getBoundingClientRect();
      // If the button is close to the top of the viewport (< 240px), open below the button
      if (rect.top < 240) {
        setOpenBelow(true);
      } else {
        setOpenBelow(false);
      }
    }
    setShowEmojiPicker((o) => !o);
  };

  const isOwn = currentUser && message.author?._id === currentUser._id;
  const isAdmin = currentUser?.role === 'admin';
  const isDeleted = message.isDeleted;

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus edit textarea
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editValue.length, editValue.length);
    }
  }, [editing]);

  const handleSaveEdit = async () => {
    if (!editValue.trim() || saving) return;
    setSaving(true);
    try {
      await onEdit(message._id, editValue.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditValue(message.content); }
  };

  // Group reactions
  const reactionMap = {};
  (message.reactions || []).forEach(({ emoji, users }) => {
    reactionMap[emoji] = { count: users.length, reacted: users.includes(currentUser?._id) };
  });

  // ── Render Deleted Message state ──
  if (isDeleted) {
    return (
      <div className="group relative flex gap-3 px-4 py-2 hover:bg-bg-hover rounded-lg transition-colors mt-1">
        {/* Simple deleted placeholder avatar */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-bg-secondary border border-border flex items-center justify-center text-xs text-text-faint select-none">
            ✕
          </div>
        </div>
        <div className="flex-1 min-w-0 flex items-center">
          <span className="text-sm text-text-faint italic select-none">Message deleted</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex gap-3 px-4 hover:bg-bg-hover rounded-lg transition-colors ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      } ${
        isConsecutive ? 'py-0.5' : 'py-2 mt-1.5'
      } ${
        showEmojiPicker ? 'z-40' : 'z-10'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
      ref={hoverRef}
    >
      {/* Avatar column (spacer if consecutive) */}
      <div className="flex-shrink-0 mt-0.5">
        {isConsecutive ? (
          <div className="w-8" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-xs font-bold text-accent-blue select-none">
            {message.author?.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'flex flex-col items-end' : ''}`}>
        {/* Header (hidden if consecutive) */}
        {!isConsecutive && (
          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-sm font-semibold text-text-primary">{message.author?.name || 'Unknown'}</span>
            {message.author?.role === 'admin' && (
              <span className="text-2xs font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-px rounded">Admin</span>
            )}
            <span className="text-2xs text-text-faint">
              {formatRelativeTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-2xs text-text-faint italic">(edited)</span>
            )}
          </div>
        )}

        {/* Reply preview */}
        {message.replyTo && !message.replyTo.isDeleted && (
          <div className={`mb-1.5 px-2.5 py-1.5 bg-bg-secondary border-l-2 border-border rounded-r text-xs text-text-muted max-w-sm ${isOwn ? 'text-right' : 'text-left'}`}>
            <span className="font-medium text-text-secondary">{message.replyTo.author?.name}: </span>
            <span className="text-text-faint">{message.replyTo.content?.slice(0, 80)}{message.replyTo.content?.length > 80 ? '…' : ''}</span>
          </div>
        )}

        {/* Message body */}
        {editing ? (
          <div className="mt-1 w-full max-w-md">
            <textarea
              ref={editRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-bg-secondary border border-accent-blue/40 rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent-blue"
              rows={3}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button onClick={handleSaveEdit} disabled={saving} className="btn btn-primary btn-sm py-1">
                <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setEditValue(message.content); }} className="btn btn-ghost btn-sm py-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <span className="text-2xs text-text-faint">Esc to cancel · Enter to save</span>
            </div>
          </div>
        ) : (
          <div className={`text-sm leading-relaxed text-text-secondary ${isOwn ? 'text-right' : 'text-left'}`}>
            <MentionRenderer content={message.content} />
          </div>
        )}

        {/* Reactions bar */}
        {Object.keys(reactionMap).length > 0 && (
          <div className={`flex items-center gap-1.5 mt-2 flex-wrap ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionMap).map(([emoji, { count, reacted }]) => (
              <button
                key={emoji}
                onClick={() => currentUser && onReact(message._id, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                  reacted
                    ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                    : 'bg-bg-secondary border-border text-text-muted hover:border-border-strong'
                } ${!currentUser ? 'cursor-default' : 'cursor-pointer hover:scale-105'}`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action toolbar (Left side for own messages, right side for others) */}
      {showActions && !editing && (
        <div className={`absolute top-1 flex items-center gap-0.5 bg-bg-card border border-border rounded-lg shadow-card-hover px-1 py-0.5 z-10 animate-fade-in ${
          isOwn ? 'left-3' : 'right-3'
        }`}>
          {/* Emoji */}
          <div className="relative" ref={emojiRef}>
            <button
              onClick={handleEmojiClick}
              className="btn-icon btn-ghost p-1.5"
              title="React"
              disabled={!currentUser}
            >
              <SmilePlus className="w-3.5 h-3.5" />
            </button>
            {showEmojiPicker && currentUser && (
              <div className={`absolute right-0 w-64 bg-bg-card border border-border rounded-xl shadow-card-hover p-3 z-[100] ${
                openBelow
                  ? 'top-full mt-2 animate-slide-down'
                  : 'bottom-full mb-2 animate-slide-up'
              }`}>
                <p className="text-[10px] text-text-faint font-semibold uppercase tracking-wider mb-2 px-1 text-left">Reactions</p>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJI_PICKER.map((e) => (
                    <button
                      key={e}
                      onClick={() => { onReact(message._id, e); setShowEmojiPicker(false); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary transition-all text-lg hover:scale-125 duration-100 cursor-pointer animate-fade-in"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply */}
          {currentUser && (
            <button onClick={() => onReply(message)} className="btn-icon btn-ghost p-1.5" title="Reply">
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit (own only) */}
          {isOwn && (
            <button onClick={() => setEditing(true)} className="btn-icon btn-ghost p-1.5" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Delete (own or admin) */}
          {(isOwn || isAdmin) && (
            <button onClick={() => onDelete(message._id)} className="btn-icon btn-danger p-1.5" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
