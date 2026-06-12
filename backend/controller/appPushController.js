const appPushService = require("../services/appPushService");

const registerToken = async (req, res) => {
  try {
    const { expoPushToken, platform, deviceName } = req.body;

    const saved = await appPushService.saveAppPushToken({
      user: req.user,
      expoPushToken,
      platform,
      deviceName,
    });

    res.json({
      success: true,
      message: "App push token registered",
      data: saved,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const unregisterToken = async (req, res) => {
  try {
    await appPushService.removeAppPushToken(req.body.expoPushToken);

    res.json({
      success: true,
      message: "App push token disabled",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  registerToken,
  unregisterToken,
};