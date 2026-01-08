import { createClient } from "redis";

const url = process.env.REDIS_URL;

export const redis =
  url && url.length > 0
    ? createClient({
        url
      })
    : null;

export async function ensureRedis() {
  if (!redis) {
    throw new Error("REDIS_URL is not set; Redis is not configured");
  }
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}


