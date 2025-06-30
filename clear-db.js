const { sequelize, Event, EventSignup } = require('./lib/database');

async function clearDatabase() {
    try {
        console.log('Clearing existing events and signups...');
        
        // Delete all signups first (due to foreign key constraints)
        await EventSignup.destroy({ where: {} });
        console.log('✅ All signups cleared');
        
        // Delete all events
        await Event.destroy({ where: {} });
        console.log('✅ All events cleared');
        
        console.log('✅ Database cleared successfully - ready for fresh events!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
