import axios from "axios";


const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://bharatspecialsteels.bharatspecialsteels.com/api";

const getToken = () =>
  localStorage.getItem("token");

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

/* =========================================================
   CREATE MTC CERTIFICATE
========================================================= */

export const createMtcCertificate = async (
  payload
) => {
  const response = await axios.post(
    `${API_BASE_URL}/mtc`,
    payload,
    authHeaders()
  );

  return response.data;
};

/* =========================================================
   GET MTC CERTIFICATES
========================================================= */

export const getMtcCertificates = async (
  filters = {}
) => {
  const params = new URLSearchParams();

  if (filters.companyName) {
    params.append(
      "companyName",
      filters.companyName
    );
  }

  if (filters.grade) {
    params.append("grade", filters.grade);
  }

  if (filters.mtcProvider) {
    params.append(
      "mtcProvider",
      filters.mtcProvider
    );
  }

  if (filters.fromDate) {
    params.append(
      "fromDate",
      filters.fromDate
    );
  }

  if (filters.toDate) {
    params.append(
      "toDate",
      filters.toDate
    );
  }

  if (filters.limit) {
    params.append("limit", filters.limit);
  }

  const response = await axios.get(
    `${API_BASE_URL}/mtc?${params.toString()}`,
    authHeaders()
  );

  return response.data;
};

/* =========================================================
   DOWNLOAD MTC PDF
========================================================= */

export const downloadMtcPdf = async (
  id,
  mtcProvider = ""
) => {
  const params = new URLSearchParams();

  if (mtcProvider) {
    params.append(
      "mtcProvider",
      mtcProvider
    );
  }

  const response = await axios.get(
    `${API_BASE_URL}/mtc/${id}/pdf?${params.toString()}`,
    {
      ...authHeaders(),
      responseType: "blob",
    }
  );

  return response.data;
};

/* =========================================================
   GET CHEMICAL SPECIFICATIONS
========================================================= */

export const getMtcChemicalSpecs = async (
  mtcProvider = "gloria"
) => {
  const response = await axios.get(
    `${API_BASE_URL}/mtc/chemical-specs`,
    {
      ...authHeaders(),
      params: {
        mtcProvider,
      },
    }
  );

  return response.data;
};

/* =========================================================
   GET AVAILABLE MTC PROVIDERS
========================================================= */

export const getMtcProviders =
  async () => {
    const response = await axios.get(
      `${API_BASE_URL}/mtc/providers`,
      authHeaders()
    );

    return response.data;
  };

/* =========================================================
   REGENERATE MTC PDF
========================================================= */

export const regenerateMtcPdf =
  async (
    id,
    mtcProvider = ""
  ) => {
    const response = await axios.post(
      `${API_BASE_URL}/mtc/${id}/regenerate-pdf`,
      {
        mtcProvider,
      },
      authHeaders()
    );

    return response.data;
  };