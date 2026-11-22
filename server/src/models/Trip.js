import mongoose from 'mongoose'

/**
 * Activity Subdocument Schema
 *
 * Defines scheduled events, stops, lodgings, or transit items within an itinerary day.
 * Includes optional geographical coordinates for Leaflet/OSM map rendering,
 * estimated cost for budget computation, and category tagging.
 */
const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
      minlength: [1, 'Activity title cannot be empty'],
      maxlength: [150, 'Activity title cannot exceed 150 characters'],
      alias: 'name',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Activity description cannot exceed 1000 characters'],
      default: '',
    },
    timeSlot: {
      type: String,
      trim: true,
      default: 'morning',
      maxlength: [50, 'Time slot cannot exceed 50 characters'],
    },
    time: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Time string cannot exceed 20 characters'],
    },
    duration: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Duration cannot exceed 50 characters'],
    },
    locationName: {
      type: String,
      trim: true,
      maxlength: [200, 'Location name cannot exceed 200 characters'],
      default: '',
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
      default: null,
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
      default: null,
    },
    estimatedCost: {
      type: Number,
      min: [0, 'Estimated cost cannot be negative'],
      default: 0,
    },
    costBreakdown: {
      type: String,
      trim: true,
      maxlength: [200, 'Cost breakdown cannot exceed 200 characters'],
      default: '',
    },
    category: {
      type: String,
      enum: {
        values: ['stay', 'food', 'transit', 'activity', 'other'],
        message: '{VALUE} is not a valid activity category',
      },
      default: 'activity',
      trim: true,
      lowercase: true,
    },
    location: {
      type: {
        name: { type: String, trim: true, default: '' },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        address: { type: String, trim: true, default: '' },
      },
      _id: false,
    },
  },
  { _id: true }
)

/**
 * Itinerary Day Subdocument Schema
 *
 * Defines sequential travel days embedded within the parent Trip document.
 * Contains day numbering, optional theme/title, day-level notes, and an embedded
 * array of scheduled activities.
 */
const itineraryDaySchema = new mongoose.Schema(
  {
    dayNumber: {
      type: Number,
      required: [true, 'Day number is required'],
      min: [1, 'Day number must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Day number must be an integer',
      },
    },
    date: {
      type: Date,
      default: null,
    },
    theme: {
      type: String,
      trim: true,
      maxlength: [150, 'Day theme cannot exceed 150 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Day notes cannot exceed 1000 characters'],
      default: '',
    },
    activities: {
      type: [activitySchema],
      default: [],
    },
  },
  { _id: true }
)

/**
 * Categorical Budget Breakdown Subdocument Schema
 *
 * Itemizes expenditure allocation across key travel categories.
 */
const categoryBreakdownSchema = new mongoose.Schema(
  {
    accommodation: {
      type: Number,
      min: [0, 'Accommodation expense cannot be negative'],
      default: 0,
    },
    food: {
      type: Number,
      min: [0, 'Food expense cannot be negative'],
      default: 0,
    },
    transportation: {
      type: Number,
      min: [0, 'Transportation expense cannot be negative'],
      default: 0,
    },
    activities: {
      type: Number,
      min: [0, 'Activities expense cannot be negative'],
      default: 0,
    },
    localTransport: {
      type: Number,
      min: [0, 'Local transport expense cannot be negative'],
      default: 0,
    },
    miscellaneous: {
      type: Number,
      min: [0, 'Miscellaneous expense cannot be negative'],
      default: 0,
    },
    other: {
      type: Number,
      min: [0, 'Other expenses cannot be negative'],
      default: 0,
    },
  },
  { _id: false }
)

/**
 * Budget Summary Subdocument Schema
 *
 * Embedded financial tracking summary representing total estimated costs,
 * actual spend, remaining budget, and categorical expense distribution.
 */
const budgetSummarySchema = new mongoose.Schema(
  {
    totalEstimated: {
      type: Number,
      min: [0, 'Total estimated budget cannot be negative'],
      default: 0,
    },
    totalSpent: {
      type: Number,
      min: [0, 'Total spent cannot be negative'],
      default: 0,
    },
    remaining: {
      type: Number,
      default: 0,
    },
    perPersonCost: {
      type: Number,
      min: [0, 'Per person cost cannot be negative'],
      default: 0,
    },
    budgetUtilization: {
      type: Number,
      min: [0, 'Budget utilization cannot be negative'],
      default: 0,
    },
    categories: {
      type: categoryBreakdownSchema,
      default: () => ({}),
      alias: 'categoryBreakdown',
    },
  },
  { _id: false }
)

/**
 * Travel Preferences Subdocument Schema
 *
 * Captures traveler style, pace, accommodation preference, transit preference,
 * and dietary constraints to guide future AI itinerary generation and customization.
 */
const travelPreferencesSchema = new mongoose.Schema(
  {
    pace: {
      type: String,
      enum: {
        values: ['relaxed', 'moderate', 'fast-paced'],
        message: '{VALUE} is not a valid pace preference',
      },
      default: 'moderate',
      trim: true,
      lowercase: true,
    },
    accommodationType: {
      type: String,
      trim: true,
      default: 'hotel',
      maxlength: [50, 'Accommodation type cannot exceed 50 characters'],
    },
    transportation: {
      type: String,
      trim: true,
      default: 'any',
      maxlength: [50, 'Transportation preference cannot exceed 50 characters'],
    },
    dietary: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [50, 'Dietary restriction cannot exceed 50 characters'],
        },
      ],
      validate: [
        {
          validator: function (val) {
            return !val || val.length <= 20
          },
          message: 'Dietary preferences array cannot exceed 20 items',
        },
      ],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Preference notes cannot exceed 500 characters'],
      default: '',
    },
  },
  { _id: false }
)

/**
 * Share Settings Subdocument Schema
 *
 * Manages public, read-only itinerary link sharing.
 * Stores cryptographically secure SHA-256 token hash for indexed lookup,
 * AES-256-GCM encrypted token for authenticated owner retrieval,
 * and toggles for public status and budget visibility.
 */
const shareSettingsSchema = new mongoose.Schema(
  {
    isShared: {
      type: Boolean,
      default: false,
      index: true,
    },
    shareTokenHash: {
      type: String,
      default: null,
      index: {
        unique: true,
        partialFilterExpression: {
          'shareSettings.shareTokenHash': { $type: 'string' },
        },
      },
    },
    shareTokenEncrypted: {
      type: String,
      default: null,
    },
    sharedAt: {
      type: Date,
      default: null,
    },
    includeBudget: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
)

/**
 * Trip Schema
 *
 * Core travel itinerary entity for TripMind. Stores trip metadata, traveler
 * configuration, ownership reference to User, embedded day-by-day itineraries,
 * and embedded categorical budget breakdown.
 *
 * Implements strict date validation ensuring return date is later than departure date,
 * non-negative budget validation, integer traveller counts, and compound query indexing.
 */
const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [150, 'Trip title cannot exceed 150 characters'],
      default: function () {
        return this.destination ? `Trip to ${this.destination}` : 'New Trip'
      },
    },
    startingLocation: {
      type: String,
      required: [true, 'Starting location is required'],
      trim: true,
      minlength: [2, 'Starting location must be at least 2 characters long'],
      maxlength: [100, 'Starting location cannot exceed 100 characters'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      minlength: [2, 'Destination must be at least 2 characters long'],
      maxlength: [100, 'Destination cannot exceed 100 characters'],
    },
    departureDate: {
      type: Date,
      required: [true, 'Departure date is required'],
      alias: 'startDate',
    },
    returnDate: {
      type: Date,
      required: [true, 'Return date is required'],
      alias: 'endDate',
      validate: {
        validator: function (value) {
          if (!value || !this.departureDate) {
            return true
          }
          return new Date(value).getTime() > new Date(this.departureDate).getTime()
        },
        message: 'Return date must be later than departure date',
      },
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [0, 'Budget must be a non-negative number'],
      alias: 'totalBudget',
    },
    numberOfTravellers: {
      type: Number,
      required: [true, 'Number of travellers is required'],
      min: [1, 'Number of travellers must be at least 1'],
      max: [50, 'Number of travellers cannot exceed 50'],
      validate: {
        validator: Number.isInteger,
        message: 'Number of travellers must be an integer',
      },
      default: 1,
      alias: 'travellers',
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
      minlength: [3, 'Currency code must be 3 characters'],
      maxlength: [3, 'Currency code must be 3 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'upcoming', 'completed'],
        message: '{VALUE} is not a valid trip status',
      },
      default: 'draft',
      trim: true,
      lowercase: true,
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Cover image URL cannot exceed 500 characters'],
    },
    interests: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [50, 'Interest cannot exceed 50 characters'],
        },
      ],
      validate: [
        {
          validator: function (val) {
            return !val || val.length <= 30
          },
          message: 'Interests array cannot exceed 30 items',
        },
      ],
      default: [],
    },
    travelPreferences: {
      type: travelPreferencesSchema,
      default: () => ({}),
    },
    days: {
      type: [itineraryDaySchema],
      default: [],
      alias: 'itinerary',
    },
    budgetSummary: {
      type: budgetSummarySchema,
      default: () => ({}),
      alias: 'budgetBreakdown',
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [2000, 'Trip summary cannot exceed 2000 characters'],
      default: '',
    },
    travelTips: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [500, 'Travel tip cannot exceed 500 characters'],
        },
      ],
      default: [],
    },
    shareSettings: {
      type: shareSettingsSchema,
      default: () => ({
        isShared: false,
        shareTokenHash: null,
        shareTokenEncrypted: null,
        sharedAt: null,
        includeBudget: true,
      }),
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v
        if (ret.shareSettings) {
          delete ret.shareSettings.shareTokenHash
          delete ret.shareSettings.shareTokenEncrypted
        }
        return ret
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v
        if (ret.shareSettings) {
          delete ret.shareSettings.shareTokenHash
          delete ret.shareSettings.shareTokenEncrypted
        }
        return ret
      },
    },
  }
)

/**
 * Compound Index Strategy
 *
 * Optimizes user dashboard queries that retrieve all trips for a specific user
 * sorted by creation date descending.
 */
tripSchema.index({ userId: 1, createdAt: -1 })

const Trip = mongoose.model('Trip', tripSchema)

export default Trip
export {
  tripSchema,
  itineraryDaySchema,
  activitySchema,
  budgetSummarySchema,
  categoryBreakdownSchema,
  travelPreferencesSchema,
}
