import { axiosWithCreds } from './axiosInstances';

export const loginWithGithub = async (code) => {
  const { data } = await axiosWithCreds.post('/auth/github', { code });
  return data;
};
