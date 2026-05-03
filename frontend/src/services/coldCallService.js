import axios from "axios";

const API_URL = "http://localhost:3000/api/cold-call";
const USER_API_URL = "http://localhost:3000/api/user";

const getToken = () => localStorage.getItem("token");

export const getAllColdCalls = async (params = {}) => {
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    params,
  });

  return response.data;
};

export const getSalesPersons = async () => {
  const response = await axios.get(`${USER_API_URL}/sales-persons`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data.data;
};
export const createColdCall = async (data) => {
  const response = await axios.post(API_URL + "/create", data, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return response.data;
};