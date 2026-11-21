import { Router } from 'express'
import * as destinationController from '../controllers/destinationController.js'

/**
 * Destination Routes
 *
 * Public endpoints for exploring curated destinations.
 * No authentication required for public exploration.
 */
const router = Router()

/**
 * @route   GET /api/destinations
 * @desc    Retrieve all curated destinations (with optional category and search filters)
 * @access  Public
 */
router.get('/', destinationController.getDestinations)

/**
 * @route   GET /api/destinations/:identifier
 * @desc    Retrieve a single destination by unique slug or ID
 * @access  Public
 */
router.get('/:identifier', destinationController.getDestinationByIdentifier)

export default router
