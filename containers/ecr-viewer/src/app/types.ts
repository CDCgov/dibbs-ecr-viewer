import { Accordion } from "@trussworks/react-uswds";

export type AccordionItem = React.ComponentProps<typeof Accordion>["items"][0];

export interface RelatedEcr {
  eicr_id: string;
  date_created: Date;
  eicr_version_number: string | undefined;
  set_id: string;
}

export interface EcrDisplay {
  ecrId: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_date_of_birth: string | undefined;
  reportable_conditions: string[];
  rule_summaries: string[];
  patient_report_date: string;
  date_created: string;
  eicr_set_id: string | undefined;
  eicr_version_number: string | undefined;
  related_ecrs: RelatedEcr[];
}

export interface Age {
  years: number;
  months: number;
  days: number;
}
