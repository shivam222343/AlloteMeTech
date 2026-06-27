import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, Building2, Tag, TrendingUp, Users, CheckCircle2, Zap, Target, BookOpen } from 'lucide-react';
import { companiesApi, topicsApi, publicApi } from '../api';
import Spinner from '../components/common/Spinner';
import { DifficultyBadge } from '../components/common/Badge';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.07 } }),
};

const FEATURES = [
  { icon: Building2, title: 'Company-Wise Problems', desc: 'Filter questions by top companies like Google, Meta, Amazon, and more.', color: 'text-accent-blue' },
  { icon: Tag, title: 'Topic-Wise Practice', desc: 'Drill down by data structures and algorithms — Arrays, DP, Graphs, Trees.', color: 'text-accent-purple' },
  { icon: TrendingUp, title: 'Track Progress', desc: 'Mark problems solved, schedule revisions, and monitor your streak.', color: 'text-accent-green' },
  { icon: Zap, title: 'Frequency Insights', desc: 'See how often each problem appears in real interviews at each company.', color: 'text-accent-yellow' },
];

const Landing = () => {
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'popular'],
    queryFn: () => companiesApi.getAll({ popular: true, limit: 8 }),
  });

  const { data: topicsData } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsApi.getAll(),
  });

  const { data: publicStatsData } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => publicApi.getStats(),
  });

  const companies = companiesData?.data?.data || [];
  const topics = topicsData?.data?.data?.topics || [];
  
  const stats = publicStatsData?.data?.data || { problems: 0, companies: 0, topics: 0, users: 0 };
  const dynamicStats = [
    { label: 'Problems', value: stats.problems || '—', icon: Code2 },
    { label: 'Companies', value: stats.companies || '—', icon: Building2 },
    { label: 'Topics', value: stats.topics || '—', icon: Tag },
    { label: 'Active Users', value: stats.users || '—', icon: Users },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-blue/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-blue border border-accent-blue/20 bg-accent-blue/5 px-3 py-1 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-pulse-slow" />
              Interview Prep Platform
            </span>
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-tight mb-5"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Crack interviews at<br />
            <span className="text-gradient">top tech companies</span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg text-text-muted max-w-xl mx-auto leading-relaxed mb-8"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Practice company-wise and topic-wise coding problems. Track your progress,
            schedule revisions, and prepare smarter.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Link to="/signup" className="btn btn-primary btn-lg w-full sm:w-auto">
              Start Practicing Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/companies" className="btn btn-secondary btn-lg w-full sm:w-auto">
              Browse Companies
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {dynamicStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <Icon className="w-4 h-4 text-accent-blue mb-1" />
                <span className="text-xl font-bold text-text-primary">{value}</span>
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Everything you need to prepare</h2>
          <p className="text-text-muted text-sm">A complete system to take you from 0 to offer.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              className="card p-5 space-y-3 hover:border-border-strong transition-colors"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Popular Companies ─────────────────────────────────────────── */}
      <section className="border-t border-border bg-bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Popular Companies</h2>
              <p className="text-sm text-text-muted mt-0.5">Practice problems asked at top companies</p>
            </div>
            <Link to="/companies" className="btn btn-ghost btn-sm hidden sm:flex">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {companies.length === 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {companies.map((c) => (
                <Link
                  key={c._id}
                  to={`/companies/${c.slug}`}
                  className="flex flex-col items-center gap-2 p-3 card-hover rounded-lg text-center group"
                >
                  {c.logo ? (
                    <img src={c.logo} alt={c.name} className="w-8 h-8 object-contain rounded bg-white p-1" onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${c.name}&background=1F2937&color=9CA3AF&size=32`; }} />
                  ) : (
                    <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center text-xs font-medium text-text-muted">
                      {c.name[0]}
                    </div>
                  )}
                  <span className="text-2xs text-text-muted group-hover:text-text-primary transition-colors truncate w-full">{c.name}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-4 text-center sm:hidden">
            <Link to="/companies" className="btn btn-ghost btn-sm">View all companies</Link>
          </div>
        </div>
      </section>

      {/* ── Popular Topics ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Popular Topics</h2>
            <p className="text-sm text-text-muted mt-0.5">Master the patterns that appear most</p>
          </div>
          <Link to="/topics" className="btn btn-ghost btn-sm hidden sm:flex">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {topics.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-20 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 14).map((t) => (
              <Link
                key={t._id}
                to={`/topics/${t.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border bg-bg-card hover:border-border-strong hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
              >
                {t.name}
                <span className="text-2xs text-text-faint">{t.problemCount}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-bg-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
          <Target className="w-8 h-8 text-accent-blue mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-3">Ready to land your dream job?</h2>
          <p className="text-text-muted text-sm mb-6">Join thousands of developers preparing for tech interviews.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn btn-primary btn-lg">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/companies" className="btn btn-secondary btn-lg">
              Explore Problems
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
