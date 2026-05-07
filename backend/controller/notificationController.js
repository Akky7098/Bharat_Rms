const notificationService = require("../services/notificationService");

const getNotifications = async (req, res) => {
  try {
    const data = await notificationService.getNotifications(req.user);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getNotifications,
};