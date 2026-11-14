import app from './src/app.js'
import { config, validateEnv } from './src/config/env.js'
import { connectDB, disconnectDB } from './src/config/db.js'

let server = null

/**
 * Initiates the backend lifecycle:
 * 1. Validates required environment variables
 * 2. Connects to MongoDB (local instance or MongoDB Atlas)
 * 3. Starts Express HTTP listener on the configured port
 */
async function startServer() {
  try {
    // 1. Validate environment configuration
    validateEnv()

    // 2. Connect to MongoDB
    await connectDB()

    // 3. Start HTTP server
    server = app.listen(config.port, () => {
      console.log(
        `[Server] TripMind backend running on http://localhost:${config.port} (${config.nodeEnv})`
      )
      console.log(`[Server] CORS configured for client origin: ${config.clientUrl}`)
    })
  } catch (error) {
    console.error(`[Server] Startup failed: ${error.message}`)
    process.exit(1)
  }
}

/**
 * Handles graceful shutdown on SIGINT and SIGTERM
 * Closes the HTTP server first to stop accepting new requests, then cleanly disconnects Mongoose.
 *
 * @param {string} signal
 */
async function handleShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`)

  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.')
      try {
        await disconnectDB()
      } catch (err) {
        console.error('[Server] Error disconnecting database:', err.message)
      } finally {
        process.exit(0)
      }
    })
  } else {
    try {
      await disconnectDB()
    } finally {
      process.exit(0)
    }
  }
}

// Register process signal listeners
process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))

// Handle unexpected rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason)
})

startServer()
