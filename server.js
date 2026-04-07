import express from 'express';
import { createServer } from 'vite';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const app = express();
app.use(express.json({ limit: '10mb' }));

// ============ API PROXY ENDPOINT ============
app.post('/api/ai-search', async (req, res) => {
  const { prompt, systemPrompt } = req.body;

  if (!GEMINI_API_KEY) {
    return res.json({ success: false, error: 'GEMINI_API_KEY ayarlanmamış.' });
  }

  try {
    console.log('[Gemini 2.5 Flash] Sending request...');

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

    for (const model of models) {
      console.log(`[Gemini] Trying ${model}...`);

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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

      if (data.error) {
        console.error(`[Gemini ${model}] Error:`, data.error.message);
        // If unavailable, try next model
        if (data.error.code === 503 || data.error.code === 429) continue;
        return res.json({ success: false, error: data.error.message || 'Gemini API hatası' });
      }

      // Extract text from response
      let text = '';
      if (data?.candidates?.[0]?.content?.parts) {
        const parts = data.candidates[0].content.parts;
        const textParts = [];
        for (const part of parts) {
          if (part.text) {
            textParts.push(part.text);
          }
        }
        text = textParts.join('\n');
      }

      if (text) {
        console.log(`[Gemini ${model}] Success, response length:`, text.length);
        return res.json({ success: true, provider: `gemini-${model}`, result: text });
      } else {
        console.log(`[Gemini ${model}] Empty response.`);
        continue;
      }
    }

    return res.json({ success: false, error: 'Tüm Gemini modelleri şu an meşgul. Lütfen biraz sonra tekrar deneyin.' });
  } catch (err) {
    console.error('[API] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!GEMINI_API_KEY,
    time: new Date().toISOString()
  });
});

// ============ SERVE FRONTEND ============
if (isProd) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Stinga Lead Agent running on port ${PORT}`);
    console.log(`   Gemini 2.5 Flash: ${GEMINI_API_KEY ? '✅ configured' : '❌ not set'}`);
  });
} else {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dev server on http://localhost:${PORT}`);
  });
}
