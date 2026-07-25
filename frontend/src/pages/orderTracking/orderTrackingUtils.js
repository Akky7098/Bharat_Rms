export const STATUS_OPTIONS = [
  {
    value: "order_approved",
    label: "Order Approved",
  },
  {
    value: "planning",
    label: "Planning",
  },
  {
    value: "material_pending",
    label: "Material Pending",
  },
  {
    value: "cutting_started",
    label: "Cutting Started",
  },
  {
    value: "cutting_partial",
    label: "Cutting Partial",
  },
  {
    value: "cutting_completed",
    label: "Cutting Completed",
  },
  {
    value: "machining_started",
    label: "Machining Started",
  },
  {
    value: "machining_partial",
    label: "Machining Partial",
  },
  {
    value: "machining_completed",
    label: "Machining Completed",
  },
  {
    value: "ready_for_dispatch",
    label: "Ready For Dispatch",
  },
  {
    value: "loading_started",
    label: "Loading Started",
  },
  {
    value: "dispatched",
    label: "Dispatched",
  },
  {
    value: "in_transit",
    label: "In Transit",
  },
  {
    value: "reached_destination",
    label: "Reached Destination",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
  {
    value: "on_hold",
    label: "On Hold",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

export const PRIORITY_OPTIONS = [
  {
    value: "",
    label: "All Priorities",
  },
  {
    value: "low",
    label: "Low",
  },
  {
    value: "normal",
    label: "Normal",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "urgent",
    label: "Urgent",
  },
];

export const humanize = (
  value = ""
) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );

export const formatDate = (
  value,
  includeTime = false
) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    includeTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
  ).format(date);
};

/*
 * Supports both response styles:
 *
 * 1. Service returns response.data:
 *
 * {
 *   success: true,
 *   data: {
 *     data: [...],
 *     pagination: {...}
 *   }
 * }
 *
 * 2. Service returns the complete Axios response:
 *
 * {
 *   data: {
 *     success: true,
 *     data: {
 *       data: [...],
 *       pagination: {...}
 *     }
 *   }
 * }
 */
export const unwrapApiData = (
  response
) => {
  if (!response) {
    return null;
  }

  /*
   * Direct backend response returned by
   * the current service file.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      response,
      "success"
    ) &&
    Object.prototype.hasOwnProperty.call(
      response,
      "data"
    )
  ) {
    return response.data;
  }

  /*
   * Full Axios response.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      response,
      "data"
    ) &&
    Object.prototype.hasOwnProperty.call(
      response.data || {},
      "success"
    ) &&
    Object.prototype.hasOwnProperty.call(
      response.data || {},
      "data"
    )
  ) {
    return response.data.data;
  }

  /*
   * Already-unwrapped payload.
   */
  return response.data ?? response;
};

export const getStatusTone = (
  status = ""
) => {
  if (
    [
      "ready_for_dispatch",
      "reached_destination",
      "delivered",
    ].includes(status)
  ) {
    return "tone-green";
  }

  if (
    [
      "order_approved",
      "planning",
      "dispatched",
      "in_transit",
    ].includes(status)
  ) {
    return "tone-blue";
  }

  if (
    [
      "material_pending",
      "cutting_started",
      "cutting_partial",
      "cutting_completed",
      "machining_started",
      "machining_partial",
      "machining_completed",
      "loading_started",
    ].includes(status)
  ) {
    return "tone-orange";
  }

  if (
    [
      "on_hold",
      "cancelled",
    ].includes(status)
  ) {
    return "tone-red";
  }

  return "tone-neutral";
};

export const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") ||
        "{}"
    );
  } catch (error) {
    return {};
  }
};

export const canUpdateTracking = (
  user = {}
) =>
  [
    "super_admin",
    "admin",
    "manager",
    "dispatch",
    "production",
  ].includes(
    String(
      user.role || ""
    ).toLowerCase()
  );

export const canReopenTrackingChat = (
  user = {}
) =>
  [
    "super_admin",
    "admin",
  ].includes(
    String(
      user.role || ""
    ).toLowerCase()
  );

export const canSyncTracking = (
  user = {}
) =>
  [
    "super_admin",
    "admin",
  ].includes(
    String(
      user.role || ""
    ).toLowerCase()
  );

export const getPublicFileUrl = (
  fileUrl = ""
) => {
  if (!fileUrl) {
    return "";
  }

  if (
    fileUrl.startsWith(
      "http://"
    ) ||
    fileUrl.startsWith(
      "https://"
    )
  ) {
    return fileUrl;
  }

  /*
   * Use the same environment variable
   * used by your backend service.
   */
  const configuredBase =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    "";

  /*
   * Remove trailing /api so file paths
   * such as /uploads/... resolve correctly.
   */
  const origin =
    configuredBase
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");

  /*
   * Local fallback when environment
   * variables are not configured.
   */
  const fallbackOrigin =
    window.location.hostname ===
    "localhost"
      ? "http://localhost:5000"
      : "";

  return `${
    origin || fallbackOrigin
  }${
    fileUrl.startsWith("/")
      ? fileUrl
      : `/${fileUrl}`
  }`;
};