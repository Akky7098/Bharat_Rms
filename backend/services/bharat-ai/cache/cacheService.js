const {
  getRedisClient,
  redisEnabled,
} = require("./redisClient");

const CACHE_TTL = Object.freeze({
  LIVE: 120,
  SHORT: 300,
  MEDIUM: 900,
  LONG: 3600,
  HISTORICAL: 21600,
  CONVERSATION: 86400,
});

const redisReady = () => {
  if (!redisEnabled()) return false;
  const client = getRedisClient();
  return Boolean(client?.isOpen && client?.isReady);
};

const getCache = async (key) => {
  if (!redisReady()) return null;

  try {
    const raw = await getRedisClient().get(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Redis GET failed [${key}]:`, error?.message || error);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = CACHE_TTL.SHORT) => {
  if (!redisReady()) return false;

  try {
    await getRedisClient().set(key, JSON.stringify(value), {
      EX: Math.max(1, Number(ttlSeconds) || CACHE_TTL.SHORT),
    });
    return true;
  } catch (error) {
    console.error(`Redis SET failed [${key}]:`, error?.message || error);
    return false;
  }
};

const deleteCache = async (key) => {
  if (!redisReady()) return 0;

  try {
    return await getRedisClient().del(key);
  } catch (error) {
    console.error(`Redis DEL failed [${key}]:`, error?.message || error);
    return 0;
  }
};

const deleteCachePattern = async (pattern) => {
  if (!redisReady()) return 0;

  let deleted = 0;

  try {
    for await (const entry of getRedisClient().scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      const keys = Array.isArray(entry) ? entry : [entry];
      const safeKeys = keys.filter(Boolean);

      if (safeKeys.length > 0) {
        deleted += await getRedisClient().del(safeKeys);
      }
    }
  } catch (error) {
    console.error(
      `Redis pattern invalidation failed [${pattern}]:`,
      error?.message || error
    );
  }

  return deleted;
};

const remember = async ({
  key,
  ttlSeconds = CACHE_TTL.SHORT,
  loader,
  forceRefresh = false,
}) => {
  if (typeof loader !== "function") {
    throw new Error("Cache loader must be a function.");
  }

  if (!forceRefresh) {
    const cached = await getCache(key);
    if (cached !== null) {
      return {
        data: cached,
        cache: { hit: true, key },
      };
    }
  }

  const data = await loader();

  // Cache only successful data returned by the business layer.
  await setCache(key, data, ttlSeconds);

  return {
    data,
    cache: { hit: false, key },
  };
};

module.exports = {
  CACHE_TTL,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  remember,
  redisReady,
};
