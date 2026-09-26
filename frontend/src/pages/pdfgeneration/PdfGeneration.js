import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAllPdfDocuments,
  deletePdfDocument,
  getPdfFileUrl,
} from "../../services/pdfDocumentService";

import PdfTypeModal from "./components/PdfTypeModal";

import "./PdfGeneration.css";

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  try {
    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  } catch {
    return "-";
  }
};

const formatDateTime = (date) => {
  if (!date) {
    return "-";
  }

  try {
    return new Date(date).toLocaleString(
      "en-GB",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  } catch {
    return "-";
  }
};

const formatLabel = (value) => {
  if (!value) {
    return "-";
  }

  return String(value)
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      return (
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
      );
    })
    .join(" ");
};

/* =========================================================
   PDF GENERATION PAGE
========================================================= */

const PdfGeneration = ({
  dashboardFilters,
}) => {
  /* =======================================================
     STATE
  ======================================================= */

  const [
    documents,
    setDocuments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    showTypeModal,
    setShowTypeModal,
  ] = useState(false);

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState(null);

  const [
    showMobileFilters,
    setShowMobileFilters,
  ] = useState(false);

  const [
    pagination,
    setPagination,
  ] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 30,
  });

  const [
    filters,
    setFilters,
  ] = useState({
    page:
      Number(
        dashboardFilters?.page
      ) || 1,

    limit:
      Number(
        dashboardFilters?.limit
      ) || 30,

    documentType:
      dashboardFilters
        ?.documentType || "",

    status:
      dashboardFilters
        ?.status || "",

    search:
      dashboardFilters
        ?.search || "",
  });

  /* =======================================================
     FETCH PDF DOCUMENTS
  ======================================================= */

  const fetchDocuments =
    useCallback(
      async () => {
        try {
          setLoading(true);

          const params = {};

          Object.keys(
            filters
          ).forEach(
            (key) => {
              const value =
                filters[key];

              if (
                value !== "" &&
                value !== null &&
                value !== undefined
              ) {
                params[key] =
                  value;
              }
            }
          );

          const response =
            await getAllPdfDocuments(
              params
            );

          /*
           * Backend expected response:
           *
           * {
           *   success: true,
           *   data: [],
           *   pagination: {...}
           * }
           */

          const rows =
            response?.data ||
            response?.documents ||
            [];

          setDocuments(
            Array.isArray(
              rows
            )
              ? rows
              : []
          );

          const responsePagination =
            response?.pagination ||
            {};

          setPagination({
            currentPage:
              Number(
                responsePagination
                  ?.currentPage ||
                  responsePagination
                    ?.page ||
                  filters.page ||
                  1
              ),

            totalPages:
              Number(
                responsePagination
                  ?.totalPages ||
                  1
              ),

            totalRecords:
              Number(
                responsePagination
                  ?.totalRecords ||
                  responsePagination
                    ?.total ||
                  0
              ),

            limit:
              Number(
                responsePagination
                  ?.limit ||
                  filters.limit ||
                  30
              ),
          });
        } catch (error) {
          console.error(
            "Failed to fetch PDF documents:",
            error
          );

          setDocuments([]);

          alert(
            error?.response
              ?.data?.message ||
              "Failed to load PDF documents."
          );
        } finally {
          setLoading(false);
        }
      },
      [filters]
    );

  /* =======================================================
     LOAD DOCUMENTS
  ======================================================= */

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /* =======================================================
     DOCUMENT TYPES

     Price Contract remains available even when database
     currently has no PDF records.
  ======================================================= */

  const documentTypes =
    useMemo(() => {
      const types =
        new Set([
          "price_contract",
        ]);

      documents.forEach(
        (item) => {
          if (
            item?.documentType
          ) {
            types.add(
              item.documentType
            );
          }
        }
      );

      return Array.from(
        types
      );
    }, [documents]);

  /* =======================================================
     FILTER HANDLER
  ======================================================= */

  const handleFilterChange = (
    e
  ) => {
    const {
      name,
      value,
    } = e.target;

    setFilters(
      (prev) => ({
        ...prev,
        [name]: value,
      })
    );
  };

  /* =======================================================
     APPLY FILTER

     Backend currently supports:
     documentType
     status
     search
     page
     limit
  ======================================================= */

  const applyFilters = () => {
    setFilters(
      (prev) => ({
        ...prev,
        page: 1,
      })
    );

    setShowMobileFilters(
      false
    );
  };

  /* =======================================================
     CLEAR FILTER
  ======================================================= */

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 30,
      documentType: "",
      status: "",
      search: "",
    });

    setShowMobileFilters(
      false
    );
  };

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh =
    async () => {
      try {
        setRefreshing(
          true
        );

        await fetchDocuments();
      } finally {
        setRefreshing(
          false
        );
      }
    };

  /* =======================================================
     OPEN NEW PDF GENERATOR
  ======================================================= */

  const openNewPdf = () => {
    setSelectedDocument(
      null
    );

    setShowTypeModal(
      true
    );
  };

  /* =======================================================
     OPEN EXISTING DOCUMENT

     This will open the correct document form directly.
  ======================================================= */

  const openEditDocument = (
    document
  ) => {
    if (!document) {
      return;
    }

    setSelectedDocument(
      document
    );

    setShowTypeModal(
      true
    );
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeGenerator =
    () => {
      setShowTypeModal(
        false
      );

      setSelectedDocument(
        null
      );
    };

  /* =======================================================
     GENERATED / REGENERATED

     Called by PriceContractForm after successful generation.

     IMPORTANT:
     Refreshes list so generated PDF immediately appears
     in this page.
  ======================================================= */

  const handleGenerated =
    async () => {
      setShowTypeModal(
        false
      );

      setSelectedDocument(
        null
      );

      await fetchDocuments();
    };

  /* =======================================================
     DELETE DOCUMENT
  ======================================================= */

  const handleDelete =
    async (
      document
    ) => {
      if (
        !document?._id
      ) {
        return;
      }

      const documentName =
        document
          ?.documentNumber ||
        document
          ?.documentTitle ||
        "this document";

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${documentName}?`
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        await deletePdfDocument(
          document._id
        );

        await fetchDocuments();
      } catch (error) {
        console.error(
          "Delete PDF document failed:",
          error
        );

        alert(
          error?.response
            ?.data?.message ||
            "Failed to delete PDF document."
        );
      }
    };

  /* =======================================================
     OPEN PDF
  ======================================================= */

  const openPdf = (
    document
  ) => {
    const fileUrl =
      document
        ?.pdf
        ?.fileUrl;

    if (
      !fileUrl
    ) {
      alert(
        "PDF has not been generated yet."
      );

      return;
    }

    const url =
      getPdfFileUrl(
        fileUrl
      );

    if (!url) {
      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =======================================================
     PREVIOUS PAGE
  ======================================================= */

  const previousPage = () => {
    if (
      Number(
        pagination
          .currentPage
      ) <= 1
    ) {
      return;
    }

    setFilters(
      (prev) => ({
        ...prev,

        page:
          Math.max(
            1,
            Number(
              prev.page ||
                pagination
                  .currentPage ||
                1
            ) - 1
          ),
      })
    );
  };

  /* =======================================================
     NEXT PAGE
  ======================================================= */

  const nextPage = () => {
    if (
      Number(
        pagination
          .currentPage
      ) >=
      Number(
        pagination
          .totalPages
      )
    ) {
      return;
    }

    setFilters(
      (prev) => ({
        ...prev,

        page:
          Number(
            prev.page ||
              pagination
                .currentPage ||
              1
          ) + 1,
      })
    );
  };

  /* =======================================================
     PAGE NUMBER
  ======================================================= */

  const goToPage = (
    page
  ) => {
    const targetPage =
      Number(page);

    if (
      !targetPage ||
      targetPage < 1 ||
      targetPage >
        pagination
          .totalPages
    ) {
      return;
    }

    setFilters(
      (prev) => ({
        ...prev,
        page: targetPage,
      })
    );
  };

  /* =======================================================
     PAGE BUTTONS
  ======================================================= */

  const renderPageButtons =
    () => {
      const total =
        Number(
          pagination
            .totalPages
        ) || 1;

      const current =
        Number(
          pagination
            .currentPage
        ) || 1;

      const buttons = [];

      for (
        let page = 1;
        page <= total;
        page++
      ) {
        if (
          page === 1 ||
          page === total ||
          (
            page >=
              current - 1 &&
            page <=
              current + 1
          )
        ) {
          buttons.push(
            <button
              type="button"
              key={page}
              className={
                page ===
                current
                  ? "active"
                  : ""
              }
              onClick={() =>
                goToPage(
                  page
                )
              }
            >
              {page}
            </button>
          );
        } else if (
          page ===
            current - 2 ||
          page ===
            current + 2
        ) {
          buttons.push(
            <span
              key={`dots-${page}`}
              className="pdfgen-page-dots"
            >
              ...
            </span>
          );
        }
      }

      return buttons;
    };

  /* =======================================================
     DASHBOARD BACK
  ======================================================= */

  const goDashboardModules =
    () => {
      if (
        window
          .__openDashboardModule
      ) {
        window
          .__openDashboardModule(
            "dashboard"
          );

        return;
      }

      window.location.href =
        "/dashboard#dashboard";
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="pdfgen-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="pdfgen-header">
        <div className="pdfgen-header-left">
          <button
            type="button"
            className="pdfgen-back-btn"
            onClick={
              goDashboardModules
            }
            title="Back to Dashboard"
          >
            ‹
          </button>

          <div>
            <h2>
              PDF Generator
            </h2>

            <p>
              Create, manage and
              regenerate business
              PDF documents
            </p>
          </div>
        </div>

        <div className="pdfgen-header-actions">
          <button
            type="button"
            className={`pdfgen-refresh-btn ${
              refreshing
                ? "is-refreshing"
                : ""
            }`}
            onClick={
              handleRefresh
            }
            disabled={
              refreshing
            }
            title="Refresh Documents"
          >
            ↻
          </button>

          <button
            type="button"
            className="pdfgen-create-btn"
            onClick={
              openNewPdf
            }
          >
            <span>
              ＋
            </span>

            Generate PDF
          </button>
        </div>
      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="pdfgen-stats">
        <div className="pdfgen-stat-card">
          <div className="pdfgen-stat-icon">
            PDF
          </div>

          <div>
            <span>
              Total Documents
            </span>

            <strong>
              {pagination
                .totalRecords ||
                0}
            </strong>
          </div>
        </div>

        <div className="pdfgen-stat-card">
          <div className="pdfgen-stat-icon">
            PC
          </div>

          <div>
            <span>
              Available Template
            </span>

            <strong>
              Price Contract
            </strong>
          </div>
        </div>

        <div className="pdfgen-stat-card">
          <div className="pdfgen-stat-icon">
            DOC
          </div>

          <div>
            <span>
              Document Types
            </span>

            <strong>
              {documentTypes
                .length}
            </strong>
          </div>
        </div>
      </div>

      {/* =================================================
          FILTER CARD
      ================================================= */}

      <div className="pdfgen-filter-card">
        <div className="pdfgen-filter-title-row">
          <div>
            <h3>
              Document Filters
            </h3>

            <p>
              Search documents by
              document name,
              customer, document
              number or reference.
            </p>
          </div>

          <button
            type="button"
            className="pdfgen-mobile-filter-toggle"
            onClick={() =>
              setShowMobileFilters(
                (prev) =>
                  !prev
              )
            }
          >
            {showMobileFilters
              ? "Close"
              : "Filters"}
          </button>
        </div>

        <div
          className={`pdfgen-filter-grid ${
            showMobileFilters
              ? "mobile-open"
              : ""
          }`}
        >
          {/* DOCUMENT TYPE */}

          <div className="pdfgen-filter-field">
            <label>
              Document Name
            </label>

            <select
              name="documentType"
              value={
                filters
                  .documentType
              }
              onChange={
                handleFilterChange
              }
            >
              <option value="">
                All Documents
              </option>

              {documentTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {formatLabel(
                      type
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          {/* SEARCH */}

          <div className="pdfgen-filter-field pdfgen-filter-search">
            <label>
              Search
            </label>

            <input
              type="text"
              name="search"
              value={
                filters.search
              }
              onChange={
                handleFilterChange
              }
              onKeyDown={(
                e
              ) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  applyFilters();
                }
              }}
              placeholder="Customer / document no. / reference"
            />
          </div>

          {/* STATUS */}

          <div className="pdfgen-filter-field">
            <label>
              Status
            </label>

            <select
              name="status"
              value={
                filters.status
              }
              onChange={
                handleFilterChange
              }
            >
              <option value="">
                All Status
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="generated">
                Generated
              </option>

              <option value="revised">
                Revised
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>

          {/* LIMIT */}

          <div className="pdfgen-filter-field">
            <label>
              Records
            </label>

            <select
              name="limit"
              value={
                filters.limit
              }
              onChange={(e) =>
                setFilters(
                  (prev) => ({
                    ...prev,

                    page: 1,

                    limit:
                      Number(
                        e.target
                          .value
                      ),
                  })
                )
              }
            >
              <option value={10}>
                10
              </option>

              <option value={20}>
                20
              </option>

              <option value={30}>
                30
              </option>

              <option value={50}>
                50
              </option>

              <option value={100}>
                100
              </option>
            </select>
          </div>

          {/* FILTER BUTTONS */}

          <div className="pdfgen-filter-actions">
            <button
              type="button"
              className="pdfgen-apply-btn"
              onClick={
                applyFilters
              }
            >
              Apply
            </button>

            <button
              type="button"
              className="pdfgen-clear-btn"
              onClick={
                clearFilters
              }
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* =================================================
          DESKTOP TABLE
      ================================================= */}

      <div className="pdfgen-table-card">
        <div className="pdfgen-table-head">
          <div>
            <h3>
              Generated Documents
            </h3>

            <p>
              {pagination
                .totalRecords ||
                0}{" "}
              document record(s)
            </p>
          </div>
        </div>

        <div className="pdfgen-table-wrapper">
          <table className="pdfgen-table">
            <thead>
              <tr>
                <th>
                  #
                </th>

                <th>
                  Document
                </th>

                <th>
                  Document No.
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Reference
                </th>

                <th>
                  Created By
                </th>

                <th>
                  Revision
                </th>

                <th>
                  Created
                </th>

                <th>
                  Generated
                </th>

                <th>
                  Status
                </th>

                <th>
                  PDF
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}

              {loading && (
                <tr>
                  <td
                    colSpan="12"
                    className="pdfgen-empty"
                  >
                    Loading PDF
                    documents...
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!loading &&
                documents.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="12"
                      className="pdfgen-empty"
                    >
                      <div className="pdfgen-empty-state">
                        <div>
                          PDF
                        </div>

                        <strong>
                          No PDF documents
                          found
                        </strong>

                        <span>
                          Generate your
                          first business
                          document.
                        </span>

                        <button
                          type="button"
                          onClick={
                            openNewPdf
                          }
                        >
                          + Generate PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

              {/* DOCUMENT ROWS */}

              {!loading &&
                documents.map(
                  (
                    document,
                    index
                  ) => {
                    const rowNumber =
                      (
                        Number(
                          pagination
                            .currentPage
                        ) -
                        1
                      ) *
                        Number(
                          pagination
                            .limit
                        ) +
                      index +
                      1;

                    const hasPdf =
                      Boolean(
                        document
                          ?.pdf
                          ?.fileUrl
                      );

                    return (
                      <tr
                        key={
                          document._id
                        }
                      >
                        {/* INDEX */}

                        <td className="pdfgen-index">
                          {
                            rowNumber
                          }
                        </td>

                        {/* DOCUMENT */}

                        <td>
                          <div className="pdfgen-doc-cell">
                            <div className="pdfgen-doc-icon">
                              PDF
                            </div>

                            <div>
                              <strong>
                                {document
                                  ?.documentTitle ||
                                  formatLabel(
                                    document
                                      ?.documentType
                                  )}
                              </strong>

                              <span>
                                {formatLabel(
                                  document
                                    ?.documentType
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* DOCUMENT NUMBER */}

                        <td>
                          <strong className="pdfgen-number">
                            {document
                              ?.documentNumber ||
                              "-"}
                          </strong>
                        </td>

                        {/* CUSTOMER */}

                        <td>
                          {document
                            ?.customerName ||
                            document
                              ?.formData
                              ?.customerName ||
                            "-"}
                        </td>

                        {/* REFERENCE */}

                        <td>
                          {document
                            ?.referenceNumber ||
                            "-"}
                        </td>

                        {/* CREATED BY */}

                        <td>
                          {document
                            ?.createdByName ||
                            "-"}
                        </td>

                        {/* REVISION */}

                        <td>
                          <span className="pdfgen-revision">
                            Rev.{" "}
                            {Number(
                              document
                                ?.revisionCount ||
                                0
                            )}
                          </span>
                        </td>

                        {/* CREATED DATE */}

                        <td>
                          {formatDate(
                            document
                              ?.createdAt
                          )}
                        </td>

                        {/* GENERATED DATE */}

                        <td>
                          {formatDateTime(
                            document
                              ?.pdf
                              ?.generatedAt
                          )}
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`pdfgen-status status-${
                              document
                                ?.status ||
                              "draft"
                            }`}
                          >
                            {formatLabel(
                              document
                                ?.status ||
                                "draft"
                            )}
                          </span>
                        </td>

                        {/* PDF */}

                        <td>
                          {hasPdf ? (
                            <button
                              type="button"
                              className="pdfgen-view-btn"
                              onClick={() =>
                                openPdf(
                                  document
                                )
                              }
                            >
                              View PDF
                            </button>
                          ) : (
                            <span className="pdfgen-no-pdf">
                              Not Generated
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="pdfgen-row-actions">
                            <button
                              type="button"
                              className="pdfgen-edit-btn"
                              onClick={() =>
                                openEditDocument(
                                  document
                                )
                              }
                            >
                              {hasPdf
                                ? "Edit / Regenerate"
                                : "Edit / Generate"}
                            </button>

                            <button
                              type="button"
                              className="pdfgen-delete-btn"
                              onClick={() =>
                                handleDelete(
                                  document
                                )
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================
          MOBILE LIST
      ================================================= */}

      <div className="pdfgen-mobile-list">
        {loading && (
          <div className="pdfgen-mobile-card">
            Loading PDF
            documents...
          </div>
        )}

        {!loading &&
          documents.length ===
            0 && (
            <div className="pdfgen-mobile-card">
              <div className="pdfgen-empty-state">
                <div>
                  PDF
                </div>

                <strong>
                  No documents found
                </strong>

                <span>
                  Generate your first
                  business PDF.
                </span>

                <button
                  type="button"
                  onClick={
                    openNewPdf
                  }
                >
                  + Generate PDF
                </button>
              </div>
            </div>
          )}

        {!loading &&
          documents.map(
            (document) => {
              const hasPdf =
                Boolean(
                  document
                    ?.pdf
                    ?.fileUrl
                );

              return (
                <div
                  className="pdfgen-mobile-card"
                  key={
                    document._id
                  }
                >
                  {/* TOP */}

                  <div className="pdfgen-mobile-card-top">
                    <div className="pdfgen-doc-icon">
                      PDF
                    </div>

                    <div className="pdfgen-mobile-card-title">
                      <strong>
                        {document
                          ?.documentTitle ||
                          formatLabel(
                            document
                              ?.documentType
                          )}
                      </strong>

                      <span>
                        {document
                          ?.documentNumber ||
                          "No document number"}
                      </span>
                    </div>

                    <span
                      className={`pdfgen-status status-${
                        document
                          ?.status ||
                        "draft"
                      }`}
                    >
                      {formatLabel(
                        document
                          ?.status ||
                          "draft"
                      )}
                    </span>
                  </div>

                  {/* DETAILS */}

                  <div className="pdfgen-mobile-details">
                    <div>
                      <span>
                        Customer
                      </span>

                      <strong>
                        {document
                          ?.customerName ||
                          document
                            ?.formData
                            ?.customerName ||
                          "-"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Document
                      </span>

                      <strong>
                        {formatLabel(
                          document
                            ?.documentType
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Reference
                      </span>

                      <strong>
                        {document
                          ?.referenceNumber ||
                          "-"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Revision
                      </span>

                      <strong>
                        Rev.{" "}
                        {Number(
                          document
                            ?.revisionCount ||
                            0
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Created
                      </span>

                      <strong>
                        {formatDate(
                          document
                            ?.createdAt
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Created By
                      </span>

                      <strong>
                        {document
                          ?.createdByName ||
                          "-"}
                      </strong>
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="pdfgen-mobile-actions">
                    {hasPdf && (
                      <button
                        type="button"
                        className="pdfgen-mobile-view"
                        onClick={() =>
                          openPdf(
                            document
                          )
                        }
                      >
                        View PDF
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openEditDocument(
                          document
                        )
                      }
                    >
                      {hasPdf
                        ? "Edit / Regenerate"
                        : "Edit / Generate"}
                    </button>

                    <button
                      type="button"
                      className="pdfgen-mobile-delete"
                      onClick={() =>
                        handleDelete(
                          document
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            }
          )}
      </div>

      {/* =================================================
          PAGINATION
      ================================================= */}

      <div className="pdfgen-pagination">
        <div>
          Showing page{" "}
          <strong>
            {pagination
              .currentPage ||
              1}
          </strong>{" "}
          of{" "}
          <strong>
            {pagination
              .totalPages ||
              1}
          </strong>

          {" · "}

          <strong>
            {pagination
              .totalRecords ||
              0}
          </strong>{" "}
          record(s)
        </div>

        <div className="pdfgen-pagination-buttons">
          <button
            type="button"
            onClick={
              previousPage
            }
            disabled={
              pagination
                .currentPage <=
              1
            }
          >
            ‹ Previous
          </button>

          <div className="pdfgen-page-numbers">
            {renderPageButtons()}
          </div>

          <button
            type="button"
            onClick={
              nextPage
            }
            disabled={
              pagination
                .currentPage >=
              pagination
                .totalPages
            }
          >
            Next ›
          </button>
        </div>
      </div>

      {/* =================================================
          PDF GENERATOR MODAL

          NEW:
          document = null
          -> show PDF type cards

          EDIT:
          document = existing Mongo record
          -> PdfTypeModal opens correct form directly
      ================================================= */}

      {showTypeModal && (
        <PdfTypeModal
          document={
            selectedDocument
          }
          onClose={
            closeGenerator
          }
          onGenerated={
            handleGenerated
          }
        />
      )}
    </div>
  );
};

export default PdfGeneration;