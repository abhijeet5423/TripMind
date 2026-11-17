import http from 'http'
import express from '../server/node_modules/express/index.js'
import cookieParser from '../server/node_modules/cookie-parser/index.js'
import jwt from '../server/node_modules/jsonwebtoken/index.js'
import mongoose from '../server/node_modules/mongoose/index.js'
import { config, validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import { generateToken, verifyToken } from '../server/src/utils/token.js'
import { authenticateToken } from '../server/src/middleware/authMiddleware.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'

async function runTests() {
  console.log('--- Starting TripMind Day 11 Authentication Middleware Tests ---\n')
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

  // Set up ephemeral test server with protected route harness
  const testApp = express()
  testApp.use(cookieParser())
  testApp.get('/test-protected', authenticateToken, (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
      message: 'Protected route accessed successfully',
    })
  })

  // Start test harness server
  const testServer = http.createServer(testApp)
  await new Promise((resolve) => testServer.listen(0, resolve))
  const testPort = testServer.address().port
  const testBaseUrl = `http://127.0.0.1:${testPort}`

  // Start real app server for regressions
  const realServer = http.createServer(app)
  await new Promise((resolve) => realServer.listen(0, resolve))
  const realPort = realServer.address().port
  const realBaseUrl = `http://127.0.0.1:${realPort}`

  const dummyUserId = '6736a18d2b99bc5d09f7a112'
  const regEmail = 'day11_test_user@example.com'
  const regPassword = 'SecurePassword123!'
  const regName = 'Day11 User'

  try {
    // Clean up any existing records
    await User.deleteMany({ email: regEmail })

    // Test 1: Missing cookie -> 401
    const res1 = await fetch(`${testBaseUrl}/test-protected`)
    const body1 = await res1.json()
    assert(
      res1.status === 401 &&
        body1.success === false &&
        body1.error?.code === 'UNAUTHORIZED' &&
        body1.error?.message === 'Authentication required. No token provided.' &&
        Array.isArray(body1.error?.details) &&
        body1.error?.details.length === 0,
      'Test 1: Missing token cookie returns HTTP 401 Unauthorized',
      body1
    )

    // Test 2: Malformed JWT -> 401
    const res2 = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: 'token=not-a-valid-jwt-token-format' },
    })
    const body2 = await res2.json()
    assert(
      res2.status === 401 &&
        body2.success === false &&
        body2.error?.code === 'UNAUTHORIZED' &&
        body2.error?.message === 'Invalid or expired authentication token. Please log in again.',
      'Test 2: Malformed JWT returns HTTP 401 Unauthorized',
      body2
    )

    // Test 3: Invalid signature -> 401
    const invalidSignatureToken = jwt.sign(
      { sub: dummyUserId },
      'wrong-secret-key-for-signature-testing-32chars',
      { algorithm: 'HS256', expiresIn: '15m' }
    )
    const res3 = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: `token=${invalidSignatureToken}` },
    })
    const body3 = await res3.json()
    assert(
      res3.status === 401 &&
        body3.success === false &&
        body3.error?.code === 'UNAUTHORIZED' &&
        body3.error?.message === 'Invalid or expired authentication token. Please log in again.',
      'Test 3: Invalid signature returns HTTP 401 Unauthorized',
      body3
    )

    // Test 4: Expired JWT -> 401
    const expiredToken = jwt.sign(
      { sub: dummyUserId, iat: Math.floor(Date.now() / 1000) - 3600 },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '0s' }
    )
    const res4 = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: `token=${expiredToken}` },
    })
    const body4 = await res4.json()
    assert(
      res4.status === 401 &&
        body4.success === false &&
        body4.error?.code === 'UNAUTHORIZED' &&
        body4.error?.message === 'Invalid or expired authentication token. Please log in again.',
      'Test 4: Expired JWT returns HTTP 401 Unauthorized (does NOT throw 500)',
      body4
    )

    // Test 5 & 6: Valid JWT -> request identity attached to req.user & next() called
    const validToken = generateToken(dummyUserId)
    const res5 = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: `token=${validToken}` },
    })
    const body5 = await res5.json()
    assert(
      res5.status === 200 &&
        body5.success === true &&
        body5.data?.user?.id === dummyUserId &&
        body5.message === 'Protected route accessed successfully',
      'Test 5 & 6: Valid JWT attaches req.user = { id: sub } and invokes next()',
      body5
    )

    // Test 7: Missing subject claim -> 401
    const noSubToken = jwt.sign(
      { role: 'user', someData: 'test' },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '15m' }
    )
    const res7 = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: `token=${noSubToken}` },
    })
    const body7 = await res7.json()
    assert(
      res7.status === 401 &&
        body7.success === false &&
        body7.error?.code === 'UNAUTHORIZED' &&
        body7.error?.message === 'Invalid authentication token. Missing subject claim.',
      'Test 7: Token missing subject claim (sub) returns HTTP 401 Unauthorized',
      body7
    )

    // Test 8: Unsupported algorithm -> 401
    // Unsigned / none algorithm token
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: dummyUserId, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')
    const noneAlgToken = `${header}.${payload}.`
    const res8 = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: `token=${noneAlgToken}` },
    })
    const body8 = await res8.json()
    assert(
      res8.status === 401 &&
        body8.success === false &&
        body8.error?.code === 'UNAUTHORIZED' &&
        body8.error?.message === 'Invalid or expired authentication token. Please log in again.',
      'Test 8: Unsupported algorithm (alg: none) rejected with HTTP 401 Unauthorized',
      body8
    )

    // Test 9 & 10: Existing registration and login still works and sets expected cookie
    const regRes = await fetch(`${realBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: regName,
        email: regEmail,
        password: regPassword,
      }),
    })
    const regBody = await regRes.json()
    assert(
      regRes.status === 201 &&
        regBody.success === true &&
        regBody.data?.user?.email === regEmail,
      'Test 10a: Registration endpoint still registers new users successfully (HTTP 201)',
      regBody
    )

    const loginRes = await fetch(`${realBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: regEmail,
        password: regPassword,
      }),
    })
    const loginBody = await loginRes.json()
    const setCookie = loginRes.headers.get('set-cookie') || ''

    assert(
      loginRes.status === 200 &&
        loginBody.success === true &&
        loginBody.data?.user?.email === regEmail &&
        setCookie.includes('token=') &&
        setCookie.toLowerCase().includes('httponly') &&
        setCookie.toLowerCase().includes('samesite=lax'),
      'Test 9 & 10b: Login endpoint authenticates user and sets HttpOnly SameSite=Lax cookie',
      { status: loginRes.status, setCookie }
    )

    // Test that the cookie issued by login works with authenticateToken
    const loginTokenMatch = setCookie.match(/token=([^;]+)/)
    const loginToken = loginTokenMatch ? loginTokenMatch[1] : null
    const resWithLoginCookie = await fetch(`${testBaseUrl}/test-protected`, {
      headers: { Cookie: `token=${loginToken}` },
    })
    const bodyWithLoginCookie = await resWithLoginCookie.json()
    assert(
      resWithLoginCookie.status === 200 &&
        bodyWithLoginCookie.success === true &&
        bodyWithLoginCookie.data?.user?.id === regBody.data?.user?.id,
      'Test 10c: Cookie issued by Login endpoint is verified successfully by authenticateToken',
      bodyWithLoginCookie
    )

    // Test 11: Health endpoint still works
    const healthRes = await fetch(`${realBaseUrl}/api/health`)
    const healthBody = await healthRes.json()
    assert(
      healthRes.status === 200 &&
        healthBody.success === true &&
        healthBody.data?.status === 'healthy' &&
        healthBody.data?.database === 'connected',
      'Test 11: Health endpoint returns 200 OK with healthy and connected status',
      healthBody
    )

    // Clean up temporary user
    await User.deleteMany({ email: regEmail })
    console.log('\nCleaned up all temporary test records from MongoDB.')
  } catch (err) {
    console.error('Test execution error:', err)
    testsFailed++
  } finally {
    await new Promise((resolve) => testServer.close(resolve))
    await new Promise((resolve) => realServer.close(resolve))
    await disconnectDB()
    console.log(`\n--- Test Summary: ${testsPassed} Passed, ${testsFailed} Failed ---`)
  }

  process.exit(testsFailed > 0 ? 1 : 0)
}

runTests()
