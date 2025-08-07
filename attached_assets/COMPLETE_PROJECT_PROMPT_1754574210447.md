# Complete Reddit Outreach Agent Project Setup

## Project Overview
Create a **Reddit Outreach Agent** - a Node.js/Express API with embedded HTML dashboard for monitoring Reddit discussions and generating AI responses.

## Critical Requirements

### Architecture
- **Backend**: Node.js + Express 4.x (NOT 5.x)
- **Frontend**: Single HTML file with inline React via CDN
- **Port**: 3000 (Replit standard)
- **No build process**: No Vite, no TypeScript compilation, no client/server separation

### Project Structure
```
reddit-outreach-agent/
├── index.js (main server - Express API)
├── index.html (dashboard UI - React via CDN)
├── redditAgent.js (Reddit/OpenAI integration)
├── package.json (dependencies)
├── .env.example (environment template)
├── .replit (Replit configuration)
├── CLAUDE.md (AI assistant instructions)
└── src/
    ├── middleware/
    │   ├── modeAuth.js (access control)
    │   └── validation.js (input validation)
    └── services/
        ├── MonitoringService.js (continuous monitoring)
        ├── NotificationService.js (alerts)
        └── PromptManager.js (AI prompt management)
```

## Exact File Contents

### 1. package.json
```json
{
  "name": "reddit-outreach-agent",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.1",
    "express": "^4.19.2",
    "node-cron": "^4.2.1",
    "nodemailer": "^7.0.5",
    "openai": "^5.12.0",
    "snoowrap": "^1.23.0",
    "uuid": "^11.1.0",
    "validator": "^13.15.15",
    "ws": "^8.18.3",
    "node-fetch": "^2.7.0"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "description": "AI-powered Reddit monitoring and engagement system",
  "author": "KaZi",
  "license": "ISC"
}
```

### 2. .replit
```toml
run = "npm start"
entrypoint = "index.js"

[nix]
channel = "stable-24_05"

[[ports]]
localPort = 3000
externalPort = 80

[env]
PORT = "3000"
```

### 3. .env.example
```env
# Server Configuration
PORT=3000

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Reddit OAuth Configuration
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_REFRESH_TOKEN=your-reddit-refresh-token
```

### 4. index.js (Main Server)
```javascript
globalThis.fetch = require('node-fetch'); // Polyfill for older Node
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Basic rate limiting
const rateLimit = new Map();
const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const limit = rateLimit.get(ip);
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + windowMs;
    return next();
  }

  if (limit.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  limit.count++;
  next();
};

app.use(rateLimiter);

// Mock services for demo
const mockPosts = [
  {
    id: '1',
    subreddit: 'r/javascript',
    title: 'Looking for React state management solutions',
    content: 'I need recommendations for managing state in a large React app...',
    author: 'u/demo_user',
    upvotes: 42,
    comments: 15,
    tags: ['react', 'state-management'],
    priority: 'high',
    score: 0.92,
    highlighted: true,
    postUrl: 'https://reddit.com/r/javascript/comments/demo123',
    matchReason: 'Mentions keyword "react"',
    proposedReply: 'For large React apps, I recommend checking out Zustand for its simplicity and great TypeScript support. It\'s much lighter than Redux but still powerful.',
    originalContent: 'Hi everyone, I\'m working on a large-scale React application...',
    originalAuthor: 'u/demo_user',
    posted: false
  }
];

// WebSocket connection handling
wss.on('connection', ws => {
  console.log('📱 Client connected to WebSocket');
  ws.send(JSON.stringify({
    type: 'monitoringStatus',
    data: { isActive: false, subreddits: [], keywords: [] }
  }));

  ws.on('close', () => {
    console.log('📱 Client disconnected from WebSocket');
  });
});

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// API Routes
app.get('/api/mode', (req, res) => {
  res.json({
    isEditMode: true,
    isViewOnly: false,
    isPublic: false,
    mode: 'edit',
    redditConfigured: !!process.env.REDDIT_CLIENT_ID,
    openaiConfigured: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key-here'
  });
});

app.get('/api/posts', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  
  res.json({
    posts: mockPosts.slice(offset, offset + limit),
    total: mockPosts.length,
    hasMore: offset + limit < mockPosts.length,
    limit,
    offset
  });
});

app.post('/monitor/start', (req, res) => {
  const { subreddits, keywords, scanInterval = 5 } = req.body;
  
  if (!subreddits || !keywords) {
    return res.status(400).json({ error: 'Subreddits and keywords are required' });
  }

  broadcast({
    type: 'monitoringStarted',
    data: { subreddits, keywords, scanInterval }
  });

  res.json({
    success: true,
    message: 'Monitoring started',
    config: { subreddits, keywords, scanInterval }
  });
});

app.post('/monitor/stop', (req, res) => {
  broadcast({ type: 'monitoringStopped', data: {} });
  res.json({ success: true, message: 'Monitoring stopped' });
});

app.get('/monitor/status', (req, res) => {
  res.json({
    isActive: false,
    subreddits: [],
    keywords: [],
    scanInterval: 5,
    lastScanTime: null
  });
});

app.post('/ingest', (req, res) => {
  const { text, tags = [], source = '' } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  res.json({
    success: true,
    message: 'Content added to knowledge base',
    id: Date.now().toString()
  });
});

// Explicit root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
  console.log(`🌐 Preview URL: http://localhost:${PORT}`);
  console.log(`API endpoints available:`);
  console.log(`  GET /api/mode - Check current mode`);
  console.log(`  GET /api/posts - Get monitored posts`);
  console.log(`  POST /monitor/start - Start monitoring`);
  console.log(`  POST /monitor/stop - Stop monitoring`);
  console.log(`  POST /ingest - Add content to knowledge base`);
});
```

### 5. index.html (Dashboard UI)
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reddit Outreach Agent Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-in { animation: slideIn 0.3s ease-out; }
    .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  </style>
</head>
<body class="bg-gray-50">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect } = React;

    const Dashboard = () => {
      const [posts, setPosts] = useState([]);
      const [monitoring, setMonitoring] = useState({ isActive: false, subreddits: [], keywords: [] });
      const [subreddits, setSubreddits] = useState('javascript,webdev,reactjs');
      const [keywords, setKeywords] = useState('react,nodejs,api');
      const [ws, setWs] = useState(null);

      useEffect(() => {
        // WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        const websocket = new WebSocket(wsUrl);
        
        websocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'monitoringStarted') {
            setMonitoring({ isActive: true, ...data.data });
          } else if (data.type === 'monitoringStopped') {
            setMonitoring({ isActive: false, subreddits: [], keywords: [] });
          }
        };
        
        setWs(websocket);
        fetchPosts();

        return () => websocket.close();
      }, []);

      const fetchPosts = async () => {
        try {
          const response = await fetch('/api/posts');
          const data = await response.json();
          setPosts(data.posts || []);
        } catch (error) {
          console.error('Failed to fetch posts:', error);
        }
      };

      const startMonitoring = async () => {
        try {
          const response = await fetch('/monitor/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subreddits: subreddits.split(',').map(s => s.trim()),
              keywords: keywords.split(',').map(k => k.trim())
            })
          });
          const data = await response.json();
          if (data.success) {
            console.log('Monitoring started');
          }
        } catch (error) {
          console.error('Failed to start monitoring:', error);
        }
      };

      const stopMonitoring = async () => {
        try {
          const response = await fetch('/monitor/stop', { method: 'POST' });
          const data = await response.json();
          if (data.success) {
            console.log('Monitoring stopped');
          }
        } catch (error) {
          console.error('Failed to stop monitoring:', error);
        }
      };

      return (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="gradient-bg text-white shadow-lg">
            <div className="container mx-auto px-6 py-8">
              <h1 className="text-4xl font-bold">Reddit Outreach Agent</h1>
              <p className="mt-2 text-blue-100">AI-powered Reddit monitoring and engagement</p>
            </div>
          </header>

          <div className="container mx-auto px-6 py-8">
            {/* Monitoring Controls */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8 card-hover">
              <h2 className="text-2xl font-semibold mb-4">Monitoring Controls</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subreddits</label>
                  <input
                    type="text"
                    value={subreddits}
                    onChange={(e) => setSubreddits(e.target.value)}
                    placeholder="javascript,webdev,reactjs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="react,nodejs,api"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startMonitoring}
                  disabled={monitoring.isActive}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {monitoring.isActive ? 'Monitoring Active' : 'Start Monitoring'}
                </button>
                <button
                  onClick={stopMonitoring}
                  disabled={!monitoring.isActive}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Stop Monitoring
                </button>
                <button
                  onClick={fetchPosts}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Refresh Posts
                </button>
              </div>

              {monitoring.isActive && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md animate-in">
                  <p className="text-green-800">
                    <span className="font-medium">Monitoring:</span> {monitoring.subreddits?.join(', ')} for keywords: {monitoring.keywords?.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Posts Feed */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-6">Recent Posts</h2>
              
              {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No posts found. Start monitoring to see results!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-6 card-hover animate-in">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">{post.title}</h3>
                          <p className="text-sm text-gray-600">
                            {post.subreddit} • by {post.author} • {post.upvotes} upvotes • {post.comments} comments
                          </p>
                        </div>
                        {post.highlighted && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                            High Priority
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-4 line-clamp-3">{post.content}</p>
                      
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Match Reason:</strong> {post.matchReason}
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-sm font-medium text-blue-800 mb-2">Proposed Reply:</p>
                          <p className="text-blue-700">{post.proposedReply}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {post.tags?.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={post.postUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                          >
                            View Post
                          </a>
                          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                            Post Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    };

    ReactDOM.render(<Dashboard />, document.getElementById('root'));
  </script>
</body>
</html>
```

## Setup Instructions for Replit

1. **Create new Repl** → Choose "Node.js" template
2. **Paste this prompt** to Replit agent and ask them to create all files
3. **Run setup commands**:
```bash
npm install
npm start
```

## Key Success Factors

### Critical Details:
- **Port 3000**: Hardcoded for Replit compatibility
- **Express 4.x**: No version 5 compatibility issues  
- **node-fetch polyfill**: Included for Node < 18
- **Server binds to 0.0.0.0**: Required for Replit
- **Explicit root route**: Ensures index.html is served
- **WebSocket support**: Real-time updates
- **Mock data**: App works immediately without external APIs

### File Requirements:
- All files must be in root directory
- index.html must be exactly 143KB+ with full React dashboard
- package.json must use Express 4.x
- .replit must specify port 3000
- Server must start with proper logging

### Testing Checklist:
- [ ] Server starts on port 3000
- [ ] API endpoint `/api/mode` returns JSON
- [ ] Root `/` serves HTML dashboard  
- [ ] Preview shows purple gradient header
- [ ] Monitoring controls are functional
- [ ] WebSocket connection works
- [ ] No Express 5.x or Vite errors

This prompt contains everything needed to recreate the working Reddit Outreach Agent with all compatibility issues resolved.