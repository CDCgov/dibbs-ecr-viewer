import React from "react";

import { Bundle, DiagnosticReport } from "fhir/r4";

import { AccordionItem } from "@/app/types";
import { toKebabCase } from "@/app/utils/format-utils";
import ClinicalInfo from "@/app/view-data/components/ClinicalInfo";
import Demographics from "@/app/view-data/components/Demographics";
import EcrMetadata from "@/app/view-data/components/EcrMetadata";
import EncounterDetails from "@/app/view-data/components/Encounter";
import LabInfo from "@/app/view-data/components/LabInfo";
import PregnancyInfo from "@/app/view-data/components/PregnancyInfo";
import SocialHistory from "@/app/view-data/components/SocialHistory";
import UnavailableInfo from "@/app/view-data/components/UnavailableInfo";
import { evaluateEcrMetadata } from "@/app/view-data/services/ecrMetadataService";
import {
  evaluateDemographicsData,
  evaluateSocialData,
  evaluateEncounterData,
  evaluateProviderData,
  evaluateFacilityData,
  evaluateHospitalEncounterData,
  evaluatePregnancyData,
} from "@/app/view-data/services/evaluateFhirDataService";
import { evaluateLabInfoData } from "@/app/view-data/services/labsService";
import {
  FhirIndex,
  getResourcesByType,
} from "@/app/view-data/services/fhirResourcesIndexService";

import { evaluateClinicalData } from "./clinical-data";

// TODO ANGELA: wish this could be somewhere else?
export type SideNavConfig = {
  title: string;
  subNavItems: string[];
};

/**
 * Functional component for an accordion container displaying various sections of eCR information.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param fhirIndex - FHIR resources indexed by type & by ID
 * @returns The JSX element representing the accordion container.
 */
export const getEcrDocumentAccordionItems = (
  fhirBundle: Bundle,
  fhirIndex: FhirIndex,
): { sideNavConfig: SideNavConfig[]; accordionItems: AccordionItem[] } => {
  const demographicsData = evaluateDemographicsData(fhirBundle);
  const socialData = evaluateSocialData(fhirBundle);
  const pregnancyData = evaluatePregnancyData(fhirBundle);
  const hospitalEncounterData = evaluateHospitalEncounterData(fhirBundle);
  const encounterData = evaluateEncounterData(fhirBundle);
  const providerData = evaluateProviderData(fhirBundle);
  const clinicalData = evaluateClinicalData(fhirBundle);
  const ecrMetadata = evaluateEcrMetadata(fhirBundle);
  const facilityData = evaluateFacilityData(fhirBundle);
  const diagnosticReports = getResourcesByType<DiagnosticReport>(
    fhirIndex,
    "DiagnosticReport",
  );
  const labInfoData = evaluateLabInfoData(fhirIndex, diagnosticReports);

  const hasUnavailableData = () => {
    const unavailableDataArrays = [
      demographicsData.unavailableData,
      socialData.unavailableData,
      pregnancyData.unavailableData,
      encounterData.unavailableData,
      hospitalEncounterData.unavailableData,
      clinicalData.reasonForVisitDetails.unavailableData,
      clinicalData.activeProblemsDetails.unavailableData,
      clinicalData.emergencyOutbreakInfo.unavailableData,
      providerData.unavailableData,
      clinicalData.vitalData.unavailableData,
      clinicalData.immunizationsDetails.unavailableData,
      clinicalData.treatmentData.unavailableData,
      clinicalData.clinicalNotes.unavailableData,
      ...ecrMetadata.eicrDetails.unavailableData,
      ...ecrMetadata.ecrCustodianDetails.unavailableData,
      ecrMetadata.eicrAuthorDetails.map((details) => details.unavailableData),
    ];
    return unavailableDataArrays.some(
      (array) => Array.isArray(array) && array.length > 0,
    );
  };

  const hasDemographicsData = demographicsData.availableData.length > 0;
  const hasSocialData = socialData.availableData.length > 0;
  const hasPregnancyData = pregnancyData.availableData.length > 0;
  const hasPatientData =
    hasDemographicsData || hasSocialData || hasPregnancyData;

  // TODO ANGELA: Make more efficient?
  const subNavPatient = [
    hasDemographicsData && "Demographics",
    hasSocialData && "Social History",
    hasPregnancyData && "Pregnancy Info",
  ].filter(Boolean) as string[];
  const subNavEncounter = [
    encounterData.availableData.length > 0 && "Encounter Details",
    hospitalEncounterData.availableData.length > 0 &&
      "Hospital Encounter Details",
    facilityData.availableData.length > 0 && "Facility Details",
    providerData.availableData.length > 0 && "Provider Details",
  ].filter(Boolean) as string[];
  const subNavClinical = [
    clinicalData.clinicalNotes.availableData.length > 0 && "Clinical Notes",
    (clinicalData.reasonForVisitDetails.availableData.length > 0 ||
      clinicalData.activeProblemsDetails.availableData.length > 0 ||
      clinicalData.emergencyOutbreakInfo.availableData.length > 0) &&
      "Symptoms and Problems",
    clinicalData.treatmentData.availableData.length > 0 && "Treatment Details",
    clinicalData.immunizationsDetails.availableData.length > 0 &&
      "Immunizations",
    clinicalData.vitalData.availableData.length > 0 &&
      "Diagnostics and Vital Signs",
  ].filter(Boolean) as string[];
  const subNavMetadata = [
    "RR Details",
    ecrMetadata.eicrDetails.availableData.length > 0 && "eICR Details",
    ecrMetadata.eicrAuthorDetails.find(
      (authorDetails) => authorDetails.availableData.length > 0,
    ) && "eICR Author Details for Practitioner",
    ecrMetadata.ecrCustodianDetails.availableData.length > 0 &&
      "eICR Custodian Details",
  ].filter(Boolean) as string[];
  const subNavLabs = labInfoData.map((labResult) => {
    const labName = `Lab Results from ${
      labResult?.organizationDisplayDataProps?.[0]?.value ||
      "Unknown Organization"
    }`;
    return labName;
  }) as string[];
  const sideNavConfig: SideNavConfig[] = [];

  const accordionItems: AccordionItem[] = [
    {
      title: "Patient Info",
      content: (
        <>
          {hasPatientData ? (
            <>
              <Demographics demographicsData={demographicsData.availableData} />
              {hasSocialData && (
                <SocialHistory socialData={socialData.availableData} />
              )}
              {hasPregnancyData && (
                <PregnancyInfo pregnancyData={pregnancyData.availableData} />
              )}
            </>
          ) : (
            <p className="text-italic padding-bottom-05">
              No patient information was found in this eCR.
            </p>
          )}
        </>
      ),
      subNavItems: subNavPatient,
    },
    {
      title: "Encounter Info",
      content: (
        <>
          {encounterData.availableData.length > 0 ||
          hospitalEncounterData.availableData.length > 0 ||
          facilityData.availableData.length > 0 ||
          providerData.availableData.length > 0 ? (
            <EncounterDetails
              encounterData={encounterData.availableData}
              hospitalEncounterData={hospitalEncounterData.availableData}
              facilityData={facilityData.availableData}
              providerData={providerData.availableData}
            />
          ) : (
            <p className="text-italic padding-bottom-05">
              No encounter information was found in this eCR.
            </p>
          )}
        </>
      ),
      subNavItems: subNavEncounter,
    },
    {
      title: "Clinical Info",
      content: Object.values(clinicalData).some(
        (section) => section.availableData.length > 0,
      ) ? (
        <ClinicalInfo
          clinicalNotes={clinicalData.clinicalNotes.availableData}
          reasonForVisitDetails={
            clinicalData.reasonForVisitDetails.availableData
          }
          activeProblemsDetails={
            clinicalData.activeProblemsDetails.availableData
          }
          emergencyOutbreakInfo={
            clinicalData.emergencyOutbreakInfo.availableData
          }
          vitalData={clinicalData.vitalData.availableData}
          immunizationsDetails={clinicalData.immunizationsDetails.availableData}
          treatmentData={clinicalData.treatmentData.availableData}
        />
      ) : (
        <p className="text-italic padding-bottom-05">
          No clinical information was found in this eCR.
        </p>
      ),
      subNavItems: subNavClinical,
    },
    {
      title: "Lab Info",
      content:
        labInfoData.length > 0 ? (
          <LabInfo labResults={labInfoData} />
        ) : (
          <p className="text-italic padding-bottom-05">
            No lab information was found in this eCR.
          </p>
        ),
      subNavItems: subNavLabs,
    },
    {
      title: "eCR Metadata",
      content: (
        <>
          {Object.keys(ecrMetadata.rrConditions).length > 0 ||
          ecrMetadata.eRSDProcessingInfo ||
          ecrMetadata.eicrDetails.availableData.length > 0 ||
          ecrMetadata.eicrAuthorDetails.find(
            (authorDetails) => authorDetails.availableData.length > 0,
          ) ||
          ecrMetadata.ecrCustodianDetails.availableData.length > 0 ? (
            <EcrMetadata
              eicrDetails={ecrMetadata.eicrDetails.availableData}
              eCRCustodianDetails={
                ecrMetadata.ecrCustodianDetails.availableData
              }
              rrConditions={ecrMetadata.rrConditions}
              eRSDProcessingInfo={ecrMetadata.eRSDProcessingInfo}
              eicrAuthorDetails={ecrMetadata.eicrAuthorDetails
                .filter((details) => details.availableData.length > 0)
                .map((details) => details.availableData)}
            />
          ) : (
            <p className="text-italic padding-bottom-05">
              No eCR metadata was found in this eCR.
            </p>
          )}
        </>
      ),
      subNavItems: subNavMetadata,
    },
    {
      title: "Unavailable Info",
      content: (
        <div>
          {hasUnavailableData() ? (
            <UnavailableInfo
              demographicsUnavailableData={demographicsData.unavailableData}
              socialUnavailableData={socialData.unavailableData}
              pregnancyUnavailableData={pregnancyData.unavailableData}
              encounterUnavailableData={encounterData.unavailableData}
              hospitalEncounterUnavailableData={
                hospitalEncounterData.unavailableData
              }
              facilityUnavailableData={facilityData.unavailableData}
              symptomsProblemsUnavailableData={[
                ...clinicalData.reasonForVisitDetails.unavailableData,
                ...clinicalData.activeProblemsDetails.unavailableData,
                ...clinicalData.emergencyOutbreakInfo.unavailableData,
              ]}
              providerUnavailableData={providerData.unavailableData}
              vitalUnavailableData={clinicalData.vitalData.unavailableData}
              immunizationsUnavailableData={
                clinicalData.immunizationsDetails.unavailableData
              }
              treatmentUnavailableData={
                clinicalData.treatmentData.unavailableData
              }
              clinicalNotesUnavailableData={
                clinicalData.clinicalNotes.unavailableData
              }
              ecrMetadataUnavailableData={[
                ...ecrMetadata.eicrDetails.unavailableData,
                ...(!ecrMetadata.eRSDProcessingInfo
                  ? [{ title: "eICR Processing Info", value: "" }]
                  : []),
                ...ecrMetadata.ecrCustodianDetails.unavailableData,
              ]}
              eicrAuthorUnavailableData={ecrMetadata.eicrAuthorDetails.map(
                (authorDetails) => authorDetails.unavailableData,
              )}
            />
          ) : (
            <p className="text-italic padding-bottom-105 margin-0">
              All possible information was found in this eCR.
            </p>
          )}
        </div>
      ),
    },
  ].map((item, index) => {
    const kebabCaseTitle = toKebabCase(item.title);

    sideNavConfig.push({
      title: item.title,
      subNavItems: item.subNavItems || [],
    });

    return {
      ...item,
      id: `${kebabCaseTitle}_${index + 1}`, // this is the id of the accordion item's inner div
      title: <span id={kebabCaseTitle}>{item.title}</span>, // the side nav links to this ID
      expanded: false,
      shouldRenderBeforeExpand: false,
      headingLevel: "h3",
    };
  });
  console.log(sideNavConfig);

  return { sideNavConfig, accordionItems };
};
