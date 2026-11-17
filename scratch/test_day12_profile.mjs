import http from 'http'
import mongoose from '../server/node_modules/mongoose/index.js'
import jwt from '../server/node_modules/jsonwebtoken/index.js'
import { config, validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken } from '../server/src/utils/token.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'

async function runTests() {
  console.log('--- Starting TripMind Day 12 Protected Routes & Profile API Tests ---\n')
  validateEnv()
  await connectDB()

  let testsPassed = 0
  let testsFailed = 0

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`[PASS] ${message}`)
      testsPassed++
    } else {
      console.error(`[FAIL] ${message}`)
      if (detail) console.error(`       Detail:`, detail)
      testsFailed++
    }
  }

  // Start real Express app on ephemeral port
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`Ephemeral test server listening on ${baseUrl}`)

  const emailA = 'day12_user_a@example.com'
  const emailB = 'day12_user_b@example.com'
  const emailC = 'day12_user_c@example.com'
  const password = 'SecurePassword123!'

  try {
    // 0. Clean up any leftover records
    await User.deleteMany({ email: { $in: [emailA, emailB, emailC] } })

    // Setup: Register User A and User B
    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Day12 User A', email: emailA, password }),
    })
    const regBodyA = await regResA.json()
    const userIdA = regBodyA.data?.user?.id

    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Day12 User B', email: emailB, password }),
    })
    const regBodyB = await regResB.json()
    const userIdB = regBodyB.data?.user?.id

    assert(userIdA && userIdB, 'Setup: Registered User A and User B')

    // Setup: Log in User A to get valid cookie
    const loginResA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password }),
    })
    const loginCookieA = loginResA.headers.get('set-cookie') || ''
    const tokenMatchA = loginCookieA.match(/token=([^;]+)/)
    const tokenA = tokenMatchA ? tokenMatchA[1] : null
    assert(tokenA !== null, 'Setup: Obtained valid login cookie token for User A')

    // Test 1: Valid authenticated request returns HTTP 200
    const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${tokenA}` },
    })
    const profileBody = await profileRes.json()
    assert(
      profileRes.status === 200 &&
        profileBody.success === true &&
        profileBody.message === 'Profile retrieved successfully',
      'Test 1: Valid authenticated request returns HTTP 200 with standard envelope',
      profileBody
    )

    // Test 2: Returned profile belongs to the logged-in user
    const profileUser = profileBody.data?.user
    assert(
      profileUser?.id === userIdA &&
        profileUser?.email === emailA &&
        profileUser?.name === 'Day12 User A' &&
        profileUser?.role === 'user' &&
        Boolean(profileUser?.createdAt) &&
        !isNaN(new Date(profileUser?.createdAt).getTime()),
      'Test 2: Returned profile correctly belongs to the logged-in user (id, name, email, role, createdAt)',
      profileUser
    )

    // Test 3: Password hash is absent from the response
    const userInDb = await User.findById(userIdA).select('+password')
    assert(
      profileUser?.password === undefined &&
        profileUser?.passwordHash === undefined &&
        !JSON.stringify(profileBody).includes(userInDb.password),
      'Test 3: Password and bcrypt hash are strictly absent from profile response'
    )

    // Test 4: JWT is absent from response body
    assert(
      profileBody.token === undefined &&
        profileBody.data?.token === undefined &&
        !JSON.stringify(profileBody).includes(tokenA),
      'Test 4: JWT is strictly absent from JSON response body'
    )

    // Test 5: Missing cookie returns HTTP 401
    const noCookieRes = await fetch(`${baseUrl}/api/auth/me`)
    const noCookieBody = await noCookieRes.json()
    assert(
      noCookieRes.status === 401 &&
        noCookieBody.success === false &&
        noCookieBody.error?.code === 'UNAUTHORIZED' &&
        noCookieBody.error?.message === 'Authentication required. No token provided.',
      'Test 5: Missing cookie returns HTTP 401 Unauthorized',
      noCookieBody
    )

    // Test 6: Invalid token returns HTTP 401
    const invalidTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: 'token=invalid.jwt.token' },
    })
    const invalidTokenBody = await invalidTokenRes.json()
    assert(
      invalidTokenRes.status === 401 &&
        invalidTokenBody.success === false &&
        invalidTokenBody.error?.code === 'UNAUTHORIZED',
      'Test 6: Invalid token returns HTTP 401 Unauthorized',
      invalidTokenBody
    )

    // Test 7: Expired token returns HTTP 401
    const expiredToken = jwt.sign(
      { sub: userIdA, iat: Math.floor(Date.now() / 1000) - 3600 },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '0s' }
    )
    const expiredTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${expiredToken}` },
    })
    const expiredTokenBody = await expiredTokenRes.json()
    assert(
      expiredTokenRes.status === 401 &&
        expiredTokenBody.success === false &&
        expiredTokenBody.error?.code === 'UNAUTHORIZED',
      'Test 7: Expired token returns HTTP 401 Unauthorized',
      expiredTokenBody
    )

    // Test 8: Deleted/nonexistent user returns HTTP 404
    const ghostId = new mongoose.Types.ObjectId().toString()
    const ghostToken = generateToken(ghostId)
    const ghostRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${ghostToken}` },
    })
    const ghostBody = await ghostRes.json()
    assert(
      ghostRes.status === 404 &&
        ghostBody.success === false &&
        ghostBody.error?.code === 'USER_NOT_FOUND' &&
        ghostBody.error?.message === 'User not found' &&
        Array.isArray(ghostBody.error?.details) &&
        ghostBody.error?.details.length === 0,
      'Test 8: Valid token for deleted/nonexistent user returns HTTP 404 USER_NOT_FOUND',
      ghostBody
    )

    // Test 9: Malformed user identity handled safely (invalid ObjectId string in sub)
    const malformedToken = jwt.sign(
      { sub: 'not-an-objectid-123' },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '15m' }
    )
    const malformedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${malformedToken}` },
    })
    const malformedBody = await malformedRes.json()
    assert(
      malformedRes.status === 400 &&
        malformedBody.success === false &&
        malformedBody.error?.code === 'INVALID_ID' &&
        malformedBody.error?.message === 'Invalid user ID format',
      'Test 9: Malformed user identity (invalid ObjectId in token sub) handled safely with HTTP 400',
      malformedBody
    )

    // Test 10: Request cannot select another user's profile via query/body manipulation
    const tamperRes = await fetch(
      `${baseUrl}/api/auth/me?userId=${userIdB}&id=${userIdB}`,
      {
        method: 'GET',
        headers: {
          Cookie: `token=${tokenA}`,
          'Content-Type': 'application/json',
        },
      }
    )
    const tamperBody = await tamperRes.json()
    assert(
      tamperRes.status === 200 &&
        tamperBody.data?.user?.id === userIdA &&
        tamperBody.data?.user?.email === emailA &&
        tamperBody.data?.user?.id !== userIdB,
      'Test 10: Profile endpoint strictly ignores query/body params and only returns authenticated user (User A)',
      tamperBody
    )

    // Test 11: Existing registration API still works
    const regResC = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Day12 User C', email: emailC, password }),
    })
    const regBodyC = await regResC.json()
    assert(
      regResC.status === 201 &&
        regBodyC.success === true &&
        regBodyC.data?.user?.email === emailC,
      'Test 11: Existing registration endpoint still registers new users successfully (HTTP 201)',
      regBodyC
    )

    // Test 12: Existing login API still works
    const loginResC = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailC, password }),
    })
    const loginBodyC = await loginResC.json()
    const setCookieC = loginResC.headers.get('set-cookie') || ''
    assert(
      loginResC.status === 200 &&
        loginBodyC.success === true &&
        loginBodyC.data?.user?.email === emailC &&
        setCookieC.includes('token='),
      'Test 12: Existing login endpoint still authenticates and sets HttpOnly cookie (HTTP 200)',
      loginBodyC
    )

    // Test 13: Health endpoint still works
    const healthRes = await fetch(`${baseUrl}/api/health`)
    const healthBody = await healthRes.json()
    assert(
      healthRes.status === 200 &&
        healthBody.success === true &&
        healthBody.data?.status === 'healthy' &&
        healthBody.data?.database === 'connected',
      'Test 13: Existing health endpoint returns HTTP 200 with healthy and connected status',
      healthBody
    )

    // Clean up temporary users
    await User.deleteMany({ email: { $in: [emailA, emailB, emailC] } })
    console.log('\nCleaned up all temporary test records from MongoDB.')
  } catch (err) {
    console.error('Test execution error:', err)
    testsFailed++
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await disconnectDB()
    console.log(`\n--- Test Summary: ${testsPassed} Passed, ${testsFailed} Failed ---`)
  }

  process.exit(testsFailed > 0 ? 1 : 0)
}

runTests()
