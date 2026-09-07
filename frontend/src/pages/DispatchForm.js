import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createDispatch,
  searchDispatchSalesOrders,
} from "../services/dispatchService";

import "./Dispatch.css";

const MAX_TC_FILES = 10;
const MAX_FILE_SIZE =
  30 * 1024 * 1024;

const DispatchForm = ({
  onClose,
  refresh,
}) => {
  /* =====================================================
     REFS
  ===================================================== */

  const tcInputRef =
    useRef(null);

  /* =====================================================
     DATE HELPERS
  ===================================================== */

  const getTodayLocalDateInputValue =
    () => {
      const today =
        new Date();

      const year =
        today.getFullYear();

      const month =
        String(
          today.getMonth() +
            1
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          today.getDate()
        ).padStart(
          2,
          "0"
        );

      return `${year}-${month}-${day}`;
    };

  const parseLocalDateOnly =
    (
      dateValue
    ) => {
      if (!dateValue) {
        return null;
      }

      const [
        year,
        month,
        day,
      ] =
        String(
          dateValue
        )
          .split("-")
          .map(Number);

      if (
        !year ||
        !month ||
        !day
      ) {
        return null;
      }

      return new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0,
        0
      );
    };

  /* =====================================================
     STATE
  ===================================================== */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState(null);

  const [
    loadingOrders,
    setLoadingOrders,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    searchError,
    setSearchError,
  ] = useState("");

  const [
    hasFocusedSearch,
    setHasFocusedSearch,
  ] = useState(false);

  /* =====================================================
     UPLOAD PROGRESS
  ===================================================== */

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState({
    show: false,
    percent: 0,
    uploadedMB: 0,
    totalMB: 0,
    status: "",
  });

  /* =====================================================
     FORM
  ===================================================== */

  const [
    form,
    setForm,
  ] = useState({
    salesOrderId: "",

    invoiceNumber: "",

    invoiceDate: "",

    dispatchDate:
      getTodayLocalDateInputValue(),

    dispatchQty: "",

    invoiceValue: "",

    paymentDueDays: "",

    paidAmount: "0",

    additionalCcEmailsText:
      "",

    dispatchStatus:
      "dispatched",

    internalRemark: "",

    paymentRemark: "",

    tcApplicable:
      "not_applicable",

    billPdf: null,

    lrCopyPdf: null,

    /*
     * NEW:
     * Array rather than one TC.
     */
    tcCertificatePdfs: [],
  });

  /* =====================================================
     FORMATTING
  ===================================================== */

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString(
      "en-IN"
    );
  };

  const formatCurrency = (
    value
  ) => {
    return `₹ ${Number(
      value || 0
    ).toLocaleString(
      "en-IN"
    )}`;
  };

  const formatKg = (
    value
  ) => {
    const num =
      Number(
        value || 0
      );

    if (!num) {
      return "0 Kg";
    }

    return `${num.toLocaleString(
      "en-IN"
    )} Kg`;
  };

  const formatDispatchStatus =
    (
      status
    ) => {
      const map = {
        pending_dispatch:
          "Pending Dispatch",

        partial_dispatched:
          "Partial Dispatch",

        fully_dispatched:
          "Fully Dispatched",
      };

      return (
        map[status] ||
        status ||
        "-"
      );
    };

  const formatFileSize = (
    size
  ) => {
    if (!size) {
      return "-";
    }

    const mb =
      size /
      (1024 * 1024);

    if (mb >= 1) {
      return `${mb.toFixed(
        2
      )} MB`;
    }

    return `${(
      size / 1024
    ).toFixed(
      1
    )} KB`;
  };

  /* =====================================================
     TOTAL TC SIZE
  ===================================================== */

  const getTotalTcSize =
    () => {
      return form
        .tcCertificatePdfs
        .reduce(
          (
            total,
            file
          ) =>
            total +
            Number(
              file?.size ||
                0
            ),
          0
        );
    };

  /* =====================================================
     PAYMENT
  ===================================================== */

  const calculatePendingAmount =
    () => {
      const invoiceValue =
        Number(
          form.invoiceValue ||
            0
        );

      const paidAmount =
        Number(
          form.paidAmount ||
            0
        );

      return Math.max(
        invoiceValue -
          paidAmount,
        0
      );
    };

  const calculateDueDatePreview =
    () => {
      if (
        !form.dispatchDate ||
        form.paymentDueDays ===
          ""
      ) {
        return "-";
      }

      const dueDate =
        parseLocalDateOnly(
          form.dispatchDate
        );

      if (!dueDate) {
        return "-";
      }

      dueDate.setDate(
        dueDate.getDate() +
          Number(
            form.paymentDueDays ||
              0
          )
      );

      return formatDate(
        dueDate
      );
    };

  /* =====================================================
     LOAD SALES ORDERS
  ===================================================== */

  const loadOrders =
    async (
      searchValue = ""
    ) => {
      try {
        setLoadingOrders(
          true
        );

        const response =
          await searchDispatchSalesOrders({
            search:
              String(
                searchValue ||
                  ""
              ).trim(),

            limit: 10,
          });

        const availableOrders =
          (
            response?.data ||
            []
          )
            .filter(
              (order) => {
                const totalQty =
                  Number(
                    order
                      ?.totalOrderQty ||
                      0
                  );

                const remainingQty =
                  Number(
                    order
                      ?.remainingDispatchQty ||
                      0
                  );

                if (
                  totalQty <=
                  0
                ) {
                  return (
                    order
                      ?.dispatchAvailabilityStatus !==
                    "fully_dispatched"
                  );
                }

                return (
                  remainingQty >
                    0 &&
                  order
                    ?.dispatchAvailabilityStatus !==
                    "fully_dispatched"
                );
              }
            )
            .slice(
              0,
              10
            );

        setOrders(
          availableOrders
        );
      } catch (
        error
      ) {
        alert(
          error.response
            ?.data
            ?.message ||
            "Failed to search sales orders"
        );
      } finally {
        setLoadingOrders(
          false
        );
      }
    };

  useEffect(() => {
    if (
      !hasFocusedSearch ||
      selectedOrder
    ) {
      return;
    }

    const delay =
      setTimeout(
        () => {
          loadOrders(
            search
          );
        },
        300
      );

    return () =>
      clearTimeout(
        delay
      );
  }, [
    search,
    selectedOrder,
    hasFocusedSearch,
  ]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const handleSearchFocus =
    () => {
      if (
        selectedOrder ||
        submitting
      ) {
        return;
      }

      setHasFocusedSearch(
        true
      );

      setSearchError("");

      loadOrders(
        search
      );
    };

  const selectOrder = (
    order
  ) => {
    setSelectedOrder(
      order
    );

    setSearch(
      order.companyName ||
        ""
    );

    setSearchError("");

    setOrders([]);

    setForm(
      (prev) => ({
        ...prev,

        salesOrderId:
          order._id,

        invoiceValue:
          "",

        paymentDueDays:
          "",

        dispatchQty:
          "",
      })
    );
  };

  const clearSelectedOrder =
    () => {
      setSelectedOrder(
        null
      );

      setSearch("");

      setOrders([]);

      setSearchError("");

      setHasFocusedSearch(
        false
      );

      setForm(
        (prev) => ({
          ...prev,

          salesOrderId:
            "",

          invoiceValue:
            "",

          dispatchQty:
            "",
        })
      );
    };

  const handleSearchChange =
    (
      event
    ) => {
      const value =
        event.target.value;

      setSearch(
        value
      );

      setSelectedOrder(
        null
      );

      setSearchError("");

      setHasFocusedSearch(
        true
      );

      setForm(
        (prev) => ({
          ...prev,

          salesOrderId:
            "",
        })
      );
    };

  /* =====================================================
     NORMAL CHANGE
  ===================================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      files,
    } = event.target;

    /*
     * Bill and LR remain single files.
     */
    if (
      files &&
      name !==
        "tcCertificatePdf"
    ) {
      setForm(
        (prev) => ({
          ...prev,

          [name]:
            files[0] ||
            null,
        })
      );

      return;
    }

    setForm(
      (prev) => ({
        ...prev,

        [name]:
          value,

        /*
         * Clearing Applicable removes all TCs.
         */
        ...(
          name ===
            "tcApplicable" &&
          value ===
            "not_applicable"
            ? {
                tcCertificatePdfs:
                  [],
              }
            : {}
        ),
      })
    );
  };

  /* =====================================================
     ADD TC FILES

     User can:
     - select 1
     - select 4 together
     - later click Add More and add more
     - maximum 10
  ===================================================== */

  const handleTcFiles =
    (
      event
    ) => {
      const selectedFiles =
        Array.from(
          event.target
            .files ||
            []
        );

      /*
       * Reset browser input.
       * This allows re-selecting a previously removed file.
       */
      event.target.value =
        "";

      if (
        selectedFiles.length ===
        0
      ) {
        return;
      }

      /* =================================================
         VALIDATE FILE TYPE + SIZE
      ================================================= */

      const invalidType =
        selectedFiles.find(
          (file) =>
            file.type !==
            "application/pdf"
        );

      if (
        invalidType
      ) {
        alert(
          `"${invalidType.name}" is not a PDF file. Only PDF certificates are allowed.`
        );

        return;
      }

      const oversized =
        selectedFiles.find(
          (file) =>
            file.size >
            MAX_FILE_SIZE
        );

      if (
        oversized
      ) {
        alert(
          `"${oversized.name}" is larger than 30 MB.`
        );

        return;
      }

      /* =================================================
         ADD TO EXISTING LIST
      ================================================= */

      setForm(
        (previous) => {
          const currentFiles =
            previous
              .tcCertificatePdfs ||
            [];

          /*
           * Avoid same file accidentally being added twice.
           */
          const uniqueFiles =
            selectedFiles.filter(
              (newFile) =>
                !currentFiles.some(
                  (
                    existingFile
                  ) =>
                    existingFile.name ===
                      newFile.name &&
                    existingFile.size ===
                      newFile.size &&
                    existingFile.lastModified ===
                      newFile.lastModified
                )
            );

          const combined = [
            ...currentFiles,
            ...uniqueFiles,
          ];

          if (
            combined.length >
            MAX_TC_FILES
          ) {
            alert(
              `Maximum ${MAX_TC_FILES} MTC / TC certificates can be uploaded per dispatch.`
            );

            return previous;
          }

          return {
            ...previous,

            tcCertificatePdfs:
              combined,
          };
        }
      );
    };

  /* =====================================================
     REMOVE ONE TC
  ===================================================== */

  const removeTcFile = (
    index
  ) => {
    if (submitting) {
      return;
    }

    setForm(
      (previous) => ({
        ...previous,

        tcCertificatePdfs:
          previous
            .tcCertificatePdfs
            .filter(
              (
                _,
                fileIndex
              ) =>
                fileIndex !==
                index
            ),
      })
    );
  };

  /* =====================================================
     OPEN LOCAL PDF

     Allows dispatch person to verify the TC
     before submitting.
  ===================================================== */

  const openLocalPdf = (
    file
  ) => {
    if (!file) {
      return;
    }

    const url =
      URL.createObjectURL(
        file
      );

    const newTab =
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    /*
     * Browser needs the blob URL while new tab loads.
     */
    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      60000
    );

    return newTab;
  };

  /* =====================================================
     EMAILS
  ===================================================== */

  const getAdditionalCcEmails =
    () => {
      return form
        .additionalCcEmailsText
        .split(",")
        .map(
          (email) =>
            email
              .trim()
              .toLowerCase()
        )
        .filter(
          (email) =>
            email &&
            email.includes("@")
        );
    };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateForm =
    () => {
      if (
        !selectedOrder ||
        !form.salesOrderId
      ) {
        setSearchError(
          "Please select a valid approved sales order"
        );

        return false;
      }

      if (
        !form.invoiceNumber.trim()
      ) {
        alert(
          "Invoice number is required"
        );

        return false;
      }

      if (
        !form.invoiceDate
      ) {
        alert(
          "Invoice date is required"
        );

        return false;
      }

      if (
        !form.dispatchDate
      ) {
        alert(
          "Dispatch date is required"
        );

        return false;
      }

      if (
        Number(
          form.dispatchQty
        ) <= 0
      ) {
        alert(
          "Dispatch quantity must be greater than 0"
        );

        return false;
      }

      if (
        selectedOrder
          ?.remainingDispatchQty >
          0 &&
        Number(
          form.dispatchQty
        ) >
          Number(
            selectedOrder
              .remainingDispatchQty
          )
      ) {
        alert(
          `Dispatch quantity cannot be greater than remaining quantity ${selectedOrder.remainingDispatchQty} Kg.`
        );

        return false;
      }

      if (
        Number(
          form.invoiceValue
        ) <= 0
      ) {
        alert(
          "Invoice value must be greater than 0"
        );

        return false;
      }

      if (
        form.paymentDueDays ===
          "" ||
        Number(
          form.paymentDueDays
        ) < 0
      ) {
        alert(
          "Payment due days is required"
        );

        return false;
      }

      if (
        Number(
          form.paidAmount ||
            0
        ) < 0
      ) {
        alert(
          "Paid amount cannot be negative"
        );

        return false;
      }

      if (
        Number(
          form.paidAmount ||
            0
        ) >
        Number(
          form.invoiceValue ||
            0
        )
      ) {
        alert(
          "Paid amount cannot be greater than invoice value"
        );

        return false;
      }

      /* =================================================
         BILL
      ================================================= */

      if (
        !form.billPdf
      ) {
        alert(
          "Bill PDF is required"
        );

        return false;
      }

      if (
        form.billPdf.type !==
        "application/pdf"
      ) {
        alert(
          "Bill file must be PDF"
        );

        return false;
      }

      if (
        form.billPdf.size >
        MAX_FILE_SIZE
      ) {
        alert(
          "Bill PDF must be under 30MB"
        );

        return false;
      }

      /* =================================================
         LR
      ================================================= */

      if (
        form.lrCopyPdf
      ) {
        if (
          form.lrCopyPdf
            .type !==
          "application/pdf"
        ) {
          alert(
            "LR copy file must be PDF"
          );

          return false;
        }

        if (
          form.lrCopyPdf
            .size >
          MAX_FILE_SIZE
        ) {
          alert(
            "LR copy PDF must be under 30MB"
          );

          return false;
        }
      }

      /* =================================================
         MULTIPLE TC
      ================================================= */

      if (
        form.tcApplicable ===
          "applicable" &&
        form
          .tcCertificatePdfs
          .length === 0
      ) {
        alert(
          "Please upload at least one MTC / TC certificate."
        );

        return false;
      }

      if (
        form
          .tcCertificatePdfs
          .length >
        MAX_TC_FILES
      ) {
        alert(
          `Maximum ${MAX_TC_FILES} MTC / TC certificates are allowed.`
        );

        return false;
      }

      for (
        const tcFile of form
          .tcCertificatePdfs
      ) {
        if (
          tcFile.type !==
          "application/pdf"
        ) {
          alert(
            `${tcFile.name} must be a PDF file.`
          );

          return false;
        }

        if (
          tcFile.size >
          MAX_FILE_SIZE
        ) {
          alert(
            `${tcFile.name} must be under 30 MB.`
          );

          return false;
        }
      }

      return true;
    };

  /* =====================================================
     PAYLOAD
  ===================================================== */

  const buildPayload =
    () => ({
      salesOrderId:
        form.salesOrderId,

      invoiceNumber:
        form.invoiceNumber.trim(),

      invoiceDate:
        form.invoiceDate,

      dispatchDate:
        form.dispatchDate,

      dispatchQty:
        Number(
          form.dispatchQty
        ),

      invoiceValue:
        Number(
          form.invoiceValue
        ),

      paymentDueDays:
        Number(
          form.paymentDueDays
        ),

      paidAmount:
        Number(
          form.paidAmount ||
            0
        ),

      additionalCcEmails:
        getAdditionalCcEmails(),

      dispatchStatus:
        form.dispatchStatus,

      internalRemark:
        form.internalRemark,

      paymentRemark:
        form.paymentRemark,

      tcApplicable:
        form.tcApplicable,
    });

  /* =====================================================
     UPLOAD RESET
  ===================================================== */

  const resetUploadProgress =
    () => {
      setUploadProgress({
        show: false,
        percent: 0,
        uploadedMB: 0,
        totalMB: 0,
        status: "",
      });
    };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        submitting
      ) {
        return;
      }

      if (
        !validateForm()
      ) {
        return;
      }

      try {
        setSubmitting(
          true
        );

        /* =================================================
           TOTAL UPLOAD SIZE

           Includes ALL TC certificates.
        ================================================= */

        const tcSize =
          form.tcApplicable ===
            "applicable"
            ? getTotalTcSize()
            : 0;

        const totalSize =
          Number(
            form.billPdf
              ?.size ||
              0
          ) +
          Number(
            form.lrCopyPdf
              ?.size ||
              0
          ) +
          tcSize;

        setUploadProgress({
          show: true,

          percent: 0,

          uploadedMB: 0,

          totalMB:
            totalSize /
            (1024 * 1024),

          status:
            "Preparing documents...",
        });

        await createDispatch(
          buildPayload(),

          form.billPdf,

          form.lrCopyPdf,

          form.tcApplicable ===
            "applicable"
            ? form.tcCertificatePdfs
            : [],

          (
            progressEvent
          ) => {
            const loaded =
              progressEvent.loaded ||
              0;

            const total =
              progressEvent.total ||
              totalSize;

            const percent =
              total
                ? Math.min(
                    Math.round(
                      (
                        loaded *
                        100
                      ) /
                        total
                    ),
                    100
                  )
                : 0;

            setUploadProgress({
              show: true,

              percent,

              uploadedMB:
                loaded /
                (1024 * 1024),

              totalMB:
                total /
                (1024 * 1024),

              status:
                percent >=
                100
                  ? "Upload complete. Creating dispatch and sending email..."
                  : `Uploading documents... ${percent}%`,
            });
          }
        );

        setUploadProgress(
          (previous) => ({
            ...previous,

            percent: 100,

            uploadedMB:
              previous.totalMB,

            status:
              "Dispatch created successfully",
          })
        );

        alert(
          "Dispatch created successfully. All uploaded TC/MTC certificates have been sent to the customer."
        );

        refresh();

        onClose();

        setTimeout(
          () => {
            resetUploadProgress();
          },
          1200
        );
      } catch (
        error
      ) {
        resetUploadProgress();

        alert(
          error.response
            ?.data
            ?.message ||
            "Failed to create dispatch"
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="dispatch-modal-overlay">

      <div className="dispatch-form-card">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="dispatch-form-header">

          <div>
            <h2>
              Create Dispatch
            </h2>

            <p>
              Select approved sales order,
              upload dispatch documents and
              notify the customer.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                !submitting
              ) {
                onClose();
              }
            }}
            disabled={
              submitting
            }
          >
            ×
          </button>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          className="dispatch-form"
          onSubmit={
            handleSubmit
          }
        >

          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="dispatch-search-section">

            <label>
              Approved Sales Order{" "}
              <span className="dispatch-required">
                *
              </span>
            </label>

            <input
              type="text"
              placeholder="Click to view latest approved orders, or search company name"
              value={
                search
              }
              onFocus={
                handleSearchFocus
              }
              onChange={
                handleSearchChange
              }
              disabled={
                submitting
              }
              onBlur={() => {
                setTimeout(
                  () => {
                    if (
                      !selectedOrder &&
                      search.trim()
                    ) {
                      setSearchError(
                        "Please select a valid sales order from dropdown"
                      );
                    }
                  },
                  180
                );
              }}
            />

            {searchError && (
              <small className="dispatch-search-error">
                {searchError}
              </small>
            )}

            {loadingOrders && (
              <div className="dispatch-search-loading">
                Searching approved
                orders...
              </div>
            )}

            {!loadingOrders &&
              hasFocusedSearch &&
              orders.length ===
                0 &&
              !selectedOrder && (
                <div className="dispatch-no-result">
                  No approved sales
                  order found
                  {search.trim()
                    ? ` for "${search}"`
                    : ""}
                </div>
              )}

            {orders.length >
              0 && (
              <div className="dispatch-search-results">

                {orders.map(
                  (
                    order
                  ) => (
                    <button
                      type="button"
                      key={
                        order._id
                      }
                      className="dispatch-order-card"
                      onMouseDown={() =>
                        selectOrder(
                          order
                        )
                      }
                    >

                      <div className="dispatch-order-top">

                        <div>
                          <strong>
                            {
                              order.companyName
                            }
                          </strong>

                          <small>
                            SO:{" "}
                            {order.salesOrderNo ||
                              "-"}
                            {" · "}
                            PO:{" "}
                            {order.poNumber ||
                              "-"}
                            {" · "}
                            Sales:{" "}
                            {order.salesPersonName ||
                              "-"}
                          </small>
                        </div>

                        <span>
                          {order.dispatchCount ||
                            0}{" "}
                          dispatch
                        </span>

                      </div>

                      <div className="dispatch-order-mini-grid">

                        <div>
                          <label>
                            Contact
                          </label>

                          <p>
                            {order.contactPersonName ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <label>
                            Email
                          </label>

                          <p>
                            {order.contactPersonEmail ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <label>
                            Mobile
                          </label>

                          <p>
                            {order.contactPersonNumber ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <label>
                            Order Value
                          </label>

                          <p>
                            {formatCurrency(
                              order.orderValue
                            )}
                          </p>
                        </div>

                        <div>
                          <label>
                            Total Qty
                          </label>

                          <p>
                            {order.totalOrderQty >
                            0
                              ? formatKg(
                                  order.totalOrderQty
                                )
                              : "-"}
                          </p>
                        </div>

                        <div>
                          <label>
                            Already Dispatched
                          </label>

                          <p>
                            {formatKg(
                              order.totalDispatchedQty
                            )}
                          </p>
                        </div>

                        <div>
                          <label>
                            Remaining Qty
                          </label>

                          <p>
                            {order.totalOrderQty >
                            0
                              ? formatKg(
                                  order.remainingDispatchQty
                                )
                              : "Open"}
                          </p>
                        </div>

                        <div>
                          <label>
                            Dispatch Status
                          </label>

                          <p>
                            {formatDispatchStatus(
                              order.dispatchAvailabilityStatus
                            )}
                          </p>
                        </div>

                        <div>
                          <label>
                            Payment Terms
                          </label>

                          <p>
                            {order.paymentTerms ||
                              "-"}
                          </p>
                        </div>

                        <div>
                          <label>
                            Approval Status
                          </label>

                          <p>
                            {order.approvalStatus ||
                              "-"}
                          </p>
                        </div>

                      </div>

                    </button>
                  )
                )}

              </div>
            )}

          </div>

          {/* =================================================
              SELECTED ORDER
          ================================================= */}

          {selectedOrder && (
            <div className="dispatch-selected-order">

              <div className="dispatch-selected-title">

                <strong>
                  Selected Sales Order
                </strong>

                <button
                  type="button"
                  onClick={
                    clearSelectedOrder
                  }
                  disabled={
                    submitting
                  }
                >
                  Change
                </button>

              </div>

              <div className="dispatch-selected-grid">

                <div>
                  <span>
                    Company
                  </span>

                  <strong>
                    {selectedOrder.companyName ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    SO No.
                  </span>

                  <strong>
                    {selectedOrder.salesOrderNo ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    PO No.
                  </span>

                  <strong>
                    {selectedOrder.poNumber ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Contact Person
                  </span>

                  <strong>
                    {selectedOrder.contactPersonName ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Customer Email
                  </span>

                  <strong>
                    {selectedOrder.contactPersonEmail ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Sales Person
                  </span>

                  <strong>
                    {selectedOrder.salesPersonName ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Order Value
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedOrder.orderValue
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Total Qty
                  </span>

                  <strong>
                    {selectedOrder.totalOrderQty >
                    0
                      ? formatKg(
                          selectedOrder.totalOrderQty
                        )
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Already Dispatched
                  </span>

                  <strong>
                    {formatKg(
                      selectedOrder.totalDispatchedQty
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Remaining Qty
                  </span>

                  <strong>
                    {selectedOrder.totalOrderQty >
                    0
                      ? formatKg(
                          selectedOrder.remainingDispatchQty
                        )
                      : "Open"}
                  </strong>
                </div>

                <div>
                  <span>
                    Dispatch Status
                  </span>

                  <strong>
                    {formatDispatchStatus(
                      selectedOrder.dispatchAvailabilityStatus
                    )}
                  </strong>
                </div>

                <div className="dispatch-selected-wide">
                  <span>
                    Material
                  </span>

                  <strong>
                    {selectedOrder.sizeGradeQuantityRate ||
                      "-"}
                  </strong>
                </div>

              </div>

            </div>
          )}

          {/* =================================================
              INVOICE SECTION
          ================================================= */}

          <div className="dispatch-section-title">
            <h3>
              Invoice & Dispatch Details
            </h3>

            <p>
              Invoice details and dispatch
              quantity for customer
              notification.
            </p>
          </div>

          <div className="dispatch-grid">

            <div className="dispatch-field">

              <label>
                Invoice Number{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                name="invoiceNumber"
                value={
                  form.invoiceNumber
                }
                onChange={
                  handleChange
                }
                placeholder="Example: BSS/INV/1024"
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Invoice Date{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                type="date"
                name="invoiceDate"
                value={
                  form.invoiceDate
                }
                onChange={
                  handleChange
                }
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Dispatch Date{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                type="date"
                name="dispatchDate"
                value={
                  form.dispatchDate
                }
                onChange={
                  handleChange
                }
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Dispatch Qty Kg{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                type="number"
                name="dispatchQty"
                value={
                  form.dispatchQty
                }
                onChange={
                  handleChange
                }
                placeholder={
                  selectedOrder
                    ?.remainingDispatchQty >
                  0
                    ? `Max ${selectedOrder.remainingDispatchQty} Kg`
                    : "Enter dispatch quantity"
                }
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Invoice Value ₹{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                type="number"
                name="invoiceValue"
                value={
                  form.invoiceValue
                }
                onChange={
                  handleChange
                }
                placeholder="Enter invoice amount"
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Dispatch Status
              </label>

              <select
                name="dispatchStatus"
                value={
                  form.dispatchStatus
                }
                onChange={
                  handleChange
                }
                disabled={
                  submitting
                }
              >
                <option value="dispatched">
                  Dispatched
                </option>

                <option value="delivered">
                  Delivered
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>

            </div>

          </div>

          {/* =================================================
              PAYMENT
          ================================================= */}

          <div className="dispatch-section-title">
            <h3>
              Payment Tracking
            </h3>

            <p>
              Due date will be calculated
              from dispatch date + payment
              due days.
            </p>
          </div>

          <div className="dispatch-grid">

            <div className="dispatch-field">

              <label>
                Payment Due Days{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                type="number"
                name="paymentDueDays"
                value={
                  form.paymentDueDays
                }
                onChange={
                  handleChange
                }
                placeholder="Example: 30"
                min="0"
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Payment Due Date
              </label>

              <input
                value={
                  calculateDueDatePreview()
                }
                disabled
                readOnly
              />

            </div>

            <div className="dispatch-field">

              <label>
                Paid Amount ₹
              </label>

              <input
                type="number"
                name="paidAmount"
                value={
                  form.paidAmount
                }
                onChange={
                  handleChange
                }
                placeholder="0"
                min="0"
                disabled={
                  submitting
                }
              />

            </div>

            <div className="dispatch-field">

              <label>
                Pending Amount ₹
              </label>

              <input
                value={
                  formatCurrency(
                    calculatePendingAmount()
                  )
                }
                disabled
                readOnly
              />

            </div>

            <div className="dispatch-field dispatch-full">

              <label>
                Payment Remark
              </label>

              <textarea
                name="paymentRemark"
                value={
                  form.paymentRemark
                }
                onChange={
                  handleChange
                }
                placeholder="Example: ₹4,00,000 received as advance"
                disabled={
                  submitting
                }
              />

            </div>

          </div>

          {/* =================================================
              DOCUMENTS
          ================================================= */}

          <div className="dispatch-section-title dispatch-documents-title">

            <h3>
              Dispatch Documents
            </h3>

            <p>
              Verify your Bill, LR and all
              MTC / TC certificates before
              creating the dispatch.
            </p>

          </div>

          <div className="dispatch-grid">

            {/* BILL */}

            <div className="dispatch-field dispatch-file-field">

              <label>
                Bill PDF{" "}
                <span className="dispatch-required">
                  *
                </span>
              </label>

              <input
                type="file"
                name="billPdf"
                accept="application/pdf"
                onChange={
                  handleChange
                }
                disabled={
                  submitting
                }
              />

              {form.billPdf && (
                <div className="dispatch-single-file-preview">

                  <div>
                    <span className="dispatch-file-icon">
                      PDF
                    </span>

                    <section>
                      <strong>
                        {form.billPdf.name}
                      </strong>

                      <small>
                        {formatFileSize(
                          form.billPdf.size
                        )}
                      </small>
                    </section>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openLocalPdf(
                        form.billPdf
                      )
                    }
                  >
                    Open
                  </button>

                </div>
              )}

            </div>

            {/* LR */}

            <div className="dispatch-field dispatch-file-field">

              <label>
                LR Copy PDF
              </label>

              <input
                type="file"
                name="lrCopyPdf"
                accept="application/pdf"
                onChange={
                  handleChange
                }
                disabled={
                  submitting
                }
              />

              {form.lrCopyPdf && (
                <div className="dispatch-single-file-preview">

                  <div>
                    <span className="dispatch-file-icon">
                      PDF
                    </span>

                    <section>
                      <strong>
                        {form.lrCopyPdf.name}
                      </strong>

                      <small>
                        {formatFileSize(
                          form.lrCopyPdf.size
                        )}
                      </small>
                    </section>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openLocalPdf(
                        form.lrCopyPdf
                      )
                    }
                  >
                    Open
                  </button>

                </div>
              )}

            </div>

            {/* TC APPLICABLE */}

            <div className="dispatch-field">

              <label>
                TC Applicable
              </label>

              <select
                name="tcApplicable"
                value={
                  form.tcApplicable
                }
                onChange={
                  handleChange
                }
                disabled={
                  submitting
                }
              >
                <option value="not_applicable">
                  Not Applicable
                </option>

                <option value="applicable">
                  Applicable
                </option>
              </select>

            </div>

            {/* =================================================
                MULTIPLE TC MANAGER
            ================================================= */}

            {form.tcApplicable ===
              "applicable" && (
              <div className="dispatch-field dispatch-full dispatch-tc-manager">

                {/* HEADER */}

                <div className="dispatch-tc-manager-head">

                  <div>
                    <span className="dispatch-tc-kicker">
                      MATERIAL CERTIFICATES
                    </span>

                    <h4>
                      MTC / TC Certificates
                    </h4>

                    <p>
                      Upload all related
                      certificates for this
                      dispatch. You can
                      review every PDF
                      before sending.
                    </p>
                  </div>

                  <div className="dispatch-tc-count">
                    <strong>
                      {
                        form
                          .tcCertificatePdfs
                          .length
                      }
                    </strong>

                    <span>
                      / {MAX_TC_FILES}
                    </span>
                  </div>

                </div>

                {/* ADD FILE AREA */}

                <div
                  className={`dispatch-tc-dropzone ${
                    form
                      .tcCertificatePdfs
                      .length >=
                    MAX_TC_FILES
                      ? "is-full"
                      : ""
                  }`}
                >

                  <input
                    ref={
                      tcInputRef
                    }
                    type="file"
                    name="tcCertificatePdf"
                    accept="application/pdf"
                    multiple
                    onChange={
                      handleTcFiles
                    }
                    disabled={
                      submitting ||
                      form
                        .tcCertificatePdfs
                        .length >=
                        MAX_TC_FILES
                    }
                  />

                  <div className="dispatch-tc-dropzone-icon">
                    +
                  </div>

                  <div className="dispatch-tc-dropzone-copy">

                    <strong>
                      {form
                        .tcCertificatePdfs
                        .length ===
                      0
                        ? "Add MTC / TC Certificates"
                        : "Add More Certificates"}
                    </strong>

                    <span>
                      Select one or
                      multiple PDF files
                    </span>

                    <small>
                      Maximum{" "}
                      {MAX_TC_FILES}
                      {" "}
                      files · 30 MB
                      per PDF
                    </small>

                  </div>

                  <button
                    type="button"
                    className="dispatch-tc-browse-btn"
                    onClick={() =>
                      tcInputRef
                        .current
                        ?.click()
                    }
                    disabled={
                      submitting ||
                      form
                        .tcCertificatePdfs
                        .length >=
                        MAX_TC_FILES
                    }
                  >
                    {form
                      .tcCertificatePdfs
                      .length ===
                    0
                      ? "Choose Files"
                      : "Add More"}
                  </button>

                </div>

                {/* DOCUMENT SUMMARY */}

                {form
                  .tcCertificatePdfs
                  .length >
                  0 && (
                  <div className="dispatch-tc-summary">

                    <div>
                      <span>
                        Certificates
                      </span>

                      <strong>
                        {
                          form
                            .tcCertificatePdfs
                            .length
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Total Size
                      </span>

                      <strong>
                        {formatFileSize(
                          getTotalTcSize()
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Status
                      </span>

                      <strong className="dispatch-tc-ready-text">
                        Ready to upload
                      </strong>
                    </div>

                  </div>
                )}

                {/* TC LIST */}

                {form
                  .tcCertificatePdfs
                  .length >
                  0 && (
                  <div className="dispatch-tc-file-list">

                    {form
                      .tcCertificatePdfs
                      .map(
                        (
                          file,
                          index
                        ) => (
                          <div
                            className="dispatch-tc-file-card"
                            key={`${file.name}-${file.lastModified}-${index}`}
                          >

                            <div className="dispatch-tc-file-number">
                              {index +
                                1}
                            </div>

                            <div className="dispatch-tc-file-main">

                              <div className="dispatch-tc-file-top">

                                <div className="dispatch-tc-file-meta">

                                  <span className="dispatch-file-icon dispatch-file-icon--tc">
                                    PDF
                                  </span>

                                  <div>
                                    <strong title={file.name}>
                                      {
                                        file.name
                                      }
                                    </strong>

                                    <small>
                                      {formatFileSize(
                                        file.size
                                      )}
                                      {" · "}
                                      TC{" "}
                                      {index +
                                        1}
                                    </small>
                                  </div>

                                </div>

                                <div className="dispatch-tc-file-actions">

                                  <button
                                    type="button"
                                    className="dispatch-tc-open"
                                    onClick={() =>
                                      openLocalPdf(
                                        file
                                      )
                                    }
                                    disabled={
                                      submitting
                                    }
                                  >
                                    Open
                                  </button>

                                  <button
                                    type="button"
                                    className="dispatch-tc-remove"
                                    onClick={() =>
                                      removeTcFile(
                                        index
                                      )
                                    }
                                    disabled={
                                      submitting
                                    }
                                    title="Remove certificate"
                                  >
                                    ×
                                  </button>

                                </div>

                              </div>

                              {/* INDIVIDUAL VISUAL UPLOAD STATUS */}

                              {uploadProgress.show && (
                                <div className="dispatch-tc-file-progress">

                                  <div>
                                    <span
                                      style={{
                                        width: `${uploadProgress.percent}%`,
                                      }}
                                    />
                                  </div>

                                  <small>
                                    {uploadProgress.percent <
                                    100
                                      ? `Uploading ${uploadProgress.percent}%`
                                      : "Uploaded"}
                                  </small>

                                </div>
                              )}

                            </div>

                          </div>
                        )
                      )}

                  </div>
                )}

                {form
                  .tcCertificatePdfs
                  .length ===
                  MAX_TC_FILES && (
                  <div className="dispatch-tc-limit-note">
                    Maximum{" "}
                    {MAX_TC_FILES}
                    {" "}
                    certificates added.
                  </div>
                )}

              </div>
            )}

            {/* CC */}

            <div className="dispatch-field dispatch-full">

              <label>
                Additional CC Emails
              </label>

              <input
                name="additionalCcEmailsText"
                value={
                  form.additionalCcEmailsText
                }
                onChange={
                  handleChange
                }
                placeholder="accounts@client.com, purchase@client.com"
                disabled={
                  submitting
                }
              />

            </div>

            {/* REMARK */}

            <div className="dispatch-field dispatch-full">

              <label>
                Internal Remark
              </label>

              <textarea
                name="internalRemark"
                value={
                  form.internalRemark
                }
                onChange={
                  handleChange
                }
                placeholder="Any internal note for dispatch/accounts team"
                disabled={
                  submitting
                }
              />

            </div>

          </div>

          {/* =================================================
              GLOBAL UPLOAD PROGRESS
          ================================================= */}

          {uploadProgress.show && (
            <div className="dispatch-upload-progress dispatch-upload-progress--premium">

              <div className="dispatch-upload-progress-icon">

                {uploadProgress.percent <
                100
                  ? "↑"
                  : "✓"}

              </div>

              <div className="dispatch-upload-progress-content">

                <div className="dispatch-upload-head">

                  <div>
                    <strong>
                      {
                        uploadProgress.status
                      }
                    </strong>

                    <small>
                      Please keep this
                      window open while
                      documents are being
                      uploaded.
                    </small>
                  </div>

                  <span>
                    {
                      uploadProgress.percent
                    }
                    %
                  </span>

                </div>

                <div className="dispatch-upload-bar">

                  <div
                    style={{
                      width: `${uploadProgress.percent}%`,
                    }}
                  />

                </div>

                <div className="dispatch-upload-progress-meta">

                  <small>
                    {uploadProgress.uploadedMB.toFixed(
                      2
                    )}{" "}
                    MB uploaded
                  </small>

                  <small>
                    {uploadProgress.totalMB.toFixed(
                      2
                    )}{" "}
                    MB total
                  </small>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="dispatch-actions">

            <button
              type="button"
              className="dispatch-cancel"
              onClick={
                onClose
              }
              disabled={
                submitting
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="dispatch-submit"
              disabled={
                submitting
              }
            >
              {submitting
                ? uploadProgress.percent <
                  100
                  ? `Uploading ${uploadProgress.percent}%`
                  : "Creating Dispatch..."
                : "Create Dispatch & Send Email"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default DispatchForm;