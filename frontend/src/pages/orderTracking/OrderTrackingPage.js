import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  closeOrderTrackingChat,
  deleteOrderTrackingMessage,
  getOrderTrackingById,
  getOrderTrackingDashboard,
  getOrderTrackingList,
  getOrderTrackingMessages,
  markOrderTrackingMessagesRead,
  reopenOrderTrackingChat,
  requestOrderTrackingUpdate,
  sendOrderTrackingMessage,
  syncApprovedSalesOrders,
  updateOrderTrackingStatus,
} from "../../services/orderTrackingService";

import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  canSyncTracking,
  getStoredUser,
  unwrapApiData,
} from "./orderTrackingUtils";

import OrderTrackingCard from "./components/OrderTrackingCard";
import OrderTrackingTable from "./components/OrderTrackingTable";
import OrderTrackingDetailPage from "./components/OrderTrackingDetailPage";
import OrderTrackingStatusModal from "./components/OrderTrackingStatusModal";

import "./OrderTrackingPage.css";

const initialFilters = {
  search: "",
  status: "",
  priority: "",
  updateRequested: "",
  page: 1,
  limit: 30,
};

const SUMMARY_CARDS = [
  {
    key: "total",
    label: "Total Orders",
  },
  {
    key: "planning",
    label: "Planning",
  },
  {
    key: "cutting_started",
    label: "Under Cutting",
  },
  {
    key: "machining_started",
    label: "Under Machining",
  },
  {
    key: "ready_for_dispatch",
    label: "Ready",
  },
  {
    key: "dispatched",
    label: "Dispatched",
  },
  {
    key: "in_transit",
    label: "In Transit",
  },
  {
    key: "delivered",
    label: "Delivered",
  },
  {
    key: "updateRequested",
    label: "Update Requested",
  },
];

const OrderTrackingPage = () => {
  const user = getStoredUser();

  /* =========================================================
     LIST AND DASHBOARD STATE
  ========================================================= */

  const [summary, setSummary] =
    useState({});

  const [records, setRecords] =
    useState([]);

  const [filters, setFilters] =
    useState(initialFilters);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 1,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [syncing, setSyncing] =
    useState(false);

  const [
    requestingTrackingId,
    setRequestingTrackingId,
  ] = useState("");

  /* =========================================================
     SELECTED ORDER / DRILL-DOWN STATE
  ========================================================= */

  const [
    selectedTracking,
    setSelectedTracking,
  ] = useState(null);

  const [
    openingTrackingId,
    setOpeningTrackingId,
  ] = useState("");

  const [statusOpen, setStatusOpen] =
    useState(false);

  const [
    statusSaving,
    setStatusSaving,
  ] = useState(false);

  /* =========================================================
     CHAT STATE
  ========================================================= */

  const [messages, setMessages] =
    useState([]);

  const [
    messagePagination,
    setMessagePagination,
  ] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });

  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(false);

  const [
    messageSending,
    setMessageSending,
  ] = useState(false);

  const [
  deletingMessageId,
  setDeletingMessageId,
] = useState("");

  /* =========================================================
     CLEAN API FILTERS
  ========================================================= */

  const cleanParams = useMemo(() => {
    const params = {};

    Object.entries(filters).forEach(
      ([key, value]) => {
        if (
          value !== "" &&
          value !== null &&
          value !== undefined
        ) {
          params[key] = value;
        }
      }
    );

    return params;
  }, [filters]);

  /* =========================================================
     DASHBOARD SUMMARY
  ========================================================= */

  const loadSummary = useCallback(
    async () => {
      const response =
        await getOrderTrackingDashboard();

      const payload =
        unwrapApiData(response) || {};

      setSummary(payload);
    },
    []
  );

  /* =========================================================
     TRACKING LIST
  ========================================================= */

  const loadRecords = useCallback(
    async () => {
      const response =
        await getOrderTrackingList(
          cleanParams
        );

      const payload =
        unwrapApiData(response) || {};

      setRecords(
        Array.isArray(payload.data)
          ? payload.data
          : []
      );

      setPagination(
        payload.pagination || {
          page: 1,
          limit: 30,
          total: 0,
          totalPages: 1,
        }
      );
    },
    [cleanParams]
  );

  /* =========================================================
     LOAD COMPLETE LIST SCREEN
  ========================================================= */

  const loadAll = useCallback(
    async (
      showRefresh = false
    ) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        await Promise.all([
          loadSummary(),
          loadRecords(),
        ]);
      } catch (error) {
        alert(
          error?.response?.data
            ?.message ||
            "Failed to load order tracking."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadRecords, loadSummary]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* =========================================================
     LOAD CHAT MESSAGES
  ========================================================= */

  const loadMessages = async (
    trackingId,
    page = 1,
    append = false
  ) => {
    try {
      setMessagesLoading(true);

      const response =
        await getOrderTrackingMessages(
          trackingId,
          {
            page,
            limit: 50,
          }
        );

      const payload =
        unwrapApiData(response) || {};

      const nextMessages =
        Array.isArray(payload.data)
          ? payload.data
          : [];

      setMessages((previous) => {
        if (!append) {
          return nextMessages;
        }

        return [
          ...nextMessages,
          ...previous,
        ];
      });

      setMessagePagination(
        payload.pagination || {
          page,
          limit: 50,
          total: 0,
          totalPages: 1,
        }
      );

      try {
        await markOrderTrackingMessagesRead(
          trackingId
        );
      } catch (readError) {
        console.error(
          "MARK ORDER TRACKING MESSAGES READ ERROR:",
          readError
        );
      }
    } catch (error) {
      alert(
        error?.response?.data
          ?.message ||
          "Failed to load messages."
      );
    } finally {
      setMessagesLoading(false);
    }
  };

  /* =========================================================
     REFRESH SELECTED TRACKING RECORD
  ========================================================= */

  const refreshSelectedTracking =
    async (trackingId) => {
      const response =
        await getOrderTrackingById(
          trackingId
        );

      const payload =
        unwrapApiData(response) || {};

      const tracking =
        payload.tracking ||
        payload;

      setSelectedTracking(
        tracking
      );

      return tracking;
    };

  /* =========================================================
     OPEN FULL DRILL-DOWN PAGE
  ========================================================= */

  const openTracking = async (
    tracking
  ) => {
    if (!tracking?._id) {
      return;
    }

    try {
      setOpeningTrackingId(
        tracking._id
      );

      setMessages([]);

      /*
       * Immediately show selected row data,
       * then replace it with complete API data.
       */
      setSelectedTracking(tracking);

      await Promise.all([
        refreshSelectedTracking(
          tracking._id
        ),

        loadMessages(
          tracking._id,
          1,
          false
        ),
      ]);
    } catch (error) {
      setSelectedTracking(null);
      setMessages([]);

      alert(
        error?.response?.data
          ?.message ||
          "Failed to open order tracking."
      );
    } finally {
      setOpeningTrackingId("");
    }
  };

  /* =========================================================
     CLOSE DRILL-DOWN AND RETURN TO TABLE
  ========================================================= */

  const closeTrackingDetails =
    async () => {
      setSelectedTracking(null);
      setMessages([]);
      setStatusOpen(false);

      setMessagePagination({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      });

      await loadAll(true);
    };

  /* =========================================================
     REQUEST UPDATE
  ========================================================= */

  const handleRequestUpdate =
    async (tracking) => {
      if (!tracking?._id) {
        return;
      }

      try {
        setRequestingTrackingId(
          tracking._id
        );

        await requestOrderTrackingUpdate(
          tracking._id
        );

        if (
          selectedTracking?._id ===
          tracking._id
        ) {
          await Promise.all([
            refreshSelectedTracking(
              tracking._id
            ),

            loadMessages(
              tracking._id,
              1,
              false
            ),
          ]);
        }

        await loadAll(true);
      } catch (error) {
        alert(
          error?.response?.data
            ?.message ||
            "Failed to request update."
        );
      } finally {
        setRequestingTrackingId(
          ""
        );
      }
    };

  /* =========================================================
     UPDATE ORDER STATUS
  ========================================================= */

  const handleStatusSubmit =
    async (payload, files) => {
      if (!selectedTracking?._id) {
        return;
      }

      const trackingId =
        selectedTracking._id;

      try {
        setStatusSaving(true);

        await updateOrderTrackingStatus(
          trackingId,
          payload,
          files
        );

        setStatusOpen(false);

        await Promise.all([
          refreshSelectedTracking(
            trackingId
          ),

          loadMessages(
            trackingId,
            1,
            false
          ),

          loadAll(true),
        ]);
      } catch (error) {
        alert(
          error?.response?.data
            ?.message ||
            "Failed to update status."
        );
      } finally {
        setStatusSaving(false);
      }
    };

  /* =========================================================
     SEND CHAT / AUDIO / FILE MESSAGE
  ========================================================= */

  const handleSendMessage =
    async (payload, files) => {
      if (!selectedTracking?._id) {
        return;
      }

      const trackingId =
        selectedTracking._id;

      try {
        setMessageSending(true);

        await sendOrderTrackingMessage(
          trackingId,
          payload,
          files
        );

        await Promise.all([
          loadMessages(
            trackingId,
            1,
            false
          ),

          refreshSelectedTracking(
            trackingId
          ),

          loadAll(true),
        ]);
      } catch (error) {
        alert(
          error?.response?.data
            ?.message ||
            "Failed to send message."
        );
      } finally {
        setMessageSending(false);
      }
    };

    /* =========================================================
   DELETE CHAT MESSAGE FOR EVERYONE
========================================================= */

const handleDeleteMessage = async (
  messageId
) => {
  if (
    !selectedTracking?._id ||
    !messageId
  ) {
    return;
  }

  const trackingId =
    selectedTracking._id;

  try {
    setDeletingMessageId(
      messageId
    );

    await deleteOrderTrackingMessage(
      trackingId,
      messageId
    );

    await Promise.all([
      loadMessages(
        trackingId,
        1,
        false
      ),

      refreshSelectedTracking(
        trackingId
      ),
    ]);
  } catch (error) {
    alert(
      error?.response?.data
        ?.message ||
        "Failed to delete message."
    );
  } finally {
    setDeletingMessageId("");
  }
};


  /* =========================================================
     LOAD OLDER CHAT MESSAGES
  ========================================================= */

  const handleLoadOlderMessages =
    async () => {
      if (!selectedTracking?._id) {
        return;
      }

      const currentPage = Number(
        messagePagination.page || 1
      );

      const totalPages = Number(
        messagePagination.totalPages ||
          1
      );

      const nextPage =
        currentPage + 1;

      if (nextPage > totalPages) {
        return;
      }

      await loadMessages(
        selectedTracking._id,
        nextPage,
        true
      );
    };

  /* =========================================================
     CLOSE CHAT
  ========================================================= */

  const handleCloseChat =
    async () => {
      if (!selectedTracking?._id) {
        return;
      }

      const trackingId =
        selectedTracking._id;

      try {
        await closeOrderTrackingChat(
          trackingId
        );

        await Promise.all([
          refreshSelectedTracking(
            trackingId
          ),

          loadMessages(
            trackingId,
            1,
            false
          ),

          loadAll(true),
        ]);
      } catch (error) {
        alert(
          error?.response?.data
            ?.message ||
            "Failed to close chat."
        );
      }
    };

  /* =========================================================
     REOPEN CHAT
  ========================================================= */

  const handleReopenChat =
    async () => {
      if (!selectedTracking?._id) {
        return;
      }

      const trackingId =
        selectedTracking._id;

      try {
        await reopenOrderTrackingChat(
          trackingId
        );

        await Promise.all([
          refreshSelectedTracking(
            trackingId
          ),

          loadMessages(
            trackingId,
            1,
            false
          ),

          loadAll(true),
        ]);
      } catch (error) {
        alert(
          error?.response?.data
            ?.message ||
            "Failed to reopen chat."
        );
      }
    };

  /* =========================================================
     SYNC EXISTING APPROVED SALES ORDERS
  ========================================================= */

  const handleSync = async () => {
    try {
      setSyncing(true);

      const response =
        await syncApprovedSalesOrders();

      const payload =
        unwrapApiData(response) || {};

      alert(
        `Sync completed. ${
          payload.createdCount || 0
        } new tracking record(s) created.`
      );

      await loadAll(true);
    } catch (error) {
      alert(
        error?.response?.data
          ?.message ||
          "Failed to sync approved orders."
      );
    } finally {
      setSyncing(false);
    }
  };

  /* =========================================================
     FILTERS
  ========================================================= */

  const handleFilterChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      ...initialFilters,
    });
  };

  /* =========================================================
     SUMMARY CARD FILTER
  ========================================================= */

  const handleSummaryClick = (
    card
  ) => {
    if (card.key === "total") {
      clearFilters();
      return;
    }

    if (
      card.key ===
      "updateRequested"
    ) {
      setFilters({
        ...initialFilters,
        updateRequested: "true",
      });

      return;
    }

    setFilters({
      ...initialFilters,
      status: card.key,
    });
  };

  /* =========================================================
     DASHBOARD BACK
  ========================================================= */

  const goBack = () => {
    if (
      window.__goDashboardHome
    ) {
      window.__goDashboardHome();
      return;
    }

    window.location.href =
      "/dashboard#dashboard";
  };

  /* =========================================================
     FULL DRILL-DOWN PAGE
  ========================================================= */

  if (selectedTracking) {
    return (
      <>
        <OrderTrackingDetailPage
  tracking={selectedTracking}
  messages={messages}
  messagesLoading={
    messagesLoading
  }
  messagesSending={
    messageSending
  }
  deletingMessageId={
    deletingMessageId
  }
          opening={
            openingTrackingId ===
            selectedTracking._id
          }
          requestingUpdate={
            requestingTrackingId ===
            selectedTracking._id
          }
          hasMoreMessages={
            Number(
              messagePagination.page ||
                1
            ) <
            Number(
              messagePagination
                .totalPages || 1
            )
          }
          onBack={
            closeTrackingDetails
          }
          onRefresh={async () => {
            await Promise.all([
              refreshSelectedTracking(
                selectedTracking._id
              ),

              loadMessages(
                selectedTracking._id,
                1,
                false
              ),
            ]);
          }}
          onOpenStatus={() =>
            setStatusOpen(true)
          }
          onRequestUpdate={() =>
            handleRequestUpdate(
              selectedTracking
            )
          }
          onLoadMoreMessages={
            handleLoadOlderMessages
          }
          onSendMessage={
  handleSendMessage
}
onDeleteMessage={
  handleDeleteMessage
}
onCloseChat={
  handleCloseChat
}
onReopenChat={
  handleReopenChat
}
/>

        <OrderTrackingStatusModal
          open={statusOpen}
          tracking={selectedTracking}
          saving={statusSaving}
          onClose={() =>
            setStatusOpen(false)
          }
          onSubmit={
            handleStatusSubmit
          }
        />
      </>
    );
  }

  /* =========================================================
     MAIN LIST PAGE
  ========================================================= */

  return (
    <div className="ot-page">
      <header className="ot-page-header">
        <div className="ot-page-title">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to dashboard"
          >
            ←
          </button>

          <div>
            <span>
              FACTORY VISIBILITY
            </span>

            <h1>
              Order Tracking
            </h1>

            <p>
              Sales order status, factory
              updates, chat, audio and files
            </p>
          </div>
        </div>

        <div className="ot-header-actions">
          {canSyncTracking(user) && (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing
                ? "Syncing..."
                : "Sync Approved Orders"}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              loadAll(true)
            }
            disabled={refreshing}
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </header>

      <main className="ot-page-content">
        <section className="ot-summary-grid">
          {SUMMARY_CARDS.map(
            (card) => (
              <button
                type="button"
                key={card.key}
                onClick={() =>
                  handleSummaryClick(
                    card
                  )
                }
              >
                <span>
                  {card.label}
                </span>

                <strong>
                  {Number(
                    summary[
                      card.key
                    ] || 0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </button>
            )
          )}
        </section>

        <section className="ot-filter-panel">
          <input
            name="search"
            value={filters.search}
            onChange={
              handleFilterChange
            }
            placeholder="Search company, PO, SO, tracking number, plant or material..."
          />

          <select
            name="status"
            value={filters.status}
            onChange={
              handleFilterChange
            }
          >
            <option value="">
              All Statuses
            </option>

            {STATUS_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <select
            name="priority"
            value={filters.priority}
            onChange={
              handleFilterChange
            }
          >
            {PRIORITY_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <select
            name="updateRequested"
            value={
              filters.updateRequested
            }
            onChange={
              handleFilterChange
            }
          >
            <option value="">
              All Update Requests
            </option>

            <option value="true">
              Update Requested
            </option>

            <option value="false">
              No Request
            </option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
          >
            Clear
          </button>
        </section>

        {loading ? (
          <div className="ot-page-state">
            <div className="ot-loader" />

            <strong>
              Loading order tracking...
            </strong>
          </div>
        ) : records.length === 0 ? (
          <div className="ot-page-state">
            <span>📦</span>

            <strong>
              No tracking records found
            </strong>

            <p>
              Clear filters or sync
              approved sales orders.
            </p>
          </div>
        ) : (
          <>
            <div className="ot-desktop-view">
              <OrderTrackingTable
                records={records}
                requestingId={
                  requestingTrackingId
                }
                openingId={
                  openingTrackingId
                }
                onOpen={
                  openTracking
                }
                onRequestUpdate={
                  handleRequestUpdate
                }
              />
            </div>

            <div className="ot-mobile-view">
              {records.map(
                (tracking) => (
                  <OrderTrackingCard
                    key={tracking._id}
                    tracking={
                      tracking
                    }
                    opening={
                      openingTrackingId ===
                      tracking._id
                    }
                    requesting={
                      requestingTrackingId ===
                      tracking._id
                    }
                    onOpen={
                      openTracking
                    }
                    onRequestUpdate={
                      handleRequestUpdate
                    }
                  />
                )
              )}
            </div>
          </>
        )}

        <div className="ot-pagination">
          <button
            type="button"
            disabled={
              Number(
                pagination.page || 1
              ) <= 1
            }
            onClick={() =>
              setFilters(
                (previous) => ({
                  ...previous,
                  page:
                    Number(
                      pagination.page ||
                        1
                    ) - 1,
                })
              )
            }
          >
            Previous
          </button>

          <span>
            Page{" "}
            {pagination.page || 1} of{" "}
            {pagination.totalPages ||
              1}
          </span>

          <button
            type="button"
            disabled={
              Number(
                pagination.page || 1
              ) >=
              Number(
                pagination.totalPages ||
                  1
              )
            }
            onClick={() =>
              setFilters(
                (previous) => ({
                  ...previous,
                  page:
                    Number(
                      pagination.page ||
                        1
                    ) + 1,
                })
              )
            }
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
};

export default OrderTrackingPage;