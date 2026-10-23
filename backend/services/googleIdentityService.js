const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();
const authError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });

const verifyGoogleCredential = async credential => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  if (process.env.GOOGLE_LOGIN_ENABLED !== 'true' || !clientId) {
    throw authError('Google login is not enabled. Please use email and password.', 503, 'GOOGLE_LOGIN_DISABLED');
  }
  if (typeof credential !== 'string' || !credential.trim() || credential.length > 16384) {
    throw authError('A valid Google ID token is required.', 400, 'GOOGLE_CREDENTIAL_REQUIRED');
  }
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    throw authError('Google authentication failed. Please try again.', 401, 'INVALID_GOOGLE_TOKEN');
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw authError('A verified Google email address is required.', 401, 'GOOGLE_EMAIL_UNVERIFIED');
  }
  return { subject: payload.sub, email: payload.email.trim().toLowerCase(), authoritativeEmail: payload.email.toLowerCase().endsWith('@gmail.com') || Boolean(payload.hd) };
};
module.exports = { verifyGoogleCredential, authError };
