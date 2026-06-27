import { useState, useRef, useEffect, useCallback } from 'react';
import { discussionApi } from '../../api';
import { Send, Building2, Code2 } from 'lucide-react';
import MentionRenderer from './MentionRenderer';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const MessageInput = ({ onSend, replyTo, onCancelReply, disabled }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  
  // Track selected mentions to replace on submission
  const [selectedMentions, setSelectedMentions] = useState([]);
  
  const textareaRef = useRef(null);
  const debounceRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  // Clean up typing status on unmount
  useEffect(() => {
    return () => {
      if (socket && isTyping) {
        socket.emit('discussion:typing:stop');
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, isTyping]);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);

    // Typing socket updates
    if (socket && user) {
      if (!isTyping && val.trim().length > 0) {
        setIsTyping(true);
        socket.emit('discussion:typing:start', { userId: user._id, name: user.name });
      } else if (val.trim().length === 0 && isTyping) {
        setIsTyping(false);
        socket.emit('discussion:typing:stop');
      }

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('discussion:typing:stop');
      }, 2000);
    }

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      const q = atMatch[1];
      setMentionStart(cursor - atMatch[0].length);
      setMentionQuery(q);
      setMentionOpen(true);

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await discussionApi.searchMentions(q);
          setMentionResults(res.data.data.results || []);
        } catch {
          setMentionResults([]);
        }
      }, 200);
    } else {
      setMentionOpen(false);
      setMentionResults([]);
    }
  };

  const insertMention = useCallback((item) => {
    const cursorPos = textareaRef.current?.selectionStart || mentionStart;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    
    // Show clean representation in textarea (e.g. @Tcs)
    const cleanLabel = `@${item.label}`;
    const token = `@[${item.type}:${item.slug} "${item.label}"]`;
    
    // Save mapping to replace when sending
    setSelectedMentions((prev) => [...prev, { label: item.label, token }]);

    const newVal = before + cleanLabel + ' ' + after;
    setValue(newVal);
    setMentionOpen(false);
    setMentionResults([]);
    
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = before.length + cleanLabel.length + 1;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [value, mentionStart]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setMentionOpen(false); return; }
    if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!value.trim() || sending || disabled) return;
    setSending(true);
    
    // Stop typing status on send
    if (socket && user) {
      setIsTyping(false);
      clearTimeout(typingTimeoutRef.current);
      socket.emit('discussion:typing:stop');
    }

    // Map clean "@Label" back to DB-friendly tokens before sending
    let processedContent = value.trim();
    selectedMentions.forEach(({ label, token }) => {
      const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Matches @Label followed by whitespace, punctuation, or end of string
      const regex = new RegExp(`@${escapedLabel}(?=\\s|[.,!?;:]|$)`, 'g');
      processedContent = processedContent.replace(regex, token);
    });

    try {
      await onSend({ content: processedContent, replyTo: replyTo?._id || null });
      setValue('');
      setSelectedMentions([]);
      if (onCancelReply) onCancelReply();
    } finally {
      setSending(false);
    }
  };

  const renderReplyContent = (content) => {
    if (!content) return '';
    return content.replace(/@\[(\w+):([^\s\]"]+)(?:\s+"([^"]*)")?\]/g, (_, __, ___, label) => `@${label || __}`);
  };

  return (
    <div className="relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg border-l-2 border-accent-blue bg-bg-secondary">
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-semibold text-accent-blue mb-0.5">
              Replying to {replyTo.author?.name}
            </p>
            <p className="text-xs text-text-muted truncate">
              {renderReplyContent(replyTo.content)}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 text-text-faint hover:text-text-primary transition-colors text-sm leading-none mt-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* @Mention Dropdown */}
      {mentionOpen && mentionResults.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-bg-card border border-border rounded-xl shadow-card-hover overflow-hidden z-30">
          <div className="px-3 py-2 border-b border-border bg-bg-secondary">
            <p className="text-2xs text-text-faint uppercase tracking-wider font-medium">
              Mention a company or problem
            </p>
          </div>
          <ul className="max-h-48 overflow-y-auto admin-scroll">
            {mentionResults.map((item, i) => (
              <li key={i}>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-secondary transition-colors text-left"
                  onMouseDown={(e) => { e.preventDefault(); insertMention(item); }}
                >
                  {item.type === 'company' ? (
                    item.logo
                      ? <img src={item.logo} alt="" className="w-6 h-6 object-contain rounded bg-white p-0.5 flex-shrink-0 border border-border" />
                      : <div className="w-6 h-6 rounded bg-bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary flex-shrink-0">
                          {item.label?.[0]?.toUpperCase()}
                        </div>
                  ) : (
                    <div className="w-6 h-6 rounded bg-accent-purple flex items-center justify-center flex-shrink-0">
                      <Code2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary truncate font-medium">{item.label}</p>
                    <p className="text-2xs text-text-faint capitalize">
                      {item.type}
                      {item.difficulty ? ` · ${item.difficulty}` : ''}
                    </p>
                  </div>
                  <span className="text-2xs text-text-faint bg-bg-secondary px-1.5 py-0.5 rounded border border-border flex-shrink-0">
                    {item.type === 'company' ? '🏢' : '💻'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <div className="bg-bg-secondary border border-border rounded-xl focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue transition-all">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || sending}
              placeholder={
                disabled
                  ? 'Sign in to join the discussion…'
                  : 'Write a message… (@ to mention · Enter to send · Shift+Enter for newline)'
              }
              rows={1}
              className="w-full bg-transparent px-4 py-3 text-sm text-text-primary placeholder-text-faint resize-none focus:outline-none disabled:cursor-not-allowed leading-relaxed font-sans"
              style={{ maxHeight: '160px' }}
            />

            {/* Bottom bar: hint + char count */}
            <div className="flex items-center justify-between px-4 pb-2">
              <p className="text-2xs text-text-faint">
                <kbd className="px-1 py-0.5 bg-bg-hover rounded text-2xs border border-border font-mono">@</kbd>
                {' '}mention &nbsp;·&nbsp;
                <kbd className="px-1 py-0.5 bg-bg-hover rounded text-2xs border border-border font-mono">↵</kbd>
                {' '}send
              </p>
              {value.length > 1800 && (
                <p className={`text-2xs ${value.length > 2000 ? 'text-accent-red font-semibold' : 'text-text-faint'}`}>
                  {value.length}/2000
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!value.trim() || sending || disabled || value.length > 2000}
          className="btn btn-primary p-3 rounded-xl disabled:opacity-40 flex-shrink-0 self-end"
          aria-label="Send"
        >
          {sending
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
