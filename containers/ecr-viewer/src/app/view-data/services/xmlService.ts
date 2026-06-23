import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

import { azureBlobContainerClient } from "@/app/data/blobStorage/azureClient";
import { gcpClient } from "@/app/data/blobStorage/gcpClient";
import { s3Client } from "@/app/data/blobStorage/s3Client";
import { AZURE_SOURCE, GCP_SOURCE, S3_SOURCE } from "@/app/data/blobStorage/utils";

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
  const key = `${id}.zip`;
  try {
    switch (process.env.SOURCE) {
      case S3_SOURCE: {
        await s3Client.send(
          new HeadObjectCommand({ Bucket: process.env.ECR_BUCKET_NAME, Key: key }),
        );
        return true;
      }
      case AZURE_SOURCE: {
        const client = azureBlobContainerClient();
        return client ? await client.getBlockBlobClient(key).exists() : false;
      }
      case GCP_SOURCE: {
        const client = gcpClient();
        if (!client) return false;
        const [exists] = await client.file(key).exists();
        return exists;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
};

const downloadZipBuffer = async (id: string): Promise<Buffer> => {
  const key = `${id}.zip`;
  switch (process.env.SOURCE) {
    case S3_SOURCE: {
      const { Body } = await s3Client.send(
        new GetObjectCommand({ Bucket: process.env.ECR_BUCKET_NAME, Key: key }),
      );
      if (!Body) throw new XmlNotFoundError("XML archive not found");
      return Buffer.from(await Body.transformToByteArray());
    }
    case AZURE_SOURCE: {
      const client = azureBlobContainerClient();
      if (!client) throw new XmlNotFoundError("XML archive not found");
      return client.getBlockBlobClient(key).downloadToBuffer();
    }
    case GCP_SOURCE: {
      const client = gcpClient();
      if (!client) throw new XmlNotFoundError("XML archive not found");
      const [buffer] = await client.file(key).download();
      return buffer;
    }
    default:
      throw new XmlNotFoundError("XML archive not found");
  }
};

export const getEcrXmls = async (id: string): Promise<EcrXmls> => {
  const buffer = await downloadZipBuffer(id);
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
