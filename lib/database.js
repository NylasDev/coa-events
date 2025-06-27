// Database Configuration and Models for COA Events
// Author: NylasDev - The Viking Company (https://thevikingcompany.eu)

const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DATABASE_NAME || 'coa_events',
    process.env.DATABASE_USER || 'root',
    process.env.DATABASE_PASSWORD || '',
    {
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Define Event model
const Event = sequelize.define('Event', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [1, 255]
        }
    },
    type: {
        type: DataTypes.ENUM('spice-farming', 'raiding-base', 'ore-farming'),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    max_participants: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        }
    },
    created_by_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    created_by_username: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'events',
    indexes: [
        {
            fields: ['start_time']
        },
        {
            fields: ['type']
        },
        {
            fields: ['created_by_id']
        }
    ]
});

// Define EventSignup model
const EventSignup = sequelize.define('EventSignup', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Event,
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'event_signups',
    indexes: [
        {
            unique: true,
            fields: ['event_id', 'user_id']
        }
    ]
});

// Define associations
Event.hasMany(EventSignup, {
    foreignKey: 'event_id',
    as: 'signups',
    onDelete: 'CASCADE'
});

EventSignup.belongsTo(Event, {
    foreignKey: 'event_id',
    as: 'event'
});

// Database connection test and initialization
async function initializeDatabase() {
    try {
        // Test the connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        
        // Sync models (create tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized successfully.');
        
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        console.error('💡 Make sure your MySQL server is running and the database exists.');
        console.error('💡 You may need to create the database manually:');
        console.error(`   CREATE DATABASE ${process.env.DATABASE_NAME || 'coa_events'};`);
        return false;
    }
}

// Create database if it doesn't exist
async function createDatabaseIfNotExists() {
    const tempSequelize = new Sequelize(
        'mysql', // Connect to mysql database to create our database
        process.env.DATABASE_USER || 'root',
        process.env.DATABASE_PASSWORD || '',
        {
            host: process.env.DATABASE_HOST || 'localhost',
            port: process.env.DATABASE_PORT || 3306,
            dialect: 'mysql',
            logging: false
        }
    );

    try {
        await tempSequelize.authenticate();
        const databaseName = process.env.DATABASE_NAME || 'coa_events';
        
        // Create database if it doesn't exist
        await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;`);
        console.log(`✅ Database '${databaseName}' created or already exists.`);
        
        await tempSequelize.close();
        return true;
    } catch (error) {
        console.error('❌ Failed to create database:', error.message);
        await tempSequelize.close();
        return false;
    }
}

module.exports = {
    sequelize,
    Event,
    EventSignup,
    initializeDatabase,
    createDatabaseIfNotExists
};
