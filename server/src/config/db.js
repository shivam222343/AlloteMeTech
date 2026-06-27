const mongoose = require('mongoose');

const connectDB = async () => {
  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log(`[DB] MongoDB connected: ${conn.connection.host}`);

      // Reconnect on unexpected disconnects instead of crashing
      mongoose.connection.on('disconnected', () => {
        console.warn('[DB] MongoDB disconnected — attempting reconnect…');
        setTimeout(connectDB, 3000);
      });
      mongoose.connection.on('error', (err) => {
        console.error(`[DB] MongoDB error: ${err.message}`);
      });
      return;
    } catch (err) {
      attempt++;
      console.error(`[DB] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt >= MAX_RETRIES) {
        console.error('[DB] Max retries reached. Exiting.');
        process.exit(1);
      }
      const delay = Math.min(2000 * attempt, 10000); // exponential backoff
      console.log(`[DB] Retrying in ${delay / 1000}s…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

module.exports = connectDB;
