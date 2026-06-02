const webpush = require("web-push");
const PushSubscription = require("../model/pushSubscriptionModel");

webpush.setVapidDetails(
  process.env.WEB_PUSH_SUBJECT || "mailto:admin@bharatspecialsteels.com",
  process.env.WEB_PUSH_PUBLIC_KEY,
  process.env.WEB_PUSH_PRIVATE_KEY
);

const getPublicVapidKey = () => {
  return process.env.WEB_PUSH_PUBLIC_KEY || "";
};

const saveSubscription = async ({ user, subscription, platform, userAgent }) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid push subscription");
  }

  const saved = await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId: user._id || user.id,
        role: user.role,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        platform: platform || "unknown",
        userAgent: userAgent || "",
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

  return saved;
};

const removeSubscription = async (endpoint) => {
  if (!endpoint) return false;

  await PushSubscription.updateOne(
    { endpoint },
    {
      $set: {
        isActive: false,
      },
    }
  );

  return true;
};

const sendPushToSubscription = async (subscriptionDoc, payload) => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscriptionDoc.endpoint,
        keys: subscriptionDoc.keys,
      },
      JSON.stringify(payload)
    );

    subscriptionDoc.lastUsedAt = new Date();
    await subscriptionDoc.save();

    return true;
  } catch (error) {
    console.log("WEB PUSH SEND ERROR =>", error.statusCode, error.message);

    if ([404, 410].includes(error.statusCode)) {
      subscriptionDoc.isActive = false;
      await subscriptionDoc.save();
    }

    return false;
  }
};

const sendPushNotification = async (notification) => {
  try {
    const targetUserIds = (notification.targetUserIds || []).map((id) =>
      String(id)
    );

    const targetRoles = notification.targetRoles || [];

    if (!targetUserIds.length && !targetRoles.length) return;

    const subscriptions = await PushSubscription.find({
      isActive: true,
      $or: [
        ...(targetUserIds.length
          ? [{ userId: { $in: targetUserIds } }]
          : []),
        ...(targetRoles.length ? [{ role: { $in: targetRoles } }] : []),
      ],
    });

    const payload = {
      title: notification.title,
      body: notification.message,
      icon: "/logo.png",
      badge: "/logo.png",
      url: notification.actionUrl || "/dashboard",
      notificationId: notification._id,
      module: notification.module,
      referenceId: notification.referenceId,
      priority: notification.priority,
    };

    await Promise.all(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );
  } catch (error) {
    console.log("WEB PUSH NOTIFICATION ERROR =>", error.message);
  }
};

module.exports = {
  getPublicVapidKey,
  saveSubscription,
  removeSubscription,
  sendPushNotification,
};