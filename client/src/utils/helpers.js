export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatRelativeTime = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

export const difficultyColor = (d) =>
  ({ Easy: 'easy', Medium: 'medium', Hard: 'hard' }[d] || 'gray');

export const truncate = (str, n) =>
  str?.length > n ? `${str.slice(0, n)}...` : str;

export const slugify = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const getInitials = (name) =>
  name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

export const formatLastActive = (date) => {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 2 * 60 * 1000) return 'Online';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
