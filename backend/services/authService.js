const User = require('../model/userModel');
const jwt = require('jsonwebtoken');
const { verifyGoogleCredential, authError } = require('./googleIdentityService');
const { isUserActive, inactiveAccountError } = require('../util/userAccountStatus');

const sessionFor = user => ({
  token: jwt.sign({ id: user._id, role: user.role }, String(process.env.JWT_SECRET || '').trim() || 'abc123', { expiresIn: '30d' }),
  user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status || 'active' },
});
const assertActive = user => { if (!isUserActive(user)) throw inactiveAccountError(); };

const loginUser = async (email, password) => {
  if (typeof email !== 'string' || typeof password !== 'string') throw new Error('Invalid email or password');
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  // Preserve the existing password format; no production password migration.
  if (!user || password !== user.password) throw new Error('Invalid email or password');
  assertActive(user);
  return sessionFor(user);
};

const linkIdentity = async (user, identity) => {
  assertActive(user);
  if (user.googleId && user.googleId !== identity.subject) throw authError('This account is linked to a different Google account.', 409, 'GOOGLE_ACCOUNT_MISMATCH');
  if (!user.googleId) {
    try {
      // Atomic conditional update prevents concurrent sign-ins replacing a link.
      const updated = await User.findOneAndUpdate({ _id: user._id, status: { $ne: 'inactive' }, $or: [{ googleId: { $exists: false } }, { googleId: null }, { googleId: identity.subject }] }, { $set: { googleId: identity.subject, googleLinkedAt: new Date() } }, { new: true, runValidators: true });
      if (!updated) throw authError('Account linking failed. Please sign in again or contact your administrator.', 409, 'GOOGLE_LINK_CONFLICT');
      return updated;
    } catch (error) {
      if (error.code === 11000) throw authError('This Google account is already linked to another user.', 409, 'GOOGLE_LINK_CONFLICT');
      throw error;
    }
  }
  return user;
};

const loginWithGoogle = async credential => {
  const identity = await verifyGoogleCredential(credential);
  let user = await User.findOne({ googleId: identity.subject });
  if (!user) {
    user = await User.findOne({ email: identity.email });
    if (!user) throw authError('No RMS account is registered for this email. Contact your administrator.', 403, 'GOOGLE_USER_NOT_REGISTERED');
    assertActive(user);
    // Google is not authoritative for non-Gmail/non-Workspace email addresses.
    // Those users must link Google while signed in with their RMS password.
    if (!identity.authoritativeEmail) throw authError('Please sign in with your RMS password first, then link your Google account.', 403, 'GOOGLE_LINK_REQUIRED');
  }
  if (user.email.trim().toLowerCase() !== identity.email) {
    throw authError('Google email must match your registered RMS account email.', 403, 'GOOGLE_EMAIL_MISMATCH');
  }
  user = await linkIdentity(user, identity);
  return sessionFor(user);
};

const linkGoogleAccount = async (userId, credential) => {
  const identity = await verifyGoogleCredential(credential);
  const user = await User.findById(userId);
  if (!user) throw authError('User not found.', 404, 'USER_NOT_FOUND');
  if (user.email.trim().toLowerCase() !== identity.email) throw authError('Google email must match your RMS account email.', 403, 'GOOGLE_EMAIL_MISMATCH');
  const linked = await linkIdentity(user, identity);
  return { id: linked._id, email: linked.email, googleLinked: true, status: linked.status || 'active' };
};
module.exports = { loginUser, loginWithGoogle, linkGoogleAccount };
