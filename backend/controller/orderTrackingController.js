const orderTrackingService = require(
  "../services/orderTrackingService"
);

const sendSuccess = (
  res,
  message,
  data,
  statusCode = 200
) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

const getDashboard = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.getTrackingDashboard(
        req.user
      );

    return sendSuccess(
      res,
      "Order tracking dashboard fetched successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const getTrackingList = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.getTrackingList(
        {
          query: req.query,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order tracking records fetched successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const getTrackingById = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.getTrackingById(
        {
          trackingId:
            req.params.trackingId,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order tracking record fetched successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const syncApprovedSalesOrders =
  async (req, res, next) => {
    try {
      const data =
        await orderTrackingService.syncApprovedSalesOrders(
          req.user
        );

      return sendSuccess(
        res,
        "Approved sales orders synced successfully.",
        data
      );
    } catch (error) {
      return next(error);
    }
  };

const updateStatus = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.updateTrackingStatus(
        {
          trackingId:
            req.params.trackingId,
          payload: req.body,
          files: req.files || [],
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order status updated successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const requestUpdate = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.requestOrderUpdate(
        {
          trackingId:
            req.params.trackingId,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order update requested successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const sendMessage = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.sendTrackingMessage(
        {
          trackingId:
            req.params.trackingId,
          payload: req.body,
          files: req.files || [],
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Message sent successfully.",
      data,
      201
    );
  } catch (error) {
    return next(error);
  }
};

const getMessages = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.getTrackingMessages(
        {
          trackingId:
            req.params.trackingId,
          query: req.query,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order tracking messages fetched successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const markMessagesRead = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.markMessagesRead(
        {
          trackingId:
            req.params.trackingId,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Messages marked as read.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const deleteMessage = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.deleteTrackingMessage(
        {
          trackingId:
            req.params.trackingId,
          messageId:
            req.params.messageId,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Message deleted for everyone successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const closeChat = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.closeTrackingChat(
        {
          trackingId:
            req.params.trackingId,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order chat closed successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

const reopenChat = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await orderTrackingService.reopenTrackingChat(
        {
          trackingId:
            req.params.trackingId,
          user: req.user,
        }
      );

    return sendSuccess(
      res,
      "Order chat reopened successfully.",
      data
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboard,
  getTrackingList,
  getTrackingById,
  syncApprovedSalesOrders,
  updateStatus,
  requestUpdate,
  sendMessage,
  getMessages,
  markMessagesRead,
  deleteMessage,
  closeChat,
  reopenChat,
};
