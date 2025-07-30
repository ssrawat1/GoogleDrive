import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const clientId = process.env.GOOGLE_CLIENT_ID;

export const verifyIdToken = async (idToken) => {
  const loginTicket = await client.verifyIdToken({
    idToken,
    aud: clientId,
  });
  const userData = loginTicket.getPayload();
  return userData;
};
