import {
  Address,
  CarePlanActivity,
  CareTeamParticipant,
  CodeableConcept,
  Coding,
  Condition,
  ContactPoint,
  DiagnosticReport,
  EncounterDiagnosis,
  EncounterParticipant,
  HumanName,
  Identifier,
  Immunization,
  Observation,
  Organization,
  PatientCommunication,
  PatientContact,
  Procedure,
  Quantity,
  Reference,
} from "fhir/r4";

import fhirPathMappings from "./data";

export type PathMappings = typeof fhirPathMappings;

export type ValueX =
  | boolean
  | number
  | string
  | CodeableConcept
  | Coding
  | Quantity;

export type PathTypes = {
  patientNameList: HumanName;
  patientAddressList: Address;
  patientTelecom: ContactPoint;
  patientCounty: string;
  patientCountry: string;
  patientIds: Identifier;
  patientDOB: string;
  patientVitalStatus: boolean;
  patientDOD: string;
  patientGender: string;
  patientRace: ValueX;
  patientRaceDetailed: ValueX;
  patientEthnicity: ValueX;
  patientEthnicityDetailed: ValueX;
  patientCommunication: PatientCommunication;
  patientTribalAffiliation: ValueX;
  patientEmergencyContact: PatientContact;
  patientCurrentJobTitle: ValueX;
  patientTobaccoUse: ValueX;
  patientHomelessStatus: ValueX;
  patientPregnancyStatus: ValueX;
  patientAlcoholUse: ValueX;
  patientAlcoholIntake: ValueX;
  patientAlcoholComment: ValueX;
  patientSexualOrientation: ValueX;
  patientGenderIdentity: ValueX;
  patientReligion: ValueX;
  patientMaritalStatus: string;
  eicrIdentifier: string;
  eicrReleaseVersion: ValueX;
  eicrCustodianRef: string;
  dateTimeEcrCreated: string;
  ehrSoftware: ValueX;
  ehrManufacturerModel: string;
  eRSDwarnings: Coding;
  compositionAuthorRefs: Reference;
  encounterEndDate: string;
  encounterStartDate: string;
  encounterDiagnosis: EncounterDiagnosis;
  encounterType: string;
  encounterID: Identifier;
  facilityContact: string;
  facilityContactAddress: Reference;
  facilityLocation: string;
  facilityName: string;
  facilityAddress: Address;
  facilityType: ValueX;
  compositionEncounterRef: string;
  encounterIndividualRef: string;
  encounterParticipants: EncounterParticipant;
  rrDetails: Observation;
  clinicalReasonForVisit: ValueX;
  patientHeight: ValueX;
  patientHeightDate: string;
  patientWeight: ValueX;
  patientWeightDate: string;
  patientBmi: ValueX;
  patientBmiDate: string;
  resolve: unknown;
  activeProblems: Condition;
  activeProblemsDisplay: string;
  activeProblemsOnsetDate: string;
  activeProblemsOnsetAge: ValueX;
  activeProblemsComments: string;
  historyOfPresentIllness: string;
  planOfTreatment: string;
  plannedProcedures: CarePlanActivity;
  plannedProcedureName: string;
  plannedProcedureOrderedDate: string;
  plannedProcedureScheduledDate: string;
  adminMedicationsRefs: string;
  careTeamParticipants: CareTeamParticipant;
  careTeamParticipantMemberName: HumanName;
  careTeamParticipantRole: string;
  careTeamParticipantStatus: string;
  careTeamParticipantPeriod: string;
  immunizations: Immunization;
  immunizationsName: string;
  immunizationsAdminDate: string;
  immunizationsDoseNumber: number;
  immunizationsManufacturerName: string;
  immunizationsLotNumber: unknown;
  procedures: Procedure;
  procedureName: string;
  procedureDate: string;
  procedureReason: string;
  diagnosticReports: DiagnosticReport;
  observations: Observation;
  labResultDiv: string;
  specimenCollectionTime: string;
  specimenReceivedTime: string;
  specimenSource: string;
  observationReferenceValue: string;
  observationComponent: string;
  observationValue: string;
  observationReferenceRange: string;
  observationDeviceReference: Reference;
  observationNote: string;
  observationOrganism: string;
  observationAntibiotic: string;
  observationOrganismMethod: string;
  observationSusceptibility: string;
  organizations: Organization;
  patientTravelHistory: Observation;
  travelHistoryStartDate: string;
  travelHistoryEndDate: string;
  travelHistoryLocation: string;
  travelHistoryPurpose: string;
  stampedImmunizations: Immunization;
};

export const PathTypeNames = {
  patientNameList: "HumanName",
  patientAddressList: "Address",
  patientTelecom: "ContactPoint",
  patientCounty: "string",
  patientCountry: "string",
  patientIds: "Identifier",
  patientDOB: "string",
  patientVitalStatus: "boolean",
  patientDOD: "string",
  patientGender: "string",
  patientRace: "ValueX",
  patientRaceDetailed: "ValueX",
  patientEthnicity: "ValueX",
  patientEthnicityDetailed: "ValueX",
  patientCommunication: "PatientCommunication",
  patientTribalAffiliation: "ValueX",
  patientEmergencyContact: "PatientContact",
  patientCurrentJobTitle: "ValueX",
  patientTobaccoUse: "ValueX",
  patientHomelessStatus: "ValueX",
  patientPregnancyStatus: "ValueX",
  patientAlcoholUse: "ValueX",
  patientAlcoholIntake: "ValueX",
  patientAlcoholComment: "ValueX",
  patientSexualOrientation: "ValueX",
  patientGenderIdentity: "ValueX",
  patientReligion: "ValueX",
  patientMaritalStatus: "string",
  eicrIdentifier: "string",
  eicrReleaseVersion: "ValueX",
  eicrCustodianRef: "string",
  dateTimeEcrCreated: "string",
  ehrSoftware: "ValueX",
  ehrManufacturerModel: "string",
  eRSDwarnings: "Coding",
  compositionAuthorRefs: "Reference",
  encounterEndDate: "string",
  encounterStartDate: "string",
  encounterDiagnosis: "EncounterDiagnosis",
  encounterType: "string",
  encounterID: "Identifier",
  facilityContact: "string",
  facilityContactAddress: "Reference",
  facilityLocation: "string",
  facilityName: "string",
  facilityAddress: "Address",
  facilityType: "ValueX",
  compositionEncounterRef: "string",
  encounterIndividualRef: "string",
  encounterParticipants: "EncounterParticipant",
  rrDetails: "Observation",
  clinicalReasonForVisit: "ValueX",
  patientHeight: "ValueX",
  patientHeightDate: "string",
  patientWeight: "ValueX",
  patientWeightDate: "string",
  patientBmi: "ValueX",
  patientBmiDate: "string",
  resolve: "unknown",
  activeProblems: "Condition",
  activeProblemsDisplay: "string",
  activeProblemsOnsetDate: "string",
  activeProblemsOnsetAge: "ValueX",
  activeProblemsComments: "string",
  historyOfPresentIllness: "string",
  planOfTreatment: "string",
  plannedProcedures: "CarePlanActivity",
  plannedProcedureName: "string",
  plannedProcedureOrderedDate: "string",
  plannedProcedureScheduledDate: "string",
  adminMedicationsRefs: "string",
  careTeamParticipants: "CareTeamParticipant",
  careTeamParticipantMemberName: "HumanName",
  careTeamParticipantRole: "string",
  careTeamParticipantStatus: "string",
  careTeamParticipantPeriod: "string",
  immunizations: "Immunization",
  immunizationsName: "string",
  immunizationsAdminDate: "string",
  immunizationsDoseNumber: "number",
  immunizationsManufacturerName: "string",
  immunizationsLotNumber: "unknown",
  procedures: "Procedure",
  procedureName: "string",
  procedureDate: "string",
  procedureReason: "string",
  diagnosticReports: "DiagnosticReport",
  observations: "Observation",
  labResultDiv: "string",
  specimenCollectionTime: "string",
  specimenReceivedTime: "string",
  specimenSource: "string",
  observationReferenceValue: "string",
  observationComponent: "string",
  observationValue: "string",
  observationReferenceRange: "string",
  observationDeviceReference: "Reference",
  observationNote: "string",
  observationOrganism: "string",
  observationAntibiotic: "string",
  observationOrganismMethod: "string",
  observationSusceptibility: "string",
  organizations: "Organization",
  patientTravelHistory: "Observation",
  travelHistoryStartDate: "string",
  travelHistoryEndDate: "string",
  travelHistoryLocation: "string",
  travelHistoryPurpose: "string",
  stampedImmunizations: "Immunization",
};

export default fhirPathMappings;
