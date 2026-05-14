let queue = Promise.resolve();

const runWithChromiumLock = async (jobName, jobFn) => {
  const run = async () => {
    console.log(`CHROMIUM LOCK START => ${jobName}`);

    try {
      const result = await jobFn();
      console.log(`CHROMIUM LOCK END => ${jobName}`);
      return result;
    } catch (error) {
      console.log(`CHROMIUM LOCK ERROR => ${jobName}`, error.message);
      throw error;
    }
  };

  const currentJob = queue.then(run, run);

  queue = currentJob.catch(() => {});

  return currentJob;
};

module.exports = runWithChromiumLock;