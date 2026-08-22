const { createClient } = require("redis");

let client = null;
let connectPromise = null;

/* =========================================================
   REDIS ENABLE / DISABLE

   Production-safe default:
   Redis is OFF unless explicitly enabled.

   REDIS_ENABLED=true  -> Redis enabled
   REDIS_ENABLED=false -> Redis disabled
========================================================= */

const redisEnabled = () =>
  String(
    process.env.REDIS_ENABLED || "false"
  ).toLowerCase() === "true";

/* =========================================================
   BUILD REDIS CLIENT
========================================================= */

const buildClient = () => {
  if (!redisEnabled()) {
    return null;
  }

  if (client) {
    return client;
  }

  client = createClient({
    url:
      process.env.REDIS_URL ||
      "redis://127.0.0.1:6379",

    socket: {
      /*
       * Do not reconnect forever.
       *
       * Redis is only a cache layer.
       * Bharat RMS must remain healthy even if Redis
       * becomes unavailable.
       */
      reconnectStrategy: (retries) => {
        if (retries >= 5) {
          console.warn(
            "Redis reconnect limit reached. Continuing without Redis."
          );

          return false;
        }

        return Math.min(
          250 * Math.max(retries, 1),
          3000
        );
      },

      connectTimeout: Number(
        process.env.REDIS_CONNECT_TIMEOUT_MS ||
          5000
      ),
    },
  });

  /* =======================================================
     EVENTS
  ======================================================= */

  client.on("connect", () => {
    console.log("Redis connecting...");
  });

  client.on("ready", () => {
    console.log(
      "Redis connected successfully."
    );
  });

  client.on("reconnecting", () => {
    console.warn(
      "Redis reconnecting..."
    );
  });

  client.on("end", () => {
    console.warn(
      "Redis connection closed."
    );
  });

  client.on("error", (error) => {
    console.error(
      "Redis error:",
      error?.message || error
    );
  });

  return client;
};

/* =========================================================
   CONNECT
========================================================= */

const connectRedis = async () => {
  if (!redisEnabled()) {
    console.log(
      "Redis disabled by REDIS_ENABLED."
    );

    return null;
  }

  const redis = buildClient();

  if (!redis) {
    return null;
  }

  if (redis.isReady) {
    return redis;
  }

  /*
   * isOpen means the socket has already been opened.
   * It may still be connecting, so don't call
   * .connect() again.
   */
  if (redis.isOpen) {
    return redis;
  }

  /*
   * Prevent multiple parts of the application from
   * starting duplicate Redis connections.
   */
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = redis
    .connect()
    .then(() => {
      return redis;
    })
    .catch((error) => {
      console.error(
        "Redis initial connection failed:",
        error?.message || error
      );

      /*
       * IMPORTANT:
       * Redis failure must not crash Bharat RMS.
       */
      return null;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
};

/* =========================================================
   GET CLIENT
========================================================= */

const getRedisClient = () =>
  client;

/* =========================================================
   HEALTH
========================================================= */

const isRedisReady = () =>
  Boolean(
    redisEnabled() &&
      client?.isOpen &&
      client?.isReady
  );

/* =========================================================
   CLOSE
========================================================= */

const closeRedis = async () => {
  if (!client?.isOpen) {
    return;
  }

  try {
    await client.quit();
  } catch (error) {
    console.error(
      "Redis quit failed:",
      error?.message || error
    );
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
  redisEnabled,
  isRedisReady,
};