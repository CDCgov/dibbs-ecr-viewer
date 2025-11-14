export function createFakeZip(string: string): Buffer {
  return Buffer.concat([Buffer.from("504b0304", "hex"), Buffer.from(string)]);
}
