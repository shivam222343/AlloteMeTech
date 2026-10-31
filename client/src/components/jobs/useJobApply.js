import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { jobsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export function useJobApply() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['jobApplyStatus', user?._id],
    queryFn: async () => {
      if (!user) {
        return { hasReachedLimit: false, appliedCount: 0, dailyLimit: 5, remaining: 5, isPremium: false };
      }
      try {
        const res = await jobsApi.getApplyStatus();
        return res?.data?.data || { hasReachedLimit: false, appliedCount: 0, dailyLimit: 5, remaining: 5, isPremium: false };
      } catch (e) {
        return { hasReachedLimit: false, appliedCount: 0, dailyLimit: 5, remaining: 5, isPremium: false };
      }
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const status = data || {
    hasReachedLimit: false,
    appliedCount: 0,
    dailyLimit: 5,
    remaining: 5,
    isPremium: !!user?.isPremium,
  };

  const hasReachedLimit = !!status.hasReachedLimit;

  const handleApply = async (e, job) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Require login before applying
    if (!user) {
      toast('Please log in to apply for jobs', { icon: '🔐' });
      navigate('/login', {
        state: {
          from: { pathname: location.pathname, search: location.search }
        }
      });
      return;
    }

    if (hasReachedLimit) {
      window.dispatchEvent(new CustomEvent('open-premium-modal', {
        detail: {
          message: 'Daily limit reached (5/5). Free users can apply to 5 jobs daily. Upgrade to Premium for unlimited daily applications!'
        }
      }));
      toast('Daily limit reached (5/5). Upgrade to Premium for unlimited applications!', { icon: '🔒' });
      return;
    }

    const rawApplyLink = (job.applyLink || '').trim();
    const cleanApplyLink = (rawApplyLink && !rawApplyLink.toLowerCase().includes('hiredoor') && !rawApplyLink.startsWith('mailto:')) ? rawApplyLink : '';
    const cleanEmail = (job.applyEmail && !job.applyEmail.toLowerCase().includes('hiredoor') && !job.applyEmail.toLowerCase().includes('alloteme'))
      ? job.applyEmail.trim()
      : (rawApplyLink.startsWith('mailto:') && !rawApplyLink.toLowerCase().includes('hiredoor') ? rawApplyLink.replace(/^mailto:/i, '').split('?')[0].trim() : '');

    const link = cleanApplyLink || (cleanEmail ? `mailto:${cleanEmail}` : null);

    if (!link) {
      toast.error('No direct company application link or email available for this position');
      return;
    }

    try {
      const res = await jobsApi.trackApply(job._id);
      const updated = res?.data?.data;
      if (updated) {
        queryClient.setQueryData(['jobApplyStatus', user?._id], updated);
        if (updated.hasReachedLimit) {
          toast('You used your 5th daily application! Upgrade to Premium for unlimited applies.', { icon: '🔒' });
        }
      }
    } catch (err) {
      if (err.response?.status === 403) {
        queryClient.setQueryData(['jobApplyStatus', user?._id], (prev) => ({
          ...(prev || {}),
          hasReachedLimit: true,
          remaining: 0,
        }));
        window.dispatchEvent(new CustomEvent('open-premium-modal', {
          detail: {
            message: 'Daily limit reached (5/5). Free users can apply to 5 jobs daily. Upgrade to Premium for unlimited daily applications!'
          }
        }));
        return;
      }
    }

    if (link.startsWith('mailto:')) {
      window.location.href = link;
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return {
    user,
    status,
    hasReachedLimit,
    remaining: status.remaining,
    appliedCount: status.appliedCount,
    isPremium: !!status.isPremium,
    handleApply,
  };
}

