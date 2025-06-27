const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "https:", "data:"],
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Validate required environment variables
const requiredEnvVars = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI,
  ALLOWED_GUILD_ID: process.env.ALLOWED_GUILD_ID,
  SESSION_SECRET: process.env.SESSION_SECRET
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value === `your_${key.toLowerCase()}_here`)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing or invalid environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📋 Please configure your .env file with proper values.');
  console.error('📖 See README.md for setup instructions.');
  process.exit(1);
}

// Discord Passport Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_REDIRECT_URI,
  scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user is in the allowed guild
    const userGuilds = profile.guilds || [];
    const allowedGuildId = process.env.ALLOWED_GUILD_ID;
    
    const isInAllowedGuild = userGuilds.some(guild => guild.id === allowedGuildId);
    
    if (!isInAllowedGuild) {
      return done(null, false, { message: 'You are not a member of the required Discord server.' });
    }
    
    // Store user data in session
    const user = {
      id: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      email: profile.email,
      guilds: profile.guilds,
      accessToken: accessToken
    };
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware to check authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You need to login first.');
  res.redirect('/');
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    user: req.user,
    messages: req.flash()
  });
});

app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    messages: req.flash()
  });
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/login',
    failureFlash: true 
  }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { 
    user: req.user,
    messages: req.flash()
  });
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    req.flash('success', 'You have been logged out successfully.');
    res.redirect('/');
  });
});

// API Routes for MCP integration
app.get('/api/user', ensureAuthenticated, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar
  });
});

// MCP Integration endpoint (placeholder)
app.get('/api/mcp-data', ensureAuthenticated, async (req, res) => {
  try {
    // This is where you would integrate with your MCP server
    // For now, returning placeholder data
    const mcpData = {
      message: 'MCP integration placeholder',
      user: req.user.username,
      timestamp: new Date().toISOString()
    };
    
    res.json(mcpData);
  } catch (error) {
    console.error('MCP API Error:', error);
    res.status(500).json({ error: 'Failed to fetch MCP data' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
