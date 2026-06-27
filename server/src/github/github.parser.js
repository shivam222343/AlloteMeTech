const csv = require('csv-parser');

class GithubParser {
  /**
   * Parse a CSV stream and return an array of normalized objects
   * @param {ReadStream} stream 
   */
  async parseCSV(stream) {
    return new Promise((resolve, reject) => {
      const results = [];
      stream
        .pipe(csv())
        .on('data', (data) => {
          // Normalize headers in case of BOM or case issues
          const normalizedData = {};
          for (const key in data) {
            normalizedData[key.trim().toLowerCase()] = data[key];
          }

          if (normalizedData.title && normalizedData.link) {
            results.push(this.normalizeRow(normalizedData));
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Normalizes a single CSV row
   */
  normalizeRow(row) {
    // Difficulty normalization
    let difficulty = 'Medium';
    const rawDiff = row.difficulty ? row.difficulty.trim().toLowerCase() : '';
    if (rawDiff === 'easy') difficulty = 'Easy';
    if (rawDiff === 'hard') difficulty = 'Hard';

    // Topic normalization
    let topics = [];
    if (row.topics) {
      topics = row.topics
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }
    // Remove duplicates
    topics = [...new Set(topics)];

    // Parse frequency and acceptance
    const frequency = parseFloat(row.frequency) || 0;
    const acceptanceRate = parseFloat(row['acceptance rate'] || row.acceptance || row.acceptancerate) || 0;

    return {
      title: row.title.trim(),
      slug: this.generateSlug(row.title),
      leetcodeUrl: row.link.trim(),
      difficulty,
      frequency,
      acceptanceRate,
      topics
    };
  }

  generateSlug(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')       // Replace spaces with -
      .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
      .replace(/\-\-+/g, '-');    // Replace multiple - with single -
  }

  generateLogoUrl(companyName) {
    // Generate Clearbit logo URL
    // For more robust, we might map specific ones, but this is a solid default
    const domain = `${companyName.trim().toLowerCase().replace(/\s+/g, '')}.com`;
    return `https://logo.clearbit.com/${domain}`;
  }

  mapFileNameToTimeRange(filename) {
    const name = filename.toLowerCase().replace('.csv', '');
    if (name.includes('thirty days') || name.includes('30 days')) return '30_DAYS';
    if (name.includes('three months') || name.includes('3 months')) return '3_MONTHS';
    if (name.includes('six months') || name.includes('6 months')) return '6_MONTHS';
    if (name.includes('more than six months') || name.includes('more than 6 months')) return 'MORE_THAN_6_MONTHS';
    return 'ALL';
  }
}

module.exports = new GithubParser();
