let queue = Promise.resolve();

const runWithChromiumLock = async (jobName, jobFn) => {
  const execute = async () => {
    console.log(`CHROMIUM LOCK START => ${jobName}`);

    try {
      const result = await jobFn();

      console.log(`CHROMIUM LOCK END => ${jobName}`);

      return result;
    } catch (error) {
      console.log(
        `CHROMIUM LOCK ERROR => ${jobName}`,
        error.message
      );

      throw error;
    }
  };

  const current = queue.then(
    execute,
    execute
  );

  /*
   * IMPORTANT:
   * Never allow one failed Chromium job
   * to permanently break the queue.
   */
  queue = current.catch(() => {});

  return current;
};

module.exports = runWithChromiumLock;