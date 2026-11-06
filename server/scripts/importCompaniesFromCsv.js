const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../src/models/Company');

// Helper to format clean company display name from slug/token
function formatCompanyName(raw) {
  if (!raw) return 'Company';
  // Replace underscores, dashes with spaces
  let clean = raw.trim().replace(/[-_]+/g, ' ');
  // Insert spaces before capital letters in camelCase (e.g. AaveLabs -> Aave Labs)
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Title Case words
  return clean
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      // Keep acronyms like IBM, 3M, AWS, AB, S&P, etc.
      if (word.length <= 3 && !/[aeiou]/i.test(word)) return word.toUpperCase();
      if (/^[0-9]+[a-z]+$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

async function importCompanies(csvFilePath) {
  const targetPath = csvFilePath || path.join(__dirname, '..', 'JobData', 'job-board-directory.csv');
  if (!fs.existsSync(targetPath)) {
    throw new Error(`CSV file not found at ${targetPath}`);
  }

  console.log(`[Import] Starting import from: ${targetPath}`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('[Import] Connected to MongoDB.');

  const fileStream = fs.createReadStream(targetPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let lineCount = 0;
  let batch = [];
  let totalUpserted = 0;
  const BATCH_SIZE = 500;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (!line.trim()) continue;

    lineCount++;
    // CSV format: platform,token,company,board_url,api_url,open_roles,count_basis,region
    // Note: Some URLs or company names might have commas or special characters, so parse carefully
    const parts = line.split(',');
    if (parts.length < 5) continue;

    const platform = (parts[0] || '').trim().toLowerCase();
    const token = (parts[1] || '').trim();
    const rawCompany = (parts[2] || '').trim();
    const boardUrl = (parts[3] || '').trim();
    const apiUrl = (parts[4] || '').trim();
    const openRoles = parseInt(parts[5], 10) || 0;
    const region = (parts[7] || '').trim();

    if (!rawCompany) continue;

    const cleanSlug = rawCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = formatCompanyName(rawCompany);

    batch.push({
      updateOne: {
        filter: { slug: cleanSlug },
        update: {
          $setOnInsert: {
            name: cleanName,
            slug: cleanSlug,
            logo: null,
            description: '',
            isEnabled: true,
            isPopular: false,
            hasWhiteBg: false,
            website: boardUrl ? new URL(boardUrl).origin : '',
            industry: '',
          },
          $set: {
            platform,
            token,
            boardUrl,
            apiUrl,
            openRoles,
            region,
          },
        },
        upsert: true,
      },
    });

    if (batch.length >= BATCH_SIZE) {
      const res = await Company.bulkWrite(batch, { ordered: false });
      totalUpserted += (res.upsertedCount || 0) + (res.modifiedCount || 0);
      console.log(`[Import] Processed ${lineCount} rows (upserted/updated: ${totalUpserted})...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const res = await Company.bulkWrite(batch, { ordered: false });
    totalUpserted += (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }

  const finalTotal = await Company.countDocuments();
  console.log(`[Import] Finished! Total rows in CSV: ${lineCount}. Total companies now in DB: ${finalTotal}`);

  return { totalCsvRows: lineCount, finalTotal };
}

if (require.main === module) {
  importCompanies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Import Error]:', err);
      process.exit(1);
    });
}

module.exports = importCompanies;
