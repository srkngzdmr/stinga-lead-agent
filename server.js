import express from 'express';
import { createServer } from 'vite';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const app = express();
app.use(express.json({ limit: '10mb' }));

// ============ API PROXY ENDPOINT ============
app.post('/api/ai-search', async (req, res) => {
  const { prompt, systemPrompt, provider } = req.body;

  try {
    // Try Gemini first if key exists
    if ((provider === 'gemini' || !provider) && GEMINI_API_KEY) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt || ''}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            tools: [{ googleSearch: {} }]
          })
        }
      );
      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.filter(p => p.text)
        ?.map(p => p.text)
        ?.join('\n') || '';

      if (text) {
        return res.json({ success: true, provider: 'gemini', result: text });
      }
    }

    // Fallback to Claude
    if (ANTHROPIC_API_KEY) {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt || 'Sen bir B2B satış araştırma uzmanısın. Türkçe yanıt ver.',
          messages: [{ role: 'user', content: prompt }],
          tools: [{ type: 'web_search_20250305', name: 'web_search' }]
        })
      });
      const data = await claudeRes.json();
      const text = data.content
        ?.filter(b => b.type === 'text')
        ?.map(b => b.text)
        ?.join('\n') || '';

      return res.json({ success: true, provider: 'claude', result: text });
    }

    return res.json({ success: false, error: 'No API key configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.' });

  } catch (err) {
    console.error('AI API Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!GEMINI_API_KEY,
    claude: !!ANTHROPIC_API_KEY,
    time: new Date().toISOString()
  });
});

// ============ SERVE FRONTEND ============
if (isProd) {
  // Production: serve built files
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Stinga Lead Agent running on port ${PORT}`);
    console.log(`   Gemini: ${GEMINI_API_KEY ? '✅ configured' : '❌ not set'}`);
    console.log(`   Claude: ${ANTHROPIC_API_KEY ? '✅ configured' : '❌ not set'}`);
  });
} else {
  // Development: Vite dev server middleware
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dev server on http://localhost:${PORT}`);
  });
}
