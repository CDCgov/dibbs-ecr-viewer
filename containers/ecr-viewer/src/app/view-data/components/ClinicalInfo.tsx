import { AccordionSection, AccordionSubSection } from "../component-utils";
import React from "react";
import classNames from "classnames";
import {
  DataDisplay,
  DataTableDisplay,
  DisplayDataProps,
} from "@/app/view-data/components/DataDisplay";

interface ClinicalProps {
  reasonForVisitDetails: DisplayDataProps[];
  activeProblemsDetails: DisplayDataProps[];
  vitalData: DisplayDataProps[];
  immunizationsDetails: DisplayDataProps[];
  treatmentData: DisplayDataProps[];
  clinicalNotes: DisplayDataProps[];
}

const TableDetails = ({
  details,
  className,
}: {
  details: DisplayDataProps[];
  className?: string;
}) => {
  return (
    <div>
      {details.map((item, index) => (
        <div key={index}>
          <div className={classNames("grid-col-auto text-pre-line", className)}>
            {item.value}
          </div>
          <div className={"section__line_gray"} />
        </div>
      ))}
    </div>
  );
};

const ClinicalNotes = ({ details }: { details: DisplayDataProps[] }) => {
  if (details?.length > 0) {
    return (
      <AccordionSubSection
        title="Clinical Notes"
        className="clinical_info_container"
      >
        {details.map((item, index) => {
          if (item.table) {
            return <TableDetails key={index} details={[item]} />;
          }
          return <DataDisplay item={item} key={index} />;
        })}
      </AccordionSubSection>
    );
  }

  return <></>;
};

const SymptomsAndProblems = ({
  symptoms,
  problems,
}: {
  symptoms: DisplayDataProps[];
  problems: DisplayDataProps[];
}) => {
  if (symptoms?.length > 0 || problems?.length > 0) {
    return (
      <AccordionSubSection title="Symptoms and Problems">
        <div data-testid="reason-for-visit">
          {symptoms.map((item, index) => (
            <DataDisplay item={item} key={index} />
          ))}
        </div>
        <div data-testid="active-problems">
          <TableDetails
            details={problems}
            className="table-clinical-problems"
          />
        </div>
      </AccordionSubSection>
    );
  }

  return <></>;
};

const TreatmentDetails = ({ details }: { details: DisplayDataProps[] }) => {
  const data = details.filter((item) => !React.isValidElement(item));

  if (data.length > 0) {
    return (
      <AccordionSubSection title="Treatment Details">
        <div data-testid="treatment-details">
          {data.map((item, index) => (
            <DataTableDisplay item={item} key={index} />
          ))}
        </div>
      </AccordionSubSection>
    );
  }

  return <></>;
};

const ImmunizationsDetails = ({ details }: { details: DisplayDataProps[] }) => {
  if (details.length > 0) {
    return (
      <AccordionSubSection title="Immunizations">
        <div className="immunization_table" data-testid="immunization-history">
          <TableDetails details={details} />
        </div>
      </AccordionSubSection>
    );
  }

  return <></>;
};

const VitalDetails = ({ details }: { details: DisplayDataProps[] }) => {
  if (details.length > 0) {
    return (
      <AccordionSubSection title="Diagnostics and Vital Signs">
        <div data-testid="vital-signs">
          <TableDetails details={details} />
        </div>
      </AccordionSubSection>
    );
  }

  return <></>;
};

/**
 * Functional component for displaying clinical information.
 * @param props - Props containing clinical information.
 * @param props.reasonForVisitDetails - The details of the reason for visit.
 * @param props.activeProblemsDetails - The details of active problems.
 * @param props.immunizationsDetails - The details of immunizations.
 * @param props.vitalData - The vital signs data.
 * @param props.treatmentData - The details of treatments.
 * @param props.clinicalNotes - The clinical notes data.
 * @returns The JSX element representing the clinical information.
 */
export const ClinicalInfo = ({
  reasonForVisitDetails,
  activeProblemsDetails,
  immunizationsDetails,
  vitalData,
  treatmentData,
  clinicalNotes,
}: ClinicalProps) => {
  return (
    <AccordionSection>
      <ClinicalNotes details={clinicalNotes} />
      <SymptomsAndProblems
        symptoms={reasonForVisitDetails}
        problems={activeProblemsDetails}
      />
      <TreatmentDetails details={treatmentData} />
      <ImmunizationsDetails details={immunizationsDetails} />
      <VitalDetails details={vitalData} />
    </AccordionSection>
  );
};

export default ClinicalInfo;
