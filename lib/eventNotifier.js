// Event notifier service for sending Discord notifications about upcoming events
const DiscordUtils = require('./discordUtils');
const moment = require('moment');

class EventNotifier {
    constructor(eventsManager) {
        this.eventsManager = eventsManager;
        this.discord = new DiscordUtils();
        this.scheduledNotifications = new Map();
    }

    /**
     * Initialize notification system
     */
    async initialize() {
        console.log('🔔 Initializing event notification system...');
        
        // Check if webhook URL is configured
        if (!process.env.DISCORD_WEBHOOK_URL) {
            console.warn('⚠️ Discord webhook URL not configured. Notifications will not be sent.');
            return;
        }
        
        // Schedule notifications for existing events
        await this.scheduleAllEventNotifications();
        
        // Set up periodic check to make sure we don't miss any events
        // This runs every 15 minutes
        setInterval(() => this.scheduleAllEventNotifications(), 15 * 60 * 1000);
        
        console.log('✅ Event notification system initialized');
    }

    /**
     * Schedule notifications for all upcoming events
     */
    async scheduleAllEventNotifications() {
        try {
            // Clear existing scheduled notifications
            this.clearScheduledNotifications();
            
            // Get all upcoming events
            const events = await this.eventsManager.getAllEvents();
            const now = new Date();
            
            // Filter for future events only
            const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
            
            console.log(`📅 Scheduling notifications for ${upcomingEvents.length} upcoming events`);
            
            // Schedule notifications for each event
            upcomingEvents.forEach(event => {
                this.scheduleEventNotifications(event);
            });
        } catch (error) {
            console.error('❌ Error scheduling event notifications:', error);
        }
    }
    
    /**
     * Schedule notifications for a single event
     * @param {Object} event - The event to schedule notifications for
     */
    scheduleEventNotifications(event) {
        const eventId = event.id;
        const eventTime = new Date(event.startTime);
        const now = new Date();
        
        // Only schedule for future events
        if (eventTime <= now) {
            return;
        }
        
        // Calculate times for different notifications
        const notificationTimes = [
            { timeUntil: '8 hours', milliseconds: 8 * 60 * 60 * 1000 },
            { timeUntil: '4 hours', milliseconds: 4 * 60 * 60 * 1000 },
            { timeUntil: '1 hour', milliseconds: 1 * 60 * 60 * 1000 },
            { timeUntil: '10 minutes', milliseconds: 10 * 60 * 1000 }
        ];
        
        // Schedule each notification
        notificationTimes.forEach(({ timeUntil, milliseconds }) => {
            const notificationTime = new Date(eventTime - milliseconds);
            
            // Only schedule notifications that are in the future
            if (notificationTime > now) {
                const delay = notificationTime.getTime() - now.getTime();
                
                // Create a unique ID for this notification
                const notificationId = `${eventId}-${timeUntil}`;
                
                // Schedule the notification
                const timerId = setTimeout(async () => {
                    await this.sendEventNotification(event, timeUntil);
                    // Remove from scheduled map once triggered
                    this.scheduledNotifications.delete(notificationId);
                }, delay);
                
                // Store in map so we can clear it later if needed
                this.scheduledNotifications.set(notificationId, timerId);
                
                console.log(`🔔 Scheduled notification for "${event.title}" ${timeUntil} before (${notificationTime.toLocaleString()})`);
            }
        });
        
        // Also send an immediate notification about the new event if it was created recently (last 15 minutes)
        const eventCreated = new Date(event.createdAt);
        if ((now - eventCreated) < 15 * 60 * 1000) {
            // Send notification about the new event
            this.sendEventNotification(event);
        }
    }
    
    /**
     * Send a notification about an event
     * @param {Object} event - The event to notify about
     * @param {String} timeUntil - Human-readable time until the event
     */
    async sendEventNotification(event, timeUntil = null) {
        try {
            // Get participant information
            const signups = await this.eventsManager.getEventSignups(event.id);
            
            // Send the notification
            await this.discord.notifyEventUpdate(event, signups, timeUntil);
            
            console.log(`📣 Sent ${timeUntil ? timeUntil + ' reminder' : 'notification'} for event "${event.title}"`);
        } catch (error) {
            console.error(`❌ Failed to send notification for event ${event.id}:`, error);
        }
    }
    
    /**
     * Clear all scheduled notifications
     */
    clearScheduledNotifications() {
        // Clear all timers
        for (const timerId of this.scheduledNotifications.values()) {
            clearTimeout(timerId);
        }
        
        // Clear the map
        this.scheduledNotifications.clear();
    }
    
    /**
     * Notify about a new or updated event
     * @param {Object} event - The event that was created or updated
     * @param {Boolean} isNew - Whether the event is new or updated
     */
    async notifyEventChange(event, isNew = true) {
        // Re-schedule notifications for this event
        this.scheduleEventNotifications(event);
        
        // Immediately send a notification about the new/updated event
        await this.sendEventNotification(event);
    }
    
    /**
     * Process a Discord command for signup/unsignup
     * @param {String} command - The command (/signup or /unsignup)
     * @param {Object} discordUser - The Discord user who sent the command
     * @returns {Object} - Response to send back
     */
    async processDiscordCommand(command, discordUser) {
        return this.discord.processEventCommand(command, discordUser, async (action, eventId, user) => {
            // Check which command we're processing
            if (action === '/signup') {
                // Sign up the user
                const result = await this.eventsManager.signUpForEvent(eventId, {
                    id: user.id,
                    username: user.username
                });
                
                // If successful, notify the channel
                if (result.success && result.event) {
                    // Get updated participant list
                    const signups = await this.eventsManager.getEventSignups(eventId);
                    
                    // If this was the first signup or a multiple of 5, notify the channel
                    if (signups.length === 1 || signups.length % 5 === 0) {
                        await this.discord.notifyEventUpdate(result.event, signups);
                    }
                }
                
                return result;
            } else if (action === '/unsignup') {
                // Remove the signup
                const removed = await this.eventsManager.removeSignup(eventId, user.id);
                
                return {
                    success: removed,
                    message: removed ? 
                        'You have been removed from the event.' : 
                        'You are not signed up for this event.'
                };
            } else {
                return {
                    success: false,
                    message: 'Unknown command. Use `/signup EVENT_ID` or `/unsignup EVENT_ID`.'
                };
            }
        });
    }
}

module.exports = EventNotifier;
