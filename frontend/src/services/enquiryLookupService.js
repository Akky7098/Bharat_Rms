import axios from "axios";


const API_BASE_URL =
  "https://bharatspecialsteels.bharatspecialsteels.com/api";

const getToken = () => localStorage.getItem("token");

export const lookupEnquiryForSalesOrder = async (enquiryNumber) => {
  const response = await axios.get(
    `${API_BASE_URL}/enquiry-lookup/sales-order/${encodeURIComponent(
      enquiryNumber
    )}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return response.data;
};