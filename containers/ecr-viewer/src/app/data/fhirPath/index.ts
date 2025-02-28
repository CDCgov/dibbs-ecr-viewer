import {
  Address,
  CareTeamParticipant,
  CodeableConcept,
  Coding,
  Communication,
  Condition,
  ContactDetail,
  DiagnosticReport,
  EncounterParticipant,
  HumanName,
  Identifier,
  Immunization,
  Observation,
  Organization,
  Procedure,
  Quantity,
  Reference,
} from "fhir/r4";

import fhirPathMappings from "./data";

export type PathMappings = typeof fhirPathMappings;

type ValueX = string | CodeableConcept | Coding | number | boolean | Quantity;

export type PathTypes = {
  patientNameList: HumanName;
  patientAddressList: Address;
  patientTelecom: Communication;
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
  patientCommunication: Communication;
  patientTribalAffiliation: ValueX;
  patientEmergencyContact: ContactDetail;
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
  eicrCustodianRef: Reference;
  dateTimeEcrCreated: string;
  ehrSoftware: ValueX;
  ehrManufacturerModel: unknown;
  eRSDwarnings: unknown;
  compositionAuthorRefs: unknown;
  encounterEndDate: string;
  encounterStartDate: string;
  encounterDiagnosis: unknown;
  encounterType: string;
  encounterID: Identifier;
  facilityContact: string;
  facilityContactAddress: Address;
  facilityLocation: Reference;
  facilityName: string;
  facilityAddress: Address;
  facilityType: ValueX;
  compositionEncounterRef: Reference;
  encounterIndividualRef: Reference;
  encounterParticipants: EncounterParticipant;
  rrDetails: unknown;
  clinicalReasonForVisit: ValueX;
  patientHeight: ValueX;
  patientHeightMeasurement: string;
  patientHeightDate: string;
  patientWeight: ValueX;
  patientWeightMeasurement: string;
  patientWeightDate: string;
  patientBmi: ValueX;
  patientBmiMeasurement: string;
  patientBmiDate: string;
  resolve: unknown;
  activeProblems: Condition;
  activeProblemsDisplay: string;
  activeProblemsOnsetDate: string;
  activeProblemsOnsetAge: ValueX;
  activeProblemsComments: string;
  historyOfPresentIllness: string;
  planOfTreatment: string;
  plannedProcedures: unknown;
  plannedProcedureName: string;
  plannedProcedureOrderedDate: string;
  plannedProcedureScheduledDate: string;
  adminMedicationsRefs: Reference;
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

export default fhirPathMappings;
