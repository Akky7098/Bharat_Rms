import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
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

/* =========================================================
   URL HELPERS
========================================================= */

const getTrackingIdFromUrl = () => {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("tracking") ||
    ""
  );
};

const setTrackingIdInUrl = (
  trackingId
) => {
  const url =
    new URL(
      window.location.href
    );

  if (trackingId) {
    url.searchParams.set(
      "tracking",
      trackingId
    );
  } else {
    url.searchParams.delete(
      "tracking"
    );
  }

  window.history.pushState(
    {},
    "",
    url
  );
};

/* =========================================================
   NORMALIZE LIST RESPONSE

   IMPORTANT:
   Backend is responsible for global sorting:

   approvedAt DESC
   createdAt DESC
   _id DESC

   Do NOT sort the returned page again in frontend.
========================================================= */

const normalizeListResponse = (
  response
) => {
  const payload =
    response?.data || {};

  return {
    items:
      Array.isArray(
        payload.items
      )
        ? payload.items
        : [],

    pagination:
      payload.pagination || {
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 1,
      },
  };
};

/* =========================================================
   NORMALIZE DETAIL RESPONSE
========================================================= */

const normalizeDetailResponse = (
  response
) =>
  response?.data || null;

/* =========================================================
   SCROLL ORDER TRACKING TO TOP
========================================================= */

const scrollOrderTrackingToTop =
  () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    const main =
      document.querySelector(
        ".dashboard .main"
      );

    if (
      main &&
      typeof main.scrollTo ===
        "function"
    ) {
      main.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

/* =========================================================
   COMPONENT

   Main Order Tracking Back:
   -> Dashboard Home

   Detail Back:
   -> Order Tracking List
========================================================= */

const OrderTrackingPage = ({
  onBack,
}) => {
  /* =======================================================
     DETAIL STATE
  ======================================================= */

  const [
    selectedTrackingId,
    setSelectedTrackingId,
  ] = useState(
    getTrackingIdFromUrl()
  );

  const [
    selectedTracking,
    setSelectedTracking,
  ] = useState(null);

  /* =======================================================
     LIST STATE
  ======================================================= */

  const [
    trackings,
    setTrackings,
  ] = useState([]);

  /*
   * IMPORTANT:
   *
   * page is REQUEST state.
   *
   * pagination contains RESPONSE metadata.
   *
   * Keeping these separate prevents the page from
   * resetting itself after a successful API response.
   */
  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  /* =======================================================
     FILTERS
  ======================================================= */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    orderType,
    setOrderType,
  ] = useState("");

  const [
    processType,
    setProcessType,
  ] = useState("");

  /* =======================================================
     LOADING / ERROR
  ======================================================= */

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

  const [
    error,
    setError,
  ] = useState("");

  const isDetailView =
    Boolean(
      selectedTrackingId
    );

  /* =======================================================
     FETCH LIST

     requestPage is explicitly supplied.

     This function does NOT depend on pagination.page.
     That prevents the pagination response from causing
     another request for Page 1.
  ======================================================= */

  const fetchList =
    useCallback(
      async ({
        requestPage = 1,
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoadingList(
              true
            );
          }

          setError("");

          const finalPage =
            Math.max(
              Number(
                requestPage
              ) || 1,
              1
            );

          const response =
            await getOrderTrackingList({
              page:
                finalPage,

              limit:
                PAGE_SIZE,

              search:
                search.trim() ||
                undefined,

              status:
                status ||
                undefined,

              orderType:
                orderType ||
                undefined,

              processType:
                processType ||
                undefined,
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
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Failed to load order tracking"
          );
        } finally {
          setLoadingList(
            false
          );
        }
      },
      [
        search,
        status,
        orderType,
        processType,
      ]
    );

  /* =======================================================
     FETCH DETAIL
  ======================================================= */

  const fetchDetail =
    useCallback(
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
            setLoadingDetail(
              true
            );
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
            err?.response
              ?.data
              ?.message ||
            err?.message ||
            "Failed to load order tracking details"
          );
        } finally {
          setLoadingDetail(
            false
          );
        }
      },
      []
    );

  /* =======================================================
     BROWSER BACK / FORWARD
  ======================================================= */

  useEffect(() => {
    const onPopState =
      () => {
        const trackingId =
          getTrackingIdFromUrl();

        setSelectedTrackingId(
          trackingId
        );

        if (!trackingId) {
          setSelectedTracking(
            null
          );
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

  /* =======================================================
     LOAD LIST / DETAIL

     IMPORTANT:
     Page is NOT hardcoded to 1 anymore.

     Search is slightly debounced.
  ======================================================= */

  useEffect(() => {
    if (
      selectedTrackingId
    ) {
      fetchDetail(
        selectedTrackingId
      );

      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          fetchList({
            requestPage:
              page,
          });
        },
        250
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    selectedTrackingId,
    page,
    search,
    status,
    orderType,
    processType,
    fetchDetail,
    fetchList,
  ]);

  /* =======================================================
     SEARCH CHANGE

     A new search always starts from Page 1.
  ======================================================= */

  const handleSearchChange =
    (
      event
    ) => {
      setSearch(
        event.target.value
      );

      setPage(1);
    };

  /* =======================================================
     STATUS FILTER

     Changing filter always starts from Page 1.
  ======================================================= */

  const handleStatusChange =
    (
      event
    ) => {
      setStatus(
        event.target.value
      );

      setPage(1);
    };

  /* =======================================================
     ORDER TYPE FILTER
  ======================================================= */

  const handleOrderTypeChange =
    (
      event
    ) => {
      setOrderType(
        event.target.value
      );

      setPage(1);
    };

  /* =======================================================
     PROCESS FILTER
  ======================================================= */

  const handleProcessTypeChange =
    (
      event
    ) => {
      setProcessType(
        event.target.value
      );

      setPage(1);
    };

  /* =======================================================
     OPEN ORDER DETAIL
  ======================================================= */

  const openTracking =
    (
      trackingId
    ) => {
      setTrackingIdInUrl(
        trackingId
      );

      setSelectedTrackingId(
        trackingId
      );

      setSelectedTracking(
        null
      );

      scrollOrderTrackingToTop();
    };

  /* =======================================================
     DETAIL BACK
     Detail -> Order Tracking List
  ======================================================= */

  const closeTracking =
    () => {
      const url =
        new URL(
          window.location.href
        );

      url.searchParams.delete(
        "tracking"
      );

      window.history.replaceState(
        {},
        "",
        url
      );

      setSelectedTrackingId(
        ""
      );

      setSelectedTracking(
        null
      );

      scrollOrderTrackingToTop();
    };

  /* =======================================================
     MAIN PWA BACK
     Order Tracking -> Dashboard Home
  ======================================================= */

  const handlePwaBack =
    () => {
      /*
       * If currently inside order detail,
       * return to Order Tracking list first.
       */
      if (
        selectedTrackingId
      ) {
        closeTracking();

        return;
      }

      /*
       * Primary navigation:
       * Dashboard controls module navigation.
       */
      if (
        typeof onBack ===
        "function"
      ) {
        onBack();

        return;
      }

      /*
       * Production-safe fallback.
       */
      const dashboardUrl =
        `${window.location.origin}` +
        "/dashboard#dashboard";

      window.location.replace(
        dashboardUrl
      );
    };

  /* =======================================================
     REFRESH + SYNC LIST

     Keep user on current page.
  ======================================================= */

  const refreshList =
    async () => {
      try {
        setRefreshing(
          true
        );

        setError("");

        await syncApprovedSalesOrders();

        await fetchList({
          requestPage:
            page,

          silent:
            true,
        });
      } catch (err) {
        setError(
          err?.response
            ?.data
            ?.message ||
          err?.message ||
          "Failed to sync order tracking"
        );
      } finally {
        setRefreshing(
          false
        );
      }
    };

  /* =======================================================
     REFRESH DETAIL
  ======================================================= */

  const refreshDetail =
    async () => {
      if (
        !selectedTrackingId
      ) {
        return;
      }

      try {
        setRefreshing(
          true
        );

        setError("");

        await fetchDetail(
          selectedTrackingId,
          {
            silent:
              true,
          }
        );
      } catch (err) {
        setError(
          err?.response
            ?.data
            ?.message ||
          err?.message ||
          "Failed to refresh tracking details"
        );
      } finally {
        setRefreshing(
          false
        );
      }
    };

  /* =======================================================
     PAGINATION HELPERS
  ======================================================= */

  const totalPages =
    Math.max(
      Number(
        pagination
          .totalPages
      ) || 1,
      1
    );

  const canGoPrevious =
    page > 1;

  const canGoNext =
    page <
    totalPages;

  const goPreviousPage =
    () => {
      if (
        !canGoPrevious ||
        loadingList
      ) {
        return;
      }

      setPage(
        (
          currentPage
        ) =>
          Math.max(
            currentPage -
              1,
            1
          )
      );

      scrollOrderTrackingToTop();
    };

  const goNextPage =
    () => {
      if (
        !canGoNext ||
        loadingList
      ) {
        return;
      }

      setPage(
        (
          currentPage
        ) =>
          Math.min(
            currentPage +
              1,
            totalPages
          )
      );

      scrollOrderTrackingToTop();
    };

  /* =======================================================
     DETAIL VIEW
  ======================================================= */

  if (isDetailView) {
    return (
      <div className="ot-page">

        {error ? (
          <div className="ot-alert ot-alert--error">

            <AlertCircle
              size={17}
            />

            <span>
              {error}
            </span>

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

  /* =======================================================
     LIST VIEW
  ======================================================= */

  return (
    <div className="ot-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <section className="ot-page-head">

        {/* PWA BACK */}

        <button
          type="button"
          className="
            ot-pwa-header-btn
            ot-pwa-header-btn--back
          "
          onClick={
            handlePwaBack
          }
          aria-label="Back to dashboard"
          title="Back to Dashboard"
        >
          <ArrowLeft
            size={20}
          />
        </button>

        {/* TITLE */}

        <div className="ot-page-head__content">

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

        {/* REFRESH */}

        <button
          type="button"
          className="
            ot-btn
            ot-btn--secondary
            ot-pwa-refresh
          "
          onClick={
            refreshList
          }
          disabled={
            refreshing
          }
          aria-label="Refresh and sync orders"
          title="Refresh & Sync"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "ot-spin"
                : ""
            }
          />

          <span className="ot-refresh-text">
            Refresh & Sync
          </span>
        </button>

      </section>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error ? (
        <div className="ot-alert ot-alert--error">

          <AlertCircle
            size={17}
          />

          <span>
            {error}
          </span>

        </div>
      ) : null}

      {/* ===================================================
          ORDER LIST
      =================================================== */}

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

          {/* SEARCH */}

          <div className="ot-search">

            <Search
              size={17}
            />

            <input
              value={
                search
              }
              onChange={
                handleSearchChange
              }
              placeholder="Search customer, PO, SO, material..."
            />

          </div>

        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <div className="ot-filters">

          <div className="ot-filter-label">

            <SlidersHorizontal
              size={14}
            />

            Filters

          </div>

          {/* STATUS */}

          <select
            value={
              status
            }
            onChange={
              handleStatusChange
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

          {/* ORDER TYPE */}

          <select
            value={
              orderType
            }
            onChange={
              handleOrderTypeChange
            }
          >
            <option value="">
              H.O. + Steel Plant
            </option>

            <option value="H.O.">
              H.O.
            </option>

            <option value="N.H.O.">
              Steel Plant
            </option>

          </select>

          {/* PROCESS */}

          <select
            value={
              processType
            }
            onChange={
              handleProcessTypeChange
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

        {/* =================================================
            TABLE / MOBILE CARDS
        ================================================= */}

        <OrderTrackingTable
          items={
            trackings
          }

          loading={
            loadingList
          }

          onOpen={
            openTracking
          }
        />

        {/* =================================================
            PAGINATION
        ================================================= */}

        <div className="ot-pagination">

          <span>
            Page{" "}

            <strong>
              {page}
            </strong>

            {" "}
            of
            {" "}

            <strong>
              {totalPages}
            </strong>
          </span>

          <div>

            {/* PREVIOUS */}

            <button
              type="button"
              disabled={
                !canGoPrevious ||
                loadingList
              }
              onClick={
                goPreviousPage
              }
            >
              <ChevronLeft
                size={15}
              />

              Previous
            </button>

            {/* NEXT */}

            <button
              type="button"
              disabled={
                !canGoNext ||
                loadingList
              }
              onClick={
                goNextPage
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