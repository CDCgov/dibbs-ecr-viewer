import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
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

export const ecrXmlsExist = async (id: string): Promise<boolean> => {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.ECR_BUCKET_NAME,
        Key: `${id}.zip`,
      }),
    );
    return true;
  } catch {
    return false;
  }
};

export const getEcrXmls = async (id: string): Promise<EcrXmls> => {
  const command = new GetObjectCommand({
    Bucket: process.env.ECR_BUCKET_NAME,
    Key: `${id}.zip`,
  });

  const { Body } = await s3Client.send(command);
  if (!Body) throw new XmlNotFoundError("XML archive not found");

  const buffer = Buffer.from(await Body.transformToByteArray());
  const zip = await JSZip.loadAsync(buffer);

  let ecrFile = zip.file(`${id}-CDA_eICR.xml`);
  let rrFile = zip.file(`${id}-CDA_RR.xml`);

  if (!ecrFile || !rrFile) {
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir || name.startsWith("__MACOSX/") || name.startsWith("._"))
        continue;
      if (!name.endsWith(".xml")) continue;
      const baseName = name.split("/").pop()!;
      if (!ecrFile && /eicr/i.test(baseName)) {
        ecrFile = entry;
      } else if (!rrFile && /_rr/i.test(baseName)) {
        rrFile = entry;
      }
    }
  }

  if (!ecrFile && !rrFile)
    throw new XmlNotFoundError("No XML files found in archive");

  return {
    ecrXml: ecrFile ? await ecrFile.async("string") : null,
    rrXml: rrFile ? await rrFile.async("string") : null,
  };
};
