import React from 'react';

/**
 * Official WhatsApp Green Color: #25D366
 */
export function WhatsAppIcon({ className = 'w-4 h-4', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.15C8.87 7.15 8.58 7.22 8.33 7.49C8.08 7.76 7.37 8.43 7.37 9.78C7.37 11.14 8.36 12.44 8.5 12.63C8.64 12.82 10.45 15.61 13.21 16.81C15.52 17.81 16 17.61 16.5 17.56C17 17.51 18.11 16.9 18.34 16.25C18.57 15.6 18.57 15.05 18.5 14.94C18.43 14.83 18.25 14.76 17.98 14.62C17.7 14.49 16.35 13.82 16.1 13.73C15.85 13.64 15.67 13.59 15.49 13.87C15.31 14.15 14.79 14.76 14.63 14.94C14.47 15.13 14.31 15.15 14.04 15.01C13.77 14.88 12.89 14.59 11.85 13.66C11.04 12.94 10.49 12.05 10.33 11.78C10.17 11.51 10.31 11.36 10.45 11.22C10.57 11.1 10.72 10.9 10.86 10.74C11 10.58 11.05 10.46 11.14 10.28C11.23 10.1 11.19 9.94 11.12 9.8C11.05 9.67 10.51 8.33 10.28 7.79C10.06 7.26 9.84 7.33 9.67 7.32C9.52 7.31 9.34 7.31 9.16 7.31L9.05 7.15Z" />
    </svg>
  );
}

export function capitalizeWords(str) {
  if (!str) return 'Company';
  return str
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format single job into structured WhatsApp message:
 * 
 * Company Name | Job Title
 * 
 * Type: Internship
 * Work Mode: On-site
 * Eligibility: Batches 2025–2027
 * Package/Stipend: ₹30,000/month
 * Location: Hyderabad
 * Apply: https://...
 */
export function formatJobForWhatsApp(job, index = null, options = {}) {
  const isUserShare = typeof options === 'boolean' ? options : !!options?.isUserShare;
  const rawCompany = job.companyName || job.company?.name || job.companyTag || 'Company';
  const company = capitalizeWords(rawCompany);
  const prefix = index !== null ? `${index}. ` : '';
  const titleLine = `${prefix}${company} | ${job.title}`;

  let eligibility = '';
  if (job.eligibleBatch) {
    eligibility = /batch/i.test(job.eligibleBatch) ? job.eligibleBatch : `Batches ${job.eligibleBatch}`;
  } else if (job.experience) {
    eligibility = job.experience;
  } else {
    eligibility = 'Any Graduate';
  }

  const packageStipend = job.salary || 'Best in Industry';
  const location = job.location || (job.workMode === 'Remote' ? 'Remote' : 'India');

  let apply = '';
  if (isUserShare) {
    // For user job tab sharing: show the techalloteme job card link
    apply = `https://tech.alloteme.online/jobs/${job.slug || ''}`;
  } else {
    // For admin sharing: direct company apply link / company email / contact phone (NEVER hiredoor)
    const rawLink = (job.applyLink || '').trim();
    const isDirectCompany = rawLink && !rawLink.toLowerCase().includes('hiredoor') && !rawLink.startsWith('mailto:');
    apply = isDirectCompany ? rawLink : '';
    if (!apply && job.applyEmail && !job.applyEmail.toLowerCase().includes('hiredoor') && !job.applyEmail.toLowerCase().includes('alloteme')) {
      apply = job.applyEmail;
    }
    if (!apply && job.contactPhone) {
      apply = `Contact: ${job.contactPhone}`;
    }
    if (!apply) {
      apply = `https://tech.alloteme.online/jobs/${job.slug || ''}`;
    }
  }

  return `${titleLine}

Type: ${job.jobType || 'Full-time'}
Work Mode: ${job.workMode || 'Remote'}
Eligibility: ${eligibility}
Package/Stipend: ${packageStipend}
Location: ${location}
Apply: ${apply}`;
}

/**
 * Format multiple jobs for WhatsApp with numbering (1., 2., ...) and clean separators
 */
export function formatMultipleJobsForWhatsApp(jobs) {
  return jobs
    .map((job, idx) => formatJobForWhatsApp(job, idx + 1))
    .join('\n\n───────────────────────────────\n\n');
}

/**
 * Format timestamp into exact humanized time ago string:
 * 1m, 1hr, 1day, 2 day, 1 week, 1 month, 1 year
 */
export function formatTimeAgo(date) {
  if (!date) return '1m';

  if (typeof date === 'string') {
    const trimmed = date.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)\s*([a-z]+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const unit = match[2];
      if (unit.startsWith('m') && !unit.startsWith('mo')) return `${num}m`;
      if (unit.startsWith('h')) return `${num}hr`;
      if (unit.startsWith('d')) return num === 1 ? '1 day' : `${num} day`;
      if (unit.startsWith('w')) return num === 1 ? '1 week' : `${num} week`;
      if (unit.startsWith('mo')) return num === 1 ? '1 month' : `${num} month`;
      if (unit.startsWith('y')) return num === 1 ? '1 year' : `${num} year`;
    }
  }

  const timestamp = new Date(date).getTime();
  if (isNaN(timestamp)) return '1m';

  const diff = Date.now() - timestamp;
  if (diff < 0) return '1m';

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  if (diff < hourMs) {
    const mins = Math.max(1, Math.floor(diff / minuteMs));
    return `${mins}m`;
  }
  if (diff < dayMs) {
    const hours = Math.floor(diff / hourMs);
    return `${hours}hr`;
  }
  if (diff < weekMs) {
    const days = Math.floor(diff / dayMs);
    return days === 1 ? '1 day' : `${days} day`;
  }
  if (diff < monthMs) {
    const weeks = Math.max(1, Math.floor(diff / weekMs));
    return weeks === 1 ? '1 week' : `${weeks} week`;
  }
  if (diff < yearMs) {
    const months = Math.max(1, Math.floor(diff / monthMs));
    return months === 1 ? '1 month' : `${months} month`;
  }
  const years = Math.max(1, Math.floor(diff / yearMs));
  return years === 1 ? '1 year' : `${years} year`;
}

/**
 * Opens WhatsApp send URL
 */
export function shareOnWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

