import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

/**
 * User Schema
 *
 * Defines the user account entity for TripMind, enforcing strict field validations,
 * unique email constraints, single-point bcrypt password hashing, and role-based
 * authorization defaults.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Excludes password from default query projections
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
      // SECURITY NOTE: The role field must never be assigned from untrusted client input.
      // Registration controllers must discard or omit client-supplied role payloads.
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password
        delete ret.__v
        return ret
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.password
        delete ret.__v
        return ret
      },
    },
  }
)

/**
 * Single-Point Password Hashing Pre-Save Hook
 *
 * Per PROJECT_RULES.md Section 4.3 and ADR-004, password hashing must occur in
 * exactly one location to prevent double-hashing regressions.
 *
 * Uses bcrypt with 10 salt rounds. Automatically skips hashing when the password
 * field has not been modified (e.g., on profile updates).
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return
  }

  const saltRounds = 10
  const salt = await bcrypt.genSalt(saltRounds)
  this.password = await bcrypt.hash(this.password, salt)
})

/**
 * Compares a candidate plaintext password against the stored bcrypt hash.
 *
 * @param {string} candidatePassword - The plain password provided during login.
 * @returns {Promise<boolean>} True if the password matches, false otherwise.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) {
    return false
  }
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)

export default User
