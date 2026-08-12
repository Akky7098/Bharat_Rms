import axios from "axios";

/* =========================================================
   BASE URL

   LOCAL TESTING
========================================================= */

const BASE_URL = "http://localhost:5000";

/*
 * PRODUCTION
 *
 * Comment localhost above and uncomment this
 * before production build.
 */

/*
const BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";
*/

const API_URL = `${BASE_URL}/api/order-tracking`;

/* =========================================================
   AUTH HELPERS
========================================================= */

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

const requestConfig = (params = {}) => ({
  headers: authHeaders(),
  params,
});

/* =========================================================
   ERROR HELPER
========================================================= */

const getErrorMessage = (
  error,
  fallbackMessage = "Something went wrong"
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

/* =========================================================
   GET ALL ORDER TRACKINGS

   GET
   /api/order-tracking

   Example:

   getOrderTrackingList({
     page: 1,
     limit: 25,
     status: "planning",
     orderType: "N.H.O.",
     processType: "AS_ROLLED",
     supplyCondition: "as_rolled",
     search: "PO-123"
   });

   IMPORTANT:

   Latest-order sorting should be handled by backend:

   approvedAt DESC
   createdAt DESC

   So orders appear:

   11 Aug
   10 Aug
   09 Aug
   08 Aug
   ...
========================================================= */

export const getOrderTrackingList = async (params = {}) => {
  try {
    const response = await axios.get(
      API_URL,
      requestConfig(params)
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to fetch order tracking list"
      )
    );
  }
};

/* =========================================================
   GET SINGLE TRACKING BY MONGODB ID

   GET
   /api/order-tracking/:id
========================================================= */

export const getOrderTrackingById = async (trackingId) => {
  try {
    if (!trackingId) {
      throw new Error("Tracking ID is required");
    }

    const response = await axios.get(
      `${API_URL}/${trackingId}`,
      requestConfig()
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to fetch order tracking details"
      )
    );
  }
};

/* =========================================================
   GET TRACKING BY SALES ORDER ID

   GET
   /api/order-tracking/sales-order/:salesOrderId
========================================================= */

export const getTrackingBySalesOrderId = async (
  salesOrderId
) => {
  try {
    if (!salesOrderId) {
      throw new Error("Sales Order ID is required");
    }

    const response = await axios.get(
      `${API_URL}/sales-order/${salesOrderId}`,
      requestConfig()
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to fetch tracking for Sales Order"
      )
    );
  }
};

/* =========================================================
   GET TRACKING BY TRACKING NUMBER

   GET
   /api/order-tracking/track/BST-2026-000001
========================================================= */

export const getTrackingByNumber = async (
  trackingNumber
) => {
  try {
    if (!trackingNumber) {
      throw new Error("Tracking number is required");
    }

    const response = await axios.get(
      `${API_URL}/track/${encodeURIComponent(
        trackingNumber
      )}`,
      requestConfig()
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to fetch tracking details"
      )
    );
  }
};

/* =========================================================
   SYNC SINGLE APPROVED SALES ORDER

   POST
   /api/order-tracking/sync/:salesOrderId

   FRONTEND SENDS:

   {}

   Backend automatically reads from Sales Order:

   salesOrder.trackingOrderType
   salesOrder.supplyCondition
   salesOrder.otherSupplyConditions

   Backend then determines:

   H.O.
   OR
   N.H.O.

   For N.H.O. it determines process from supply condition:

   AS_ROLLED
   AS_FORGED
   AS_ROLLED_ANNEALED_NORMALIZED
   AS_FORGED_ANNEALED_NORMALIZED
   AS_ROLLED_QT
   AS_FORGED_QT

   Example:

   await syncSalesOrder(salesOrderId);
========================================================= */

export const syncSalesOrder = async (salesOrderId) => {
  try {
    if (!salesOrderId) {
      throw new Error("Sales Order ID is required");
    }

    const response = await axios.post(
      `${API_URL}/sync/${salesOrderId}`,
      {},
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to sync Sales Order"
      )
    );
  }
};

/* =========================================================
   AUTO SYNC ALL APPROVED SALES ORDERS

   POST
   /api/order-tracking/sync

   FRONTEND SENDS:

   {}

   Backend automatically:

   1. Finds manager-approved Sales Orders
   2. Skips already synced Sales Orders
   3. Reads trackingOrderType
   4. Reads supplyCondition
   5. Reads otherSupplyConditions
   6. Determines H.O. / N.H.O.
   7. Resolves correct manufacturing process
   8. Generates all milestones
   9. Generates estimated dates
   10. Sets first milestone to Planning

   IMPORTANT:

   Frontend does NOT send:

   orders[]
   orderType
   supplyCondition
   processType

   Sales Order remains source of truth.

   Example:

   await syncApprovedSalesOrders();
========================================================= */

export const syncApprovedSalesOrders = async () => {
  try {
    const response = await axios.post(
      `${API_URL}/sync`,
      {},
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to sync approved Sales Orders"
      )
    );
  }
};

/* =========================================================
   COMPLETE TRACKING MILESTONE

   PATCH
   /api/order-tracking/:trackingId/
   milestones/:milestoneId/complete

   This is the LOW-LEVEL function.

   Normally the UI should use:

   markMilestoneDoneNow()

   Backend automatically:

   1. Records actual server date/time
   2. Marks milestone completed
   3. Calculates difference between:
      estimatedDate vs actualDate
   4. Shifts future estimated dates
   5. Marks next milestone in_progress
   6. Changes current status
   7. Updates progress percentage
   8. Recalculates:
      Ready for Dispatch
      Loading
      Shipped
      Delivered
========================================================= */

export const completeTrackingMilestone = async (
  trackingId,
  milestoneId,
  payload = {}
) => {
  try {
    if (!trackingId) {
      throw new Error("Tracking ID is required");
    }

    if (!milestoneId) {
      throw new Error("Milestone ID is required");
    }

    const body = {};

    /*
     * DO NOT normally send actualDate.
     *
     * Backend should automatically use
     * current server date/time.
     *
     * Support remains here only in case
     * admin correction is required later.
     */

    if (payload.actualDate) {
      body.actualDate = payload.actualDate;
    }

    if (payload.comment) {
      body.comment = payload.comment;
    }

    if (
      Array.isArray(payload.attachments) &&
      payload.attachments.length > 0
    ) {
      body.attachments = payload.attachments;
    }

    const response = await axios.patch(
      `${API_URL}/${trackingId}/milestones/${milestoneId}/complete`,
      body,
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to complete tracking milestone"
      )
    );
  }
};

/* =========================================================
   MARK MILESTONE DONE NOW

   MAIN FUNCTION FOR PREMIUM TIMELINE UI

   User simply clicks:

   "Mark Done Now"

   Example:

   await markMilestoneDoneNow(
     trackingId,
     milestoneId
   );

   OR WITH COMMENT:

   await markMilestoneDoneNow(
     trackingId,
     milestoneId,
     "Forging completed successfully"
   );

   Frontend does NOT calculate dates.

   Backend automatically records:

   actualDate = current server time

   Then backend adjusts all future ETAs.
========================================================= */

export const markMilestoneDoneNow = async (
  trackingId,
  milestoneId,
  comment = ""
) => {
  try {
    return await completeTrackingMilestone(
      trackingId,
      milestoneId,
      comment
        ? {
            comment,
          }
        : {}
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to mark milestone complete"
      )
    );
  }
};

/* =========================================================
   UPDATE ESTIMATED DATE

   PATCH
   /api/order-tracking/:trackingId/
   milestones/:milestoneId/estimated-date

   Example:

   await updateMilestoneEstimatedDate(
     trackingId,
     milestoneId,
     {
       estimatedDate: "2026-08-20",
       comment: "Mill revised forging plan"
     }
   );

   IMPORTANT:

   Backend calculates date difference.

   Example:

   Old ETA:
   18 Aug

   New ETA:
   21 Aug

   Difference:
   +3 days

   Backend moves ALL later pending
   milestones forward by +3 days.

   Frontend does NOT calculate this.
========================================================= */

export const updateMilestoneEstimatedDate = async (
  trackingId,
  milestoneId,
  payload = {}
) => {
  try {
    if (!trackingId) {
      throw new Error("Tracking ID is required");
    }

    if (!milestoneId) {
      throw new Error("Milestone ID is required");
    }

    if (!payload?.estimatedDate) {
      throw new Error("Estimated date is required");
    }

    const response = await axios.patch(
      `${API_URL}/${trackingId}/milestones/${milestoneId}/estimated-date`,
      {
        estimatedDate: payload.estimatedDate,
        comment: payload.comment || "",
      },
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to update estimated date"
      )
    );
  }
};

/* =========================================================
   UPDATE TRANSPORTER DETAILS

   PATCH
   /api/order-tracking/:trackingId/transporter

   Example:

   await updateOrderTrackingTransporter(
     trackingId,
     {
       transporterName: "ABC Transport",
       vehicleNumber: "HR38AB1234",
       driverName: "Rajesh",
       driverPhone: "9876543210",
       lrNumber: "LR-001"
     }
   );
========================================================= */

export const updateOrderTrackingTransporter = async (
  trackingId,
  payload = {}
) => {
  try {
    if (!trackingId) {
      throw new Error("Tracking ID is required");
    }

    const response = await axios.patch(
      `${API_URL}/${trackingId}/transporter`,
      {
        transporterName:
          payload.transporterName ?? "",

        vehicleNumber:
          payload.vehicleNumber ?? "",

        driverName:
          payload.driverName ?? "",

        driverPhone:
          payload.driverPhone ?? "",

        lrNumber:
          payload.lrNumber ?? "",
      },
      {
        headers: authHeaders(),
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Failed to update transporter details"
      )
    );
  }
};