const cron = require('node-cron');
const githubService = require('./github.service');
const githubSync = require('./github.sync');
const fs = require('fs');
const path = require('path');

class GithubScheduler {
  constructor() {
    this.cronSchedule = process.env.CRON_SCHEDULE || '0 2 * * *';
    this.logFile = path.join(__dirname, '..', '..', 'logs', 'sync_status.json');
    this.ensureLogDir();
  }

  ensureLogDir() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, JSON.stringify({ lastSha: null, lastSync: null }), 'utf8');
    }
  }

  getSyncStatus() {
    try {
      return JSON.parse(fs.readFileSync(this.logFile, 'utf8'));
    } catch (err) {
      return { lastSha: null, lastSync: null };
    }
  }

  saveSyncStatus(status) {
    fs.writeFileSync(this.logFile, JSON.stringify(status, null, 2), 'utf8');
  }

  init() {
    console.log(`[GithubScheduler] Initializing cron job with schedule: ${this.cronSchedule}`);
    cron.schedule(this.cronSchedule, async () => {
      console.log('[GithubScheduler] Cron job triggered.');
      await this.runScheduledSync();
    });
  }

  async runScheduledSync() {
    try {
      const latestSha = await githubService.getLatestCommitSha();
      const status = this.getSyncStatus();

      if (status.lastSha === latestSha) {
        console.log('[GithubScheduler] No new commits found. Skipping sync.');
        return { skipped: true, reason: 'SHA unchanged' };
      }

      console.log(`[GithubScheduler] New commit found (${latestSha}). Starting sync...`);
      const result = await githubSync.runSync();

      this.saveSyncStatus({
        lastSha: latestSha,
        lastSync: new Date().toISOString(),
        lastResult: result
      });

      return result;
    } catch (error) {
      console.error('[GithubScheduler] Error during scheduled sync:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GithubScheduler();
