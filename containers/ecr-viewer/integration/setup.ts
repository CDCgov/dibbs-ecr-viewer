const { waitForMetadataDatabase } = require("../src/app/api/services/database");

/**
 * Wait for the metadata database to be ready for testing
 */
module.exports = async function () {
  const ready = await waitForMetadataDatabase();
  if (!ready) {
    throw new Error("No metadata database available to connect to");
  }
};
