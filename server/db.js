import mongoose from 'mongoose';

let connectionPromise = null;

export function hasMongoConfig() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectDb() {
  if (!hasMongoConfig()) return null;
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 5
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
  return mongoose.connection;
}
