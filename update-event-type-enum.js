// Database migration script to update the event type ENUM values
// Run this script with: node update-event-type-enum.js

const { initializeDatabase, sequelize } = require('./lib/database');
require('dotenv').config();

async function updateEventTypeEnum() {
    try {
        console.log('Initializing database connection...');
        await initializeDatabase();
        
        console.log('Connected to database, updating event type ENUM...');
        
        // MySQL syntax to modify ENUM type to include new value
        // This alters the column type to include the new value
        const query = `
            ALTER TABLE events 
            MODIFY COLUMN type 
            ENUM('spice-farming', 'raiding-base', 'ore-stravidium', 'ore-titanium', 'dd-extraction', 'dd-base-creation') 
            NOT NULL;
        `;
        
        await sequelize.query(query);
        
        console.log('✅ Successfully updated event type ENUM to include dd-base-creation!');
        console.log('You can now create events with the "DD Base Creation" type.');
        
        // Close the database connection
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating event type ENUM:', error);
        process.exit(1);
    }
}

updateEventTypeEnum();
