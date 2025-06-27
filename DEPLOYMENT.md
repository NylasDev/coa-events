# Deployment Guide for cPanel Hosting

This guide will help you deploy the COA Events Discord App on a cPanel server with Node.js support.

## Prerequisites

- cPanel account with Node.js support
- Node.js 12+ available on the server
- Domain or subdomain configured
- Discord application configured

## Step 1: Prepare Your Files

1. **Create a production build:**
   ```bash
   # Remove development dependencies and files
   rm -rf node_modules
   rm -rf .git
   ```

2. **Create a compressed archive:**
   ```bash
   tar -czf coa-events.tar.gz .
   ```

## Step 2: Upload to cPanel

1. **Access cPanel File Manager**
2. **Navigate to your domain's directory** (usually `public_html` or `public_html/subdomain`)
3. **Upload the compressed file**
4. **Extract the archive**

## Step 3: Configure Node.js App in cPanel

1. **Go to "Node.js Apps" in cPanel**
2. **Click "Create Application"**
3. **Configure the following:**
   - **Node.js Version:** 12.x or higher
   - **Application Mode:** Production
   - **Application Root:** Path to your uploaded files
   - **Application URL:** Your domain/subdomain
   - **Application Startup File:** `server.js`

## Step 4: Install Dependencies

1. **In the Node.js Apps interface, click on your app**
2. **Use the terminal or run:**
   ```bash
   npm install --production
   ```

## Step 5: Configure Environment Variables

In the cPanel Node.js Apps interface, add these environment variables:

### Required Variables
```
NODE_ENV=production
PORT=3000
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/discord/callback
ALLOWED_GUILD_ID=your_discord_server_id_here
SESSION_SECRET=your_secure_random_session_secret_here
APP_URL=https://yourdomain.com
```

### Optional Variables
```
MCP_SERVER_URL=http://localhost:3001
MCP_API_KEY=your_mcp_api_key_here
```

## Step 6: Update Discord Application Settings

1. **Go to Discord Developer Portal**
2. **Select your application**
3. **Go to OAuth2 > General**
4. **Update Redirect URI** to match your production domain:
   ```
   https://yourdomain.com/auth/discord/callback
   ```

## Step 7: Start the Application

1. **In cPanel Node.js Apps, click "Start"**
2. **Verify the app is running**
3. **Check the logs for any errors**

## Step 8: Test the Application

1. **Visit your domain**
2. **Test Discord login**
3. **Verify server access control**
4. **Test dashboard functionality**

## Common cPanel-Specific Issues

### Port Configuration
- cPanel usually assigns a random port
- The app will use the PORT environment variable automatically
- Don't hardcode port numbers

### File Permissions
```bash
# If you get permission errors, set correct permissions:
chmod 644 *.js *.json *.md
chmod 755 public views
chmod 644 public/* views/*
```

### Node.js Version
- Ensure your cPanel supports Node.js 12+
- Some older cPanel versions may need Node.js 10 compatibility

### Memory Limits
- cPanel may have memory limits
- Monitor your app's memory usage
- Consider optimizing if needed

### SSL/HTTPS
- Ensure your domain has SSL configured
- Update all URLs to use HTTPS in production
- Set secure cookie options

## Monitoring and Maintenance

### Log Files
- Check Node.js app logs in cPanel
- Monitor for errors and performance issues

### Updates
- Keep dependencies updated regularly
- Test updates in development first

### Backup
- Regular backups of your application files
- Backup environment variables configuration

### Performance
- Monitor response times
- Consider caching strategies if needed
- Optimize images and static assets

## Troubleshooting

### App Won't Start
1. Check Node.js version compatibility
2. Verify all required environment variables are set
3. Check for syntax errors in logs
4. Ensure all dependencies are installed

### Discord OAuth Issues
1. Verify redirect URI matches exactly (including HTTPS)
2. Check Discord app settings
3. Ensure client ID and secret are correct

### Database/Session Issues
1. Verify session secret is set
2. Check file permissions for session storage
3. Consider using database sessions for production

### Performance Issues
1. Check memory usage
2. Monitor CPU usage
3. Optimize database queries if applicable
4. Consider implementing caching

## Security Checklist

- [ ] All environment variables properly configured
- [ ] SESSION_SECRET is strong and unique
- [ ] HTTPS is enabled and working
- [ ] Rate limiting is active
- [ ] Security headers are set (via Helmet)
- [ ] No sensitive data in logs
- [ ] File permissions are correct
- [ ] Only authorized Discord servers can access

## Support

If you encounter issues:

1. Check the application logs in cPanel
2. Verify environment variables
3. Test Discord OAuth configuration
4. Check cPanel Node.js app status
5. Contact your hosting provider for server-specific issues

For application-specific issues, refer to the main README.md file.
