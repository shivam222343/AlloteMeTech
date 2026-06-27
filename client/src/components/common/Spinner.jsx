import { cn } from '../../utils/cn';

const sizeMap = {
  sm: 'w-4 h-4 border-[2px]',
  md: 'w-6 h-6 border-[2.5px]',
  lg: 'w-10 h-10 border-[3px]',
  xl: 'w-16 h-16 border-[4px]',
};

const Spinner = ({ size = 'md', className }) => (
  <span
    className={cn(
      'inline-block rounded-full border-border border-t-accent-blue animate-spin',
      sizeMap[size],
      className
    )}
    role="status"
    aria-label="Loading"
  />
);

export default Spinner;
