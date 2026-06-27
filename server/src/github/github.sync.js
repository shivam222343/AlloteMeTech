const githubService = require('./github.service');
const githubParser = require('./github.parser');
const Company = require('../models/Company');
const Topic = require('../models/Topic');
const Problem = require('../models/Problem');
const CompanyProblem = require('../models/CompanyProblem');

class GithubSync {
  async runSync() {
    const startTime = Date.now();
    const stats = {
      companiesCreated: 0,
      companiesUpdated: 0,
      problemsCreated: 0,
      problemsUpdated: 0,
      topicsCreated: 0,
      mappingsCreated: 0,
      errors: []
    };

    try {
      console.log('[GithubSync] Starting sync...');
      const treeData = await githubService.getRepoTree();
      
      // Filter out root directories that represent companies (ignore hidden files/folders)
      const companyFolders = treeData.tree.filter(node => node.type === 'tree' && !node.path.startsWith('.'));
      
      // Pre-fetch all topics to minimize DB queries
      const existingTopics = await Topic.find({});
      const topicMap = new Map(existingTopics.map(t => [t.slug, t]));

      let count = 0;
      for (const folder of companyFolders) {
        count++;
        console.log(`[GithubSync] Processing company ${folder.path} (${count}/${companyFolders.length})`);
        try {
          await this.processCompany(folder.path, treeData.tree, topicMap, stats);
        } catch (err) {
          console.error(`[GithubSync] Error processing company ${folder.path}:`, err.message);
          stats.errors.push(`Company ${folder.path}: ${err.message}`);
        }
      }

      stats.duration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';
      console.log(`[GithubSync] Sync completed in ${stats.duration}`);
      
      console.log('[GithubSync] Updating totalQuestions count for all companies...');
      const Company = require('../models/Company');
      const CompanyProblem = require('../models/CompanyProblem');
      const companies = await Company.find({});
      for (const c of companies) {
        const uniqueProblems = await CompanyProblem.distinct('problem', { company: c._id });
        c.totalQuestions = uniqueProblems.length;
        await c.save();
      }
      
      console.log('[GithubSync] Updating problemCount for all topics...');
      const Topic = require('../models/Topic');
      const Problem = require('../models/Problem');
      const allTopics = await Topic.find({});
      for (const t of allTopics) {
        t.problemCount = await Problem.countDocuments({ topics: t._id, isActive: true });
        await t.save();
      }
      
      console.log('[GithubSync] Counts updated successfully.');

      return { success: true, ...stats };
    } catch (error) {
      console.error('[GithubSync] Critical sync error:', error);
      return { success: false, error: error.message, ...stats };
    }
  }

  async processCompany(folderName, fullTree, topicMap, stats) {
    const companySlug = githubParser.generateSlug(folderName);
    
    // Find or create Company
    let company = await Company.findOne({ slug: companySlug });
    if (!company) {
      company = await Company.create({
        name: folderName.charAt(0).toUpperCase() + folderName.slice(1),
        slug: companySlug,
        githubFolder: folderName,
        logo: null
      });
      stats.companiesCreated++;
    } else {
      stats.companiesUpdated++;
    }

    // Find all CSV files in this company's folder
    const csvFiles = fullTree.filter(node => 
      node.type === 'blob' && 
      node.path.startsWith(`${folderName}/`) && 
      node.path.endsWith('.csv')
    );

    for (const csvFile of csvFiles) {
      const timeRange = githubParser.mapFileNameToTimeRange(csvFile.path.split('/').pop());
      const stream = await githubService.getFileStream(csvFile.path);
      const parsedRows = await githubParser.parseCSV(stream);
      
      await this.processRows(parsedRows, company, timeRange, topicMap, stats);
    }
    
    // Update company's totalQuestions based on unique problems mapped to it
    const uniqueProblemsCount = await CompanyProblem.distinct('problem', { company: company._id }).then(res => res.length);
    await Company.findByIdAndUpdate(company._id, { totalQuestions: uniqueProblemsCount });
  }

  async processRows(rows, company, timeRange, topicMap, stats) {
    // Process in batches if necessary, but we can do sequentially for stability
    for (const row of rows) {
      // Handle Topics
      const topicIds = [];
      for (const topicName of row.topics) {
        const topicSlug = githubParser.generateSlug(topicName);
        if (!topicMap.has(topicSlug)) {
          const newTopic = await Topic.create({ name: topicName, slug: topicSlug });
          topicMap.set(topicSlug, newTopic);
          stats.topicsCreated++;
        }
        topicIds.push(topicMap.get(topicSlug)._id);
      }

      // Handle Problem
      let problem = await Problem.findOne({ 
        $or: [
          { leetcodeUrl: row.leetcodeUrl },
          { slug: row.slug }
        ]
      });

      if (!problem) {
        problem = await Problem.create({
          title: row.title,
          slug: row.slug,
          leetcodeUrl: row.leetcodeUrl,
          difficulty: row.difficulty,
          frequency: row.frequency,
          acceptanceRate: row.acceptanceRate,
          topics: topicIds
        });
        stats.problemsCreated++;
      } else {
        // Update problem frequency/acceptance if needed
        problem.frequency = Math.max(problem.frequency, row.frequency);
        problem.acceptanceRate = row.acceptanceRate > 0 ? row.acceptanceRate : problem.acceptanceRate;
        
        // Merge topics
        const existingTopicIds = problem.topics.map(t => t.toString());
        const newTopicIds = topicIds.filter(id => !existingTopicIds.includes(id.toString()));
        if (newTopicIds.length > 0) {
          problem.topics.push(...newTopicIds);
        }
        await problem.save();
        stats.problemsUpdated++;
      }

      // Handle CompanyProblem Mapping
      const existingMapping = await CompanyProblem.findOne({
        company: company._id,
        problem: problem._id,
        timeRange: timeRange
      });

      if (!existingMapping) {
        await CompanyProblem.create({
          company: company._id,
          problem: problem._id,
          timeRange: timeRange,
          frequency: row.frequency
        });
        stats.mappingsCreated++;
      } else {
        existingMapping.frequency = row.frequency;
        existingMapping.lastSeenAt = Date.now();
        await existingMapping.save();
      }
    }
  }
}

module.exports = new GithubSync();
