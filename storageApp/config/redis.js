import { createClient } from 'redis';

const redisClient = createClient({
  socket: {
    host: 'localhost',
    port: 6379,
  },
  password: process.env.REDIS_PASS,
});

redisClient.on('error', (err) => {
  console.log('Redis Connection Error', err);
  process.exit(1);
});

await redisClient.connect();

export default redisClient;

process.on('SIGINT', async () => {
  console.log('Database Disconnected');
  await redisClient.quit();
  process.exit(0);
});
