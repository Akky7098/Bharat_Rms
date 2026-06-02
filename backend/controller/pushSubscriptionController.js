const webPushService = require("../services/webPushService");

const getPublicKey = async (req, res) => {
  res.json({
    success: true,
    data: {
      publicKey: webPushService.getPublicVapidKey(),
    },
  });
};

const subscribe = async (req, res) => {
  try {
    const subscription = await webPushService.saveSubscription({
      user: req.user,
      subscription: req.body.subscription,
      platform: req.body.platform,
      userAgent: req.headers["user-agent"] || "",
    });

    res.json({
      success: true,
      message: "Push subscription saved",
      data: subscription,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const unsubscribe = async (req, res) => {
  try {
    await webPushService.removeSubscription(req.body.endpoint);

    res.json({
      success: true,
      message: "Push subscription removed",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getPublicKey,
  subscribe,
  unsubscribe,
};