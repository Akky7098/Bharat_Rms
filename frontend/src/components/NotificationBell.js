import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { io } from "socket.io-client";

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

import {
  enablePushNotifications,
  disablePushNotifications,
  getCurrentPushSubscription,
  getPushPermission,
  isPushSupported,
} from "../services/pushNotificationService";

const SOCKET_URL = "https://bharatspecialsteels.bharatspecialsteels.com";

const moduleHashMap = {
  sales_order: "sales-order",
  dispatch: "dispatch",
  enquiry: "enquiry",
  attendance: "attendance",
  timesheet: "timesheet",
  receivable: "receivables",
  document: "documents",
  payment: "dispatch",
  system: "dashboard",
};

const getNotificationHash = (notification) => {
  if (notification?.actionUrl?.includes("#")) {
    return notification.actionUrl.split("#")[1];
  }

  return moduleHashMap[notification?.module] || "dashboard";
};

const formatTime = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pushPermission, setPushPermission] = useState(getPushPermission());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const socketRef = useRef(null);
  const mountedRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();

      if (!mountedRef.current) return;

      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (error) {
      console.log("Notification load failed:", error?.message || error);
    }
  }, []);

  const checkPushStatus = useCallback(async () => {
    try {
      setPushPermission(getPushPermission());

      if (!isPushSupported()) {
        setPushEnabled(false);
        return;
      }

      const sub = await getCurrentPushSubscription();

      if (!mountedRef.current) return;

      setPushEnabled(Boolean(sub) && getPushPermission() === "granted");
    } catch (error) {
      console.log("Push check failed:", error?.message || error);
      setPushEnabled(false);
    }
  }, []);

  const syncPushSubscription = useCallback(async () => {
    try {
      if (!isPushSupported()) return;

      if (Notification.permission !== "granted") {
        await checkPushStatus();
        return;
      }

      const sub = await getCurrentPushSubscription();

      if (!sub) {
        await enablePushNotifications();
      }

      await checkPushStatus();
    } catch (error) {
      console.log("Push sync failed:", error?.message || error);
    }
  }, [checkPushStatus]);

  useEffect(() => {
    mountedRef.current = true;

    loadNotifications();
    syncPushSubscription();

    const token = localStorage.getItem("token");

    if (!token) {
      return () => {
        mountedRef.current = false;
      };
    }

    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      forceNew: false,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      if (!mountedRef.current) return;
      setSocketConnected(true);
      console.log("Notification socket connected");
    };

    const handleDisconnect = () => {
      if (!mountedRef.current) return;
      setSocketConnected(false);
      console.log("Notification socket disconnected");
    };

    const handleConnectError = (error) => {
      console.log("Notification socket connect error:", error?.message || error);
    };

    const handleNotification = (notification) => {
      if (!mountedRef.current || !notification?._id) return;

      setNotifications((prev) => {
        const alreadyExists = prev.some((item) => item._id === notification._id);

        if (alreadyExists) return prev;

        return [notification, ...prev].slice(0, 20);
      });

      setUnreadCount((prev) => Number(prev || 0) + 1);

      if ("vibrate" in navigator) {
        navigator.vibrate(120);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("error", handleConnectError);
    socket.on("notification:new", handleNotification);

    return () => {
      mountedRef.current = false;

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("error", handleConnectError);
      socket.off("notification:new", handleNotification);

      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [loadNotifications, syncPushSubscription]);

  useEffect(() => {
    if (open) {
      checkPushStatus();
    }
  }, [open, checkPushStatus]);

  const handleEnablePush = async () => {
    try {
      setPushLoading(true);

      await enablePushNotifications();

      setPushPermission(getPushPermission());
      setPushEnabled(true);

      alert("Push notifications enabled successfully on this device.");
    } catch (error) {
      setPushPermission(getPushPermission());
      await checkPushStatus();

      alert(error?.message || "Unable to enable notifications.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    try {
      setPushLoading(true);

      await disablePushNotifications();

      setPushPermission(getPushPermission());
      setPushEnabled(false);

      alert("Push notifications disabled on this device.");
    } catch (error) {
      setPushPermission(getPushPermission());
      await checkPushStatus();

      alert(error?.message || "Unable to disable notifications.");
    } finally {
      setPushLoading(false);
    }
  };

  const openNotification = async (notification) => {
    try {
      await markNotificationRead(notification._id);

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? { ...item, isRead: true } : item
        )
      );

      setUnreadCount((prev) => Math.max(Number(prev || 0) - 1, 0));
    } catch (error) {
      console.log("Mark read failed:", error?.message || error);
    }

    localStorage.setItem(
      "notificationFocus",
      JSON.stringify({
        module: notification.module,
        referenceId: notification.referenceId,
        referenceModel: notification.referenceModel,
        createdAt: new Date().toISOString(),
      })
    );

    const hash = getNotificationHash(notification);

    setOpen(false);

    if (window.location.hash.replace("#", "") === hash) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = hash;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.log("Mark all read failed:", error?.message || error);
    }
  };

  return (
    <div className="notification-widget">
      <button
        type="button"
        className={`notification-bell-btn ${
          unreadCount > 0 ? "has-unread" : ""
        }`}
        onClick={() => setOpen((prev) => !prev)}
        title="Notifications"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <h3>Notifications</h3>
              <p>{socketConnected ? "Live updates active" : "Connecting live..."}</p>
            </div>

            <button
              type="button"
              className="notification-close-btn"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="notification-actions-row">
            <span>{unreadCount} unread</span>

            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {isPushSupported() && pushPermission !== "denied" && (
            <div className="notification-push-box">
              <strong>
                {pushEnabled
                  ? "Lock-screen notifications enabled"
                  : "Enable lock-screen notifications"}
              </strong>

              <span>
                {pushEnabled
                  ? "This device will receive Bharat RMS alerts."
                  : "Get alerts even when Bharat RMS is closed."}
              </span>

              {pushEnabled ? (
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={pushLoading}
                  className="disable"
                >
                  {pushLoading ? "Disabling..." : "Disable on this device"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                >
                  {pushLoading ? "Enabling..." : "Enable Notifications"}
                </button>
              )}
            </div>
          )}

          {!isPushSupported() && (
            <div className="notification-push-box warning">
              <strong>Push not supported</strong>
              <span>
                Install this dashboard as PWA or use Chrome/Safari supported
                browser.
              </span>
            </div>
          )}

          {pushPermission === "denied" && (
            <div className="notification-push-box warning">
              <strong>Notifications blocked</strong>
              <span>
                Please allow notifications from browser settings to receive
                lock-screen alerts.
              </span>
            </div>
          )}

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <strong>No notifications</strong>
                <span>You are all caught up.</span>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`notification-item ${
                    item.isRead ? "read" : "unread"
                  } priority-${item.priority || "normal"}`}
                  onClick={() => openNotification(item)}
                >
                  <div className="notification-item-top">
                    <strong>{item.title}</strong>
                    {!item.isRead && <span />}
                  </div>

                  <p>{item.message}</p>

                  <small>
                    {String(item.module || "")
                      .replaceAll("_", " ")
                      .toUpperCase()}{" "}
                    · {formatTime(item.createdAt)}
                  </small>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;