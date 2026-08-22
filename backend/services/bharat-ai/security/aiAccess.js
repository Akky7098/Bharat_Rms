const mongoose = require("mongoose");

const MANAGEMENT_ROLES = Object.freeze(["super_admin", "admin"]);

const isManagement = (user) =>
  Boolean(user && MANAGEMENT_ROLES.includes(user.role));

const assertAuthenticated = (user) => {
  if (!user?._id) {
    const error = new Error("Authentication required.");
    error.statusCode = 401;
    throw error;
  }
};

const assertManagement = (user) => {
  assertAuthenticated(user);

  if (!isManagement(user)) {
    const error = new Error(
      "You are not authorized to access company-wide or other-employee information."
    );
    error.statusCode = 403;
    throw error;
  }
};

const validObjectId = (value) =>
  Boolean(value && mongoose.Types.ObjectId.isValid(value));

const scopedSalesPersonId = (requestingUser, requestedSalesPersonId) => {
  assertAuthenticated(requestingUser);

  if (!isManagement(requestingUser)) {
    return requestingUser._id;
  }

  if (!requestedSalesPersonId) return null;

  if (!validObjectId(requestedSalesPersonId)) {
    const error = new Error("Invalid salesperson id.");
    error.statusCode = 400;
    throw error;
  }

  return requestedSalesPersonId;
};

module.exports = {
  MANAGEMENT_ROLES,
  isManagement,
  assertAuthenticated,
  assertManagement,
  validObjectId,
  scopedSalesPersonId,
};
