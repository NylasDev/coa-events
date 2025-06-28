// Discord utility functions for enhanced Discord integration

const axios = require('axios');

class DiscordUtils {
    constructor(botToken) {
        this.botToken = botToken || process.env.DISCORD_BOT_TOKEN;
        this.baseURL = 'https://discord.com/api/v10';
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        
        if (this.botToken) {
            this.client = axios.create({
                baseURL: this.baseURL,
                headers: {
                    'Authorization': `Bot ${this.botToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    }

    // Get guild member information
    async getGuildMember(guildId, userId) {
        if (!this.client) {
            throw new Error('Discord bot token not configured');
        }

        try {
            const response = await this.client.get(`/guilds/${guildId}/members/${userId}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return null; // User not in guild
            }
            throw error;
        }
    }

    // Get user's roles in a guild
    async getUserRoles(guildId, userId) {
        try {
            const member = await this.getGuildMember(guildId, userId);
            if (!member) return [];
            
            return member.roles;
        } catch (error) {
            console.error('Failed to get user roles:', error.message);
            return [];
        }
    }

    // Check if user has specific role
    async userHasRole(guildId, userId, roleId) {
        try {
            const roles = await this.getUserRoles(guildId, userId);
            return roles.includes(roleId);
        } catch (error) {
            console.error('Failed to check user role:', error.message);
            return false;
        }
    }

    // Get guild information
    async getGuild(guildId) {
        if (!this.client) {
            throw new Error('Discord bot token not configured');
        }

        try {
            const response = await this.client.get(`/guilds/${guildId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to get guild info:', error.message);
            throw error;
        }
    }

    // Validate user's guild membership with additional checks
    async validateMembership(guildId, userId, requiredRoles = []) {
        try {
            const member = await this.getGuildMember(guildId, userId);
            
            if (!member) {
                return {
                    valid: false,
                    reason: 'User is not a member of the guild'
                };
            }

            // Check if user has required roles (if any)
            if (requiredRoles.length > 0) {
                const hasRequiredRole = requiredRoles.some(roleId => 
                    member.roles.includes(roleId)
                );
                
                if (!hasRequiredRole) {
                    return {
                        valid: false,
                        reason: 'User does not have required roles'
                    };
                }
            }

            return {
                valid: true,
                member: member,
                joinedAt: member.joined_at,
                roles: member.roles
            };
        } catch (error) {
            console.error('Failed to validate membership:', error.message);
            return {
                valid: false,
                reason: 'Failed to validate membership'
            };
        }
    }

    // Format Discord user for display
    static formatUser(user) {
        const tag = user.discriminator && user.discriminator !== '0' 
            ? `${user.username}#${user.discriminator}`
            : user.username;
            
        return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            tag: tag,
            avatar: user.avatar,
            avatarURL: user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`
        };
    }

    // Get user's avatar URL
    static getAvatarURL(user, size = 128) {
        if (user.avatar) {
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
        }
        return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`;
    }

    // Check if user is guild owner or admin
    async isGuildAdmin(guildId, userId) {
        try {
            const guild = await this.getGuild(guildId);
            if (guild.owner_id === userId) {
                return true;
            }

            const member = await this.getGuildMember(guildId, userId);
            if (!member) return false;

            // Check for administrator permission
            const permissions = parseInt(member.permissions || '0');
            const ADMINISTRATOR = 0x8;
            
            return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
        } catch (error) {
            console.error('Failed to check admin status:', error.message);
            return false;
        }
    }

    // Send DM to user (requires bot token and proper permissions)
    async sendDirectMessage(userId, content) {
        if (!this.client) {
            throw new Error('Discord bot token not configured');
        }

        try {
            // Create DM channel
            const dmResponse = await this.client.post('/users/@me/channels', {
                recipient_id: userId
            });
            
            const dmChannelId = dmResponse.data.id;
            
            // Send message
            const messageResponse = await this.client.post(`/channels/${dmChannelId}/messages`, {
                content: content
            });
            
            return messageResponse.data;
        } catch (error) {
            console.error('Failed to send DM:', error.message);
            throw error;
        }
    }

    /**
     * Send a message to a Discord channel via webhook
     * @param {Object} options - Webhook message options
     * @param {String} options.content - Simple text content
     * @param {Array} options.embeds - Embeds for rich message formatting
     * @returns {Promise} - API response
     */
    async sendWebhookMessage(options) {
        if (!this.webhookUrl) {
            throw new Error('Discord webhook URL not configured');
        }

        try {
            const response = await axios.post(this.webhookUrl, options);
            return response.data;
        } catch (error) {
            console.error('Failed to send webhook message:', error.message);
            throw error;
        }
    }

    /**
     * Send an event notification to Discord
     * @param {Object} event - The event to notify about
     * @param {Array} signups - List of users who signed up
     * @param {String} timeUntil - Human-readable time until the event (e.g. '1 hour')
     * @returns {Promise} - Webhook response
     */
    async notifyEventUpdate(event, signups = [], timeUntil = null) {
        const eventDate = new Date(event.startTime);
        const formattedDate = eventDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        // Create participant list
        let participantList = 'No participants yet';
        if (signups && signups.length > 0) {
            participantList = signups.map((signup, index) => 
                `${index+1}. <@${signup.userId}> (${signup.username || 'Unknown User'})`
            ).join('\n');
        }
        
        // Determine color based on event type
        let color = 0xff9900; // Default orange
        switch(event.type) {
            case 'extraction': color = 0xf44336; break;   // Red
            case 'exploration': color = 0x2196f3; break;  // Blue
            case 'mining': color = 0xffc107; break;       // Yellow
            case 'combat': color = 0x9c27b0; break;       // Purple
            case 'trading': color = 0x4caf50; break;      // Green
        }
        
        // Customize title based on notification type
        let title = `Event: ${event.title}`;
        if (timeUntil) {
            title = `⚠️ ${event.title} starts in ${timeUntil}!`;
        }
        
        // Build the rich embed
        const embed = {
            title: title,
            description: event.description || 'No description provided',
            color: color,
            fields: [
                {
                    name: 'Event Type',
                    value: event.type,
                    inline: true
                },
                {
                    name: 'Date & Time',
                    value: formattedDate,
                    inline: true
                },
                {
                    name: timeUntil ? 'Current Participants' : 'Participants',
                    value: participantList
                },
            ],
            footer: {
                text: `Event ID: ${event.id} • ${event.signupCount || signups.length}/${event.maxParticipants || '∞'} participants`
            }
        }
        
        // Add signup instructions
        let content = timeUntil ? 
            `**Reminder:** ${event.title} starts in ${timeUntil}!` :
            `**New Event:** ${event.title}`;
            
        content += `\n\nTo sign up, use the command: \`/signup ${event.id}\``;
        
        return this.sendWebhookMessage({
            content: content,
            embeds: [embed]
        });
    }
    
    /**
     * Process a Discord command for event signups
     * @param {String} command - The command text (e.g. "/signup 123")
     * @param {Object} user - The Discord user who sent the command
     * @param {Function} signupCallback - Function to handle the signup/removal
     * @returns {Object} - Response to send back to Discord
     */
    async processEventCommand(command, user, signupCallback) {
        // Simple command parsing
        const parts = command.trim().split(' ');
        const action = parts[0].toLowerCase();
        const eventId = parts[1];
        
        if (!eventId) {
            return { content: '⚠️ Missing event ID. Usage: `/signup EVENT_ID` or `/unsignup EVENT_ID`' };
        }
        
        try {
            // Call the provided callback to handle signup/unsignup logic
            const result = await signupCallback(action, eventId, user);
            
            return { 
                content: result.message,
                ephemeral: true // Only visible to the user who triggered it
            };
        } catch (error) {
            console.error('Error processing event command:', error);
            return { 
                content: `⚠️ Error: ${error.message || 'Something went wrong'}`,
                ephemeral: true
            };
        }
    }
}

module.exports = DiscordUtils;
