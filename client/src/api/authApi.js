import { axiosWithoutCreds } from './axiosInstances';

export const sendOtp = async (email) => {
  const { data } = await axiosWithoutCreds.post('/auth/send-otp', { email });
  return data;
};

export const verifyOtp = async (email, otp) => {
  const { data } = await axiosWithoutCreds.post('/auth/verify-otp', {
    email,
    otp,
  });
  return data;
};
