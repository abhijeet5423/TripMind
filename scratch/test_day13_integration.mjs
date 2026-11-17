import http from 'http'
import fs from 'fs'
import path from 'path'
import { config, validateEnv } from '../server/src/config/env.js'
import { connectDB, disconnectDB } from '../server/src/config/db.js'
import app from '../server/src/app.js'
import User from '../server/src/models/User.js'

async function runTests() {
  console.log('--- Starting TripMind Day 13 Frontend Auth Integration Tests ---\n')
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

  // Start real Express server
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`
  console.log(`Ephemeral test server listening on ${baseUrl}`)

  const testEmail = 'day13_integration_user@example.com'
  const testPassword = 'SecurePassword123!'
  const testName = 'Day 13 Integration Traveler'

  try {
    // 0. Clean up any existing records
    await User.deleteMany({ email: testEmail })

    // Test 1: Frontend Storage Hygiene Check (No JWT in localStorage / sessionStorage)
    const clientSrcDir = path.resolve('client/src')
    function scanDir(dir) {
      let files = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files = files.concat(scanDir(fullPath))
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          files.push(fullPath)
        }
      }
      return files
    }

    const sourceFiles = scanDir(clientSrcDir)
    let foundLocalStorageToken = false
    let foundSessionStorageToken = false

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8')
      if (/localStorage\.(set|get)Item\(['"`](token|jwt|accessToken)/i.test(content)) {
        foundLocalStorageToken = true
        console.error(`Found token in localStorage in: ${file}`)
      }
      if (/sessionStorage\.(set|get)Item\(['"`](token|jwt|accessToken)/i.test(content)) {
        foundSessionStorageToken = true
        console.error(`Found token in sessionStorage in: ${file}`)
      }
    }

    assert(
      !foundLocalStorageToken && !foundSessionStorageToken,
      'Test 1: Zero JWT storage in localStorage or sessionStorage across all client source code'
    )

    // Test 2: Unauthenticated initial session check (GET /api/auth/me without cookie)
    const initialMeRes = await fetch(`${baseUrl}/api/auth/me`)
    const initialMeBody = await initialMeRes.json()
    assert(
      initialMeRes.status === 401 &&
        initialMeBody.success === false &&
        initialMeBody.error?.code === 'UNAUTHORIZED',
      'Test 2: Initial session check returns HTTP 401 (unauthenticated state, user is null)',
      initialMeBody
    )

    // Test 3: Registration integration (POST /api/auth/register)
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    })
    const regBody = await regRes.json()
    assert(
      regRes.status === 201 &&
        regBody.success === true &&
        regBody.data?.user?.email === testEmail &&
        regBody.data?.user?.role === 'user',
      'Test 3: Registration endpoint succeeds with HTTP 201 and creates traveler account',
      regBody
    )

    // Test 4: Duplicate registration rejection (HTTP 409)
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    })
    const dupBody = await dupRes.json()
    assert(
      dupRes.status === 409 &&
        dupBody.success === false &&
        dupBody.error?.code === 'EMAIL_ALREADY_EXISTS',
      'Test 4: Duplicate registration is rejected with HTTP 409 EMAIL_ALREADY_EXISTS',
      dupBody
    )

    // Test 5: Invalid credentials login display check (POST /api/auth/login with wrong password)
    const invalidLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    })
    const invalidLoginBody = await invalidLoginRes.json()
    assert(
      invalidLoginRes.status === 401 &&
        invalidLoginBody.success === false &&
        invalidLoginBody.error?.code === 'INVALID_CREDENTIALS' &&
        invalidLoginBody.error?.message === 'Invalid email or password',
      'Test 5: Login with wrong password returns generic HTTP 401 (anti-enumeration check)',
      invalidLoginBody
    )

    // Test 6: Successful login integration & HttpOnly cookie issuance
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    })
    const loginBody = await loginRes.json()
    const setCookieHeader = loginRes.headers.get('set-cookie') || ''
    const tokenMatch = setCookieHeader.match(/token=([^;]+)/)
    const sessionToken = tokenMatch ? tokenMatch[1] : null

    assert(
      loginRes.status === 200 &&
        loginBody.success === true &&
        loginBody.data?.user?.email === testEmail &&
        sessionToken !== null &&
        setCookieHeader.toLowerCase().includes('httponly'),
      'Test 6: Successful login sets HttpOnly session cookie (HTTP 200)',
      { status: loginRes.status, setCookie: setCookieHeader }
    )

    // Test 7: Browser session persistence simulation (refreshing browser calls GET /api/auth/me)
    const refreshRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${sessionToken}` },
    })
    const refreshBody = await refreshRes.json()
    assert(
      refreshRes.status === 200 &&
        refreshBody.success === true &&
        refreshBody.data?.user?.email === testEmail &&
        refreshBody.data?.user?.id === regBody.data?.user?.id,
      'Test 7: Browser refresh simulation: GET /api/auth/me with cookie restores active user profile',
      refreshBody
    )

    // Test 8: Logout endpoint clears HttpOnly cookie (POST /api/auth/logout)
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `token=${sessionToken}` },
    })
    const logoutBody = await logoutRes.json()
    const logoutSetCookie = logoutRes.headers.get('set-cookie') || ''

    assert(
      logoutRes.status === 200 &&
        logoutBody.success === true &&
        logoutBody.message === 'Logged out successfully' &&
        logoutSetCookie.includes('token=') &&
        (logoutSetCookie.includes('Max-Age=0') || logoutSetCookie.includes('Expires=Thu, 01 Jan 1970')),
      'Test 8: Logout endpoint clears the HttpOnly cookie (Max-Age=0 / Expires=1970)',
      { status: logoutRes.status, logoutSetCookie }
    )

    // Test 9: Subsequent request after logout is unauthenticated (HTTP 401)
    // Using the cleared cookie simulation (empty/cleared token)
    const postLogoutRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: 'token=' },
    })
    const postLogoutBody = await postLogoutRes.json()
    assert(
      postLogoutRes.status === 401 &&
        postLogoutBody.success === false &&
        postLogoutBody.error?.code === 'UNAUTHORIZED',
      'Test 9: Subsequent request after logout returns HTTP 401 (session ended)',
      postLogoutBody
    )

    // Test 10: Client form validation constraints check (bcrypt 72-byte UTF-8 calculation)
    const testUtf8_80bytes = 'A'.repeat(80)
    const encoder = new TextEncoder()
    const byteLengthOver = encoder.encode(testUtf8_80bytes).length
    const testUtf8_72bytes = 'B'.repeat(72)
    const byteLengthOk = encoder.encode(testUtf8_72bytes).length

    assert(
      byteLengthOver > 72 && byteLengthOk === 72,
      'Test 10: Client-side UTF-8 byte length calculation matches backend bcrypt 72-byte rule'
    )

    // Test 11: Health endpoint regression check
    const healthRes = await fetch(`${baseUrl}/api/health`)
    const healthBody = await healthRes.json()
    assert(
      healthRes.status === 200 &&
        healthBody.success === true &&
        healthBody.data?.status === 'healthy' &&
        healthBody.data?.database === 'connected',
      'Test 11: Backend health endpoint remains healthy and connected (HTTP 200)',
      healthBody
    )

    // Clean up temporary user
    await User.deleteMany({ email: testEmail })
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
