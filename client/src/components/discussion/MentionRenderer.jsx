import { Link } from 'react-router-dom';

/**
 * Parses message content and renders @[type:slug "Label"] tokens as clickable links.
 * Format stored in DB: @[company:google "Google"] or @[problem:two-sum "Two Sum"]
 * Plain text between tokens is rendered as-is.
 */
const TOKEN_RE = /@\[(\w+):([^\s\]"]+)(?:\s+"([^"]*)")?\]/g;

const MentionRenderer = ({ content }) => {
  if (!content) return null;

  const parts = [];
  let lastIndex = 0;
  let match;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(content)) !== null) {
    const [fullMatch, type, slug, label] = match;
    const before = content.slice(lastIndex, match.index);
    if (before) parts.push(<span key={`t-${lastIndex}`}>{before}</span>);

    const displayLabel = label || slug;
    const isCompany = type === 'company';
    const colorClass = isCompany ? 'text-accent-blue' : 'text-accent-purple';

    if (isCompany) {
      parts.push(
        <Link
          key={`m-${match.index}`}
          to={`/companies/${slug}`}
          className={`${colorClass} font-medium hover:underline`}
          onClick={(e) => e.stopPropagation()}
        >
          @{displayLabel}
        </Link>
      );
    } else {
      parts.push(
        <a
          key={`m-${match.index}`}
          href={`https://leetcode.com/problems/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${colorClass} font-medium hover:underline`}
          onClick={(e) => e.stopPropagation()}
        >
          @{displayLabel}
        </a>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  const tail = content.slice(lastIndex);
  if (tail) parts.push(<span key="tail">{tail}</span>);

  return <span className="whitespace-pre-wrap break-words">{parts}</span>;
};

export default MentionRenderer;
