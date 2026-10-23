// Missing status means active for users created before this feature.
const isUserActive = user => Boolean(user) && user.status !== 'inactive';
const inactiveAccountError = () => Object.assign(new Error('Your account is inactive. Please contact your administrator.'), { statusCode: 403, code: 'ACCOUNT_INACTIVE' });
module.exports = { isUserActive, inactiveAccountError };
