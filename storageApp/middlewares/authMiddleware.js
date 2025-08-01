import redisClient from '../config/redis.js';

export default async function checkAuth(req, res, next) {
  const { sid } = req.signedCookies;

  if (!sid) {
    // not sid , if have then valiadate it
    //before doing DB call first we check uid exist or not
    res.clearCookie('sid'); //uid exists but changed
    return res.status(401).json({ error: 'Not Logged in!' });
  }

  // const { id, expiry: expiryTimeInSecond } = JSON.parse(Buffer.from(sid, 'base64url').toString());

  // const currentTimeInSecond = Math.round(Date.now() / 1000);

  // if (currentTimeInSecond > expiryTimeInSecond) {
  //   res.clearCookie('sid');
  //   return res.status(401).json({ error: 'Not Logged in!' });
  // }
  const session = await redisClient.json.get(`session:${sid}`);

  if (!session) {
    res.clearCookie('sid');
    return res.status(401).json({ error: 'Not Logged in!' });
  }

  req.user = { _id: session.userId, rootDirId: session.rootDirId };
  next();
}

export async function checkRoleBasedAccess(req, res, next) {
   if (req.user.role !== 'User') return next();
   return res.status(403).json({ error: `You can't access users` });
}

export async function checkIsAdminUser(req, res, next) {
  console.log({ role: req.user.role });
  if (req.user.role === 'Admin') return next();
  return res.status(403).json({ error: `You can't delete users` });
}
