import axios from "axios";

/* =========================================================
   API CONFIG
========================================================= */

const API_URL =
  process.env
    .REACT_APP_API_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com/api/dispatch";

const BACKEND_URL =
  process.env
    .REACT_APP_BACKEND_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com";

/* =========================================================
   AUTH
========================================================= */

const getToken =
  () =>
    localStorage.getItem(
      "token"
    );

const authHeaders =
  () => ({
    Authorization:
      `Bearer ${getToken()}`,
  });

/* =========================================================
   FILE URL
========================================================= */

export const getFullFileUrl =
  (
    fileUrl
  ) => {
    if (!fileUrl) {
      return "#";
    }

    if (
      fileUrl.startsWith(
        "http"
      )
    ) {
      return fileUrl;
    }

    return (
      `${BACKEND_URL}${fileUrl}`
    );
  };

/* =========================================================
   SEARCH SALES ORDERS
========================================================= */

export const searchDispatchSalesOrders =
  async (
    params = {}
  ) => {
    const response =
      await axios.get(
        `${API_URL}/sales-orders/search`,
        {
          headers:
            authHeaders(),

          params,
        }
      );

    return response.data;
  };

/* =========================================================
   CREATE DISPATCH

   SUPPORTS:

   billPdf
   - one file

   lrCopyPdf
   - one optional file

   tcCertificatePdfs
   - array
   - 0 to 10 files

   IMPORTANT:

   Every TC is appended using the SAME backend field:

   tcCertificatePdf

   This produces:

   req.files.tcCertificatePdf = [
     file1,
     file2,
     file3,
     ...
   ]

   DO NOT manually set multipart Content-Type.
   Axios/browser will add the multipart boundary.
========================================================= */

export const createDispatch =
  async (
    data,
    billPdf,
    lrCopyPdf,
    tcCertificatePdfs = [],
    onUploadProgress
  ) => {
    const formData =
      new FormData();

    /* =====================================================
       REQUEST DATA
    ===================================================== */

    formData.append(
      "data",
      JSON.stringify(
        data || {}
      )
    );

    /* =====================================================
       BILL PDF
    ===================================================== */

    if (billPdf) {
      formData.append(
        "billPdf",
        billPdf
      );
    }

    /* =====================================================
       LR COPY
    ===================================================== */

    if (lrCopyPdf) {
      formData.append(
        "lrCopyPdf",
        lrCopyPdf
      );
    }

    /* =====================================================
       MULTIPLE TC / MTC FILES
    ===================================================== */

    const tcFiles =
      Array.isArray(
        tcCertificatePdfs
      )
        ? tcCertificatePdfs
        : tcCertificatePdfs
        ? [
            tcCertificatePdfs,
          ]
        : [];

    tcFiles.forEach(
      (file) => {
        if (!file) {
          return;
        }

        formData.append(
          "tcCertificatePdf",
          file
        );
      }
    );

    /* =====================================================
       CREATE REQUEST
    ===================================================== */

    const response =
      await axios.post(
        `${API_URL}/create`,

        formData,

        {
          headers: {
            ...authHeaders(),
          },

          /*
           * Browser/XHR upload progress.
           *
           * Example:
           * 12%
           * 46%
           * 78%
           * 100%
           */
          onUploadProgress:
            typeof onUploadProgress ===
            "function"
              ? onUploadProgress
              : undefined,
        }
      );

    return response.data;
  };

/* =========================================================
   GET DISPATCHES
========================================================= */

export const getDispatches =
  async (
    params = {}
  ) => {
    const response =
      await axios.get(
        API_URL,
        {
          headers:
            authHeaders(),

          params,
        }
      );

    return response.data;
  };

/* =========================================================
   GET DISPATCH BY ID
========================================================= */

export const getDispatchById =
  async (
    dispatchId
  ) => {
    const response =
      await axios.get(
        `${API_URL}/${dispatchId}`,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   UPDATE DISPATCH STATUS
========================================================= */

export const updateDispatchStatus =
  async (
    dispatchId,
    data
  ) => {
    const response =
      await axios.patch(
        `${API_URL}/${dispatchId}/status`,

        data,

        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   DELETE DISPATCH
========================================================= */

export const deleteDispatch =
  async (
    dispatchId
  ) => {
    const response =
      await axios.delete(
        `${API_URL}/${dispatchId}`,
        {
          headers:
            authHeaders(),
        }
      );

    return response.data;
  };

/* =========================================================
   UPDATE PAYMENT

   Optional:
   paymentBillPdf

   DO NOT manually set multipart Content-Type here either.
========================================================= */

export const updateDispatchPayment =
  async (
    dispatchId,
    data,
    paymentBillPdf
  ) => {
    const formData =
      new FormData();

    formData.append(
      "data",
      JSON.stringify(
        data || {}
      )
    );

    if (
      paymentBillPdf
    ) {
      formData.append(
        "paymentBillPdf",
        paymentBillPdf
      );
    }

    const response =
      await axios.patch(
        `${API_URL}/${dispatchId}/payment`,

        formData,

        {
          headers: {
            ...authHeaders(),
          },
        }
      );

    return response.data;
  };