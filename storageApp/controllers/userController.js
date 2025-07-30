import { User } from '../models/userModel.js';
import { Directory } from '../models/directoryModel.js';
import { Session } from '../models/sessionModel.js';
import mongoose from 'mongoose';
import { OTP } from '../models/otpModel.js';
import redisClient from '../config/redis.js';
import { validateLoginSchema, validateRegisterSchema } from '../validators/authSchema.js';
import { sanitizeUserInput } from '../validators/sanitizeUserInput.js';
 
export const register = async (req, res, next) => {
  const cleanInput = sanitizeUserInput(req.body);
  console.log('clean input:', cleanInput);

  const validateData = validateRegisterSchema(cleanInput);
  console.log('Register Validate Data:', validateData);
  if (validateData.fieldErrors) {
    return res.status(403).json({ error: 'Invalid input. Please enter valid details.' });
  }
  const { name, email, password, otp } = validateData;
  console.log(otp);
  try {
    const user = await User.findOne({ email }).select('email isDeleted -_id');

    if (user?.isDeleted) {
      return res
        .status(403)
        .json({ error: 'Your account has been deleted. Contact app admin to recover' });
    }
    const otpRecord = await OTP.findOne({ email, otp });
    console.log('otp:', otp);
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await otpRecord.deleteOne();
    // Start a session
    const session = await mongoose.startSession();

    // const hassedPassword = await bcrypt.hash(password, 12);
    const rootDirId = new mongoose.Types.ObjectId(); //new ObjectId=>in mongoDB
    const userId = new mongoose.Types.ObjectId();
    // const foundUser = await User.findOne({ email }).lean();
    // if (foundUser) {
    //   return res.status(409).json({
    //     error: 'User already exists',
    //     message:
    //       'A user with this email address already exists. Please try logging in or use a different email.',
    //   });
    // }
    /* dirId automatically created by mongodb */

    session.startTransaction();
    await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      { session }
    );
    /* userId automatically created by mongodb: */
    await User.insertOne(
      {
        _id: userId,
        name,
        email,
        password,
        rootDirId,
      },
      { session }
    );
    // If no errors, commit the transaction
    await session.commitTransaction();

    return res.status(201).json({ message: 'User Registered' });
  } catch (err) {
    console.log(err);
    // If any error occurs, rollback the transaction
    // await session.abortTransaction();
    // if (err.code === 121) {
    //   return res.status(404).json({ error: 'invalid fields please enter valid details' });
    // } else if (err.code === 11000) {
    //   if (err.keyValue.email) {
    //     return res.status(409).json({
    //       error: 'User already exists',
    //       message:
    //         'A user with this email address already exists. Please try logging in or use a different email.',
    //     });
    //   }
    // }
    next(err);
  }
};

export const login = async (req, res) => {
  const cleanInput = sanitizeUserInput(req.body);
  console.log('Clean Login Input:', cleanInput);

  const validateData = validateLoginSchema(cleanInput);
  console.log('Email validate Data:', validateData);

  if (validateData.fieldErrors) {
    return res.status(400).json({ error: 'invalid credentials' });
  }

  let { email, password } = validateData;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ error: 'invalid credentials' });
  }

  if (user.isDeleted) {
    return res
      .status(403)
      .json({ error: 'Your account has been deleted. Contact app admin to recover' });
  }

  // const isPasswordValid = await bcrypt.compare(password, user.password);

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(404).json({ error: 'invalid credentials' });
  }

  // const allSession = await Session.find({ userId: user._id });
  // console.log('All Sesson Length:', allSession.length);

  // if (allSession.length >= 2) {
  //   await allSession[0].deleteOne();
  // }

  const allSession = await redisClient.ft.search('userIdIdx', `@userId:{${user.id}}`, {
    RETURN: [],
  });

  console.log(allSession);

  if (allSession.total >= 2) {
    await redisClient.del(allSession.documents[0].id);
  }

  const sessionId = crypto.randomUUID();
  const redisKey = `session:${sessionId}`;
  await redisClient.json.set(redisKey, '$', {
    userId: user._id,
    rootDirId: user.rootDirId,
  });

  await redisClient.expire(redisKey, 60 * 60 * 24 * 7);

  // const cookiesPayload = JSON.stringify({
  //   id: user._id.toString(),
  //   expiry: Math.round(Date.now() / 1000 + 60 * 60 * 24 * 7),
  // });

  res.cookie('sid', sessionId, {
    httpOnly: true,
    signed: true,
    sameSite: 'Lax',
    maxAge: 60 * 1000 * 60 * 24 * 7,
  });

  return res.json({ message: 'Logged In' });
};

export const logout = async (req, res) => {
  const { sid } = req.signedCookies;
  const session = await redisClient.del(`session:${sid}`); // delete the user session if he has been logout
  console.log(session);
  // res.set({
  //   "Set-Cookie":""
  // })
  // res.cookie('uid', '', {
  //   maxAge: 0,
  // });
  res.clearCookie('sid');

  res.status(204).json({
    message: 'Logged Out!',
  });
};

export const logoutAll = async (req, res, next) => {
  const sid = req.signedCookies.sid;
  try {
    const session = await Session.findById(sid);

    const result = await Session.deleteMany({ userId: session.userId });
    console.log(result);
    res.clearCookie('sid'); // all cookies don't clear
    return res.status(200).json({ message: 'user logout from all devices' });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res) => {
  const { _id } = req.user;
  const { name, email, pictureUrl, role, rootDirId, storageLimit } =
    await User.findById(_id).lean();

  const rootDir = await Directory.findById(rootDirId).lean();
  res.status(200).json({
    name,
    email,
    pictureUrl,
    role,
    storageUsed: rootDir.size,
    storageLimit,
  });
};

export const getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await User.find({ isDeleted: false }).lean();

    const allSessions = await Session.find().lean();
    const allSessionsUserId = allSessions.map(({ userId }) => userId.toString());
    /* because duplicate Id can exist */
    const allSessionsUserIdSet = new Set(allSessionsUserId);

    const transformedUsers = allUsers.map(({ _id, name, email }) => ({
      id: _id,
      name,
      email,
      isLoggedIn: allSessionsUserIdSet.has(_id.toString()),
    }));
    res.status(200).json(transformedUsers);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const logoutById = async (req, res, next) => {
  const { userId } = req.params;
  try {
    await Session.deleteMany({ userId });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const deleteById = async (req, res, next) => {
  const { userId } = req.params;
  console.log({ deleteId: userId });

  try {
    await Session.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { isDeleted: true });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
