// Database-backed Events Management System for Council of The Ancients
// Author: NylasDev - The Viking Company (https://thevikingcompany.eu)

const moment = require('moment');
const { Event, EventSignup } = require('./database');
const { Op } = require('sequelize');

class DatabaseEventsManager {
    constructor() {
        // Event types for Dune Awakening
        this.eventTypes = {
            'spice-farming': {
                name: 'Spice Farming',
                icon: '🏜️',
                color: '#D4A574',
                description: 'Harvest the precious spice from the desert sands'
            },
            'raiding-base': {
                name: 'Raiding Base',
                icon: '⚔️',
                color: '#B85450',
                description: 'Coordinate attacks on enemy strongholds'
            },
            'ore-farming': {
                name: 'Ore Farming',
                icon: '⛏️',
                color: '#708090',
                description: 'Mining operations for valuable resources'
            }
        };
    }

    // Event types getter (static method for compatibility)
    static getEventTypes() {
        return {
            'spice-farming': {
                name: 'Spice Farming',
                icon: '/icons/events/spice_large_edited.avif',
                color: '#D4A574',
                description: 'Harvest the precious spice from the desert sands'
            },
            'raiding-base': {
                name: 'Raiding Base',
                icon: '⚔️',
                color: '#B85450',
                description: 'Coordinate attacks on enemy strongholds'
            },
            'ore-stravidium': {
                name: 'Stravidium Ore Mining',
                icon: '/icons/events/StravidiumOre.avif',
                color: '#9370DB',
                description: 'Mining operations for rare stravidium deposits'
            },
            'ore-titanium': {
                name: 'Titanium Ore Mining',
                icon: '/icons/events/TitaniumOre.avif',
                color: '#708090',
                description: 'Mining operations for valuable titanium resources'
            },
            'dd-extraction': {
                name: 'DD Extraction Day',
                icon: '/icons/events/explorationpoint_x2.avif',
                color: '#4169E1',
                description: 'Dangerous extraction missions in hostile territories'
            }
        };
    }

    // Check if user can manage events (admin users)
    static canManageEvents(user) {
        if (!user) return false;
        
        // Admin Discord user IDs with full access
        const adminUserIds = [
            '165918844022554624', // Rensc
            '704229390833418250', // Evilkane  
            '152491155030802432'  // Nagorian
        ];
        
        if (adminUserIds.includes(user.id)) {
            return true;
        }

        // Check if user has admin permissions in the allowed guild
        const allowedGuildId = process.env.ALLOWED_GUILD_ID;
        if (user.guilds && allowedGuildId) {
            const guild = user.guilds.find(g => g.id === allowedGuildId);
            if (guild) {
                // Check for administrator permission (permission bit 8)
                const hasAdminPerms = (guild.permissions & 0x8) === 0x8; // Administrator permission
                if (hasAdminPerms) return true;
            }
        }

        // Fallback check for isAdmin flag (for testing or custom setups)
        return user.isAdmin || false;
    }

    // Create a new event
    async createEvent(eventData, createdBy) {
        try {
            const event = await Event.create({
                title: eventData.title,
                type: eventData.type,
                description: eventData.description || '',
                start_time: eventData.startTime,
                end_time: eventData.endTime || null,
                max_participants: eventData.maxParticipants || null,
                created_by_id: createdBy.id,
                created_by_username: createdBy.username
            });

            return this.formatEventForOutput(event);
        } catch (error) {
            console.error('Error creating event:', error);
            throw new Error('Failed to create event');
        }
    }

    // Get all events
    async getAllEvents() {
        try {
            const events = await Event.findAll({
                include: [{
                    model: EventSignup,
                    as: 'signups'
                }],
                order: [['start_time', 'ASC']]
            });

            return events.map(event => this.formatEventForOutput(event));
        } catch (error) {
            console.error('Error fetching events:', error);
            return [];
        }
    }

    // Get events for a specific month
    async getEventsForMonth(year, month) {
        try {
            const startOfMonth = moment.utc([year, month - 1]).startOf('month').toDate();
            const endOfMonth = moment.utc([year, month - 1]).endOf('month').toDate();

            const events = await Event.findAll({
                where: {
                    start_time: {
                        [Op.between]: [startOfMonth, endOfMonth]
                    }
                },
                include: [{
                    model: EventSignup,
                    as: 'signups'
                }],
                order: [['start_time', 'ASC']]
            });

            return events.map(event => this.formatEventForOutput(event));
        } catch (error) {
            console.error('Error fetching events for month:', error);
            return [];
        }
    }

    // Get events for a specific date
    async getEventsForDate(date) {
        try {
            const targetDate = moment.utc(date).format('YYYY-MM-DD');
            
            const events = await Event.findAll({
                where: {
                    start_time: {
                        [Op.gte]: moment.utc(targetDate).startOf('day').toDate(),
                        [Op.lt]: moment.utc(targetDate).endOf('day').toDate()
                    }
                },
                include: [{
                    model: EventSignup,
                    as: 'signups'
                }],
                order: [['start_time', 'ASC']]
            });

            return events.map(event => this.formatEventForOutput(event));
        } catch (error) {
            console.error('Error fetching events for date:', error);
            return [];
        }
    }

    // Get event by ID
    async getEvent(eventId) {
        try {
            const event = await Event.findByPk(eventId, {
                include: [{
                    model: EventSignup,
                    as: 'signups'
                }]
            });

            return event ? this.formatEventForOutput(event) : null;
        } catch (error) {
            console.error('Error fetching event:', error);
            return null;
        }
    }

    // Update event
    async updateEvent(eventId, updateData, updatedBy) {
        try {
            const event = await Event.findByPk(eventId);
            if (!event) return null;

            await event.update({
                title: updateData.title,
                type: updateData.type,
                description: updateData.description,
                start_time: updateData.startTime,
                end_time: updateData.endTime,
                max_participants: updateData.maxParticipants
            });

            // Fetch updated event with signups
            const updatedEvent = await Event.findByPk(eventId, {
                include: [{
                    model: EventSignup,
                    as: 'signups'
                }]
            });

            return this.formatEventForOutput(updatedEvent);
        } catch (error) {
            console.error('Error updating event:', error);
            throw new Error('Failed to update event');
        }
    }

    // Delete event
    async deleteEvent(eventId) {
        try {
            const result = await Event.destroy({
                where: { id: eventId }
            });
            return result > 0;
        } catch (error) {
            console.error('Error deleting event:', error);
            return false;
        }
    }

    // Sign up user for event
    async signUpForEvent(eventId, user) {
        try {
            const event = await Event.findByPk(eventId, {
                include: [{
                    model: EventSignup,
                    as: 'signups'
                }]
            });

            if (!event) {
                return { success: false, message: 'Event not found' };
            }

            // Check if already signed up
            const existingSignup = await EventSignup.findOne({
                where: { event_id: eventId, user_id: user.id }
            });

            if (existingSignup) {
                return { success: false, message: 'Already signed up for this event' };
            }

            // Check max participants
            if (event.max_participants && event.signups.length >= event.max_participants) {
                return { success: false, message: 'Event is full' };
            }

            // Check if event is in the past
            if (event.start_time < new Date()) {
                return { success: false, message: 'Cannot sign up for past events' };
            }

            await EventSignup.create({
                event_id: eventId,
                user_id: user.id,
                username: user.username,
                user_avatar: user.avatar,
                user_discriminator: user.discriminator
            });

            return { success: true, message: 'Successfully signed up for event' };
        } catch (error) {
            console.error('Error signing up for event:', error);
            return { success: false, message: 'Failed to sign up for event' };
        }
    }

    // Remove signup from event
    async removeSignup(eventId, userId) {
        try {
            const result = await EventSignup.destroy({
                where: { event_id: eventId, user_id: userId }
            });
            return result > 0;
        } catch (error) {
            console.error('Error removing signup:', error);
            return false;
        }
    }

    // Get signups for event
    async getEventSignups(eventId) {
        try {
            const signups = await EventSignup.findAll({
                where: { event_id: eventId },
                order: [['created_at', 'ASC']]
            });
            const result = signups.map(signup => ({
                userId: signup.user_id,
                username: signup.username,
                avatar: signup.user_avatar,
                discriminator: signup.user_discriminator,
                createdAt: signup.created_at
            }));
            
            return result;
        } catch (error) {
            console.error('Error fetching event signups:', error);
            return [];
        }
    }

    // Get signup count for event
    async getEventSignupCount(eventId) {
        try {
            const count = await EventSignup.count({
                where: { event_id: eventId }
            });
            return count;
        } catch (error) {
            console.error('Error fetching event signup count:', error);
            return 0;
        }
    }

    // Check if user is signed up for event
    async isUserSignedUp(eventId, userId) {
        try {
            const signup = await EventSignup.findOne({
                where: { event_id: eventId, user_id: userId }
            });
            return !!signup;
        } catch (error) {
            console.error('Error checking user signup:', error);
            return false;
        }
    }

    // Get calendar data for a specific month
    async getCalendarData(year, month) {
        try {
            const events = await this.getEventsForMonth(year, month);
            const eventTypes = DatabaseEventsManager.getEventTypes();
            
            // Group events by date
            const eventsByDate = {};
            events.forEach(event => {
                const dateKey = moment.utc(event.startTime).format('YYYY-MM-DD');
                if (!eventsByDate[dateKey]) {
                    eventsByDate[dateKey] = [];
                }
                
                eventsByDate[dateKey].push({
                    ...event,
                    eventTypeInfo: eventTypes[event.type]
                });
            });

            return eventsByDate;
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            return {};
        }
    }

    // Helper method to format event for output
    formatEventForOutput(event) {
        return {
            id: event.id,
            title: event.title,
            type: event.type,
            description: event.description,
            startTime: event.start_time,
            endTime: event.end_time,
            maxParticipants: event.max_participants,
            createdBy: {
                id: event.created_by_id,
                username: event.created_by_username
            },
            createdAt: event.created_at,
            updatedAt: event.updated_at,
            signupCount: event.signups ? event.signups.length : 0
        };
    }

    // Initialize sample events (disabled to start with clean slate)
    async initializeSampleEvents() {
        try {
            console.log('✅ Sample events initialization skipped - starting with clean database.');
        } catch (error) {
            console.error('❌ Error in sample events initialization:', error);
        }
    }
}

module.exports = DatabaseEventsManager;
