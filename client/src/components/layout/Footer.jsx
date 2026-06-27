import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';


const Footer = () => {
  const { isDark } = useTheme();
  return (
    <footer className="border-t border-border bg-bg-primary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="inline-block">
              <img
                src={isDark ? "/AlloteMe_Logos.png" : "/AlloteMe_Logos _Light.png"}
                alt="AlloteMe Tech"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-text-muted leading-relaxed">
              Company-wise coding interview preparation. Practice smarter, land offers faster.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="text-xs text-text-faint hover:text-text-muted transition-colors" aria-label="GitHub">
                GitHub
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                className="text-xs text-text-faint hover:text-text-muted transition-colors" aria-label="Twitter">
                Twitter
              </a>
            </div>
          </div>

          {/* Practice */}
          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Practice</h4>
            <ul className="space-y-2">
              {[['Companies', '/companies'], ['Topics', '/topics'], ['Dashboard', '/dashboard']].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-text-muted hover:text-text-primary transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coming Soon */}
          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Coming Soon</h4>
            <ul className="space-y-2">
              {['Premium Plans', 'Mock Interviews', 'Discussion Forum', 'Weekly Contests', 'AI Assistant'].map((label) => (
                <li key={label}>
                  <span className="text-sm text-text-faint">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors">
                  LeetCode <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-faint">
            © {new Date().getFullYear()} AlloteMe Tech. All rights reserved.
          </p>
          <p className="text-xs text-text-faint">
            Built for developers, by developers.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
