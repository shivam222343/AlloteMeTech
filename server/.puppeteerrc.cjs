const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Ensure Chrome is installed and cached inside the project directory
  // so Render persists it across build and runtime environments.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
