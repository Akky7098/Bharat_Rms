const crypto =
  require("crypto");

const mongoose =
  require("mongoose");

const SalesOrder =
  require(
    "../model/salesOrderModel"
  );

const OrderTracking =
  require(
    "../model/OrderTracking"
  );

const CustomerOrderTrackingAccess =
  require(
    "../model/CustomerOrderTrackingAccess"
  );

const orderTrackingService =
  require(
    "./orderTrackingService"
  );

const customerTrackingEmailService =
  require(
    "./customerTrackingEmailService"
  );


/* =========================================================
   TOKEN
========================================================= */

const createRawToken =
  () =>
    crypto
      .randomBytes(32)
      .toString("hex");


const hashToken =
  (
    rawToken
  ) =>
    crypto
      .createHash("sha256")
      .update(
        String(
          rawToken ||
          ""
        )
      )
      .digest("hex");


/* =========================================================
   DATE HELPERS
========================================================= */

const toIsoOrNull =
  (
    value
  ) => {
    if (!value) {
      return null;
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
  };


/* =========================================================
   CUSTOMER SAFE TRACKING RESPONSE

   IMPORTANT:
   Never return:
   - internal activityHistory
   - internal users
   - manager comments
   - transporter private fields
   - MongoDB sales order details
   - order value / rate
   - payment details
========================================================= */

const sanitizeTrackingForCustomer =
  ({
    tracking,
    salesOrder,
  }) => {
    if (!salesOrder) {
      throw new Error(
        "Sales order not found"
      );
    }

    const milestones =
      Array.isArray(
        tracking?.milestones
      )
        ? [...tracking.milestones]
            .sort(
              (
                a,
                b
              ) =>
                Number(
                  a?.sequence ||
                  0
                ) -
                Number(
                  b?.sequence ||
                  0
                )
            )
            .map(
              (
                milestone
              ) => ({
                sequence:
                  Number(
                    milestone
                      ?.sequence ||
                    0
                  ),

                code:
                  String(
                    milestone
                      ?.code ||
                    ""
                  ),

                label:
                  String(
                    milestone
                      ?.label ||
                    ""
                  ),

                status:
                  String(
                    milestone
                      ?.status ||
                    "pending"
                  ),

                isCurrent:
                  Boolean(
                    milestone
                      ?.isCurrent
                  ),

                estimatedDate:
                  toIsoOrNull(
                    milestone
                      ?.estimatedDate
                  ),

                /*
                 * Customer can see that a stage
                 * has actually completed.
                 *
                 * We do not expose internal comments.
                 */
                actualDate:
                  toIsoOrNull(
                    milestone
                      ?.actualDate
                  ),
              })
            )
        : [];

    return {
      trackingAvailable:
        Boolean(
          tracking
        ),

      order: {
  companyName:
    salesOrder?.companyName || "",

  /*
   * CUSTOMER NAME
   *
   * This is the customer/contact person
   * entered in Sales Order.
   *
   * Example:
   * Mr. Anubhav
   */
  contactPersonName:
    salesOrder?.contactPersonName || "",

  poNumber:
    salesOrder?.poNumber || "",

  salesOrderNo:
    salesOrder?.salesOrderNo || "",

  orderDate:
    toIsoOrNull(
      salesOrder?.orderDate
    ),

  /*
   * BHARAT SALESPERSON
   *
   * This should only be shown in
   * "Your Bharat Contact".
   */
  salesPersonName:
    salesOrder?.salesPersonName || "",
},

      tracking:
        tracking
          ? {
              trackingNumber:
                tracking
                  ?.trackingNumber ||
                "",

              currentStatus:
                tracking
                  ?.currentStatus ||
                "",

              currentStatusLabel:
                tracking
                  ?.currentStatusLabel ||
                "In Process",

              progressPercentage:
                Number(
                  tracking
                    ?.progressPercentage ||
                  0
                ),

              estimatedReadyDate:
                toIsoOrNull(
                  tracking
                    ?.estimatedReadyDate
                ),

              estimatedLoadingDate:
                toIsoOrNull(
                  tracking
                    ?.estimatedLoadingDate
                ),

              estimatedShipDate:
                toIsoOrNull(
                  tracking
                    ?.estimatedShipDate
                ),

              estimatedDeliveryDate:
                toIsoOrNull(
                  tracking
                    ?.estimatedDeliveryDate
                ),

              milestones,
            }
          : {
              trackingNumber:
                "",

              currentStatus:
                "planning",

              currentStatusLabel:
                "Order Confirmed",

              progressPercentage:
                0,

              estimatedReadyDate:
                null,

              estimatedLoadingDate:
                null,

              estimatedShipDate:
                null,

              estimatedDeliveryDate:
                null,

              milestones:
                [],
            },
    };
  };


/* =========================================================
   ENSURE ORDER TRACKING EXISTS

   Uses the EXISTING Order Tracking service.

   No new order status or supply-condition logic is invented.
========================================================= */

const ensureOrderTracking =
  async ({
    salesOrder,
    approvedBy,
  }) => {
    let tracking =
      await OrderTracking.findOne({
        salesOrderId:
          salesOrder._id,

        isActive:
          true,
      });

    if (tracking) {
      return tracking;
    }

    /*
     * Existing service validates:
     * approvalStatus
     * trackingOrderType
     * supplyCondition
     * process generation
     */
    const syncResult =
      await orderTrackingService.syncSalesOrder({
        salesOrderId:
          salesOrder._id,

        user: {
          _id:
            approvedBy
              ?.managerId ||
            salesOrder
              ?.salesPersonId,

          id:
            approvedBy
              ?.managerId ||
            salesOrder
              ?.salesPersonId,

          name:
            approvedBy
              ?.managerName ||
            "MD Sir",

          email:
            approvedBy
              ?.managerEmail ||
            salesOrder
              ?.salesPersonEmail ||
            "",

          role:
            "super_admin",
        },
      });

    tracking =
      syncResult
        ?.tracking ||
      null;

    return tracking;
  };


/* =========================================================
   CREATE / ROTATE CUSTOMER ACCESS
========================================================= */

const createTrackingAccess =
  async (
    salesOrder
  ) => {
    const rawToken =
      createRawToken();

    const tokenHash =
      hashToken(
        rawToken
      );

    const access =
      await CustomerOrderTrackingAccess.findOneAndUpdate(
        {
          salesOrderId:
            salesOrder._id,
        },

        {
          $set: {
            tokenHash,

            customerEmail:
              String(
                salesOrder
                  ?.contactPersonEmail ||
                ""
              )
                .trim()
                .toLowerCase(),

            salesPersonEmail:
              String(
                salesOrder
                  ?.salesPersonEmail ||
                salesOrder
                  ?.salesPersonId
                  ?.email ||
                ""
              )
                .trim()
                .toLowerCase(),

            issuedAt:
              new Date(),

            isActive:
              true,

            revokedAt:
              null,

            emailError:
              "",
          },
        },

        {
          new:
            true,

          upsert:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

    return {
      access,
      rawToken,
    };
  };


/* =========================================================
   FINAL APPROVAL CUSTOMER FLOW

   Called as BACKGROUND work after MD approval.

   Approval itself must NEVER fail merely because
   customer email fails.
========================================================= */

const issueCustomerTrackingAfterApproval =
  async ({
    salesOrderId,
    approvedBy = {},
  }) => {
    if (
      !mongoose.Types
        .ObjectId
        .isValid(
          salesOrderId
        )
    ) {
      throw new Error(
        "Invalid Sales Order ID"
      );
    }

    const salesOrder =
      await SalesOrder
        .findById(
          salesOrderId
        )
        .populate(
          "salesPersonId",
          "name email mobileNumber whatsappNumber"
        );

    if (!salesOrder) {
      throw new Error(
        "Sales order not found"
      );
    }

    /*
     * EXACT existing Sales Order status.
     */
    if (
      salesOrder
        .approvalStatus !==
      "approved"
    ) {
      throw new Error(
        "Customer tracking email can be issued only after final Sales Order approval."
      );
    }

    /* -----------------------------------------------------
       TRY TO ENSURE ADMIN TRACKING EXISTS
    ----------------------------------------------------- */

    try {
      await ensureOrderTracking({
        salesOrder,
        approvedBy,
      });
    } catch (
      trackingError
    ) {
      /*
       * Do NOT break customer link creation.
       *
       * Customer page will temporarily show
       * "Order confirmed / tracking preparation".
       *
       * Once Bharat tracking is synced,
       * same link starts showing it automatically.
       */
      console.log(
        "CUSTOMER TRACKING AUTO SYNC ERROR =>",
        trackingError.message
      );
    }

    /* -----------------------------------------------------
       CREATE SECURE LINK
    ----------------------------------------------------- */

    const {
      access,
      rawToken,
    } =
      await createTrackingAccess(
        salesOrder
      );

    /* -----------------------------------------------------
       EMAIL
    ----------------------------------------------------- */

    try {
      const emailResult =
        await customerTrackingEmailService
          .sendCustomerTrackingEmail({
            salesOrder,
            rawToken,
          });

      access.lastEmailSentAt =
        new Date();

      access.emailMessageId =
        emailResult
          ?.messageId ||
        "";

      access.emailError =
        "";

      await access.save();

      /*
       * Existing allowed enum:
       * action = "email_sent"
       */
      salesOrder
        .approvalHistory
        .push({
          role:
            "system",

          action:
            "email_sent",

          comment:
            `Customer order tracking email sent to ${salesOrder.contactPersonEmail}`,
        });

      salesOrder.emailStatus = {
        sent:
          true,

        sentAt:
          new Date(),

        sentTo: [
          salesOrder
            .contactPersonEmail,
        ].filter(
          Boolean
        ),

        messageId:
          emailResult
            ?.messageId ||
          "",

        errorMessage:
          "",
      };

      await salesOrder.save();

      return {
        success:
          true,

        salesOrderId:
          salesOrder._id,

        customerEmail:
          salesOrder
            .contactPersonEmail,

        cc:
          salesOrder
            .salesPersonEmail ||
          salesOrder
            ?.salesPersonId
            ?.email ||
          "",

        messageId:
          emailResult
            ?.messageId ||
          "",
      };
    } catch (
      emailError
    ) {
      access.emailError =
        emailError.message;

      await access.save();

      salesOrder
        .approvalHistory
        .push({
          role:
            "system",

          action:
            "failed",

          comment:
            `Customer order tracking email failed: ${emailError.message}`,
        });

      salesOrder.emailStatus = {
        sent:
          false,

        sentAt:
          null,

        sentTo: [
          salesOrder
            .contactPersonEmail,
        ].filter(
          Boolean
        ),

        messageId:
          "",

        errorMessage:
          emailError.message,
      };

      await salesOrder.save();

      throw emailError;
    }
  };


/* =========================================================
   PUBLIC CUSTOMER LOOKUP
========================================================= */

const getCustomerTrackingByToken =
  async (
    rawToken
  ) => {
    const normalized =
      String(
        rawToken ||
        ""
      ).trim();

    /*
     * randomBytes(32).toString("hex")
     * creates exactly 64 hex chars.
     */
    if (
      !/^[a-f0-9]{64}$/i.test(
        normalized
      )
    ) {
      throw new Error(
        "Invalid tracking link."
      );
    }

    const tokenHash =
      hashToken(
        normalized
      );

    const access =
      await CustomerOrderTrackingAccess.findOne({
        tokenHash,

        isActive:
          true,
      });

    if (!access) {
      throw new Error(
        "This tracking link is invalid or no longer active."
      );
    }

    const salesOrder =
      await SalesOrder
        .findOne({
          _id:
            access.salesOrderId,

          isActive: {
            $ne:
              false,
          },

          approvalStatus:
            "approved",
        })
        .lean();

    if (!salesOrder) {
      throw new Error(
        "Order is not available for customer tracking."
      );
    }

    const tracking =
      await OrderTracking
        .findOne({
          salesOrderId:
            salesOrder._id,

          isActive:
            true,
        })
        .lean();

    access.lastOpenedAt =
      new Date();

    access.openCount =
      Number(
        access.openCount ||
        0
      ) + 1;

    await access.save();

    return sanitizeTrackingForCustomer({
      tracking,
      salesOrder,
    });
  };


module.exports = {
  issueCustomerTrackingAfterApproval,
  getCustomerTrackingByToken,
};