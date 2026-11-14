import mongoose from 'mongoose'
import { config, validateEnv } from './env.js'

/**
 * Maps Mongoose readyState numerical codes to human-readable statuses
 */
const CONNECTION_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

/**
 * Returns current database connection state name
 * @returns {'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown'}
 */
export function getDbStatus() {
  return CONNECTION_STATES[mongoose.connection.readyState] || 'unknown'
}

/**
 * Connects to MongoDB (MongoDB Atlas or local MongoDB instance) using Mongoose
 * Validates environment configuration beforehand and logs status without exposing credentials.
 *
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  // Validate presence of MONGODB_URI before connecting
  validateEnv()

  try {
    const conn = await mongoose.connect(config.mongodbUri)
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`)
    return conn
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`)
    throw error
  }
}

/**
 * Gracefully disconnects from MongoDB
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    console.log('[Database] MongoDB disconnected cleanly.')
  }
}
