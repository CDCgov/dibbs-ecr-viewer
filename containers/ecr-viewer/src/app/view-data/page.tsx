import React from "react";
import { Bundle } from "fhir/r4";
import { Grid, GridContainer } from "@trussworks/react-uswds";

import { get_fhir_data } from "../api/fhir-data/fhir-data-service";
import {
  evaluateEcrSummaryConditionSummary,
  evaluateEcrSummaryEncounterDetails,
  evaluateEcrSummaryPatientDetails,
} from "../services/ecrSummaryService";
import { PathMappings } from "./utils/utils";
import AccordionContent from "@/app/view-data/components/AccordionContent";
import { EcrLoadingSkeleton } from "./components/LoadingComponent";
import { ECRViewerLayout } from "./components/ECRViewerLayout";
import { ExpandCollapseButtons } from "@/app/view-data/components/ExpandCollapseButtons";
import EcrSummary from "./components/EcrSummary";
import RetrievalFailed from "./retrieval-failed";
import SideNav from "./components/SideNav";

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
      <div>
        <pre>
          <code>{`${errors.status}: ${errors.message}`}</code>
        </pre>
      </div>
    );
  } else if (fhirBundle && mappings) {
    return (
      <ECRViewerLayout bundle={fhirBundle} mappings={mappings}>
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
          <div className="margin-top-10">
            <GridContainer className={"padding-0 margin-bottom-3 maxw-none"}>
              <Grid row className="margin-bottom-05">
                <Grid>
                  <h2 className="margin-bottom-0" id="ecr-document">
                    eCR Document
                  </h2>
                </Grid>
                <Grid className={"flex-align-self-center margin-left-auto"}>
                  <ExpandCollapseButtons
                    id={"main"}
                    buttonSelector={"h3 > .usa-accordion__button"}
                    accordionSelector={
                      ".info-container > .usa-accordion__content"
                    }
                    expandButtonText={"Expand all sections"}
                    collapseButtonText={"Collapse all sections"}
                  />
                </Grid>
              </Grid>
              <div className="text-base-darker line-height-sans-5">
                Displays entire eICR and RR documents to help you dig further
                into eCR data
              </div>
            </GridContainer>
            <AccordionContent
              fhirPathMappings={mappings}
              fhirBundle={fhirBundle}
            />
          </div>
        </div>
      </ECRViewerLayout>
    );
  } else {
    return <EcrLoadingSkeleton />;
  }
};

export default ECRViewerPage;
