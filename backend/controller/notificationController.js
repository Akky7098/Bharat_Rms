// const notificationService = require("../services/notificationService");

// const getNotifications = async (req, res) => {
//   try {
//     const data = await notificationService.getNotifications(req.user);

//     res.status(200).json({
//       success: true,
//       data,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// module.exports = {
//   getNotifications,
// };
const notificationService = require("../services/notificationService");

const getNotifications = async (req, res) => {
  try {
    const data = await notificationService.getUserNotifications(
      req.user,
      req.query
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user);

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user);

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const clearNotification = async (req, res) => {
  try {
    await notificationService.clearNotification(req.params.id, req.user);

    res.json({
      success: true,
      message: "Notification cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotification,
};