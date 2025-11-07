export function createFakeZip(): Buffer {
  const xml = "<ClinicalDocument>Fake ECR XML</ClinicalDocument>";
  return Buffer.concat([Buffer.from("504b0304", "hex"), Buffer.from(xml)]);
}
