import { GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

import { s3Client } from "@/app/data/blobStorage/s3Client";

export class XmlNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlNotFoundError";
  }
}

export interface EcrXmls {
  ecrXml: string | null;
  rrXml: string | null;
}

export const getEcrXmls = async (id: string): Promise<EcrXmls> => {
  const command = new GetObjectCommand({
    Bucket: process.env.ECR_BUCKET_NAME,
    Key: `${id}.zip`,
  });

  const { Body } = await s3Client.send(command);
  if (!Body) throw new XmlNotFoundError("XML archive not found");

  const buffer = Buffer.from(await Body.transformToByteArray());
  const zip = await JSZip.loadAsync(buffer);

  const ecrFile = zip.file(`${id}-CDA_eICR.xml`);
  const rrFile = zip.file(`${id}-CDA_RR.xml`);

  if (!ecrFile && !rrFile)
    throw new XmlNotFoundError("No XML files found in archive");

  return {
    ecrXml: ecrFile ? await ecrFile.async("string") : null,
    rrXml: rrFile ? await rrFile.async("string") : null,
  };
};
