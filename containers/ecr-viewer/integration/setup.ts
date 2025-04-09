const {
  metadataDatabaseHealthCheck,
} = require("../src/app/api/services/database");

/**
 * Wait for the metadata database to be ready for testing
 */
module.exports = async function () {
  let attempts = 10;
  while (attempts > 0) {
    attempts -= 1;

    const status = await metadataDatabaseHealthCheck();
    if (status === "UP") return;

    // sleep for 2 seconds
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("No metadata database available to connect to");
};
