import { cn } from '../../utils/cn';

const DifficultyBadge = ({ difficulty }) => {
  const map = {
    Easy: 'badge-easy',
    Medium: 'badge-medium',
    Hard: 'badge-hard',
  };
  return <span className={cn('badge', map[difficulty] || 'badge-gray')}>{difficulty}</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    not_started: { label: 'Not Started', cls: 'badge-gray' },
    solved: { label: 'Solved', cls: 'badge-easy' },
    revision: { label: 'Revision', cls: 'badge bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20' },
    scheduled: { label: 'Scheduled', cls: 'badge-blue' },
    favorite: { label: 'Favorite', cls: 'badge bg-accent-red/10 text-accent-red border border-accent-red/20' },
  };
  const { label, cls } = map[status] || map.not_started;
  return <span className={cn('badge', cls)}>{label}</span>;
};

const TopicBadge = ({ name }) => (
  <span className="badge badge-gray text-2xs">{name}</span>
);

export { DifficultyBadge, StatusBadge, TopicBadge };
