import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { readFile } from 'node:fs/promises';

const privateKey = await readFile('./cloudfront.pem', 'utf-8');
const keyPairId = 'KUOIOTHB4PV8E';
const dateLessThan = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // valid for 1 hr only

const distributionName = `https://d3w6pars2gmcd.cloudfront.net`;

export const createCloudFrontGetSignedUrl = ({ key, action, filename }) => {
  const disposition = `${action === 'download' ? 'attachment' : 'inline'};filename="${filename}"`;
  const url = `${distributionName}/${key}?response-content-disposition=${encodeURIComponent(disposition)}`;
  const signedUrl = getSignedUrl({
    url,
    keyPairId,
    dateLessThan,
    privateKey,
  });
  console.log({ signedUrl });
  return signedUrl;
};
