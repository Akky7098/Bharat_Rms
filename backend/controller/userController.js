const userService = require("../services/userService");

const getSalesPersons = async (req, res) => {
  try {
    const users = await userService.getSalesPersons();

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSalesPersons,
};
module.exports.getUserAccounts = async (req, res) => {
  try {
    const users = await userService.getUserAccounts();
    return res.json({ success: true, data: users.map(user => ({ ...user, status: user.status || "active", googleLinked: Boolean(user.googleLinkedAt) })) });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load user accounts." });
  }
};
module.exports.setUserStatus = async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: "Invalid user ID." });
  try {
    const user = await userService.setUserStatus(req.params.id, req.body?.status, req.user._id);
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to update user status." });
  }
};
