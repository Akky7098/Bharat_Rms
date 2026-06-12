const { Expo } = require("expo-server-sdk");
const AppPushToken = require("../model/appPushTokenModel");

const expo = new Expo();

const saveAppPushToken = async ({ user, expoPushToken, platform, deviceName }) => {
  if (!expoPushToken || !Expo.isExpoPushToken(expoPushToken)) {
    throw new Error("Invalid Expo push token");
  }

  const saved = await AppPushToken.findOneAndUpdate(
    { expoPushToken },
    {
      $set: {
        userId: user._id || user.id,
        role: user.role,
        expoPushToken,
        platform: platform || "unknown",
        deviceName: deviceName || "",
        isActive: true,
        lastUsedAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log(
    `APP PUSH TOKEN SAVED => user=${saved.userId}, role=${saved.role}, platform=${saved.platform}`
  );

  return saved;
};

const removeAppPushToken = async (expoPushToken) => {
  if (!expoPushToken) return false;

  await AppPushToken.updateOne(
    { expoPushToken },
    {
      $set: {
        isActive: false,
      },
    }
  );

  return true;
};

const sendAppPushNotification = async (notification) => {
  try {
    const targetUserIds = (notification.targetUserIds || []).map((id) =>
      String(id)
    );

    const targetRoles = notification.targetRoles || [];

    if (!targetUserIds.length && !targetRoles.length) return;

    const tokens = await AppPushToken.find({
      isActive: true,
      $or: [
        ...(targetUserIds.length ? [{ userId: { $in: targetUserIds } }] : []),
        ...(targetRoles.length ? [{ role: { $in: targetRoles } }] : []),
      ],
    });

    console.log(
      `APP PUSH TARGETS => notification=${notification._id}, tokens=${tokens.length}`
    );

    if (!tokens.length) return;

    const messages = tokens
      .filter((item) => Expo.isExpoPushToken(item.expoPushToken))
      .map((item) => ({
        to: item.expoPushToken,
        sound: "default",
        title: notification.title || "Bharat RMS",
        body: notification.message || "You have a new update.",
        priority: "high",
        channelId: "bharat-rms-alerts",
        data: {
          notificationId: String(notification._id || ""),
          module: notification.module || "",
          referenceId: String(notification.referenceId || ""),
          actionUrl: notification.actionUrl || "",
          priority: notification.priority || "normal",
        },
      }));

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log("APP PUSH SENT =>", tickets);
      } catch (error) {
        console.log("APP PUSH SEND ERROR =>", error.message);
      }
    }

    await AppPushToken.updateMany(
      { expoPushToken: { $in: tokens.map((t) => t.expoPushToken) } },
      { $set: { lastUsedAt: new Date() } }
    );
  } catch (error) {
    console.log("APP PUSH NOTIFICATION ERROR =>", error.message);
  }
};

module.exports = {
  saveAppPushToken,
  removeAppPushToken,
  sendAppPushNotification,
};