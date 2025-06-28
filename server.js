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
const moment = require('moment');
const { initializeDatabase, createDatabaseIfNotExists } = require('./lib/database');
const DatabaseEventsManager = require('./lib/databaseEventsManager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database Events Manager
let eventsManager;

// Initialize database and events manager
async function initializeApp() {
    try {
        // Create database if it doesn't exist
        await createDatabaseIfNotExists();
        
        // Initialize database connection
        const dbInitialized = await initializeDatabase();
        if (!dbInitialized) {
            console.error('❌ Failed to initialize database. Exiting...');
            process.exit(1);
        }

        // Initialize events manager
        eventsManager = new DatabaseEventsManager();
        
        // Create sample events
        await eventsManager.initializeSampleEvents();
        
        // Initialize the Discord notification system
        await eventsManager.initializeNotifier();
        
        console.log('✅ Application initialized successfully.');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        process.exit(1);
    }
}

// Rate limiting configuration for both development and production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (suitable for production and development)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skipSuccessfulRequests: true // Don't count successful requests against the rate limit
});

// Middleware
app.use(limiter);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "https:", "data:", "https://cdn.discordapp.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
    },
  },
  crossOriginEmbedderPolicy: false,
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

// Middleware to make user object available to all templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.messages = req.flash();
  res.locals.path = req.path; // Add current path for active navbar items
  next();
});

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

// Middleware to check if user can manage events
function ensureEventManager(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('error', 'You need to login first.');
    return res.redirect('/login');
  }
  
  if (!DatabaseEventsManager.canManageEvents(req.user)) {
    req.flash('error', 'You do not have permission to manage events.');
    return res.redirect('/dashboard');
  }
  
  return next();
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

app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const currentDate = new Date();
  const year = parseInt(req.query.year) || currentDate.getFullYear();
  const month = parseInt(req.query.month) || (currentDate.getMonth() + 1);
  
  const calendarData = await eventsManager.getCalendarData(year, month);
  const eventTypes = DatabaseEventsManager.getEventTypes();
  const canManageEvents = DatabaseEventsManager.canManageEvents(req.user);
  
  res.render('dashboard', { 
    user: req.user,
    messages: req.flash(),
    calendarData,
    eventTypes,
    canManageEvents,
    currentYear: year,
    currentMonth: month,
    moment: moment
  });
});

app.get('/events', ensureAuthenticated, async (req, res) => {
  const events = await eventsManager.getAllEvents();
  const eventTypes = DatabaseEventsManager.getEventTypes();
  const canManageEvents = DatabaseEventsManager.canManageEvents(req.user);
  
  // Add signup information for each event
  for (let event of events) {
    const signups = await eventsManager.getEventSignups(event.id);
    event.signups = signups;
    event.signupCount = signups.length;
    event.isSignedUp = signups.some(signup => signup.userId === req.user.id);
  }
  
  res.render('events', {
    user: req.user,
    messages: req.flash(),
    events,
    eventTypes,
    canManageEvents,
    moment: moment
  });
});

app.get('/events/create', ensureEventManager, (req, res) => {
  const eventTypes = DatabaseEventsManager.getEventTypes();
  res.render('event-form', {
    user: req.user,
    messages: req.flash(),
    eventTypes,
    event: null,
    editing: false,
    moment: moment
  });
});

app.post('/events/create', ensureEventManager, async (req, res) => {
  try {
    // Combine date and time inputs into a proper datetime
    const startTime = new Date(`${req.body.date}T${req.body.time}:00.000Z`);
    
    const eventData = {
      title: req.body.title,
      type: req.body.type,
      description: req.body.description || '',
      startTime: startTime,
      maxParticipants: req.body.maxParticipants ? parseInt(req.body.maxParticipants) : null
    };
    
    const event = await eventsManager.createEvent(eventData, req.user);
    req.flash('success', 'Event created successfully!');
    res.redirect('/dashboard');
  } catch (error) {
    req.flash('error', 'Failed to create event: ' + error.message);
    res.redirect('/events/create');
  }
});

app.get('/events/:id/edit', ensureEventManager, async (req, res) => {
  const event = await eventsManager.getEvent(req.params.id);
  if (!event) {
    req.flash('error', 'Event not found');
    return res.redirect('/events');
  }
  
  const eventTypes = DatabaseEventsManager.getEventTypes();
  res.render('event-form', {
    user: req.user,
    messages: req.flash(),
    eventTypes,
    event,
    editing: true,
    moment: moment
  });
});

app.post('/events/:id/edit', ensureEventManager, async (req, res) => {
  try {
    // Combine date and time inputs into a proper datetime
    const startTime = new Date(`${req.body.date}T${req.body.time}:00.000Z`);
    
    const updateData = {
      title: req.body.title,
      type: req.body.type,
      description: req.body.description || '',
      startTime: startTime,
      maxParticipants: req.body.maxParticipants ? parseInt(req.body.maxParticipants) : null
    };
    
    const event = await eventsManager.updateEvent(req.params.id, updateData, req.user);
    if (!event) {
      req.flash('error', 'Event not found');
    } else {
      req.flash('success', 'Event updated successfully!');
    }
    res.redirect('/dashboard');
  } catch (error) {
    req.flash('error', 'Failed to update event: ' + error.message);
    res.redirect('/events/' + req.params.id + '/edit');
  }
});

app.post('/events/:id/delete', ensureEventManager, async (req, res) => {
  const deleted = await eventsManager.deleteEvent(req.params.id);
  if (deleted) {
    req.flash('success', 'Event deleted successfully!');
  } else {
    req.flash('error', 'Event not found');
  }
  res.redirect('/events');
});

app.post('/events/:id/signup', ensureAuthenticated, async (req, res) => {
  const result = await eventsManager.signUpForEvent(req.params.id, req.user);
  req.flash(result.success ? 'success' : 'error', result.message);
  res.redirect(req.headers.referer || '/dashboard');
});

app.post('/events/:id/remove-signup', ensureAuthenticated, async (req, res) => {
  const removed = await eventsManager.removeSignup(req.params.id, req.user.id);
  if (removed) {
    req.flash('success', 'Signup removed successfully!');
  } else {
    req.flash('error', 'Could not remove signup');
  }
  res.redirect(req.headers.referer || '/dashboard');
});

app.get('/logout', (req, res) => {
  // First set a flash message (while session is still active)
  req.flash('success', 'You have been logged out successfully.');
  
  // Then perform the logout
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/dashboard'); // Redirect on error
    }
    
    // Destroy the session completely to ensure proper logout
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destruction error:', sessionErr);
      }
      
      // Clear the session cookie directly
      res.clearCookie('connect.sid');
      
      // Redirect to home page with cache control headers to prevent browser caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.redirect('/');
    });
  });
});

// API Routes
app.get('/api/user', ensureAuthenticated, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    canManageEvents: DatabaseEventsManager.canManageEvents(req.user)
  });
});

// Discord webhook integration route
app.post('/api/discord/command', async (req, res) => {
  try {
    // Validate webhook secret for security
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.DISCORD_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { command, user } = req.body;
    
    if (!command || !user || !user.id) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    // Process the command
    const result = await eventsManager.processDiscordCommand(command, user);
    
    res.json(result);
  } catch (error) {
    console.error('Error processing Discord command:', error);
    res.status(500).json({ error: 'Failed to process command' });
  }
});

// Manually trigger event notifications (admin only)
app.post('/api/events/:id/notify', ensureEventManager, async (req, res) => {
  try {
    const event = await eventsManager.getEvent(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }
    
    // Send notification
    await eventsManager.eventNotifier.notifyEventChange(event);
    
    req.flash('success', 'Event notification sent successfully!');
    res.redirect('/events');
  } catch (error) {
    console.error('Error sending notification:', error);
    req.flash('error', 'Failed to send notification: ' + error.message);
    res.redirect('/events');
  }
});

app.get('/api/events', ensureAuthenticated, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    
    if (req.query.format === 'calendar') {
      // Return calendar data (object grouped by date)
      const calendarData = await eventsManager.getCalendarData(year, month);
      console.log('Returning calendar data:', typeof calendarData);
      res.json(calendarData);
    } else {
      // Return all events as array (for statistics)
      const events = await eventsManager.getAllEvents();
      console.log('Returning events array:', Array.isArray(events), 'Length:', events ? events.length : 'undefined');
      res.json(events);
    }
  } catch (error) {
    console.error('Error in /api/events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/events/:id', ensureAuthenticated, async (req, res) => {
  console.log('API call for event:', req.params.id);
  const event = await eventsManager.getEvent(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const signups = await eventsManager.getEventSignups(req.params.id);
  const isSignedUp = await eventsManager.isUserSignedUp(req.params.id, req.user.id);
  
  const result = {
    ...event,
    signups: signups,
    signupCount: signups.length,
    isSignedUp,
    canManage: DatabaseEventsManager.canManageEvents(req.user)
  };
  
  res.json(result);
});

// Webhook route for Discord notifications
app.post('/webhook/discord', express.json(), (req, res) => {
  const { event, data } = req.body;
  
  // Log the received webhook data
  console.log('Received Discord webhook:', event, data);
  
  // Handle different events
  switch (event) {
    case 'EVENT_CREATED':
      // Notify all users
      eventsManager.notifyAllUsers('New event created: ' + data.title);
      break;
    case 'EVENT_UPDATED':
      // Notify all users
      eventsManager.notifyAllUsers('Event updated: ' + data.title);
      break;
    case 'EVENT_DELETED':
      // Notify all users
      eventsManager.notifyAllUsers('Event deleted: ' + data.title);
      break;
    default:
      console.log('Unknown event type:', event);
  }
  
  res.sendStatus(200);
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

// Start the application
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
