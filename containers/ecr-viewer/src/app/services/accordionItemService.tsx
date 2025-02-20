import { PathMappings } from "../utils/data-utils";
import Demographics from "../view-data/components/Demographics";
import SocialHistory from "../view-data/components/SocialHistory";
import UnavailableInfo from "../view-data/components/UnavailableInfo";
import EcrMetadata from "../view-data/components/EcrMetadata";
import EncounterDetails from "../view-data/components/Encounter";
import ClinicalInfo from "../view-data/components/ClinicalInfo";
import { Bundle } from "fhir/r4";
import React from "react";
import LabInfo from "@/app/view-data/components/LabInfo";
import { evaluateEcrMetadata } from "./ecrMetadataService";
import { evaluateLabInfoData } from "@/app/services/labsService";
import {
  evaluateDemographicsData,
  evaluateSocialData,
  evaluateEncounterData,
  evaluateProviderData,
  evaluateFacilityData,
} from "@/app/services/evaluateFhirDataService";
import { evaluateClinicalData } from "../view-data/components/common";
import { Accordion, HeadingLevel, Tag } from "@trussworks/react-uswds";
import { evaluate } from "@/app/utils/evaluate";
import { toKebabCase } from "@/app/utils/format-utils";
import classNames from "classnames";

export type AccordionItem = React.ComponentProps<typeof Accordion>["items"][0];

/**
 * Functional component for an accordion container displaying various sections of eCR information.
 * @param fhirBundle - The FHIR bundle containing patient information.
 * @param fhirPathMappings - The path mappings used to extract information from the FHIR bundle.
 * @returns The JSX element representing the accordion container.
 */
export const getEcrDocumentAccordionItems = (
  fhirBundle: Bundle,
  fhirPathMappings: PathMappings,
): AccordionItem[] => {
  const demographicsData = evaluateDemographicsData(
    fhirBundle,
    fhirPathMappings,
  );
  const socialData = evaluateSocialData(fhirBundle, fhirPathMappings);
  const encounterData = evaluateEncounterData(fhirBundle, fhirPathMappings);
  const providerData = evaluateProviderData(fhirBundle, fhirPathMappings);
  const clinicalData = evaluateClinicalData(fhirBundle, fhirPathMappings);
  const ecrMetadata = evaluateEcrMetadata(fhirBundle, fhirPathMappings);
  const facilityData = evaluateFacilityData(fhirBundle, fhirPathMappings);
  const labInfoData = evaluateLabInfoData(
    fhirBundle,
    evaluate(fhirBundle, fhirPathMappings["diagnosticReports"]),
    fhirPathMappings,
  );
  const hasUnavailableData = () => {
    const unavailableDataArrays = [
      demographicsData.unavailableData,
      socialData.unavailableData,
      encounterData.unavailableData,
      clinicalData.reasonForVisitDetails.unavailableData,
      clinicalData.activeProblemsDetails.unavailableData,
      providerData.unavailableData,
      clinicalData.vitalData.unavailableData,
      clinicalData.immunizationsDetails.unavailableData,
      clinicalData.treatmentData.unavailableData,
      clinicalData.clinicalNotes.unavailableData,
      ...ecrMetadata.eicrDetails.unavailableData,
      ...ecrMetadata.ecrCustodianDetails.unavailableData,
      ecrMetadata.eRSDWarnings,
      ecrMetadata.eicrAuthorDetails.map((details) => details.unavailableData),
    ];
    return unavailableDataArrays.some(
      (array) => Array.isArray(array) && array.length > 0,
    );
  };

  const accordionItems: AccordionItem[] = [
    {
      title: "Patient Info",
      content: (
        <>
          {demographicsData.availableData.length > 0 ||
          socialData.availableData.length > 0 ? (
            <>
              <Demographics demographicsData={demographicsData.availableData} />
              {socialData.availableData.length > 0 && (
                <SocialHistory socialData={socialData.availableData} />
              )}
            </>
          ) : (
            <p className="text-italic padding-bottom-05">
              No patient information was found in this eCR.
            </p>
          )}
        </>
      ),
    },
    {
      title: "Encounter Info",
      content: (
        <>
          {encounterData.availableData.length > 0 ||
          facilityData.availableData.length > 0 ||
          providerData.availableData.length > 0 ? (
            <EncounterDetails
              encounterData={encounterData.availableData}
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
          vitalData={clinicalData.vitalData.availableData}
          immunizationsDetails={clinicalData.immunizationsDetails.availableData}
          treatmentData={clinicalData.treatmentData.availableData}
        />
      ) : (
        <p className="text-italic padding-bottom-05">
          No clinical information was found in this eCR.
        </p>
      ),
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
    },
    {
      title: "eCR Metadata",
      content: (
        <>
          {Object.keys(ecrMetadata.rrDetails).length > 0 ||
          ecrMetadata.eRSDWarnings.length > 0 ||
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
              rrDetails={ecrMetadata.rrDetails}
              eRSDWarnings={ecrMetadata.eRSDWarnings}
              eicrAuthorDetails={ecrMetadata.eicrAuthorDetails.map(
                (details) => details.availableData,
              )}
            />
          ) : (
            <p className="text-italic padding-bottom-05">
              No eCR metadata was found in this eCR.
            </p>
          )}
        </>
      ),
    },
    {
      title: "Unavailable Info",
      content: (
        <div>
          {hasUnavailableData() ? (
            <UnavailableInfo
              demographicsUnavailableData={demographicsData.unavailableData}
              socialUnavailableData={socialData.unavailableData}
              encounterUnavailableData={encounterData.unavailableData}
              facilityUnavailableData={facilityData.unavailableData}
              symptomsProblemsUnavailableData={[
                ...clinicalData.reasonForVisitDetails.unavailableData,
                ...clinicalData.activeProblemsDetails.unavailableData,
              ]}
              providerUnavailableData={providerData.unavailableData}
              vitalUnavailableData={clinicalData.vitalData.unavailableData}
              immunizationsUnavailableData={
                clinicalData.immunizationsDetails.unavailableData
              }
              treatmentData={clinicalData.treatmentData.unavailableData}
              clinicalNotesData={clinicalData.clinicalNotes.unavailableData}
              ecrMetadataUnavailableData={[
                ...ecrMetadata.eicrDetails.unavailableData,
                ...(ecrMetadata.eRSDWarnings.length === 0
                  ? [{ title: "eRSD Warnings", value: "" }]
                  : []),
                ...ecrMetadata.ecrCustodianDetails.unavailableData,
              ]}
              eicrAuthorDetails={ecrMetadata.eicrAuthorDetails.map(
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
    return {
      ...item,
      id: `${kebabCaseTitle}_${index + 1}`, // this is the id of the accordion item's inner div
      title: <span id={kebabCaseTitle}>{item.title}</span>, // the side nav links to this ID
      expanded: true,
      headingLevel: "h3",
    };
  });

  return accordionItems;
};

/**
 * Accordion component for displaying lab results.
 * @param props - The props object.
 * @param props.title - The title of the lab result.
 * @param props.abnormalTag - Boolean value if the lab result is abnormal.
 * @param props.content - The content within the accordian.
 * @param props.collapsedByDefault - Whether or not to collapse by default for the accordion
 * @param props.headingLevel - Heading level for the Accordion menu title.
 * @param props.className - Classnames to be applied to accordion.
 * @returns React element representing the AccordionLabResults component.
 */
export const getLabResultAccordionItem = ({
  title,
  abnormalTag,
  content,
  collapsedByDefault = false,
  headingLevel = "h5",
  className = "",
}: {
  title: string;
  abnormalTag: boolean;
  content: React.JSX.Element[];
  collapsedByDefault?: boolean;
  headingLevel?: HeadingLevel;
  className?: string;
}): AccordionItem => {
  return {
    title: (
      <>
        {title}
        {abnormalTag && (
          <Tag background={"#B50909"} className={"margin-left-105"}>
            Abnormal
          </Tag>
        )}
      </>
    ),
    content: content,
    expanded: collapsedByDefault,
    id: toKebabCase(title),
    headingLevel,
    className: classNames("side-nav-ignore", className),
  };
};
