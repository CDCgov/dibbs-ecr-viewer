/**
 * @jest-environment node
 */
import JSZip from "jszip";
import { NextRequest } from "next/server";

import { s3Client } from "@/app/data/blobStorage/s3Client";
import { createProgramArea } from "@/app/services/programAreaService";
import { createUser } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";
import { GET } from "@/app/view-data/view-xml/route";

import { createCoreEcr, createEcrCondition } from "./helpers/core";
import { buildCore, dropExisting } from "./helpers/ddl";
import { seedUserProgramData } from "./helpers/seed";

jest.mock("@/app/utils/auth-utils");
jest.mock("@/app/data/blobStorage/s3Client", () => ({
  s3Client: { send: jest.fn() },
}));

const ecrs = [
  { id: "condition-a-ecr", code: "123" },
  { id: "condition-b-ecr", code: "456" },
];
const xmls = {
  ecrXml: "<ClinicalDocument>SYNTHETIC-EICR</ClinicalDocument>",
  rrXml: "<ReportabilityResponse>SYNTHETIC-RR</ReportabilityResponse>",
};
const requestXml = (id: string) =>
  GET(
    new NextRequest(`http://localhost/ecr-viewer/view-data/view-xml?id=${id}`),
  );

describe("XML route authorization", () => {
  const originalEnv = { ...process.env };
  let archive: Buffer;

  beforeAll(async () => {
    jest.mocked(getLoggedInUserSession).mockResolvedValue({
      email: "admin@admin.com",
    });
    await buildCore();
    await seedUserProgramData();
    const areaB = await createProgramArea({
      name: "Synthetic area B",
      conditions: ["456"],
    });
    await createUser({
      email: "area-b@example.com",
      userType: "standard",
      programs: [areaB],
    });
    await createUser({
      email: "no-areas@example.com",
      userType: "standard",
      programs: [],
    });

    for (const { id, code } of ecrs) {
      await createCoreEcr({
        eicr_id: id,
        set_id: id,
        fhir_reference_link: "",
        first_name: "Synthetic",
        last_name: "Patient",
        birth_date: "2000-01-01",
        encounter_start_date: new Date("2024-12-02T12:00:00Z"),
        date_created: new Date("2024-12-02T12:00:00Z"),
      });
      await createEcrCondition({
        uuid: id,
        eicr_id: id,
        condition: `${id}-condition`,
        condition_code: code,
      });
    }

    archive = await new JSZip()
      .file("synthetic-CDA_eICR.xml", xmls.ecrXml)
      .file("synthetic-CDA_RR.xml", xmls.rrXml)
      .generateAsync({ type: "nodebuffer" });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SAVE_XML = "true";
    process.env.SOURCE = "s3";
    (s3Client.send as jest.Mock).mockResolvedValue({
      Body: { transformToByteArray: async () => archive },
    });
  });

  afterAll(async () => {
    await dropExisting();
    process.env = { ...originalEnv };
  });

  describe.each(["standard@standard.com", "programadmin@programadmin.com"])(
    "program-area restricted user %s",
    (email) => {
      beforeEach(() => {
        jest.mocked(getLoggedInUserSession).mockResolvedValue({ email });
      });

      it("allows XML access to an eCR within the user's program areas", async () => {
        const response = await requestXml("condition-a-ecr");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(xmls);
      });

      it("denies XML access to an eCR outside the user's program areas", async () => {
        const response = await requestXml("condition-b-ecr");
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
          message: "XML archive not found",
        });
      });
    },
  );

  it("allows administrators to retrieve XML across program areas", async () => {
    jest.mocked(getLoggedInUserSession).mockResolvedValue({
      email: "admin@admin.com",
    });
    for (const { id } of ecrs) {
      const response = await requestXml(id);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(xmls);
    }
  });

  it.each(["no-areas@example.com", "unregistered@example.com", ""])(
    "denies XML access for an IDP session without permissions: %s",
    async (email) => {
      jest.mocked(getLoggedInUserSession).mockResolvedValue({ email });
      expect((await requestXml("condition-a-ecr")).status).toBe(404);
    },
  );
});
