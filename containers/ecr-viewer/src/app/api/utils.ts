export const S3_SOURCE = "s3";
export const AZURE_SOURCE = "azure";

/**
 * Converts stream data to json data
 * @param stream - The input stream that provides JSON data in chunks. The stream
 *   should implement the async iterable protocol to allow for-await-of
 *   iteration over its data chunks.
 * @returns A promise that resolves to the JSON-parsed object from the accumulated
 *  stream data. The specific structure of this object depends on the JSON
 *  content of the stream.
 */
// There's some difficulty with typing the overlap between the Azure and S3 stream data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function streamToJson(stream: any) {
  if (!stream) throw new Error("Stream is undefined.");

  let rawData = "";
  for await (const chunk of stream) {
    rawData += chunk;
  }
  return JSON.parse(rawData);
}
