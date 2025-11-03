// PR analysis routes
const express = require('express');
const OpenAI = require('openai');
const { verifyToken, checkUsageLimit } = require('../middleware/auth');

// Use PostgreSQL for production (Railway), SQLite for local development
const databaseModule = process.env.DATABASE_URL ? '../database' : '../database-sqlite';
const { recordUsage, getUserStats } = require(databaseModule);

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Analyze PR (OpenAI proxy endpoint)
router.post('/analyze', verifyToken, checkUsageLimit, async (req, res) => {
  try {
    const { pr, files } = req.body;

    if (!pr || !files) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'PR data and files are required'
      });
    }

    // Extract PR info
    const prUrl = pr.url || '';
    const repoName = pr.repo || '';
    const prNumber = pr.number || null;

    console.log(`[PR Analysis] User: ${req.user.email}, PR: ${prUrl}`);

    // Prepare analysis prompt
    const systemPrompt = `You are an expert code reviewer analyzing GitHub pull requests. Provide comprehensive analysis including:

1. **Summary**: Brief overview of changes
2. **Impact Score**: Rate 1-10 based on scope and complexity
3. **Key Changes**: Main modifications and their purpose
4. **Potential Issues**: Bugs, security concerns, performance problems
5. **Suggestions**: Specific improvements and best practices
6. **Security Patterns**: Flag any security-related changes
7. **Testing Needs**: Required tests and edge cases

Be concise but thorough. Focus on actionable insights.`;

    const userPrompt = `Analyze this pull request:

**PR Title**: ${pr.title}
**Description**: ${pr.description || 'No description provided'}

**Files Changed** (${files.length} files):
${files.map(f => `- ${f.filename} (+${f.additions || 0}, -${f.deletions || 0})`).join('\n')}

**Code Changes**:
${files.slice(0, 10).map(f => `
File: ${f.filename}
${f.patch || 'No changes shown'}
`).join('\n---\n')}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const analysis = completion.choices[0].message.content;

    // Record usage
    recordUsage(req.user.id, prUrl, repoName, prNumber);

    // Get updated stats
    const stats = getUserStats(req.user.id);

    res.json({
      success: true,
      analysis: analysis,
      usage: {
        monthly: stats.monthlyUsage,
        limit: stats.limit,
        remaining: stats.remaining,
        tier: req.user.tier
      },
      metadata: {
        model: 'gpt-4o-mini',
        filesAnalyzed: files.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PR analysis error:', error);

    // Handle OpenAI specific errors
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'OpenAI API error',
        message: error.response.data?.error?.message || 'Failed to analyze PR'
      });
    }

    res.status(500).json({
      error: 'Analysis failed',
      message: 'An error occurred while analyzing the PR'
    });
  }
});

// Get usage stats
router.get('/usage', verifyToken, (req, res) => {
  try {
    const stats = getUserStats(req.user.id);

    res.json({
      success: true,
      usage: stats
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({
      error: 'Failed to get usage stats'
    });
  }
});

module.exports = router;
