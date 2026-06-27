require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./src/models/Company');
const Topic = require('./src/models/Topic');
const Problem = require('./src/models/Problem');
const User = require('./src/models/User');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[SEED] Connected to MongoDB');
};

// ─── Topics Data ──────────────────────────────────────────────────────────────
const topicsData = [
  { name: 'Array', slug: 'array', color: '#3B82F6' },
  { name: 'Dynamic Programming', slug: 'dynamic-programming', color: '#8B5CF6' },
  { name: 'Graph', slug: 'graph', color: '#10B981' },
  { name: 'Tree', slug: 'tree', color: '#22C55E' },
  { name: 'Binary Search', slug: 'binary-search', color: '#F59E0B' },
  { name: 'Trie', slug: 'trie', color: '#EF4444' },
  { name: 'Heap', slug: 'heap', color: '#EC4899' },
  { name: 'Greedy', slug: 'greedy', color: '#14B8A6' },
  { name: 'Math', slug: 'math', color: '#6366F1' },
  { name: 'Backtracking', slug: 'backtracking', color: '#F97316' },
  { name: 'Sliding Window', slug: 'sliding-window', color: '#06B6D4' },
  { name: 'Union Find', slug: 'union-find', color: '#84CC16' },
  { name: 'Linked List', slug: 'linked-list', color: '#D946EF' },
  { name: 'DFS', slug: 'dfs', color: '#0EA5E9' },
  { name: 'BFS', slug: 'bfs', color: '#F59E0B' },
  { name: 'Recursion', slug: 'recursion', color: '#64748B' },
  { name: 'HashMap', slug: 'hashmap', color: '#3B82F6' },
  { name: 'Stack', slug: 'stack', color: '#EF4444' },
  { name: 'Two Pointers', slug: 'two-pointers', color: '#22C55E' },
  { name: 'Bit Manipulation', slug: 'bit-manipulation', color: '#8B5CF6' },
];

// ─── Companies Data ───────────────────────────────────────────────────────────
const companiesData = [
  { name: 'Google', slug: 'google', logo: 'https://logo.clearbit.com/google.com', isPopular: true, industry: 'Technology' },
  { name: 'Meta', slug: 'meta', logo: 'https://logo.clearbit.com/meta.com', isPopular: true, industry: 'Technology' },
  { name: 'Amazon', slug: 'amazon', logo: 'https://logo.clearbit.com/amazon.com', isPopular: true, industry: 'E-Commerce' },
  { name: 'Microsoft', slug: 'microsoft', logo: 'https://logo.clearbit.com/microsoft.com', isPopular: true, industry: 'Technology' },
  { name: 'Apple', slug: 'apple', logo: 'https://logo.clearbit.com/apple.com', isPopular: true, industry: 'Technology' },
  { name: 'Netflix', slug: 'netflix', logo: 'https://logo.clearbit.com/netflix.com', isPopular: true, industry: 'Entertainment' },
  { name: 'Uber', slug: 'uber', logo: 'https://logo.clearbit.com/uber.com', isPopular: true, industry: 'Mobility' },
  { name: 'Airbnb', slug: 'airbnb', logo: 'https://logo.clearbit.com/airbnb.com', isPopular: false, industry: 'Travel' },
  { name: 'Adobe', slug: 'adobe', logo: 'https://logo.clearbit.com/adobe.com', isPopular: false, industry: 'Software' },
  { name: 'Salesforce', slug: 'salesforce', logo: 'https://logo.clearbit.com/salesforce.com', isPopular: false, industry: 'CRM' },
  { name: 'VMware', slug: 'vmware', logo: 'https://logo.clearbit.com/vmware.com', isPopular: false, industry: 'Cloud' },
  { name: 'Flipkart', slug: 'flipkart', logo: 'https://logo.clearbit.com/flipkart.com', isPopular: false, industry: 'E-Commerce' },
  { name: 'Goldman Sachs', slug: 'goldman-sachs', logo: 'https://logo.clearbit.com/goldmansachs.com', isPopular: false, industry: 'Finance' },
  { name: 'LinkedIn', slug: 'linkedin', logo: 'https://logo.clearbit.com/linkedin.com', isPopular: false, industry: 'Professional Network' },
  { name: 'Twitter', slug: 'twitter', logo: 'https://logo.clearbit.com/twitter.com', isPopular: false, industry: 'Social Media' },
  { name: 'Stripe', slug: 'stripe', logo: 'https://logo.clearbit.com/stripe.com', isPopular: false, industry: 'Fintech' },
  { name: 'Atlassian', slug: 'atlassian', logo: 'https://logo.clearbit.com/atlassian.com', isPopular: false, industry: 'Software' },
  { name: 'Oracle', slug: 'oracle', logo: 'https://logo.clearbit.com/oracle.com', isPopular: false, industry: 'Enterprise' },
  { name: 'Spotify', slug: 'spotify', logo: 'https://logo.clearbit.com/spotify.com', isPopular: false, industry: 'Music' },
  { name: 'Lyft', slug: 'lyft', logo: 'https://logo.clearbit.com/lyft.com', isPopular: false, industry: 'Mobility' },
];

// ─── Problems Data ────────────────────────────────────────────────────────────
const problemsRaw = [
  { id: 1, title: 'Two Sum', difficulty: 'Easy', acceptance: 49.1, frequency: 95, topics: ['array', 'hashmap'], companies: ['google', 'amazon', 'meta', 'microsoft', 'apple'] },
  { id: 3, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', acceptance: 33.8, frequency: 88, topics: ['sliding-window', 'hashmap'], companies: ['amazon', 'google', 'uber', 'microsoft'] },
  { id: 4, title: 'Median of Two Sorted Arrays', difficulty: 'Hard', acceptance: 36.2, frequency: 72, topics: ['binary-search', 'array'], companies: ['google', 'amazon', 'apple'] },
  { id: 5, title: 'Longest Palindromic Substring', difficulty: 'Medium', acceptance: 32.4, frequency: 78, topics: ['dynamic-programming'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 11, title: 'Container With Most Water', difficulty: 'Medium', acceptance: 54.1, frequency: 82, topics: ['two-pointers', 'array'], companies: ['google', 'amazon', 'meta'] },
  { id: 15, title: '3Sum', difficulty: 'Medium', acceptance: 32.1, frequency: 85, topics: ['two-pointers', 'array'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 17, title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', acceptance: 56.2, frequency: 70, topics: ['backtracking', 'recursion'], companies: ['amazon', 'google', 'uber'] },
  { id: 20, title: 'Valid Parentheses', difficulty: 'Easy', acceptance: 40.9, frequency: 90, topics: ['stack'], companies: ['amazon', 'google', 'meta', 'microsoft', 'apple'] },
  { id: 21, title: 'Merge Two Sorted Lists', difficulty: 'Easy', acceptance: 61.5, frequency: 87, topics: ['linked-list', 'recursion'], companies: ['amazon', 'microsoft', 'apple', 'google'] },
  { id: 23, title: 'Merge k Sorted Lists', difficulty: 'Hard', acceptance: 49.3, frequency: 80, topics: ['linked-list', 'heap'], companies: ['amazon', 'google', 'meta', 'uber'] },
  { id: 33, title: 'Search in Rotated Sorted Array', difficulty: 'Medium', acceptance: 38.5, frequency: 82, topics: ['binary-search', 'array'], companies: ['amazon', 'microsoft', 'google', 'meta'] },
  { id: 42, title: 'Trapping Rain Water', difficulty: 'Hard', acceptance: 58.6, frequency: 84, topics: ['two-pointers', 'stack', 'dynamic-programming'], companies: ['google', 'amazon', 'meta', 'microsoft'] },
  { id: 46, title: 'Permutations', difficulty: 'Medium', acceptance: 73.2, frequency: 76, topics: ['backtracking'], companies: ['linkedin', 'microsoft', 'amazon'] },
  { id: 48, title: 'Rotate Image', difficulty: 'Medium', acceptance: 70.8, frequency: 74, topics: ['array', 'math'], companies: ['amazon', 'microsoft', 'apple', 'uber'] },
  { id: 49, title: 'Group Anagrams', difficulty: 'Medium', acceptance: 67.3, frequency: 83, topics: ['hashmap', 'array'], companies: ['amazon', 'google', 'meta'] },
  { id: 51, title: 'N-Queens', difficulty: 'Hard', acceptance: 67.0, frequency: 65, topics: ['backtracking'], companies: ['microsoft', 'amazon', 'google'] },
  { id: 53, title: 'Maximum Subarray', difficulty: 'Medium', acceptance: 50.3, frequency: 88, topics: ['array', 'dynamic-programming'], companies: ['amazon', 'google', 'microsoft', 'linkedin'] },
  { id: 55, title: 'Jump Game', difficulty: 'Medium', acceptance: 38.2, frequency: 79, topics: ['greedy', 'array'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 56, title: 'Merge Intervals', difficulty: 'Medium', acceptance: 46.1, frequency: 85, topics: ['array', 'greedy'], companies: ['amazon', 'google', 'meta', 'microsoft', 'uber'] },
  { id: 62, title: 'Unique Paths', difficulty: 'Medium', acceptance: 63.4, frequency: 76, topics: ['dynamic-programming', 'math'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 70, title: 'Climbing Stairs', difficulty: 'Easy', acceptance: 51.5, frequency: 87, topics: ['dynamic-programming'], companies: ['amazon', 'apple', 'adobe', 'microsoft'] },
  { id: 72, title: 'Edit Distance', difficulty: 'Medium', acceptance: 52.9, frequency: 75, topics: ['dynamic-programming'], companies: ['google', 'amazon', 'meta'] },
  { id: 76, title: 'Minimum Window Substring', difficulty: 'Hard', acceptance: 41.1, frequency: 80, topics: ['sliding-window', 'hashmap'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 78, title: 'Subsets', difficulty: 'Medium', acceptance: 74.3, frequency: 77, topics: ['backtracking', 'array'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 84, title: 'Largest Rectangle in Histogram', difficulty: 'Hard', acceptance: 43.4, frequency: 74, topics: ['stack', 'array'], companies: ['google', 'amazon', 'meta'] },
  { id: 85, title: 'Maximal Rectangle', difficulty: 'Hard', acceptance: 45.5, frequency: 69, topics: ['stack', 'dynamic-programming'], companies: ['amazon', 'google'] },
  { id: 94, title: 'Binary Tree Inorder Traversal', difficulty: 'Easy', acceptance: 73.5, frequency: 83, topics: ['tree', 'dfs'], companies: ['amazon', 'microsoft', 'google', 'apple'] },
  { id: 98, title: 'Validate Binary Search Tree', difficulty: 'Medium', acceptance: 32.5, frequency: 81, topics: ['tree', 'dfs'], companies: ['amazon', 'microsoft', 'google', 'meta'] },
  { id: 100, title: 'Same Tree', difficulty: 'Easy', acceptance: 56.2, frequency: 72, topics: ['tree', 'dfs', 'bfs'], companies: ['amazon', 'apple', 'microsoft'] },
  { id: 101, title: 'Symmetric Tree', difficulty: 'Easy', acceptance: 53.1, frequency: 74, topics: ['tree', 'bfs', 'dfs'], companies: ['microsoft', 'amazon', 'google'] },
  { id: 102, title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', acceptance: 64.7, frequency: 85, topics: ['tree', 'bfs'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 104, title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', acceptance: 73.9, frequency: 85, topics: ['tree', 'dfs', 'bfs'], companies: ['amazon', 'apple', 'google', 'microsoft'] },
  { id: 105, title: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium', acceptance: 61.3, frequency: 76, topics: ['tree', 'dfs', 'recursion'], companies: ['amazon', 'microsoft', 'meta'] },
  { id: 121, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', acceptance: 54.3, frequency: 92, topics: ['array', 'dynamic-programming'], companies: ['amazon', 'google', 'meta', 'microsoft', 'goldman-sachs'] },
  { id: 124, title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', acceptance: 38.2, frequency: 76, topics: ['tree', 'dfs', 'dynamic-programming'], companies: ['amazon', 'google', 'meta'] },
  { id: 128, title: 'Longest Consecutive Sequence', difficulty: 'Medium', acceptance: 46.3, frequency: 82, topics: ['hashmap', 'array', 'union-find'], companies: ['google', 'amazon', 'meta', 'uber'] },
  { id: 136, title: 'Single Number', difficulty: 'Easy', acceptance: 70.7, frequency: 77, topics: ['bit-manipulation', 'array'], companies: ['amazon', 'microsoft', 'apple'] },
  { id: 138, title: 'Copy List with Random Pointer', difficulty: 'Medium', acceptance: 53.2, frequency: 79, topics: ['linked-list', 'hashmap'], companies: ['amazon', 'microsoft', 'uber', 'adobe'] },
  { id: 139, title: 'Word Break', difficulty: 'Medium', acceptance: 45.3, frequency: 82, topics: ['dynamic-programming', 'trie'], companies: ['google', 'amazon', 'meta', 'microsoft'] },
  { id: 141, title: 'Linked List Cycle', difficulty: 'Easy', acceptance: 45.9, frequency: 88, topics: ['linked-list', 'two-pointers'], companies: ['amazon', 'microsoft', 'apple', 'google'] },
  { id: 142, title: 'Linked List Cycle II', difficulty: 'Medium', acceptance: 46.6, frequency: 76, topics: ['linked-list', 'two-pointers'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 146, title: 'LRU Cache', difficulty: 'Medium', acceptance: 40.9, frequency: 87, topics: ['linked-list', 'hashmap'], companies: ['amazon', 'google', 'meta', 'microsoft', 'uber'] },
  { id: 148, title: 'Sort List', difficulty: 'Medium', acceptance: 52.5, frequency: 75, topics: ['linked-list'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 152, title: 'Maximum Product Subarray', difficulty: 'Medium', acceptance: 34.3, frequency: 78, topics: ['array', 'dynamic-programming'], companies: ['amazon', 'google', 'linkedin'] },
  { id: 155, title: 'Min Stack', difficulty: 'Medium', acceptance: 52.1, frequency: 82, topics: ['stack'], companies: ['amazon', 'google', 'microsoft', 'bloomberg'] },
  { id: 160, title: 'Intersection of Two Linked Lists', difficulty: 'Easy', acceptance: 54.5, frequency: 77, topics: ['linked-list', 'two-pointers'], companies: ['amazon', 'microsoft', 'apple'] },
  { id: 169, title: 'Majority Element', difficulty: 'Easy', acceptance: 63.8, frequency: 81, topics: ['array', 'hashmap'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 198, title: 'House Robber', difficulty: 'Medium', acceptance: 49.6, frequency: 82, topics: ['dynamic-programming', 'array'], companies: ['amazon', 'google', 'meta'] },
  { id: 200, title: 'Number of Islands', difficulty: 'Medium', acceptance: 57.2, frequency: 91, topics: ['graph', 'dfs', 'bfs', 'union-find'], companies: ['amazon', 'google', 'meta', 'microsoft', 'uber'] },
  { id: 206, title: 'Reverse Linked List', difficulty: 'Easy', acceptance: 73.9, frequency: 90, topics: ['linked-list', 'recursion'], companies: ['amazon', 'microsoft', 'apple', 'adobe', 'google'] },
  { id: 207, title: 'Course Schedule', difficulty: 'Medium', acceptance: 45.4, frequency: 84, topics: ['graph', 'dfs', 'bfs'], companies: ['amazon', 'google', 'meta', 'microsoft', 'uber'] },
  { id: 208, title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', acceptance: 63.7, frequency: 80, topics: ['trie', 'hashmap'], companies: ['google', 'amazon', 'microsoft', 'meta'] },
  { id: 210, title: 'Course Schedule II', difficulty: 'Medium', acceptance: 47.7, frequency: 80, topics: ['graph', 'dfs', 'bfs'], companies: ['amazon', 'google', 'meta'] },
  { id: 212, title: 'Word Search II', difficulty: 'Hard', acceptance: 35.2, frequency: 72, topics: ['trie', 'backtracking', 'dfs'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 215, title: 'Kth Largest Element in an Array', difficulty: 'Medium', acceptance: 65.6, frequency: 86, topics: ['heap', 'array'], companies: ['amazon', 'google', 'facebook', 'microsoft', 'apple'] },
  { id: 217, title: 'Contains Duplicate', difficulty: 'Easy', acceptance: 61.4, frequency: 83, topics: ['array', 'hashmap'], companies: ['amazon', 'apple', 'google'] },
  { id: 226, title: 'Invert Binary Tree', difficulty: 'Easy', acceptance: 75.5, frequency: 80, topics: ['tree', 'dfs', 'bfs'], companies: ['amazon', 'google', 'apple', 'microsoft'] },
  { id: 230, title: 'Kth Smallest Element in a BST', difficulty: 'Medium', acceptance: 70.6, frequency: 78, topics: ['tree', 'dfs'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 234, title: 'Palindrome Linked List', difficulty: 'Easy', acceptance: 48.7, frequency: 78, topics: ['linked-list', 'two-pointers'], companies: ['amazon', 'microsoft', 'apple', 'google'] },
  { id: 236, title: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium', acceptance: 58.1, frequency: 82, topics: ['tree', 'dfs'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 238, title: 'Product of Array Except Self', difficulty: 'Medium', acceptance: 65.3, frequency: 86, topics: ['array'], companies: ['amazon', 'google', 'meta', 'microsoft', 'apple'] },
  { id: 239, title: 'Sliding Window Maximum', difficulty: 'Hard', acceptance: 46.4, frequency: 80, topics: ['sliding-window', 'heap', 'stack'], companies: ['amazon', 'google', 'meta'] },
  { id: 240, title: 'Search a 2D Matrix II', difficulty: 'Medium', acceptance: 50.8, frequency: 77, topics: ['binary-search', 'array'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 253, title: 'Meeting Rooms II', difficulty: 'Medium', acceptance: 50.5, frequency: 83, topics: ['heap', 'greedy'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 261, title: 'Graph Valid Tree', difficulty: 'Medium', acceptance: 45.2, frequency: 73, topics: ['graph', 'union-find', 'dfs'], companies: ['google', 'linkedin'] },
  { id: 269, title: 'Alien Dictionary', difficulty: 'Hard', acceptance: 34.1, frequency: 75, topics: ['graph', 'dfs', 'bfs'], companies: ['google', 'meta', 'amazon', 'airbnb'] },
  { id: 273, title: 'Integer to English Words', difficulty: 'Hard', acceptance: 30.8, frequency: 71, topics: ['math', 'recursion'], companies: ['amazon', 'microsoft', 'google', 'airbnb'] },
  { id: 283, title: 'Move Zeroes', difficulty: 'Easy', acceptance: 60.7, frequency: 82, topics: ['array', 'two-pointers'], companies: ['amazon', 'microsoft', 'apple', 'google'] },
  { id: 295, title: 'Find Median from Data Stream', difficulty: 'Hard', acceptance: 51.5, frequency: 78, topics: ['heap'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 297, title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', acceptance: 55.2, frequency: 77, topics: ['tree', 'dfs', 'bfs'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 300, title: 'Longest Increasing Subsequence', difficulty: 'Medium', acceptance: 52.7, frequency: 82, topics: ['dynamic-programming', 'binary-search'], companies: ['amazon', 'google', 'microsoft', 'meta'] },
  { id: 301, title: 'Remove Invalid Parentheses', difficulty: 'Hard', acceptance: 47.3, frequency: 72, topics: ['backtracking', 'bfs'], companies: ['meta', 'google', 'amazon'] },
  { id: 315, title: 'Count of Smaller Numbers After Self', difficulty: 'Hard', acceptance: 42.3, frequency: 73, topics: ['array', 'binary-search'], companies: ['google', 'amazon', 'meta'] },
  { id: 322, title: 'Coin Change', difficulty: 'Medium', acceptance: 41.9, frequency: 85, topics: ['dynamic-programming'], companies: ['amazon', 'google', 'microsoft', 'meta'] },
  { id: 324, title: 'Wiggle Sort II', difficulty: 'Medium', acceptance: 32.4, frequency: 68, topics: ['array', 'greedy'], companies: ['google', 'amazon'] },
  { id: 332, title: 'Reconstruct Itinerary', difficulty: 'Hard', acceptance: 40.2, frequency: 70, topics: ['graph', 'dfs'], companies: ['google', 'amazon', 'uber'] },
  { id: 347, title: 'Top K Frequent Elements', difficulty: 'Medium', acceptance: 66.8, frequency: 85, topics: ['heap', 'hashmap', 'array'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 380, title: 'Insert Delete GetRandom O(1)', difficulty: 'Medium', acceptance: 52.5, frequency: 78, topics: ['hashmap', 'array'], companies: ['amazon', 'google', 'meta', 'uber'] },
  { id: 394, title: 'Decode String', difficulty: 'Medium', acceptance: 57.5, frequency: 78, topics: ['stack', 'recursion'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 399, title: 'Evaluate Division', difficulty: 'Medium', acceptance: 59.2, frequency: 74, topics: ['graph', 'dfs', 'bfs', 'union-find'], companies: ['google', 'meta', 'amazon'] },
  { id: 416, title: 'Partition Equal Subset Sum', difficulty: 'Medium', acceptance: 46.6, frequency: 78, topics: ['dynamic-programming', 'array'], companies: ['amazon', 'google', 'meta'] },
  { id: 424, title: 'Longest Repeating Character Replacement', difficulty: 'Medium', acceptance: 51.9, frequency: 76, topics: ['sliding-window'], companies: ['google', 'amazon', 'microsoft'] },
  { id: 435, title: 'Non-overlapping Intervals', difficulty: 'Medium', acceptance: 52.3, frequency: 77, topics: ['greedy', 'array'], companies: ['google', 'amazon', 'meta'] },
  { id: 438, title: 'Find All Anagrams in a String', difficulty: 'Medium', acceptance: 49.6, frequency: 80, topics: ['sliding-window', 'hashmap'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 448, title: 'Find All Numbers Disappeared in an Array', difficulty: 'Easy', acceptance: 59.8, frequency: 76, topics: ['array', 'hashmap'], companies: ['amazon', 'google'] },
  { id: 450, title: 'Delete Node in a BST', difficulty: 'Medium', acceptance: 50.7, frequency: 73, topics: ['tree', 'dfs'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 460, title: 'LFU Cache', difficulty: 'Hard', acceptance: 42.4, frequency: 70, topics: ['linked-list', 'hashmap'], companies: ['amazon', 'google', 'meta'] },
  { id: 472, title: 'Concatenated Words', difficulty: 'Hard', acceptance: 44.6, frequency: 68, topics: ['trie', 'dynamic-programming'], companies: ['google', 'amazon'] },
  { id: 480, title: 'Sliding Window Median', difficulty: 'Hard', acceptance: 41.7, frequency: 69, topics: ['sliding-window', 'heap'], companies: ['google', 'amazon', 'meta'] },
  { id: 490, title: 'The Maze', difficulty: 'Medium', acceptance: 54.4, frequency: 73, topics: ['graph', 'bfs', 'dfs'], companies: ['amazon', 'google', 'meta'] },
  { id: 494, title: 'Target Sum', difficulty: 'Medium', acceptance: 44.8, frequency: 79, topics: ['dynamic-programming', 'backtracking'], companies: ['amazon', 'google', 'meta'] },
  { id: 496, title: 'Next Greater Element I', difficulty: 'Easy', acceptance: 71.0, frequency: 76, topics: ['stack', 'hashmap'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 518, title: 'Coin Change II', difficulty: 'Medium', acceptance: 62.0, frequency: 78, topics: ['dynamic-programming', 'array'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 543, title: 'Diameter of Binary Tree', difficulty: 'Easy', acceptance: 57.1, frequency: 82, topics: ['tree', 'dfs'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 560, title: 'Subarray Sum Equals K', difficulty: 'Medium', acceptance: 43.8, frequency: 83, topics: ['array', 'hashmap'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 572, title: 'Subtree of Another Tree', difficulty: 'Easy', acceptance: 47.3, frequency: 78, topics: ['tree', 'dfs'], companies: ['amazon', 'microsoft', 'google'] },
  { id: 621, title: 'Task Scheduler', difficulty: 'Medium', acceptance: 58.0, frequency: 80, topics: ['greedy', 'heap'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 647, title: 'Palindromic Substrings', difficulty: 'Medium', acceptance: 67.2, frequency: 78, topics: ['dynamic-programming'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 695, title: 'Max Area of Island', difficulty: 'Medium', acceptance: 70.9, frequency: 81, topics: ['graph', 'dfs', 'bfs'], companies: ['amazon', 'google', 'meta'] },
  { id: 704, title: 'Binary Search', difficulty: 'Easy', acceptance: 55.2, frequency: 84, topics: ['binary-search', 'array'], companies: ['amazon', 'google', 'microsoft', 'apple'] },
  { id: 739, title: 'Daily Temperatures', difficulty: 'Medium', acceptance: 67.1, frequency: 82, topics: ['stack', 'array'], companies: ['amazon', 'google', 'meta', 'microsoft'] },
  { id: 767, title: 'Reorganize String', difficulty: 'Medium', acceptance: 53.5, frequency: 77, topics: ['greedy', 'heap'], companies: ['amazon', 'google', 'microsoft'] },
  { id: 778, title: 'Swim in Rising Water', difficulty: 'Hard', acceptance: 59.9, frequency: 71, topics: ['graph', 'binary-search', 'union-find'], companies: ['google', 'amazon'] },
  { id: 827, title: 'Making A Large Island', difficulty: 'Hard', acceptance: 49.3, frequency: 69, topics: ['graph', 'dfs', 'union-find'], companies: ['google', 'amazon'] },
  { id: 981, title: 'Time Based Key-Value Store', difficulty: 'Medium', acceptance: 53.9, frequency: 76, topics: ['binary-search', 'hashmap'], companies: ['google', 'amazon', 'meta', 'uber'] },
  { id: 1091, title: 'Shortest Path in Binary Matrix', difficulty: 'Medium', acceptance: 45.4, frequency: 76, topics: ['graph', 'bfs'], companies: ['google', 'amazon', 'meta'] },
  { id: 1143, title: 'Longest Common Subsequence', difficulty: 'Medium', acceptance: 57.7, frequency: 82, topics: ['dynamic-programming'], companies: ['amazon', 'google', 'microsoft', 'oracle'] },
  { id: 1235, title: 'Maximum Profit in Job Scheduling', difficulty: 'Hard', acceptance: 52.6, frequency: 74, topics: ['dynamic-programming', 'binary-search', 'greedy'], companies: ['google', 'amazon', 'meta'] },
  { id: 1293, title: 'Shortest Path in a Grid with Obstacles Elimination', difficulty: 'Hard', acceptance: 44.9, frequency: 72, topics: ['graph', 'bfs'], companies: ['google', 'amazon', 'uber'] },
];

async function seed() {
  try {
    await connectDB();

    console.log('[SEED] Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Topic.deleteMany({}),
      Problem.deleteMany({}),
    ]);

    console.log('[SEED] Seeding topics...');
    const topics = await Topic.insertMany(topicsData);
    const topicMap = topics.reduce((acc, t) => ({ ...acc, [t.slug]: t._id }), {});

    console.log('[SEED] Seeding companies...');
    const companies = await Company.insertMany(companiesData);
    const companyMap = companies.reduce((acc, c) => ({ ...acc, [c.slug]: c._id }), {});

    console.log('[SEED] Seeding problems...');
    const problems = problemsRaw.map((p) => ({
      title: p.title,
      slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      leetcodeUrl: `https://leetcode.com/problems/${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/`,
      leetcodeId: p.id,
      difficulty: p.difficulty,
      acceptance: p.acceptance,
      frequency: p.frequency,
      topics: p.topics.filter((t) => topicMap[t]).map((t) => topicMap[t]),
      companies: p.companies.filter((c) => companyMap[c]).map((c) => ({
        company: companyMap[c],
        frequency: Math.floor(Math.random() * 50) + 50,
        lastAsked: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000),
      })),
    }));

    await Problem.insertMany(problems);

    // Update company question counts
    console.log('[SEED] Updating company counts...');
    for (const company of companies) {
      const count = await Problem.countDocuments({ 'companies.company': company._id });
      await Company.findByIdAndUpdate(company._id, { totalQuestions: count });
    }

    // Update topic problem counts
    console.log('[SEED] Updating topic counts...');
    for (const topic of topics) {
      const count = await Problem.countDocuments({ topics: topic._id });
      await Topic.findByIdAndUpdate(topic._id, { problemCount: count });
    }

    // Create admin user
    console.log('[SEED] Creating admin user...');
    await User.create({
      name: 'Admin',
      email: 'admin@alloteme.tech',
      password: 'admin123456',
      role: 'admin',
      isVerified: true,
      isActive: true,
    });

    // Create demo user
    await User.create({
      name: 'Demo User',
      email: 'demo@alloteme.tech',
      password: 'demo123456',
      role: 'user',
      isVerified: true,
      isActive: true,
    });

    console.log('[SEED] Done! Database seeded successfully.');
    console.log('[SEED] Admin: admin@alloteme.tech / admin123456');
    console.log('[SEED] Demo:  demo@alloteme.tech  / demo123456');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err);
    process.exit(1);
  }
}

seed();
