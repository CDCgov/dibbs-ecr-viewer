import React from "react";

import { notFound } from "next/navigation";

import { GenericError, RetrievalFailed } from "@/app/components/ErrorPage";
import { isLoggedInUserEcrAuthed } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { ECRViewerLayout } from "./components/ECRViewerLayout";
import EcrDocument from "./components/EcrDocument";
import { getEcrDocumentAccordionItems } from "./components/EcrDocument/accordion-items";
import EcrSummary from "./components/EcrSummary";
import SideNav from "./components/SideNav";
import XmlViewer from "./components/XmlViewer";
import {
  evaluatePatientDOB,
  evaluatePatientName,
  getPatient,
} from "./services/evaluateFhirDataService";
import { getFhirData, isSuccessResponse } from "./services/fhirDataService";
import { ecrXmlsExist } from "./services/xmlService";
import { getFhirIndex } from "@/app/view-data/services/fhirResourcesIndexService";
import {
  evaluateEcrSummaryConditionSummary,
  evaluateEcrSummaryEncounterDetails,
  evaluateEcrSummaryPatientDetails,
} from "./services/ecrSummaryService";

/**
 * Functional component for rendering the eCR Viewer page.
 * @param params react params
 * @param params.searchParams searchParams for page
 * @returns The main eCR Viewer JSX component.
 */
const ECRViewerPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; "snomed-code"?: string }>;
}) => {
  const _searchParams = await searchParams;
  const fhirId = _searchParams.id ?? "";
  const snomedCode = _searchParams["snomed-code"] ?? "";

  const user = await getLoggedInUserSession();
  // If we have a user that means we're using IDP auth and not NBS Auth, so we
  // need to check if they're authorized to view this eCR
  if (user) {
    const authed = await isLoggedInUserEcrAuthed(fhirId);
    if (!authed) notFound();
  }

  const resp = await getFhirData({ eicr_id: fhirId });
  if (!isSuccessResponse(resp)) {
    if (resp.status === 404) {
      return <RetrievalFailed />;
    } else {
      return (
        <GenericError>
          <pre>
            <code>{`${resp.status}: ${resp.payload.message}`}</code>
          </pre>
        </GenericError>
      );
    }
  }

  const fhirBundle = resp.payload.fhirBundle;
  const fhirIndex = getFhirIndex(fhirBundle);

  const patient = getPatient(fhirIndex);
  const patientName = evaluatePatientName(patient, true);
  const patientDOB = evaluatePatientDOB(patient);

  const { ecrDocumentNavConfig, accordionItems } = getEcrDocumentAccordionItems(
    fhirBundle,
    fhirIndex,
  );

  const xmlsExist =
    process.env.SAVE_XML === "true" && (await ecrXmlsExist(fhirId));

  return (
    <ECRViewerLayout patientName={patientName} patientDOB={patientDOB}>
      <XmlViewer
        sideNav={<SideNav ecrDocumentNavConfig={ecrDocumentNavConfig} />}
        ecrId={xmlsExist ? fhirId : undefined}
      >
        <EcrSummary
          patientDetails={
            evaluateEcrSummaryPatientDetails(fhirBundle, fhirIndex)
          }
          encounterDetails={
            evaluateEcrSummaryEncounterDetails(fhirBundle)
          }
          conditionSummary={evaluateEcrSummaryConditionSummary(
            fhirBundle,
            fhirIndex,
            snomedCode,
          )}
          snomed={snomedCode}
        />
        <EcrDocument initialAccordionItems={accordionItems} />
      </XmlViewer>
    </ECRViewerLayout>
  );
};

export default ECRViewerPage;
