import { useQuery } from '@tanstack/react-query';
import { progressApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';

const ContinueLearningRecommendation = () => {
  const { user } = useAuth();

  const { data: recData } = useQuery({
    queryKey: ['recommendation'],
    queryFn: () => progressApi.getRecommendation(),
    enabled: !!user,
  });

  const recommendation = recData?.data?.data?.recommendation;

  if (!recommendation) return null;

  const { company, solvedCount, totalCount, lastSolvedProblemTitle } = recommendation;

  // Curiosity-driven prompt options
  const curiosityPrompts = [
    `Curious to see what else ${company.name} asks in interviews and DSa rounds? You're ${solvedCount}/${totalCount} on their list. Let's keep moving!`,
    `Ready to ace ${company.name}'s coding rounds? You recently solved "${lastSolvedProblemTitle}". Keep the momentum going!`,
    `Keep learning! You solved a ${company.name} question recently. Can you tackle another one right now?`,
    `Unlock your potential! You've tackled ${solvedCount} questions for ${company.name}. Let's make it ${solvedCount + 1}!`,
  ];

  // Pick prompt deterministically based on solvedCount
  const prompt = curiosityPrompts[solvedCount % curiosityPrompts.length];

  return (
    <div className="relative overflow-hidden card border border-accent-purple/20 bg-gradient-to-r from-accent-blue/5 via-accent-purple/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in mb-6">
      <div className="flex items-start sm:items-center gap-3">
        {company.logo ? (
          <img
            src={company.logo}
            alt={company.name}
            className="w-10 h-10 rounded-xl object-contain border border-border bg-white p-1 flex-shrink-0"
            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${company.name[0]}&background=1F2937&color=9CA3AF&size=40`; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center flex-shrink-0 text-accent-purple">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs font-semibold uppercase tracking-wider text-accent-purple">Continue Learning</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
            <span className="text-2xs text-text-muted">{solvedCount} solved of {totalCount}</span>
          </div>
          <p className="text-xs sm:text-sm text-text-primary mt-1 font-medium leading-relaxed">
            {prompt}
          </p>
        </div>
      </div>
      <Link
        to={`/companies/${company.slug}`}
        className="inline-flex items-center gap-1 text-xs font-semibold px-4 py-2.5 rounded-xl bg-accent-purple text-bg-primary hover:opacity-90 active:scale-[0.98] transition-all w-fit shadow-sm flex-shrink-0"
      >
        Practice {company.name} <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};

export default ContinueLearningRecommendation;
