const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const authenticate = require('../middleware/authenticate');

const pendingStates = new Map();

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

router.get('/airtable', (req, res) => {
  console.log('=== OAuth Flow Started ===');
  console.log('Client ID:', process.env.AIRTABLE_CLIENT_ID ? 'Set (hidden)' : 'MISSING');
  console.log('Redirect URI:', process.env.AIRTABLE_REDIRECT_URI);
  
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  pendingStates.set(state, {
    codeVerifier,
    createdAt: Date.now()
  });
  
  setTimeout(() => {
    pendingStates.delete(state);
  }, 10 * 60 * 1000);
  
  console.log('Generated state:', state.substring(0, 10) + '...');
  console.log('Generated code challenge');
  
  const params = new URLSearchParams({
    client_id: process.env.AIRTABLE_CLIENT_ID,
    redirect_uri: process.env.AIRTABLE_REDIRECT_URI,
    response_type: 'code',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'data.records:read data.records:write schema.bases:read schema.bases:write webhook:manage'
  });
  
  const authUrl = `https://airtable.com/oauth2/v1/authorize?${params.toString()}`;
  
  console.log('Redirecting to Airtable...');
  res.redirect(authUrl);
});

router.get('/airtable/callback', async (req, res) => {
  console.log('=== OAuth Callback Received ===');
  console.log('Query params:', req.query);
  
  const { code, error, error_description, state } = req.query;
  
  if (error) {
    console.error('OAuth Error from Airtable:', error);
    console.error('Error Description:', error_description);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`);
  }
  
  if (!state || !pendingStates.has(state)) {
    console.error('Invalid or expired state parameter');
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
  }
  
  const { codeVerifier } = pendingStates.get(state);
  pendingStates.delete(state);
  console.log('State validated successfully');
  
  if (!code) {
    console.error('No authorization code received');
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }
  
  console.log('Authorization code received:', code.substring(0, 10) + '...');
  
  try {
    console.log('Exchanging code for access token...');
    
    const tokenPayload = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.AIRTABLE_REDIRECT_URI,
      code_verifier: codeVerifier
    };
    
    const authHeader = Buffer.from(
      `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
    ).toString('base64');
    
    console.log('Sending token request with Basic Auth...');
    
    const tokenResponse = await axios.post(
      'https://airtable.com/oauth2/v1/token',
      new URLSearchParams(tokenPayload),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      }
    );
    
    console.log('Access token received successfully');
    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    console.log('Token expires in:', expires_in, 'seconds');
    console.log('Granted scopes:', scope);
    
    console.log('Fetching user info from Airtable...');
    const userInfoResponse = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const { id: airtableUserId } = userInfoResponse.data;
    console.log('Airtable User ID:', airtableUserId);
    
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);
    
    console.log('Checking if user exists in database...');
    let user = await User.findOne({ airtableUserId });
    
    if (user) {
      console.log('Existing user found. Updating tokens...');
      user.accessToken = access_token;
      user.refreshToken = refresh_token;
      user.tokenExpiry = tokenExpiry;
      user.scopes = scope.split(' ');
      user.loginTimestamp = new Date();
      await user.save();
      console.log('User updated successfully. User ID:', user._id);
    } else {
      console.log('New user. Creating database record...');
      user = await User.create({
        airtableUserId,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry,
        scopes: scope.split(' ')
      });
      console.log('New user created. User ID:', user._id);
    }
    
    console.log('Generating JWT token...');
    const jwtToken = jwt.sign(
      { userId: user._id, airtableUserId: user.airtableUserId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    console.log('JWT token generated');
    
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`;
    console.log('Redirecting to frontend');
    console.log('=== OAuth Flow Completed Successfully ===');
    
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('=== OAuth Callback Error ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.error('Full error stack:', error.stack);
    console.error('=== End Error Details ===');
    
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

router.get('/me', authenticate, async (req, res) => {
  console.log('GET /me - User ID:', req.userId);
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        airtableUserId: req.user.airtableUserId,
        email: req.user.email,
        scopes: req.user.scopes,
        loginTimestamp: req.user.loginTimestamp
      }
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ success: false, message: 'Error fetching user info' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  console.log('POST /refresh - Attempting token refresh');
  
  if (!refreshToken) {
    console.warn('No refresh token provided');
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }
  
  try {
    const user = await User.findOne({ refreshToken });
    
    if (!user) {
      console.warn('Invalid refresh token - user not found');
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    
    console.log('Refreshing token for user:', user._id);
    
    const authHeader = Buffer.from(
      `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
    ).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://airtable.com/oauth2/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        }
      }
    );
    
    const { access_token, refresh_token: newRefreshToken, expires_in } = tokenResponse.data;
    
    user.accessToken = access_token;
    user.refreshToken = newRefreshToken;
    user.tokenExpiry = new Date(Date.now() + expires_in * 1000);
    await user.save();
    
    console.log('Token refreshed successfully');
    
    const jwtToken = jwt.sign(
      { userId: user._id, airtableUserId: user.airtableUserId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token: jwtToken,
      expiresIn: expires_in
    });
    
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(401).json({ success: false, message: 'Failed to refresh token' });
  }
});

router.get('/bases', authenticate, async (req, res) => {
  console.log('GET /bases - User ID:', req.userId);
  try {
    const AirtableClient = require('../utils/airtableClient');
    const client = new AirtableClient(req.airtableToken);
    
    console.log('Fetching bases from Airtable...');
    const bases = await client.getBases();
    console.log('Found', bases.length, 'bases');
    
    res.json({
      success: true,
      bases
    });
  } catch (error) {
    console.error('Error fetching bases:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bases/:baseId/tables', authenticate, async (req, res) => {
  const { baseId } = req.params;
  console.log('GET /bases/:baseId/tables - Base ID:', baseId);
  
  try {
    const AirtableClient = require('../utils/airtableClient');
    const client = new AirtableClient(req.airtableToken);
    
    console.log('Fetching tables from base...');
    const tables = await client.getTables(baseId);
    console.log('Found', tables.length, 'tables');
    
    res.json({
      success: true,
      tables
    });
  } catch (error) {
    console.error('Error fetching tables:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bases/:baseId/tables/:tableId/schema', authenticate, async (req, res) => {
  const { baseId, tableId } = req.params;
  console.log('GET /bases/:baseId/tables/:tableId/schema');
  console.log('Base ID:', baseId);
  console.log('Table ID:', tableId);
  
  try {
    const AirtableClient = require('../utils/airtableClient');
    const client = new AirtableClient(req.airtableToken);
    
    console.log('Fetching table schema...');
    const tableSchema = await client.getTableSchema(baseId, tableId);
    
    if (!tableSchema) {
      console.warn('Table not found');
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    
    console.log('Table found:', tableSchema.name);
    console.log('Total fields:', tableSchema.fields.length);
    
    const supportedTypes = ['singleLineText', 'multilineText', 'singleSelect', 'multipleSelects', 'attachment'];
    
    const filteredFields = tableSchema.fields.filter(field => 
      supportedTypes.includes(field.type)
    ).map(field => ({
      id: field.id,
      name: field.name,
      type: field.type,
      options: field.options || null
    }));
    
    console.log('Supported fields:', filteredFields.length);
    
    res.json({
      success: true,
      table: {
        id: tableSchema.id,
        name: tableSchema.name,
        fields: filteredFields
      }
    });
  } catch (error) {
    console.error('Error fetching table schema:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
