import axios from "axios";
import { BACKEND_URL } from "../config";

export const axiosWithCreds = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

export const axiosWithoutCreds = axios.create({
  baseURL: BACKEND_URL,
});
