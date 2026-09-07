import axios from "axios";

/* =========================================================
   API
========================================================= */

 const API_URL = "http://localhost:5002/api";
// const API_URL =
//   process.env.REACT_APP_API_URL ||
//   "https://bharatspecialsteels.bharatspecialsteels.com/api";

const MTC_API_URL =
  `${API_URL}/mtc`;

/* =========================================================
   AUTH
========================================================= */

const getToken = () =>
  localStorage.getItem("token");

const authHeaders = () => ({
  Authorization:
    `Bearer ${getToken()}`,
});

/* =========================================================
   ERROR NORMALIZER
========================================================= */

const getApiError = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   GET PROVIDERS
========================================================= */

export const getMtcProviders =
  async () => {
    try {
      const response =
        await axios.get(
          `${MTC_API_URL}/providers`,
          {
            headers:
              authHeaders(),
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to load MTC providers"
        )
      );
    }
  };

/* =========================================================
   GET PROVIDER CONFIG / CHEMICAL SPECS
========================================================= */

export const getMtcChemicalSpecs =
  async (
    mtcProvider
  ) => {
    try {
      const response =
        await axios.get(
          `${MTC_API_URL}/chemical-specs`,
          {
            headers:
              authHeaders(),

            params: {
              mtcProvider,
            },
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to load MTC configuration"
        )
      );
    }
  };

/* =========================================================
   GET ALL MTC CERTIFICATES
========================================================= */

export const getMtcCertificates =
  async (
    params = {}
  ) => {
    try {
      const response =
        await axios.get(
          MTC_API_URL,
          {
            headers:
              authHeaders(),

            params,
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to load MTC certificates"
        )
      );
    }
  };

/* =========================================================
   GET SINGLE MTC
========================================================= */

export const getMtcCertificateById =
  async (
    id,
    mtcProvider = ""
  ) => {
    try {
      const response =
        await axios.get(
          `${MTC_API_URL}/${id}`,
          {
            headers:
              authHeaders(),

            params:
              mtcProvider
                ? {
                    mtcProvider,
                  }
                : {},
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to load MTC certificate"
        )
      );
    }
  };

/* =========================================================
   CREATE MTC
========================================================= */

export const createMtcCertificate =
  async (
    payload
  ) => {
    try {
      const response =
        await axios.post(
          MTC_API_URL,
          payload,
          {
            headers: {
              ...authHeaders(),

              "Content-Type":
                "application/json",
            },
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to create MTC certificate"
        )
      );
    }
  };

/* =========================================================
   UPDATE MTC
========================================================= */

export const updateMtcCertificate =
  async (
    id,
    payload,
    mtcProvider = ""
  ) => {
    try {
      const response =
        await axios.patch(
          `${MTC_API_URL}/${id}`,
          payload,
          {
            headers: {
              ...authHeaders(),

              "Content-Type":
                "application/json",
            },

            params:
              mtcProvider
                ? {
                    mtcProvider,
                  }
                : {},
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to update MTC certificate"
        )
      );
    }
  };

/* =========================================================
   REGENERATE PDF
========================================================= */

export const regenerateMtcPdf =
  async (
    id,
    mtcProvider = ""
  ) => {
    try {
      const response =
        await axios.post(
          `${MTC_API_URL}/${id}/regenerate`,

          mtcProvider
            ? {
                mtcProvider,
              }
            : {},

          {
            headers:
              authHeaders(),

            params:
              mtcProvider
                ? {
                    mtcProvider,
                  }
                : {},
          }
        );

      return response.data;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to regenerate MTC PDF"
        )
      );
    }
  };

/* =========================================================
   DOWNLOAD PDF AS BLOB
========================================================= */

export const downloadMtcPdf =
  async (
    id,
    mtcProvider = ""
  ) => {
    try {
      const response =
        await axios.get(
          `${MTC_API_URL}/${id}/download`,
          {
            headers:
              authHeaders(),

            params:
              mtcProvider
                ? {
                    mtcProvider,
                  }
                : {},

            responseType:
              "blob",
          }
        );

      return response;
    } catch (error) {
      throw new Error(
        getApiError(
          error,
          "Unable to download MTC PDF"
        )
      );
    }
  };

/* =========================================================
   DOWNLOAD HELPER
========================================================= */

export const saveMtcPdfToDevice =
  async (
    id,
    mtcProvider = "",
    preferredFileName =
      ""
  ) => {
    const response =
      await downloadMtcPdf(
        id,
        mtcProvider
      );

    const blob =
      new Blob(
        [response.data],
        {
          type:
            response.headers[
              "content-type"
            ] ||
            "application/pdf",
        }
      );

    const objectUrl =
      window.URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      objectUrl;

    const contentDisposition =
      response.headers[
        "content-disposition"
      ];

    let fileName =
      preferredFileName ||
      "material-test-certificate.pdf";

    if (
      contentDisposition
    ) {
      const fileNameMatch =
        contentDisposition.match(
          /filename="?([^"]+)"?/i
        );

      if (
        fileNameMatch?.[1]
      ) {
        fileName =
          fileNameMatch[1];
      }
    }

    link.download =
      fileName;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    window.URL.revokeObjectURL(
      objectUrl
    );
  };