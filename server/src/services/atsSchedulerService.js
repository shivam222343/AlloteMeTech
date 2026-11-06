const cron = require('node-cron');
const JobSettings = require('../models/JobSettings');
const Company = require('../models/Company');
const { globalSyncCompanies } = require('./atsScraperService');

let activeCronTask = null;
let isCurrentlyRunning = false;

/**
 * Convert HH:mm (24-hour time string) to a standard cron expression.
 * E.g., "02:30" => "30 2 * * *"
 */
function timeToCronExpression(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return '0 2 * * *'; // fallback: 2:00 AM daily
  }
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return `${minutes} ${hours} * * *`;
}

/**
 * Executes the auto-sync job for all companies flagged with isAutoSync = true.
 */
async function runAutoSyncNow() {
  if (isCurrentlyRunning) {
    console.log('[ATS Scheduler] Auto-sync is already in progress, skipping trigger.');
    return { status: 'already_running' };
  }

  isCurrentlyRunning = true;
  console.log('[ATS Scheduler] Starting automated daily ATS sync...');

  try {
    let settings = await JobSettings.findOne();
    if (!settings) {
      settings = await JobSettings.create({});
    }

    // Find all companies marked for auto-sync
    const autoSyncCompanies = await Company.find({ isAutoSync: true }).select('_id name platform');
    console.log(`[ATS Scheduler] Found ${autoSyncCompanies.length} companies enabled for auto-sync.`);

    if (autoSyncCompanies.length === 0) {
      console.log('[ATS Scheduler] No companies currently have isAutoSync=true enabled. Skipping.');
      isCurrentlyRunning = false;
      return { status: 'no_companies', message: 'No companies selected for auto-sync.' };
    }

    const companyIds = autoSyncCompanies.map((c) => c._id);
    const filterOptions = {
      postedWithinDays: settings.autoSyncFilterPostedWithinDays || 2,
      experienceFilter: settings.autoSyncFilterExperience || 'all',
      categoryFilter: settings.autoSyncFilterCategory || 'all',
    };

    console.log('[ATS Scheduler] Running sync with filters:', filterOptions);

    const result = await globalSyncCompanies(companyIds, filterOptions, (progress) => {
      if (progress.index % 10 === 0 || progress.index === autoSyncCompanies.length) {
        console.log(`[ATS Scheduler] Progress: ${progress.index}/${progress.total} (${progress.companyName})`);
      }
    });

    // Update settings with last run metrics
    settings.lastAutoSyncAt = new Date();
    settings.lastAutoSyncResult = {
      companiesProcessed: result.processedCount,
      jobsAdded: result.totalSaved,
      duplicatesSkipped: result.totalDuplicates,
      errorsCount: result.totalErrors,
      completedAt: new Date(),
    };
    await settings.save();

    console.log(
      `[ATS Scheduler] Daily sync completed: ${result.totalSaved} jobs added, ${result.totalDuplicates} duplicates skipped, ${result.totalErrors} errors.`
    );

    return { status: 'success', result };
  } catch (err) {
    console.error('[ATS Scheduler] Error during auto-sync execution:', err);
    return { status: 'error', error: err.message };
  } finally {
    isCurrentlyRunning = false;
  }
}

/**
 * Initializes the cron job on server start based on JobSettings.
 */
async function initAtsScheduler() {
  try {
    let settings = await JobSettings.findOne();
    if (!settings) {
      settings = await JobSettings.create({
        autoSyncScheduleTime: '02:00',
        autoSyncEnabled: true,
      });
    }

    if (!settings.autoSyncEnabled) {
      console.log('[ATS Scheduler] Daily auto-sync is disabled in settings.');
      return;
    }

    const cronExpr = timeToCronExpression(settings.autoSyncScheduleTime);
    console.log(
      `[ATS Scheduler] Scheduling daily auto-sync at ${settings.autoSyncScheduleTime} (cron: "${cronExpr}")`
    );

    if (activeCronTask) {
      activeCronTask.stop();
    }

    activeCronTask = cron.schedule(cronExpr, () => {
      console.log('[ATS Scheduler] Cron triggered at scheduled time.');
      runAutoSyncNow().catch((err) =>
        console.error('[ATS Scheduler] Cron task error:', err)
      );
    });
  } catch (err) {
    console.error('[ATS Scheduler] Failed to initialize scheduler:', err);
  }
}

/**
 * Reschedule the cron job dynamically when admin updates time or toggle in UI.
 */
async function rescheduleDailySync(newTime, enabled = true) {
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }

  if (!enabled) {
    console.log('[ATS Scheduler] Auto-sync disabled.');
    return;
  }

  const cronExpr = timeToCronExpression(newTime);
  console.log(`[ATS Scheduler] Rescheduled to ${newTime} (cron: "${cronExpr}")`);

  activeCronTask = cron.schedule(cronExpr, () => {
    runAutoSyncNow().catch((err) =>
      console.error('[ATS Scheduler] Cron task error:', err)
    );
  });
}

module.exports = {
  initAtsScheduler,
  rescheduleDailySync,
  runAutoSyncNow,
};
