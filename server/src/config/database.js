const mongoose = require('mongoose');

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

const connectionOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_TIMEOUT || '5000', 10),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true,
  w: 'majority'
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  return uri;
}

async function connectWithRetry() {
  const uri = getMongoUri();
  
  while (connectionAttempts < MAX_RETRY_ATTEMPTS) {
    try {
      connectionAttempts++;
      console.log(`[MongoDB] Connection attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}...`);
      
      await mongoose.connect(uri, connectionOptions);
      
      isConnected = true;
      console.log('[MongoDB] Successfully connected to MongoDB');
      console.log(`[MongoDB] Database: ${mongoose.connection.name}`);
      console.log(`[MongoDB] Host: ${mongoose.connection.host}`);
      
      return mongoose.connection;
    } catch (error) {
      console.error(`[MongoDB] Connection attempt ${connectionAttempts} failed:`, error.message);
      
      if (connectionAttempts >= MAX_RETRY_ATTEMPTS) {
        console.error('[MongoDB] Max retry attempts reached. Could not connect to MongoDB.');
        throw new Error(`Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts: ${error.message}`);
      }
      
      console.log(`[MongoDB] Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

async function connect() {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('[MongoDB] Using existing connection');
    return mongoose.connection;
  }
  
  return await connectWithRetry();
}

async function disconnect() {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error('[MongoDB] Error during disconnect:', error.message);
    throw error;
  }
}

function setupEventHandlers() {
  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Connection established');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
    isConnected = false;
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('[MongoDB] Connection disconnected');
    isConnected = false;
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Connection re-established');
    isConnected = true;
  });
  
  // Handle process termination
  process.on('SIGINT', async () => {
    await disconnect();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await disconnect();
    process.exit(0);
  });
}

function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    isConnected,
    readyState: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host || 'N/A',
    name: mongoose.connection.name || 'N/A',
    models: Object.keys(mongoose.connection.models)
  };
}

module.exports = {
  connect,
  disconnect,
  setupEventHandlers,
  getConnectionStatus,
  mongoose
};
