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
  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
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

  console.log(
    `PUSH SUBSCRIPTION SAVED => user=${saved.userId}, role=${saved.role}, platform=${saved.platform}`
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

  console.log("PUSH SUBSCRIPTION DISABLED =>", endpoint.slice(0, 40));

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

    console.log(
      `WEB PUSH SENT SUCCESS => user=${subscriptionDoc.userId}, role=${subscriptionDoc.role}, platform=${subscriptionDoc.platform}`
    );

    return true;
  } catch (error) {
    console.log(
      "WEB PUSH SEND ERROR =>",
      error.statusCode,
      error.message,
      "endpoint=",
      String(subscriptionDoc.endpoint || "").slice(0, 60)
    );

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

    if (!targetUserIds.length && !targetRoles.length) {
      console.log("WEB PUSH SKIPPED => no target users/roles");
      return;
    }

    const subscriptions = await PushSubscription.find({
      isActive: true,
      $or: [
        ...(targetUserIds.length
          ? [{ userId: { $in: targetUserIds } }]
          : []),
        ...(targetRoles.length ? [{ role: { $in: targetRoles } }] : []),
      ],
    });

    console.log(
      `WEB PUSH TARGETS => notification=${notification._id}, users=${targetUserIds.length}, roles=${targetRoles.join(
        ","
      )}, subscriptions=${subscriptions.length}`
    );

    if (!subscriptions.length) return;

    const hash =
      notification.actionUrl?.includes("#")
        ? notification.actionUrl.split("#")[1]
        : "";

    const payload = {
      title: notification.title || "Bharat RMS",
      body: notification.message || "You have a new update.",
      icon: "/bharat-rms-icon-12-06-2026.png",
      badge: "/bharat-rms-icon-12-06-2026.png",
      url: hash ? `/dashboard#${hash}` : notification.actionUrl || "/dashboard",
      notificationId: String(notification._id || ""),
      module: notification.module || "",
      referenceId: String(notification.referenceId || ""),
      priority: notification.priority || "normal",
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