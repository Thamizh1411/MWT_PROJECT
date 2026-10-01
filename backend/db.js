const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in backend/.env');
    }

    console.log('[Database] Connecting to MongoDB Atlas...');

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `[Database] MongoDB Connected: ${conn.connection.host} / ${conn.connection.name}`
    );
  } catch (error) {
    console.error(
      '[Database Error] Failed to connect to MongoDB:',
      error.message
    );

    process.exit(1);
  }
};

module.exports = connectDB;