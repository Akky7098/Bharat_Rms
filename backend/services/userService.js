const User = require("../model/userModel");

const getSalesPersons = async () => {
  const users = await User.find(
    { $or: [
      { role: "user" },
      { _id: "69f32999a3a3532d7a8721e2", role: "admin" },
    ] },
    "_id name email status"
  );

  return users;
};

module.exports = {
  getSalesPersons,
};
const getUserAccounts = () => User.find({}).select("_id name email role status googleLinkedAt").lean();
const setUserStatus = async (userId, status, actingUserId) => {
  if (!["active", "inactive"].includes(status)) {
    throw Object.assign(new Error("Status must be active or inactive."), { statusCode: 400 });
  }
  if (status === "inactive" && String(userId) === String(actingUserId)) {
    throw Object.assign(new Error("You cannot deactivate your own account."), { statusCode: 400 });
  }
  const user = await User.findByIdAndUpdate(userId, { $set: { status } }, { new: true, runValidators: true }).select("_id name email role status");
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  if (status === "inactive") {
    require("../socket").getIO()?.in(`user:${user._id}`).disconnectSockets(true);
  }
  return user;
};
module.exports.getUserAccounts = getUserAccounts;
module.exports.setUserStatus = setUserStatus;
