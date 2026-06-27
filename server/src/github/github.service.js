const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    console.log(`[GithubService] Request failed, retrying in ${delay}ms...`);
    await sleep(delay);
    return withRetry(fn, retries - 1, delay * 2);
  }
};

class GithubService {
  constructor() {
    this.owner = process.env.GITHUB_OWNER || 'liquidslr';
    this.repo = process.env.GITHUB_REPO || 'interview-company-wise-problems';
    this.branch = process.env.GITHUB_BRANCH || 'main';
    this.token = process.env.GITHUB_TOKEN;
    
    this.api = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 10000,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(this.token && { Authorization: `token ${this.token}` })
      }
    });
  }

  /**
   * Fetches the entire repository tree recursively.
   */
  async getRepoTree() {
    try {
      const response = await withRetry(() => this.api.get(`/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`));
      return response.data;
    } catch (error) {
      console.error('[GithubService] Error fetching repo tree:', error.response?.data || error.message);
      throw new Error('Failed to fetch GitHub repository tree');
    }
  }

  /**
   * Fetches the latest commit SHA for the branch.
   */
  async getLatestCommitSha() {
    try {
      const response = await withRetry(() => this.api.get(`/repos/${this.owner}/${this.repo}/commits/${this.branch}`));
      return response.data.sha;
    } catch (error) {
      console.error('[GithubService] Error fetching latest commit:', error.response?.data || error.message);
      throw new Error('Failed to fetch latest commit SHA');
    }
  }

  /**
   * Fetches a raw file content from GitHub using raw.githubusercontent.com
   * @param {string} pathToFile Path to the file in the repo
   * @returns {ReadStream} Node stream of the file content
   */
  async getFileStream(pathToFile) {
    // axios encodes the URL automatically, manual encoding causes double-encoding and 400 Bad Request
    const url = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${pathToFile}`;
    
    try {
      const response = await withRetry(() => axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 15000,
        headers: this.token ? { Authorization: `token ${this.token}` } : {}
      }), 3, 2000);
      return response.data;
    } catch (error) {
      console.error(`[GithubService] Error downloading file ${pathToFile}:`, error.message);
      throw new Error(`Failed to download file: ${pathToFile}`);
    }
  }
}

module.exports = new GithubService();
