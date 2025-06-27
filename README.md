# Council of The Ancients - Events Calendar

A Dune Awakening themed Node.js web application for managing guild events on Discord. Built for the **Council of The Ancients** guild with Discord OAuth authentication and server-specific access control.

## 🏜️ Features

- **Discord OAuth Authentication**: Secure login using Discord OAuth2
- **Guild-Based Access Control**: Only COA guild members can access the application
- **Event Management System**: Create, edit, and manage guild events (Spice Farming, Raiding Base, Ore Farming)
- **Calendar View**: Interactive monthly calendar showing all events with signups
- **Event Signups**: Members can sign up for events and see who else is participating
- **Admin Controls**: Only admins and NylasDev can create/edit/delete events
- **Dune Awakening Theme**: Beautiful desert-themed UI with spice-inspired colors
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Node 12 Compatible**: Built for cPanel hosting compatibility

## 🎮 Event Types

- **🏜️ Spice Farming**: Gather the precious spice across Arrakis
- **⚔️ Raiding Base**: Coordinate attacks on enemy strongholds  
- **⛏️ Ore Farming**: Mining operations for valuable resources

## 🚀 Quick Setup

1. **Clone and install dependencies:**
   ```bash
   cd coa-events
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your Discord application details:
   ```env
   DISCORD_CLIENT_ID=your_discord_client_id_here
   DISCORD_CLIENT_SECRET=your_discord_client_secret_here
   DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
   ALLOWED_GUILD_ID=your_coa_discord_server_id_here
   SESSION_SECRET=your_random_session_secret_here
   ```

3. **Start the application:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "OAuth2" section
4. Add redirect URI: `http://localhost:3000/auth/discord/callback` (adjust for production)
5. Copy the Client ID and Client Secret to your `.env` file
6. Make sure to select the `identify` and `guilds` scopes

## Getting Discord Server ID

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on your server name
3. Click "Copy ID"
4. Use this ID as `ALLOWED_GUILD_ID` in your `.env` file

## Project Structure

```
coa-events/
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── public/               # Static assets
│   ├── css/
│   │   └── style.css    # Custom styles
│   └── js/
│       └── app.js       # Client-side JavaScript
└── views/               # EJS templates
    ├── index.ejs        # Home page
    ├── login.ejs        # Login page
    ├── dashboard.ejs    # User dashboard
    ├── 404.ejs          # 404 error page
    └── error.ejs        # Generic error page
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port (default: 3000) | No |
| `DISCORD_CLIENT_ID` | Discord application client ID | Yes |
| `DISCORD_CLIENT_SECRET` | Discord application client secret | Yes |
| `DISCORD_REDIRECT_URI` | OAuth2 redirect URI | Yes |
| `ALLOWED_GUILD_ID` | Discord server ID for access control | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `MCP_SERVER_URL` | MCP server URL (if applicable) | No |
| `MCP_API_KEY` | MCP API key (if applicable) | No |
| `APP_URL` | Application base URL | No |

## API Endpoints

### Authentication Routes
- `GET /` - Home page
- `GET /login` - Login page
- `GET /auth/discord` - Initiate Discord OAuth
- `GET /auth/discord/callback` - Discord OAuth callback
- `GET /logout` - Logout user

### Protected Routes
- `GET /dashboard` - User dashboard (requires authentication)

### API Routes
- `GET /api/user` - Get current user info (requires authentication)
- `GET /api/mcp-data` - Get MCP data (requires authentication)

## Security Features

- **Helmet.js**: Adds security headers
- **Rate Limiting**: Prevents abuse (100 requests per 15 minutes per IP)
- **CORS**: Configurable cross-origin resource sharing
- **Session Security**: Secure session cookies in production
- **Input Validation**: Server-side validation for all inputs
- **Guild Verification**: Users must be members of specified Discord server

## Deployment

### cPanel Hosting

1. Upload all files to your cPanel Node.js app directory
2. Install dependencies: `npm install`
3. Configure environment variables in cPanel
4. Set the startup file to `server.js`
5. Update `DISCORD_REDIRECT_URI` and `APP_URL` for production domain

### Production Environment Variables

For production, make sure to set:
```env
NODE_ENV=production
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/discord/callback
APP_URL=https://yourdomain.com
SESSION_SECRET=your_secure_random_string
```

## MCP Integration

The application is ready for MCP integration. The placeholder endpoint at `/api/mcp-data` can be extended to connect with your MCP server. Update the `MCP_SERVER_URL` and `MCP_API_KEY` environment variables and modify the MCP integration code in `server.js`.

## Customization

### Styling
- Modify `public/css/style.css` for custom styles
- The app uses Bootstrap 5 with a glass-morphism theme
- Color scheme can be adjusted via CSS custom properties

### Templates
- EJS templates are in the `views/` directory
- Each template includes Bootstrap and custom styling
- Flash messages are supported for user feedback

### Client-side Features
- `public/js/app.js` contains utility classes for API calls, notifications, and UI management
- Built-in support for loading states, error handling, and form validation

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

## Troubleshooting

### Common Issues

1. **"You are not a member of the required Discord server"**
   - Ensure the user is a member of the server specified in `ALLOWED_GUILD_ID`
   - Verify the Guild ID is correct

2. **OAuth2 errors**
   - Check Discord application settings
   - Verify redirect URI matches exactly
   - Ensure client ID and secret are correct

3. **Session issues**
   - Generate a strong `SESSION_SECRET`
   - Check session cookie settings for production

## License

GPL-3.0 License - see LICENSE file for details.

## Support

For issues and questions, please check the troubleshooting section above or contact the administrator.
