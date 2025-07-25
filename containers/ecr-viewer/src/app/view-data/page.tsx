import React from "react";

import { notFound } from "next/navigation";

import { GenericError, RetrievalFailed } from "@/app/components/ErrorPage";
import {
  evaluatePatientDOB,
  evaluatePatientName,
} from "@/app/services/evaluateFhirDataService";
import { getFhirData, isSuccessResponse } from "@/app/services/fhirDataService";
import { isLoggedInUserEcrAuthed } from "@/app/services/userService";
import { getLoggedInUserSession } from "@/app/utils/auth-utils";

import { ECRViewerLayout } from "./components/ECRViewerLayout";
import EcrDocument from "./components/EcrDocument";
import { getEcrDocumentAccordionItems } from "./components/EcrDocument/accordion-items";
import EcrSummary from "./components/EcrSummary";
import SideNav from "./components/SideNav";
import {
  evaluateEcrSummaryConditionSummary,
  evaluateEcrSummaryEncounterDetails,
  evaluateEcrSummaryPatientDetails,
} from "./services/ecrSummaryService";

/**
 * Functional component for rendering the eCR Viewer page.
 * @param params react params
 * @param params.searchParams searchParams for page
 * @param params.searchParams.id ecr ID
 * @returns The main eCR Viewer JSX component.
 */
const ECRViewerPage = async ({
  searchParams,
}: {
  searchParams: { id?: string; "snomed-code"?: string };
}) => {
  const fhirId = searchParams.id ?? "";
  const snomedCode = searchParams["snomed-code"] ?? "";

  const user = await getLoggedInUserSession();
  // If we have a user that means we're using IDP auth and not NBS Auth, so we
  // need to check if they're authorized to view this eCR
  if (user) {
    const authed = await isLoggedInUserEcrAuthed(fhirId);
    if (!authed) notFound();
  }

  const resp = await getFhirData(fhirId);
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
  const patientName = evaluatePatientName(fhirBundle, true);
  const patientDOB = evaluatePatientDOB(fhirBundle);

  const accordionItems = getEcrDocumentAccordionItems(fhirBundle);
  return (
    <ECRViewerLayout patientName={patientName} patientDOB={patientDOB}>
      <SideNav />
      <div className="ecr-viewer-container">
        <div className="margin-bottom-3">
          <h2 className="margin-bottom-05 margin-top-3" id="ecr-summary">
            eCR Summary
          </h2>
          <div className="text-base-darker line-height-sans-5">
            Provides key info upfront to help you understand the eCR at a glance
          </div>
        </div>
        <EcrSummary
          patientDetails={
            evaluateEcrSummaryPatientDetails(fhirBundle).availableData
          }
          encounterDetails={
            evaluateEcrSummaryEncounterDetails(fhirBundle).availableData
          }
          conditionSummary={evaluateEcrSummaryConditionSummary(
            fhirBundle,
            snomedCode,
          )}
          snomed={snomedCode}
        />
        <EcrDocument initialAccordionItems={accordionItems} />
      </div>
    </ECRViewerLayout>
  );
};

export default ECRViewerPage;
