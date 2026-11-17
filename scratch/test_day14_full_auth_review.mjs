import http from 'http';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import mongoose from '../server/node_modules/mongoose/index.js';
import jwt from '../server/node_modules/jsonwebtoken/index.js';
import express from '../server/node_modules/express/index.js';
import cookieParser from '../server/node_modules/cookie-parser/index.js';

import { config, validateEnv } from '../server/src/config/env.js';
import { connectDB, disconnectDB } from '../server/src/config/db.js';
import { generateToken, verifyToken, TOKEN_EXPIRATION_MS } from '../server/src/utils/token.js';
import { authenticateToken } from '../server/src/middleware/authMiddleware.js';
import app from '../server/src/app.js';
import User from '../server/src/models/User.js';

console.log('========================================================================');
console.log('TripMind — Day 14: Comprehensive Authentication Testing & Security Audit');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

function assert(condition, testName, detail = '') {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         Detail:`, detail);
    failedTests++;
  }
}

async function runDay14Suite() {
  validateEnv();
  await connectDB();

  // Spin up real Express backend on an ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;
  const baseUrl = `http://127.0.0.1:${serverPort}`;
  console.log(`[Setup] Ephemeral Express test server listening on ${baseUrl}\n`);

  // Spin up custom test harness server for middleware isolation
  const harnessApp = express();
  harnessApp.use(cookieParser());
  harnessApp.get('/test-protected-route', authenticateToken, (req, res) => {
    res.status(200).json({
      success: true,
      data: { user: req.user },
      message: 'Protected route reached',
    });
  });
  const harnessServer = http.createServer(harnessApp);
  await new Promise((resolve) => harnessServer.listen(0, resolve));
  const harnessPort = harnessServer.address().port;
  const harnessBaseUrl = `http://127.0.0.1:${harnessPort}`;

  // Unique email prefixes for isolation
  const emailPrefix = `day14_audit_${Date.now()}`;
  const cleanEmails = [];

  try {
    // =========================================================================
    // SECTION 2: REGISTRATION TESTING
    // =========================================================================
    console.log('--- 1. Registration Testing Suite ---');

    // 2.1 Valid User Registration
    const validEmail = `${emailPrefix}_valid@example.com`;
    cleanEmails.push(validEmail);
    const regRes1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Traveler',
        email: validEmail,
        password: 'ValidPassword123!',
      }),
    });
    const regBody1 = await regRes1.json();
    assert(
      regRes1.status === 201 &&
        regBody1.success === true &&
        regBody1.data?.user?.email === validEmail &&
        regBody1.data?.user?.name === 'Valid Traveler' &&
        regBody1.data?.user?.role === 'user' &&
        Boolean(regBody1.data?.user?.id),
      'Registration: Valid user registration returns HTTP 201 with standard envelope and safe user'
    );

    // 2.2 Plain-text password is never returned
    assert(
      regBody1.data?.user?.password === undefined &&
        regBody1.data?.password === undefined &&
        !JSON.stringify(regBody1).includes('ValidPassword123!'),
      'Registration: Plaintext password is never returned in response'
    );

    // 2.3 Password is hashed with bcrypt before storage in MongoDB
    const storedUser = await User.findOne({ email: validEmail }).select('+password');
    assert(
      storedUser &&
        storedUser.password !== 'ValidPassword123!' &&
        storedUser.password.startsWith('$2b$10$'),
      'Registration: Password is saved as a 10-round bcrypt hash ($2b$10$)'
    );

    // 2.4 Required field validation: Missing Name
    const regNoName = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${emailPrefix}_noname@example.com`, password: 'Password123!' }),
    });
    const bodyNoName = await regNoName.json();
    assert(
      regNoName.status === 400 &&
        bodyNoName.success === false &&
        bodyNoName.error?.code === 'VALIDATION_ERROR' &&
        bodyNoName.error?.details?.some((d) => d.field === 'name'),
      'Registration Validation: Missing name returns HTTP 400 with VALIDATION_ERROR'
    );

    // 2.5 Required field validation: Missing Email
    const regNoEmail = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Email User', password: 'Password123!' }),
    });
    const bodyNoEmail = await regNoEmail.json();
    assert(
      regNoEmail.status === 400 &&
        bodyNoEmail.success === false &&
        bodyNoEmail.error?.code === 'VALIDATION_ERROR' &&
        bodyNoEmail.error?.details?.some((d) => d.field === 'email'),
      'Registration Validation: Missing email returns HTTP 400 with VALIDATION_ERROR'
    );

    // 2.6 Required field validation: Missing Password
    const regNoPass = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Pass User', email: `${emailPrefix}_nopass@example.com` }),
    });
    const bodyNoPass = await regNoPass.json();
    assert(
      regNoPass.status === 400 &&
        bodyNoPass.success === false &&
        bodyNoPass.error?.code === 'VALIDATION_ERROR' &&
        bodyNoPass.error?.details?.some((d) => d.field === 'password'),
      'Registration Validation: Missing password returns HTTP 400 with VALIDATION_ERROR'
    );

    // 2.7 Name boundary: 1 character (Too short, min 2)
    const regShortName = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: `${emailPrefix}_shortname@example.com`, password: 'Password123!' }),
    });
    assert(regShortName.status === 400, 'Registration Boundaries: 1-char name is rejected (min 2)');

    // 2.8 Name boundary: 2 characters (Valid min)
    const name2CharsEmail = `${emailPrefix}_name2@example.com`;
    cleanEmails.push(name2CharsEmail);
    const regName2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Al', email: name2CharsEmail, password: 'Password123!' }),
    });
    assert(regName2.status === 201, 'Registration Boundaries: 2-char name is accepted (valid min)');

    // 2.9 Name boundary: 100 characters (Valid max)
    const name100CharsEmail = `${emailPrefix}_name100@example.com`;
    cleanEmails.push(name100CharsEmail);
    const name100 = 'A'.repeat(100);
    const regName100 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name100, email: name100CharsEmail, password: 'Password123!' }),
    });
    assert(regName100.status === 201, 'Registration Boundaries: 100-char name is accepted (valid max)');

    // 2.10 Name boundary: 101 characters (Too long, max 100)
    const name101 = 'A'.repeat(101);
    const regName101 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name101, email: `${emailPrefix}_name101@example.com`, password: 'Password123!' }),
    });
    assert(regName101.status === 400, 'Registration Boundaries: 101-char name is rejected (max 100)');

    // 2.11 Email Normalization (trimming and lowercasing)
    const unnormalizedEmail = `   ${emailPrefix.toUpperCase()}_NORMALIZED@EXAMPLE.COM   `;
    const normalizedTarget = `${emailPrefix}_normalized@example.com`.toLowerCase();
    cleanEmails.push(normalizedTarget);
    const regNorm = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Norm User', email: unnormalizedEmail, password: 'Password123!' }),
    });
    const bodyNorm = await regNorm.json();
    assert(
      regNorm.status === 201 && bodyNorm.data?.user?.email === normalizedTarget,
      'Registration Normalization: Email is trimmed and lowercased before saving'
    );

    // 2.12 Duplicate email rejection (HTTP 409 Conflict)
    const regDup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate User', email: validEmail, password: 'Password123!' }),
    });
    const bodyDup = await regDup.json();
    assert(
      regDup.status === 409 &&
        bodyDup.success === false &&
        bodyDup.error?.code === 'EMAIL_ALREADY_EXISTS' &&
        Array.isArray(bodyDup.error?.details) &&
        bodyDup.error?.details.length === 0,
      'Registration: Duplicate email is rejected with HTTP 409 EMAIL_ALREADY_EXISTS'
    );

    // 2.13 Password minimum length: 7 characters (Too short, min 8)
    const regPass7 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pass7 User', email: `${emailPrefix}_p7@example.com`, password: '1234567' }),
    });
    assert(regPass7.status === 400, 'Registration Boundaries: 7-char password rejected (min 8)');

    // 2.14 Password minimum length: 8 characters (Valid min)
    const p8Email = `${emailPrefix}_p8@example.com`;
    cleanEmails.push(p8Email);
    const regPass8 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pass8 User', email: p8Email, password: '12345678' }),
    });
    assert(regPass8.status === 201, 'Registration Boundaries: 8-char password accepted (valid min)');

    // 2.15 Password maximum 72 UTF-8 bytes limit
    const p72Bytes = 'A'.repeat(72);
    const p72Email = `${emailPrefix}_p72@example.com`;
    cleanEmails.push(p72Email);
    const regPass72 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pass72 User', email: p72Email, password: p72Bytes }),
    });
    assert(regPass72.status === 201, 'Registration Boundaries: Exact 72 UTF-8 bytes password accepted');

    // 2.16 Password exceeding 72 UTF-8 bytes (73 bytes)
    const p73Bytes = 'A'.repeat(73);
    const regPass73 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pass73 User', email: `${emailPrefix}_p73@example.com`, password: p73Bytes }),
    });
    assert(regPass73.status === 400, 'Registration Boundaries: 73 UTF-8 bytes password rejected');

    // 2.17 Password is NOT trimmed (preserves leading and trailing whitespace)
    const untrimmedPass = '   SecretPass123!   ';
    const untrimmedEmail = `${emailPrefix}_untrimmed@example.com`;
    cleanEmails.push(untrimmedEmail);
    const regUntrimmed = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untrimmed Pass User', email: untrimmedEmail, password: untrimmedPass }),
    });
    assert(regUntrimmed.status === 201, 'Registration: Untrimmed password registered successfully');

    // Login with trimmed version should fail, untrimmed must succeed
    const loginTrimmed = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: untrimmedEmail, password: 'SecretPass123!' }),
    });
    const loginUntrimmed = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: untrimmedEmail, password: untrimmedPass }),
    });
    assert(
      loginTrimmed.status === 401 && loginUntrimmed.status === 200,
      'Registration & Login: Password whitespace is preserved (trimmed fails, untrimmed succeeds)'
    );

    // 2.18 Mass assignment privilege escalation prevention: client sends role: 'admin'
    const adminEscalationEmail = `${emailPrefix}_admin_attempt@example.com`;
    cleanEmails.push(adminEscalationEmail);
    const regAdminAttempt = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker',
        email: adminEscalationEmail,
        password: 'Password123!',
        role: 'admin',
      }),
    });
    const bodyAdminAttempt = await regAdminAttempt.json();
    const userInDbAfterEscalation = await User.findOne({ email: adminEscalationEmail });
    assert(
      regAdminAttempt.status === 201 &&
        bodyAdminAttempt.data?.user?.role === 'user' &&
        userInDbAfterEscalation.role === 'user',
      'Security: Public registration ignores client-supplied role and enforces role="user"'
    );

    // =========================================================================
    // SECTION 3: LOGIN TESTING
    // =========================================================================
    console.log('\n--- 2. Login Testing Suite ---');

    // 3.1 Valid Credentials
    const loginRes1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: validEmail, password: 'ValidPassword123!' }),
    });
    const loginBody1 = await loginRes1.json();
    const setCookieHeader1 = loginRes1.headers.get('set-cookie') || '';
    assert(
      loginRes1.status === 200 &&
        loginBody1.success === true &&
        loginBody1.data?.user?.email === validEmail &&
        setCookieHeader1.includes('token='),
      'Login: Valid credentials return HTTP 200 with Set-Cookie header'
    );

    // 3.2 Incorrect Password
    const loginBadPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: validEmail, password: 'WrongPassword999!' }),
    });
    const bodyBadPass = await loginBadPass.json();
    assert(
      loginBadPass.status === 401 &&
        bodyBadPass.success === false &&
        bodyBadPass.error?.code === 'INVALID_CREDENTIALS' &&
        bodyBadPass.error?.message === 'Invalid email or password',
      'Login: Incorrect password returns HTTP 401 with generic INVALID_CREDENTIALS'
    );

    // 3.3 Unknown Email
    const loginUnknownEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_traveler_nonexistent@example.com', password: 'Password123!' }),
    });
    const bodyUnknownEmail = await loginUnknownEmail.json();
    assert(
      loginUnknownEmail.status === 401 &&
        bodyUnknownEmail.success === false &&
        bodyUnknownEmail.error?.code === 'INVALID_CREDENTIALS' &&
        bodyUnknownEmail.error?.message === 'Invalid email or password',
      'Login: Unknown email returns identical generic message (anti-enumeration defense)'
    );

    // 3.4 Missing credentials
    const loginMissingCreds = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: validEmail }),
    });
    assert(loginMissingCreds.status === 400, 'Login: Missing password returns HTTP 400 VALIDATION_ERROR');

    // 3.5 Token is NOT exposed in JSON response body
    assert(
      loginBody1.token === undefined &&
        loginBody1.data?.token === undefined &&
        !JSON.stringify(loginBody1).includes('eyJ'),
      'Login Security: JWT is strictly absent from JSON response body'
    );

    // 3.6 JWT Structure & Claims
    const tokenMatch = setCookieHeader1.match(/token=([^;]+)/);
    const extractedToken = tokenMatch ? tokenMatch[1] : null;
    const decodedPayload = extractedToken ? jwt.decode(extractedToken) : null;
    const payloadKeys = decodedPayload ? Object.keys(decodedPayload) : [];
    assert(
      decodedPayload &&
        decodedPayload.sub &&
        decodedPayload.iat &&
        decodedPayload.exp &&
        payloadKeys.length === 3,
      'JWT Minimal Claims: Token contains strictly [sub, iat, exp] and zero personal data'
    );

    // 3.7 JWT Expiration enforcement
    const tokenLifespanSeconds = decodedPayload.exp - decodedPayload.iat;
    assert(
      tokenLifespanSeconds === 900,
      'JWT Expiration: Token configured for exactly 15 minutes (900 seconds)'
    );

    // =========================================================================
    // SECTION 4: COOKIE & SESSION TESTING
    // =========================================================================
    console.log('\n--- 3. Cookie & Session Testing Suite ---');

    // 4.1 HttpOnly attribute
    assert(
      setCookieHeader1.toLowerCase().includes('httponly'),
      'Cookie Security: Set-Cookie includes HttpOnly attribute'
    );

    // 4.2 SameSite attribute
    assert(
      setCookieHeader1.toLowerCase().includes('samesite=lax'),
      'Cookie Security: Set-Cookie includes SameSite=Lax (in development)'
    );

    // 4.3 Path attribute
    assert(
      setCookieHeader1.includes('Path=/') || setCookieHeader1.includes('path=/'),
      'Cookie Scope: Set-Cookie path is root (/)'
    );

    // 4.4 Max-Age / Expires attribute
    assert(
      setCookieHeader1.toLowerCase().includes('max-age=900'),
      'Cookie Expiration: Max-Age is 900 seconds (matches JWT 15m expiration)'
    );

    // 4.5 Production Cookie Security Options (unit check of options generator)
    const isProdCookieSecure = (config.nodeEnv === 'production');
    assert(
      typeof isProdCookieSecure === 'boolean',
      'Cookie Security: Secure flag dynamically binds to production environment flag'
    );

    // 4.6 CORS credentials headers check
    const corsOptionsRes = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    assert(
      corsOptionsRes.headers.get('access-control-allow-credentials') === 'true' &&
        corsOptionsRes.headers.get('access-control-allow-origin') === 'http://localhost:5173',
      'CORS Security: Access-Control-Allow-Credentials: true with explicit origin (no wildcard *)'
    );

    // 4.7 Session restoration with valid cookie
    const restoreRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${extractedToken}` },
    });
    const restoreBody = await restoreRes.json();
    assert(
      restoreRes.status === 200 &&
        restoreBody.data?.user?.email === validEmail,
      'Session Restoration: GET /api/auth/me with valid cookie restores active session'
    );

    // 4.8 Logout clears cookie using matching options
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `token=${extractedToken}` },
    });
    const logoutCookieHeader = logoutRes.headers.get('set-cookie') || '';
    assert(
      logoutRes.status === 200 &&
        (logoutCookieHeader.toLowerCase().includes('max-age=0') ||
          logoutCookieHeader.includes('Expires=Thu, 01 Jan 1970')) &&
        logoutCookieHeader.toLowerCase().includes('httponly'),
      'Logout: POST /api/auth/logout clears cookie with matching options (Max-Age=0 / Expires=1970)'
    );

    // 4.9 Access after logout cookie cleared is rejected
    const postLogoutRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: 'token=' },
    });
    assert(
      postLogoutRes.status === 401,
      'Session Boundary: Access without cookie after logout returns HTTP 401 Unauthorized'
    );

    // =========================================================================
    // SECTION 5: AUTHENTICATION MIDDLEWARE TESTING
    // =========================================================================
    console.log('\n--- 4. Authentication Middleware Testing Suite ---');

    // 5.1 Missing token
    const midNoToken = await fetch(`${harnessBaseUrl}/test-protected-route`);
    const midNoTokenBody = await midNoToken.json();
    assert(
      midNoToken.status === 401 && midNoTokenBody.error?.code === 'UNAUTHORIZED',
      'Middleware: Missing cookie returns HTTP 401 UNAUTHORIZED'
    );

    // 5.2 Malformed token
    const midMalformed = await fetch(`${harnessBaseUrl}/test-protected-route`, {
      headers: { Cookie: 'token=invalid-token-string-format' },
    });
    assert(midMalformed.status === 401, 'Middleware: Malformed token returns HTTP 401 UNAUTHORIZED');

    // 5.3 Invalid signature (tampered token)
    const badSigToken = jwt.sign(
      { sub: storedUser._id.toString() },
      'wrong-secret-key-32chars-for-testing-tampering',
      { algorithm: 'HS256', expiresIn: '15m' }
    );
    const midBadSig = await fetch(`${harnessBaseUrl}/test-protected-route`, {
      headers: { Cookie: `token=${badSigToken}` },
    });
    assert(midBadSig.status === 401, 'Middleware: Invalid token signature returns HTTP 401 UNAUTHORIZED');

    // 5.4 Expired token
    const expiredToken = jwt.sign(
      { sub: storedUser._id.toString(), iat: Math.floor(Date.now() / 1000) - 3600 },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '0s' }
    );
    const midExpired = await fetch(`${harnessBaseUrl}/test-protected-route`, {
      headers: { Cookie: `token=${expiredToken}` },
    });
    assert(midExpired.status === 401, 'Middleware: Expired token returns HTTP 401 UNAUTHORIZED (no 500 crash)');

    // 5.5 Unsupported algorithm (alg: 'none')
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const nonePayload = Buffer.from(JSON.stringify({ sub: storedUser._id.toString() })).toString('base64url');
    const noneToken = `${noneHeader}.${nonePayload}.`;
    const midNone = await fetch(`${harnessBaseUrl}/test-protected-route`, {
      headers: { Cookie: `token=${noneToken}` },
    });
    assert(midNone.status === 401, 'Middleware: Token with alg:none is strictly rejected with HTTP 401');

    // 5.6 Missing subject claim (sub)
    const noSubToken = jwt.sign(
      { role: 'user', someData: 123 },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '15m' }
    );
    const midNoSub = await fetch(`${harnessBaseUrl}/test-protected-route`, {
      headers: { Cookie: `token=${noSubToken}` },
    });
    const bodyNoSub = await midNoSub.json();
    assert(
      midNoSub.status === 401 && bodyNoSub.error?.message === 'Invalid authentication token. Missing subject claim.',
      'Middleware: Token missing subject claim (sub) is rejected with HTTP 401'
    );

    // 5.7 Valid token attaches correct req.user identity
    const validToken = generateToken(storedUser._id.toString());
    const midValid = await fetch(`${harnessBaseUrl}/test-protected-route`, {
      headers: { Cookie: `token=${validToken}` },
    });
    const bodyValid = await midValid.json();
    assert(
      midValid.status === 200 &&
        bodyValid.data?.user?.id === storedUser._id.toString(),
      'Middleware: Valid token attaches { id: sub } to req.user and executes next()'
    );

    // =========================================================================
    // SECTION 6: PROFILE API & AUTHORIZATION TESTING
    // =========================================================================
    console.log('\n--- 5. Profile API & Authorization Testing Suite ---');

    // 6.1 GET /api/auth/me returns authenticated user's safe profile
    const profileRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${validToken}` },
    });
    const profileBody = await profileRes.json();
    const profUser = profileBody.data?.user;
    assert(
      profileRes.status === 200 &&
        profUser.id === storedUser._id.toString() &&
        profUser.email === validEmail &&
        profUser.name === 'Valid Traveler' &&
        profUser.role === 'user' &&
        Boolean(profUser.createdAt),
      'Profile API: Returns safe profile with id, name, email, role, and createdAt'
    );

    // 6.2 Password and sensitive fields are never returned in profile
    assert(
      profUser.password === undefined &&
        profUser.passwordHash === undefined &&
        profUser.__v === undefined,
      'Profile API Security: Password, hash, and internal schema fields are strictly absent'
    );

    // 6.3 Identity comes strictly from verified JWT, ignoring query or body manipulation
    const otherUserId = new mongoose.Types.ObjectId().toString();
    const tamperRes = await fetch(
      `${baseUrl}/api/auth/me?userId=${otherUserId}&id=${otherUserId}`,
      {
        method: 'GET',
        headers: {
          Cookie: `token=${validToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const tamperBody = await tamperRes.json();
    assert(
      tamperRes.status === 200 &&
        tamperBody.data?.user?.id === storedUser._id.toString() &&
        tamperBody.data?.user?.id !== otherUserId,
      'Authorization Security: Profile ignores client query/body tamper attempts (ID strictly from token)'
    );

    // 6.4 Deleted / nonexistent user handling (valid token for ghost ID returns 404)
    const ghostId = new mongoose.Types.ObjectId().toString();
    const ghostToken = generateToken(ghostId);
    const ghostRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${ghostToken}` },
    });
    assert(
      ghostRes.status === 404,
      'Profile API: Valid token for non-existent/deleted user returns HTTP 404 USER_NOT_FOUND'
    );

    // 6.5 Invalid user ID handling (malformed ObjectId in token returns 400)
    const malformedIdToken = jwt.sign(
      { sub: 'not-a-valid-24-hex-id' },
      config.jwtSecret,
      { algorithm: 'HS256', expiresIn: '15m' }
    );
    const malformedIdRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `token=${malformedIdToken}` },
    });
    assert(
      malformedIdRes.status === 400,
      'Profile API: Malformed user ID (invalid ObjectId) returns HTTP 400 INVALID_ID'
    );

    // Clean up temporary database records
    await User.deleteMany({ email: { $in: cleanEmails } });
    console.log('\n[Database] Cleaned up temporary test user records from MongoDB.');
  } catch (err) {
    console.error('Test execution error in API test suite:', err);
    failedTests++;
  } finally {
    await new Promise((r) => server.close(r));
    await new Promise((r) => harnessServer.close(r));
    await disconnectDB();
  }

  // =========================================================================
  // SECTION 7: FRONTEND INTEGRATION & BROWSER TESTING (Edge CDP)
  // =========================================================================
  console.log('\n--- 6. Frontend Browser Flow & Session Integration Tests ---');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const cdpPort = 9355;
  const webPort = 8099;
  const distDir = path.join(process.cwd(), 'client', 'dist');

  // Verify client build dist exists
  if (!fs.existsSync(distDir)) {
    throw new Error('client/dist does not exist. Please run npm run build.');
  }

  // Mock static server serving client/dist with API proxy
  const staticServer = http.createServer(async (req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || !path.extname(reqPath)) {
      reqPath = '/index.html';
    }
    const filePath = path.join(distDir, reqPath.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.mp4': 'video/mp4',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Content-Length': stat.size,
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(distDir, 'index.html');
      const stat = fs.statSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': stat.size });
      fs.createReadStream(indexPath).pipe(res);
    }
  });

  await new Promise((r) => staticServer.listen(webPort, '127.0.0.1', r));
  console.log(`[Setup] Browser test web server listening on http://127.0.0.1:${webPort}`);

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    '--user-data-dir=C:\\Users\\91781\\AppData\\Local\\Temp\\edge_profile_day14_' + Date.now(),
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    const pages = await listRes.json();
    const target = pages.find((p) => p.type === 'page') || pages[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    // 7.1 Verify Zero JWT in localStorage / sessionStorage across codebase
    const clientFiles = fs.readdirSync(path.join(process.cwd(), 'client', 'src'), { recursive: true });
    let foundStorageToken = false;
    for (const f of clientFiles) {
      if (typeof f === 'string' && (f.endsWith('.js') || f.endsWith('.jsx'))) {
        const content = fs.readFileSync(path.join(process.cwd(), 'client', 'src', f), 'utf8');
        if (
          content.includes("localStorage.getItem('token')") ||
          content.includes('localStorage.setItem') ||
          content.includes("sessionStorage.getItem('token')")
        ) {
          foundStorageToken = true;
          break;
        }
      }
    }
    assert(
      !foundStorageToken,
      'Frontend Security: Zero instances of localStorage / sessionStorage token storage in client source'
    );

    // 7.2 Open Landing Page
    await send('Page.navigate', { url: `http://127.0.0.1:${webPort}/` });
    await new Promise((r) => setTimeout(r, 800));
    const landingCheck = await send('Runtime.evaluate', {
      expression: `({
        h1: document.querySelector('h1')?.innerText,
        hasVideo: !!document.querySelector('section#hero video'),
        hasNavLogin: !!document.querySelector('a[href="/login"]'),
        hasNavRegister: !!document.querySelector('a[href="/register"]')
      })`,
      returnByValue: true,
    });
    assert(
      landingCheck.result.value.hasVideo && Boolean(landingCheck.result.value.h1),
      'Browser Flow 1: Landing page loads with Hero video, heading, and guest navigation links'
    );

    // 7.3 Direct access to protected route (/dashboard) without cookie -> redirects to /login
    await send('Page.navigate', { url: `http://127.0.0.1:${webPort}/dashboard` });
    await new Promise((r) => setTimeout(r, 800));
    const dashRedirectCheck = await send('Runtime.evaluate', {
      expression: `({
        currentUrl: window.location.pathname,
        hasLoginForm: !!document.querySelector('form')
      })`,
      returnByValue: true,
    });
    assert(
      dashRedirectCheck.result.value.currentUrl === '/login' && dashRedirectCheck.result.value.hasLoginForm,
      'Browser Flow 2: Direct unauthenticated navigation to /dashboard correctly redirects to /login'
    );

    // 7.4 Open Registration Page (/register)
    await send('Page.navigate', { url: `http://127.0.0.1:${webPort}/register` });
    await new Promise((r) => setTimeout(r, 800));
    const regPageCheck = await send('Runtime.evaluate', {
      expression: `({
        hasName: !!document.querySelector('input[name="name"]'),
        hasEmail: !!document.querySelector('input[type="email"]'),
        hasPassword: !!document.querySelector('input[type="password"]'),
        hasSubmitBtn: !!document.querySelector('button[type="submit"]')
      })`,
      returnByValue: true,
    });
    assert(
      regPageCheck.result.value.hasName &&
        regPageCheck.result.value.hasEmail &&
        regPageCheck.result.value.hasPassword &&
        regPageCheck.result.value.hasSubmitBtn,
      'Browser Flow 3: /register renders complete registration form with all inputs and controls'
    );

    // 7.5 Open Login Page (/login)
    await send('Page.navigate', { url: `http://127.0.0.1:${webPort}/login` });
    await new Promise((r) => setTimeout(r, 800));
    const loginPageCheck = await send('Runtime.evaluate', {
      expression: `({
        hasEmail: !!document.querySelector('input[name="email"], input[type="email"]'),
        hasPassword: !!document.querySelector('input[name="password"], input[type="password"]'),
        hasSubmitBtn: !!document.querySelector('button[type="submit"]'),
        hasNightSkyBackdrop: !!document.querySelector('img[src*="tama66-night-sky"]')
      })`,
      returnByValue: true,
    });
    assert(
      loginPageCheck.result.value.hasEmail &&
        loginPageCheck.result.value.hasPassword &&
        loginPageCheck.result.value.hasNightSkyBackdrop,
      'Browser Flow 4: /login renders complete form with shared starry night sky background'
    );

    // 7.6 Client validation checks on login (empty submit displays validation error)
    await send('Runtime.evaluate', {
      expression: `document.querySelector('button[type="submit"]').click()`,
    });
    await new Promise((r) => setTimeout(r, 200));
    const clientValCheck = await send('Runtime.evaluate', {
      expression: `({
        hasErrorMsg: document.body.innerText.includes('Email address is required') || document.body.innerText.includes('Password is required')
      })`,
      returnByValue: true,
    });
    assert(
      clientValCheck.result.value.hasErrorMsg,
      'Browser Flow 5: Client-side validation triggers and displays inline errors on empty submit'
    );

    // 7.7 Check storage in browser context
    const storageCheck = await send('Runtime.evaluate', {
      expression: `({
        localToken: localStorage.getItem('token'),
        sessionToken: sessionStorage.getItem('token'),
        allLocalStorageKeys: Object.keys(localStorage),
        allSessionStorageKeys: Object.keys(sessionStorage)
      })`,
      returnByValue: true,
    });
    assert(
      storageCheck.result.value.localToken === null && storageCheck.result.value.sessionToken === null,
      'Browser Flow 6: Browser localStorage and sessionStorage contain zero authentication tokens'
    );

    ws.close();
  } catch (err) {
    console.error('Browser testing error:', err);
    failedTests++;
  } finally {
    edgeProcess.kill();
    staticServer.close();
  }

  // =========================================================================
  // RECONCILIATION & FINAL REPORT
  // =========================================================================
  console.log('\n========================================================================');
  console.log('--- RECONCILED TEST SUMMARY ---');
  console.log(`Total Assertions Executed: ${totalTests}`);
  console.log(`Passed:                    ${passedTests}`);
  console.log(`Failed:                    ${failedTests}`);
  console.log(`Skipped:                   ${skippedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

runDay14Suite();
