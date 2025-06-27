// Events Management System for Council of The Ancients
// Author: NylasDev - The Viking Company (https://thevikingcompany.eu)

const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class EventsManager {
    constructor() {
        // In-memory storage for demo. In production, use a database
        this.events = new Map();
        this.eventSignups = new Map(); // eventId -> Set of userIds
        this.initializeSampleEvents();
    }

    // Event types for Dune Awakening
    static getEventTypes() {
        return {
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

    // Check if user can manage events (admin or NylasDev)
    static canManageEvents(user) {
        if (!user) return false;
        
        // NylasDev has full access
        if (user.username.toLowerCase() === 'nylas' || user.username.toLowerCase() === 'nylasdev') {
            return true;
        }

        // Check if user has admin role in the guild
        // This would need to be implemented with Discord API calls
        // For now, we'll use a simple check
        return user.isAdmin || false;
    }

    // Create a new event
    createEvent(eventData, createdBy) {
        const eventId = uuidv4();
        const event = {
            id: eventId,
            title: eventData.title,
            type: eventData.type,
            description: eventData.description || '',
            startTime: new Date(eventData.startTime),
            endTime: eventData.endTime ? new Date(eventData.endTime) : null,
            maxParticipants: eventData.maxParticipants || null,
            createdBy: createdBy,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.events.set(eventId, event);
        this.eventSignups.set(eventId, new Set());

        return event;
    }

    // Get all events
    getAllEvents() {
        return Array.from(this.events.values()).sort((a, b) => a.startTime - b.startTime);
    }

    // Get events for a specific month
    getEventsForMonth(year, month) {
        const startOfMonth = moment.utc([year, month - 1]).startOf('month');
        const endOfMonth = moment.utc([year, month - 1]).endOf('month');

        return this.getAllEvents().filter(event => {
            const eventDate = moment.utc(event.startTime);
            return eventDate.isBetween(startOfMonth, endOfMonth, null, '[]');
        });
    }

    // Get events for a specific date
    getEventsForDate(date) {
        const targetDate = moment.utc(date).format('YYYY-MM-DD');
        
        return this.getAllEvents().filter(event => {
            const eventDate = moment.utc(event.startTime).format('YYYY-MM-DD');
            return eventDate === targetDate;
        });
    }

    // Get event by ID
    getEvent(eventId) {
        return this.events.get(eventId);
    }

    // Update event
    updateEvent(eventId, updateData, updatedBy) {
        const event = this.events.get(eventId);
        if (!event) return null;

        const updatedEvent = {
            ...event,
            ...updateData,
            updatedAt: new Date(),
            updatedBy: updatedBy
        };

        this.events.set(eventId, updatedEvent);
        return updatedEvent;
    }

    // Delete event
    deleteEvent(eventId) {
        const deleted = this.events.delete(eventId);
        if (deleted) {
            this.eventSignups.delete(eventId);
        }
        return deleted;
    }

    // Sign up user for event
    signUpForEvent(eventId, userId, username) {
        const event = this.events.get(eventId);
        if (!event) return { success: false, message: 'Event not found' };

        const signups = this.eventSignups.get(eventId);
        if (signups.has(userId)) {
            return { success: false, message: 'Already signed up for this event' };
        }

        // Check max participants
        if (event.maxParticipants && signups.size >= event.maxParticipants) {
            return { success: false, message: 'Event is full' };
        }

        // Check if event is in the past
        if (event.startTime < new Date()) {
            return { success: false, message: 'Cannot sign up for past events' };
        }

        signups.add(userId);
        return { success: true, message: 'Successfully signed up for event' };
    }

    // Remove signup from event
    removeSignup(eventId, userId) {
        const signups = this.eventSignups.get(eventId);
        if (!signups) return false;

        return signups.delete(userId);
    }

    // Get signups for event
    getEventSignups(eventId) {
        return this.eventSignups.get(eventId) || new Set();
    }

    // Get all signups with user info
    getEventSignupsWithUsers(eventId, userCache = new Map()) {
        const signups = this.getEventSignups(eventId);
        return Array.from(signups).map(userId => {
            return userCache.get(userId) || { id: userId, username: 'Unknown User' };
        });
    }

    // Check if user is signed up for event
    isUserSignedUp(eventId, userId) {
        const signups = this.eventSignups.get(eventId);
        return signups ? signups.has(userId) : false;
    }

    // Get calendar data for a specific month
    getCalendarData(year, month) {
        const events = this.getEventsForMonth(year, month);
        const eventTypes = EventsManager.getEventTypes();
        
        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            const dateKey = moment.utc(event.startTime).format('YYYY-MM-DD');
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            
            const signups = this.getEventSignups(event.id);
            eventsByDate[dateKey].push({
                ...event,
                signupCount: signups.size,
                eventTypeInfo: eventTypes[event.type]
            });
        });

        return eventsByDate;
    }

    // Initialize some sample events for demonstration
    initializeSampleEvents() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Sample events
        this.createEvent({
            title: 'Daily Spice Harvest',
            type: 'spice-farming',
            description: 'Gather at the southern dunes for our daily spice collection. Bring your harvesters!',
            startTime: tomorrow.toISOString(),
            maxParticipants: 15
        }, { id: 'system', username: 'NylasDev' });

        this.createEvent({
            title: 'Raid on Harkonnen Outpost',
            type: 'raiding-base',
            description: 'Strategic assault on the Harkonnen mining facility. Combat gear required.',
            startTime: nextWeek.toISOString(),
            maxParticipants: 10
        }, { id: 'system', username: 'NylasDev' });

        this.createEvent({
            title: 'Solari Ore Expedition',
            type: 'ore-farming',
            description: 'Mining expedition to the crystal caves. Expect heavy resistance.',
            startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            maxParticipants: 20
        }, { id: 'system', username: 'NylasDev' });
    }
}

module.exports = EventsManager;
