// ============================================================
// FILE: controller/orderTrackingController.js
// ============================================================

const orderTrackingService =
  require("../services/orderTrackingService");

/* =========================================================
   GET ALL TRACKING ORDERS
========================================================= */

const getAllOrderTrackings =
  async (req, res) => {
    try {
      const data =
        await orderTrackingService.getAllOrderTrackings(
          req.query,
          req.user
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch order tracking",
      });
    }
  };

/* =========================================================
   GET SINGLE TRACKING
========================================================= */

const getOrderTrackingById =
  async (req, res) => {
    try {
      const data =
        await orderTrackingService.getOrderTrackingById(
          req.params.id
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message:
          error.message ||
          "Order tracking not found",
      });
    }
  };

/* =========================================================
   GET TRACKING BY SALES ORDER ID
========================================================= */

const getTrackingBySalesOrderId =
  async (req, res) => {
    try {
      const {
        salesOrderId,
      } = req.params;

      if (!salesOrderId) {
        return res.status(400).json({
          success: false,
          message:
            "Sales Order ID is required",
        });
      }

      const data =
        await orderTrackingService.getTrackingBySalesOrderId(
          salesOrderId
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message:
          error.message ||
          "Tracking not found",
      });
    }
  };

/* =========================================================
   GET BY TRACKING NUMBER
========================================================= */

const getTrackingByNumber =
  async (req, res) => {
    try {
      const {
        trackingNumber,
      } = req.params;

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Tracking number is required",
        });
      }

      const data =
        await orderTrackingService.getTrackingByNumber(
          trackingNumber
        );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message:
          error.message ||
          "Order tracking not found",
      });
    }
  };

/* =========================================================
   SYNC SINGLE APPROVED SALES ORDER

   POST
   /api/order-tracking/sync/:salesOrderId

   BODY:
   {}

   Backend reads:
   - salesOrder.trackingOrderType
   - salesOrder.supplyCondition
   - salesOrder.otherSupplyConditions
========================================================= */

const syncSalesOrder =
  async (req, res) => {
    try {
      const {
        salesOrderId,
      } = req.params;

      if (!salesOrderId) {
        return res.status(400).json({
          success: false,
          message:
            "Sales Order ID is required",
        });
      }

      const data =
        await orderTrackingService.syncSalesOrder({
          salesOrderId,
          user:
            req.user,
        });

      return res.status(200).json({
        success: true,

        message:
          data.alreadySynced
            ? "Sales Order is already synced with order tracking"
            : "Sales Order synced with order tracking successfully",

        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to sync Sales Order",
      });
    }
  };

/* =========================================================
   AUTO SYNC ALL APPROVED SALES ORDERS

   POST
   /api/order-tracking/sync

   BODY:
   {}

   Backend automatically:
   - finds approved Sales Orders
   - skips already synced records
   - reads trackingOrderType
   - reads supplyCondition
   - resolves process
   - generates milestones
========================================================= */

const syncApprovedSalesOrders =
  async (req, res) => {
    try {
      const data =
        await orderTrackingService.syncApprovedSalesOrders({
          user:
            req.user,
        });

      return res.status(200).json({
        success: true,
        message:
          "Approved Sales Orders sync completed successfully",
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to sync approved Sales Orders",
      });
    }
  };

/* =========================================================
   COMPLETE CURRENT MILESTONE

   PATCH
   /api/order-tracking/:id/milestones/:milestoneId/complete

   BODY CAN BE:
   {}

   Backend automatically uses server date/time.

   Optional:
   {
     "comment": "Forging completed"
   }
========================================================= */

const completeMilestone =
  async (req, res) => {
    try {
      const {
        actualDate,
        comment,
        attachments,
      } = req.body || {};

      const {
        id,
        milestoneId,
      } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Tracking ID is required",
        });
      }

      if (!milestoneId) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone ID is required",
        });
      }

      const data =
        await orderTrackingService.completeMilestone({
          trackingId:
            id,

          milestoneId,

          actualDate:
            actualDate ||
            undefined,

          comment:
            comment ||
            "",

          attachments:
            Array.isArray(
              attachments
            )
              ? attachments
              : [],

          user:
            req.user,
        });

      return res.status(200).json({
        success: true,

        message:
          "Milestone completed successfully. Future estimated dates adjusted automatically.",

        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to complete milestone",
      });
    }
  };

/* =========================================================
   UPDATE ESTIMATED DATE
========================================================= */

const updateEstimatedDate =
  async (req, res) => {
    try {
      const {
        estimatedDate,
        comment,
      } = req.body || {};

      const {
        id,
        milestoneId,
      } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Tracking ID is required",
        });
      }

      if (!milestoneId) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone ID is required",
        });
      }

      if (!estimatedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Estimated date is required",
        });
      }

      const data =
        await orderTrackingService.updateEstimatedDate({
          trackingId:
            id,

          milestoneId,

          estimatedDate,

          comment:
            comment ||
            "",

          user:
            req.user,
        });

      return res.status(200).json({
        success: true,

        message:
          "Estimated date updated and future milestone dates adjusted successfully",

        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update estimated date",
      });
    }
  };

/* =========================================================
   UPDATE TRANSPORTER
========================================================= */

const updateTransporter =
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Tracking ID is required",
        });
      }

      const transporter = {
        transporterName:
          req.body
            ?.transporterName,

        vehicleNumber:
          req.body
            ?.vehicleNumber,

        driverName:
          req.body
            ?.driverName,

        driverPhone:
          req.body
            ?.driverPhone,

        lrNumber:
          req.body
            ?.lrNumber,
      };

      const data =
        await orderTrackingService.updateTransporter({
          trackingId:
            id,

          transporter,

          user:
            req.user,
        });

      return res.status(200).json({
        success: true,
        message:
          "Transporter details updated successfully",
        data,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to update transporter details",
      });
    }
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  /* SYNC */
  syncSalesOrder,
  syncApprovedSalesOrders,

  /* GET */
  getAllOrderTrackings,
  getOrderTrackingById,
  getTrackingBySalesOrderId,
  getTrackingByNumber,

  /* UPDATE */
  completeMilestone,
  updateEstimatedDate,
  updateTransporter,
};