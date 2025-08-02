const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Music Diary API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Suno API - Generate Music
app.post('/api/suno/generate', async (req, res) => {
  try {
    const { prompt, style, title, customMode, instrumental, model, negativeTags } = req.body;
    
    console.log('Suno Generate Request:', { prompt, style, title });

    if (!process.env.SUNO_API_KEY) {
      return res.status(500).json({
        code: 500,
        msg: 'Suno API key is not configured'
      });
    }

    const response = await fetch('https://api.sunoapi.org/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
      },
      body: JSON.stringify({
        prompt,
        style,
        title,
        customMode: customMode !== undefined ? customMode : true,
        instrumental: instrumental !== undefined ? instrumental : true,
        model: model || 'V3_5',
        negativeTags: negativeTags || 'Heavy Metal, Loud Drums, Aggressive'
      })
    });

    const data = await response.json();
    console.log('Suno API Response:', data);

    res.json(data);
  } catch (error) {
    console.error('Suno Generate Error:', error);
    res.status(500).json({
      code: 500,
      msg: 'Internal server error',
      error: error.message
    });
  }
});

// Suno API - Check Task Status
app.get('/api/suno/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    console.log('Checking Suno Task Status:', taskId);

    if (!process.env.SUNO_API_KEY) {
      return res.status(500).json({
        code: 500,
        msg: 'Suno API key is not configured'
      });
    }

    const response = await fetch(`https://api.sunoapi.org/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`
      }
    });

    const data = await response.json();
    console.log('Suno Task Status Response:', data);

    res.json(data);
  } catch (error) {
    console.error('Suno Task Status Error:', error);
    res.status(500).json({
      code: 500,
      msg: 'Internal server error',
      error: error.message
    });
  }
});

// OpenAI API - Chat Completions
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { messages, systemPrompt, maxTokens, temperature } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OpenAI API key is not configured'
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: maxTokens || 300,
        temperature: temperature || 0.7
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API Error:', data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('OpenAI Chat Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    code: 500,
    msg: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔑 Suno API Key: ${process.env.SUNO_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
});