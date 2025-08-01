import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import directoryRoutes from './routes/directoryRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoute.js';
import checkAuth from './middlewares/authMiddleware.js';
import { connectDB } from './config/db.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { throttle } from './middlewares/throttleMiddleware.js';

await connectDB();
const app = express();

/* .env */
const Secret_Key = process.env.SECRET_KEY;
const PORT = process.env.PORT || 4000;
const Client_Url = process.env.CLIENT_URL;

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        reportUri: '/csp-violation-report',
      },
    },
  })
);
app.use(cookieParser(Secret_Key));
app.use(express.json());

app.use(
  cors({
    origin: Client_Url,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 45,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  message: 'Too many request,Please wait',
});

// app.use(limiter, throttle(2000, 2));

/* Attach DB with Each Request: */
// app.use((req, res, next) => {
//   console.log(req.url);
//   req.db = db;
//   next();
// });

app.use('/directory', checkAuth, directoryRoutes);
app.use('/file', checkAuth, fileRoutes);
app.use(userRoutes);
app.use('/auth', authRoutes);

app.post(
  '/csp-violation-report',
  express.json({ type: 'application/csp-violation-report' }),
  (req, res, next) => {
    console.log(req.body);
    return res.json({ error: 'csp violation' });
  }
);

app.use((err, req, res, next) => {
  res.json(err);
  // res.status(err.status || 500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`server is listening on address http://localhost:${PORT}`);
});
