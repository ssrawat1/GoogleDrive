import { sendOtpService } from '../services/sendOtpService.js';
import { OTP } from '../models/otpModel.js';
import { User } from '../models/userModel.js';
import mongoose from 'mongoose';
import { verifyIdToken } from '../services/googleAuthService.js';
import { Directory } from '../models/directoryModel.js';
import redisClient from '../config/redis.js';
import { validateLoginWithGoogleSchema, validateOtpSchema } from '../validators/authSchema.js';

export const sendOtp = async (req, res, next) => {
  const { email } = req.body;
  try {
    const resData = await sendOtpService(email);
    console.log({ resData });
    res.status(201).json(resData);
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  const validateData = validateOtpSchema(req.body);
  console.log('validated OTP Data:', validateData);
  if (validateData.fieldErrors) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const { email, otp } = validateData;

  try {
    const isValidOtp = await OTP.findOne({ email, otp }).lean();
    if (!isValidOtp) {
      return res
        .status(400)
        .json({ error: "OTP is invalid, has expired, or doesn't match the provided email." });
    }
    return res.status(200).json({ message: 'OTP verified successfully!' });
  } catch (error) {
    next(error);
  }
};

export const loginWithGoogle = async (req, res, next) => {
  const { idToken } = req.body;
  // Start a session
  const clientSession = await mongoose.startSession();
  try {
    const userData = await verifyIdToken(idToken);
    const validatedLoginUserData = validateLoginWithGoogleSchema(userData);
    
    if (validatedLoginUserData.fieldErrors) {
      return res.status(400).json({
        error: 'Invalid Google login data',
      });
    }
    console.log(validatedLoginUserData);
    const { name, email, picture, iss, sub } = validatedLoginUserData;

    const user = await User.findOne({ email }).select('-__v');
    if (user) {
      /* create Session */
      if (user.isDeleted) {
        return res
          .status(403)
          .json({ error: 'Your account has been deleted. Contact app owner to recover' });
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

      /* updating pictureUrl if user is loged in with google */
      if (!user.pictureUrl.includes('googleusercontent.com')) {
        user.pictureUrl = picture;
        await user.save();
      }

      // const session = await Session.create({
      //   userId: user._id,
      // });

      const sessionId = crypto.randomUUID();
      const redisKey = `session:${sessionId}`;
      await redisClient.json.set(redisKey, '$', {
        userId: user._id,
        rootDirId: user.rootDirId,
      });

      await redisClient.expire(redisKey, 60 * 60 * 24 * 7);

      res.cookie('sid', sessionId, {
        httpOnly: true,
        signed: true,
        sameSite:"Lax",
        maxAge: 60 * 1000 * 60 * 24 * 7,
      });
      return res.json({ message: 'logged in', user });
    }

    const rootDirId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    clientSession.startTransaction();
    await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      { clientSession }
    );

    /* creating user */
    await User.insertOne(
      {
        _id: userId,
        name,
        email,
        pictureUrl: picture,
        provider: iss.split('.')[1],
        providerId: sub,
        rootDirId,
      },
      { clientSession }
    );

    /* create Session */
    // const session = await Session.create({ userId });
    const sessionId = crypto.randomUUID();
    const redisKey = `session:${sessionId}`;
    await redisClient.json.set(redisKey, '$', {
      userId: userId,
      rootDirId: rootDirId,
    });

    await redisClient.expire(redisKey, 60 * 60 * 24 * 7);

    res.cookie('sid', sessionId, {
      httpOnly: true,
      signed: true,
      sameSite:"Lax",
      maxAge: 60 * 1000 * 60 * 24 * 7,
    });

    // If no errors, commit the transaction
    await clientSession.commitTransaction();
    return res.status(201).json({ message: 'Account created and logged in' });
  } catch (error) {
    await clientSession.abortTransaction();
    console.error('Error in loginWithGoogle:', error);
    next(error);
  }
};
