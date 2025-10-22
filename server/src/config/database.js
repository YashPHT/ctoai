const mongoose = require('mongoose');

const connectDB = async (retries = 5, delayMs = 5000) => {
  const options = {
    maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_TIMEOUT || '5000', 10),
    socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
  };

  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/assessli', options);

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Database: ${conn.connection.name}`);
      console.log(`Pool size: ${options.maxPoolSize} (max), ${options.minPoolSize} (min)`);
      
      mongoose.connection.on('error', (err) => {
        console.error(`MongoDB connection error: ${err}`);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully');
      });

      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${i + 1}/${retries} failed: ${error.message}`);
      
      if (i === retries - 1) {
        console.error('All connection attempts failed. Exiting...');
        process.exit(1);
      }
      
      console.log(`Retrying in ${delayMs / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed gracefully');
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

const setupGracefulShutdown = () => {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Closing MongoDB connection...`);
    try {
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
};

module.exports = { connectDB, disconnectDB, setupGracefulShutdown };
