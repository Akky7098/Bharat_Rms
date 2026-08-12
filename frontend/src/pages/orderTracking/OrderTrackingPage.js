import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import {
  getOrderTrackingById,
  getOrderTrackingList,
  syncApprovedSalesOrders,
} from "../../services/orderTrackingService";

import OrderTrackingTable from "./components/OrderTrackingTable";
import OrderTrackingDetail from "./components/OrderTrackingDetail";

import "./orderTrackingPage.css";

const PAGE_SIZE = 25;

const getTrackingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("tracking") || "";
};

const setTrackingIdInUrl = (trackingId) => {
  const url = new URL(window.location.href);

  if (trackingId) {
    url.searchParams.set("tracking", trackingId);
  } else {
    url.searchParams.delete("tracking");
  }

  window.history.pushState({}, "", url);
};

const normalizeListResponse = (response) => {
  const payload = response?.data || {};

  const items = Array.isArray(payload.items)
    ? [...payload.items].sort((a, b) => {
        const aDate = new Date(
          a.approvedAt ||
            a.createdAt ||
            a.updatedAt ||
            0
        ).getTime();

        const bDate = new Date(
          b.approvedAt ||
            b.createdAt ||
            b.updatedAt ||
            0
        ).getTime();

        return bDate - aDate;
      })
    : [];

  return {
    items,
    pagination:
      payload.pagination || {
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
      },
  };
};

const normalizeDetailResponse = (response) =>
  response?.data || null;

const OrderTrackingPage = () => {
  const [
    selectedTrackingId,
    setSelectedTrackingId,
  ] = useState(getTrackingIdFromUrl());

  const [
    selectedTracking,
    setSelectedTracking,
  ] = useState(null);

  const [trackings, setTrackings] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 1,
    });

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [orderType, setOrderType] =
    useState("");

  const [
    processType,
    setProcessType,
  ] = useState("");

  const [
    loadingList,
    setLoadingList,
  ] = useState(true);

  const [
    loadingDetail,
    setLoadingDetail,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const isDetailView = Boolean(
    selectedTrackingId
  );

  const listQuery = useMemo(
    () => ({
      page: pagination.page || 1,
      limit: PAGE_SIZE,
      search:
        search.trim() || undefined,
      status: status || undefined,
      orderType:
        orderType || undefined,
      processType:
        processType || undefined,
    }),
    [
      pagination.page,
      search,
      status,
      orderType,
      processType,
    ]
  );

  const fetchList = useCallback(
    async ({
      page,
      silent = false,
    } = {}) => {
      try {
        if (!silent) {
          setLoadingList(true);
        }

        setError("");

        const response =
          await getOrderTrackingList({
            ...listQuery,
            page:
              page ||
              listQuery.page,
          });

        const normalized =
          normalizeListResponse(
            response
          );

        setTrackings(
          normalized.items
        );

        setPagination(
          normalized.pagination
        );
      } catch (err) {
        setError(
          err?.message ||
            "Failed to load order tracking"
        );
      } finally {
        setLoadingList(false);
      }
    },
    [listQuery]
  );

  const fetchDetail = useCallback(
    async (
      trackingId,
      {
        silent = false,
      } = {}
    ) => {
      if (!trackingId) {
        return;
      }

      try {
        if (!silent) {
          setLoadingDetail(true);
        }

        setError("");

        const response =
          await getOrderTrackingById(
            trackingId
          );

        setSelectedTracking(
          normalizeDetailResponse(
            response
          )
        );
      } catch (err) {
        setError(
          err?.message ||
            "Failed to load order tracking details"
        );
      } finally {
        setLoadingDetail(false);
      }
    },
    []
  );

  useEffect(() => {
    const onPopState = () => {
      const trackingId =
        getTrackingIdFromUrl();

      setSelectedTrackingId(
        trackingId
      );

      if (!trackingId) {
        setSelectedTracking(null);
      }
    };

    window.addEventListener(
      "popstate",
      onPopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        onPopState
      );
    };
  }, []);

  useEffect(() => {
    if (selectedTrackingId) {
      fetchDetail(
        selectedTrackingId
      );

      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        fetchList({
          page: 1,
        });
      }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    selectedTrackingId,
    search,
    status,
    orderType,
    processType,
    fetchDetail,
    fetchList,
  ]);

  const openTracking = (
    trackingId
  ) => {
    setTrackingIdInUrl(
      trackingId
    );

    setSelectedTrackingId(
      trackingId
    );

    setSelectedTracking(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const closeTracking = () => {
    setTrackingIdInUrl("");

    setSelectedTrackingId("");

    setSelectedTracking(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const refreshList = async () => {
    try {
      setRefreshing(true);
      setError("");

      /*
       * First discover any newly-approved Sales Orders.
       * No orderType/supplyCondition body is required.
       */
      await syncApprovedSalesOrders();

      /*
       * Then reload the latest tracking list.
       */
      await fetchList({
        page:
          pagination.page || 1,
        silent: true,
      });
    } catch (err) {
      setError(
        err?.message ||
          "Failed to sync order tracking"
      );
    } finally {
      setRefreshing(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedTrackingId) {
      return;
    }

    try {
      setRefreshing(true);
      setError("");

      await fetchDetail(
        selectedTrackingId,
        {
          silent: true,
        }
      );
    } catch (err) {
      setError(
        err?.message ||
          "Failed to refresh tracking details"
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (isDetailView) {
    return (
      <div className="ot-page">
        {error ? (
          <div className="ot-alert ot-alert--error">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        ) : null}

        <OrderTrackingDetail
          tracking={
            selectedTracking
          }
          loading={
            loadingDetail
          }
          refreshing={
            refreshing
          }
          onBack={
            closeTracking
          }
          onRefresh={
            refreshDetail
          }
          onUpdated={
            refreshDetail
          }
        />
      </div>
    );
  }

  return (
    <div className="ot-page">
      <section className="ot-page-head">
        <div>
          <span className="ot-eyebrow">
            DISPATCH CONTROL CENTER
          </span>

          <h1>
            Order Tracking
          </h1>

          <p>
            Latest approved orders first —
            with live production,
            inspection and dispatch status.
          </p>
        </div>

        <button
          type="button"
          className="ot-btn ot-btn--secondary"
          onClick={
            refreshList
          }
          disabled={
            refreshing
          }
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "ot-spin"
                : ""
            }
          />

          Refresh & Sync
        </button>
      </section>

      {error ? (
        <div className="ot-alert ot-alert--error">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="ot-list-card">
        <div className="ot-list-toolbar">
          <div className="ot-list-title">
            <div className="ot-list-title__icon">
              <PackageSearch
                size={20}
              />
            </div>

            <div>
              <span className="ot-eyebrow">
                LIVE ORDERS
              </span>

              <h2>
                {pagination.total || 0}
                {" "}
                Orders
              </h2>
            </div>
          </div>

          <div className="ot-search">
            <Search size={17} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search customer, PO, SO, material..."
            />
          </div>
        </div>

        <div className="ot-filters">
          <div className="ot-filter-label">
            <SlidersHorizontal
              size={14}
            />
            Filters
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
          >
            <option value="">
              All Statuses
            </option>
            <option value="planning">
              Planning
            </option>
            <option value="under_casting">
              Under Casting
            </option>
            <option value="rolling_planning">
              Rolling Planning
            </option>
            <option value="rolling">
              Rolling
            </option>
            <option value="forging_planning">
              Forging Planning
            </option>
            <option value="forging">
              Forging
            </option>
            <option value="pit_cooling">
              Pit Cooling
            </option>
            <option value="inspection">
              Inspection
            </option>
            <option value="annealing">
              Annealing
            </option>
            <option value="normalizing">
              Normalizing
            </option>
            <option value="quenching">
              Quenching
            </option>
            <option value="tempering">
              Tempering
            </option>
            <option value="end_cutting_mill_inspection">
              Mill Inspection
            </option>
            <option value="bharat_inspection">
              Bharat Inspection
            </option>
            <option value="cutting">
              Cutting
            </option>
            <option value="machining">
              Machining
            </option>
            <option value="ready_for_dispatch">
              Ready for Dispatch
            </option>
            <option value="loading">
              Loading
            </option>
            <option value="shipped">
              Shipped
            </option>
            <option value="out_for_delivery">
              Out for Delivery
            </option>
            <option value="delivered">
              Delivered
            </option>
          </select>

          <select
            value={orderType}
            onChange={(event) =>
              setOrderType(
                event.target.value
              )
            }
          >
            <option value="">
              H.O. + N.H.O.
            </option>
            <option value="H.O.">
              H.O.
            </option>
            <option value="N.H.O.">
              N.H.O.
            </option>
          </select>

          <select
            value={processType}
            onChange={(event) =>
              setProcessType(
                event.target.value
              )
            }
          >
            <option value="">
              All Processes
            </option>
            <option value="AS_ROLLED">
              As Rolled
            </option>
            <option value="AS_FORGED">
              As Forged
            </option>
            <option value="AS_ROLLED_ANNEALED_NORMALIZED">
              Rolled + A/N
            </option>
            <option value="AS_FORGED_ANNEALED_NORMALIZED">
              Forged + A/N
            </option>
            <option value="AS_ROLLED_QT">
              Rolled + Q&T
            </option>
            <option value="AS_FORGED_QT">
              Forged + Q&T
            </option>
            <option value="H_O">
              H.O.
            </option>
          </select>
        </div>

        <OrderTrackingTable
          items={trackings}
          loading={loadingList}
          onOpen={
            openTracking
          }
        />

        <div className="ot-pagination">
          <span>
            Page{" "}
            <strong>
              {pagination.page || 1}
            </strong>{" "}
            of{" "}
            <strong>
              {pagination.totalPages || 1}
            </strong>
          </span>

          <div>
            <button
              type="button"
              disabled={
                (pagination.page || 1) <= 1
              }
              onClick={() =>
                fetchList({
                  page: Math.max(
                    (pagination.page || 1) - 1,
                    1
                  ),
                })
              }
            >
              <ChevronLeft
                size={15}
              />
              Previous
            </button>

            <button
              type="button"
              disabled={
                (pagination.page || 1) >=
                (pagination.totalPages || 1)
              }
              onClick={() =>
                fetchList({
                  page: Math.min(
                    (pagination.page || 1) + 1,
                    pagination.totalPages || 1
                  ),
                })
              }
            >
              Next
              <ChevronRight
                size={15}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrderTrackingPage;

