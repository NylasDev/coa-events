// Discord utility functions for enhanced Discord integration

const axios = require('axios');

class DiscordUtils {
    constructor(botToken) {
        this.botToken = botToken || process.env.DISCORD_BOT_TOKEN;
        this.baseURL = 'https://discord.com/api/v10';
        
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
            if (error.response?.status === 404) {
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
}

module.exports = DiscordUtils;
