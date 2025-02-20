import React from "react";
import { Bundle } from "fhir/r4";

import { get_fhir_data } from "../api/fhir-data/fhir-data-service";
import {
  evaluateEcrSummaryConditionSummary,
  evaluateEcrSummaryEncounterDetails,
  evaluateEcrSummaryPatientDetails,
} from "../services/ecrSummaryService";
import { PathMappings } from "../utils/data-utils";
import { getAccordionItems } from "@/app/services/accordionItemService";
import { EcrLoadingSkeleton } from "./components/LoadingComponent";
import { ECRViewerLayout } from "./components/ECRViewerLayout";
import EcrSummary from "./components/EcrSummary";
import { GenericError, RetrievalFailed } from "@/app/components/ErrorPage";
import SideNav from "./components/SideNav";
import {
  evaluatePatientDOB,
  evaluatePatientName,
} from "../services/evaluateFhirDataService";
import { EcrDocument } from "./components/EcrDocument";

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

  type ApiResponse = {
    fhirBundle: Bundle;
    fhirPathMappings: PathMappings;
  };
  let fhirBundle;
  let mappings;
  let errors;
  try {
    const response = await get_fhir_data(fhirId);
    if (!response.ok) {
      errors = {
        status: response.status,
        message: response.statusText || "Internal Server Error",
      };
    } else {
      const bundle: ApiResponse = await response.json();
      fhirBundle = bundle.fhirBundle;
      mappings = bundle.fhirPathMappings;
    }
  } catch (error: any) {
    errors = {
      status: 500,
      message: error,
    };
  }

  if (errors) {
    if (errors.status === 404) {
      return <RetrievalFailed />;
    }
    return (
      <GenericError>
        <pre>
          <code>{`${errors.status}: ${errors.message}`}</code>
        </pre>
      </GenericError>
    );
  } else if (fhirBundle && mappings) {
    const patientName = evaluatePatientName(fhirBundle, mappings, true);
    const patientDOB = evaluatePatientDOB(fhirBundle, mappings);

    const accordionItems = getAccordionItems(fhirBundle, mappings);
    return (
      <ECRViewerLayout patientName={patientName} patientDOB={patientDOB}>
        <SideNav />
        <div className={"ecr-viewer-container"}>
          <div className="margin-bottom-3">
            <h2 className="margin-bottom-05 margin-top-3" id="ecr-summary">
              eCR Summary
            </h2>
            <div className="text-base-darker line-height-sans-5">
              Provides key info upfront to help you understand the eCR at a
              glance
            </div>
          </div>
          <EcrSummary
            patientDetails={
              evaluateEcrSummaryPatientDetails(fhirBundle, mappings)
                .availableData
            }
            encounterDetails={
              evaluateEcrSummaryEncounterDetails(fhirBundle, mappings)
                .availableData
            }
            conditionSummary={evaluateEcrSummaryConditionSummary(
              fhirBundle,
              mappings,
              snomedCode,
            )}
            snomed={snomedCode}
          />
          <EcrDocument initialAccordionItems={accordionItems} />
        </div>
      </ECRViewerLayout>
    );
  } else {
    return <EcrLoadingSkeleton />;
  }
};

export default ECRViewerPage;
