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
  Extension,
  HumanName,
  Identifier,
  Immunization,
  Observation,
  ObservationReferenceRange,
  Organization,
  PatientCommunication,
  PatientContact,
  Period,
  Procedure,
  Quantity,
  Reference,
  RelatedPerson,
} from "fhir/r4";

export type ValueX =
  | boolean
  | number
  | string
  | CodeableConcept
  | Coding
  | Quantity
  | Reference
  | ObservationReferenceRange;

export type TimeX = string | Period;

/**
 * Mapping from the FHIR path key to the expected type upon valuation.
 */
export type PathTypes = {
  patientNameList: HumanName;
  patientAddressList: Address;
  patientTelecom: ContactPoint;
  patientCounty: string;
  patientCountry: string;
  patientIds: string;
  patientDOB: string;
  patientVitalStatus: boolean;
  patientDOD: string;
  patientGender: string;
  patientRace: ValueX;
  patientRaceDetailed: ValueX;
  patientEthnicity: ValueX;
  patientEthnicityDetailed: ValueX;
  patientCommunication: PatientCommunication;
  patientProficiencyExtension: Extension;
  patientTribalAffiliation: ValueX;
  patientEmergencyContact: PatientContact;
  patientGuardian: RelatedPerson;
  patientOccupation: Observation;
  patientOccupationHistory: Observation;
  patientEmploymentStatus: Observation;
  patientTobaccoUse: ValueX;
  patientHomelessStatus: ValueX;
  patientAlcoholUse: ValueX;
  patientAlcoholIntake: ValueX;
  patientAlcoholComment: ValueX;
  patientSexualOrientation: ValueX;
  patientGenderIdentity: ValueX;
  patientReligion: ValueX;
  patientMaritalStatus: ValueX;
  lastMenstrualPeriod: Observation;
  pregnancyStatus: Observation;
  postpartumStatus: Observation;
  patientNationality: ValueX;
  patientCountryResidence: ValueX;
  patientDisabilityStatus: Observation;
  disabilityStatusQuestion: string;
  eicrIdentifier: string;
  eicrReleaseVersion: ValueX;
  eicrCustodianRef: string;
  dateTimeEcrCreated: string;
  ehrSoftware: ValueX;
  ehrManufacturerModel: string;
  eICRProcessingStatus: string;
  eICRProcessingStatusReason: Observation;
  compositionAuthorRefs: Reference;
  encounterPeriod: Period;
  encounterDiagnosis: EncounterDiagnosis;
  encounterType: string;
  encounterID: Identifier;
  hospitalEncounterDiagnosisRef: Reference;
  conditionCode: CodeableConcept;
  conditionOnsetDateTime: string;
  facilityContact: string;
  facilityContactAddress: string;
  facilityLocation: string;
  facilityName: string;
  facilityAddress: Address;
  facilityType: ValueX;
  compositionEncounterRef: string;
  encounterAttendingRefs: EncounterParticipant;
  encounterParticipants: EncounterParticipant;
  rrDetails: Observation;
  clinicalReasonForVisit: ValueX;
  patientVitalSigns: Observation;
  vitalSignType: CodeableConcept;
  resolve: unknown;
  activeProblems: Condition;
  activeProblemsDisplay: string;
  activeProblemsStatus: string;
  activeProblemsOnsetDate: string;
  activeProblemsOnsetAge: ValueX;
  activeProblemsComments: string;
  historyOfPresentIllness: string;
  emergencyOutbreakInfo: Observation;
  planOfTreatment: string;
  plannedProcedures: CarePlanActivity;
  plannedProcedureName: string;
  plannedProcedureOrderedDate: string;
  plannedProcedureScheduledDate: string;
  adminMedicationsRefs: string;
  adminMedicationTherapeuticResponseObs: CodeableConcept;
  careTeamParticipants: CareTeamParticipant;
  careTeamParticipantMemberName: string;
  careTeamParticipantRole: string;
  careTeamParticipantStatus: string;
  careTeamParticipantPeriod: string;
  immunizations: Immunization;
  immunizationsName: string;
  immunizationsAdminDate: string;
  immunizationsDoseNumber: ValueX;
  immunizationsManufacturerName: string;
  immunizationsLotNumber: unknown;
  procedures: Procedure;
  procedureHistoryRefs: Reference;
  procedureName: CodeableConcept;
  procedureDate: TimeX;
  procedureStatus: string;
  procedureReason: CodeableConcept;
  procedureLocationRef: Reference;
  procedureOrgRef: Reference;
  procedureBodySite: CodeableConcept;
  procedureOutcome: CodeableConcept;
  procedureComplication: CodeableConcept;
  procedureProductRef: Reference;
  procedureMedRef: Reference;
  procedureSpecimen: CodeableConcept;
  procedureMethod: CodeableConcept;
  procedurePriority: CodeableConcept;
  diagnosticReports: DiagnosticReport;
  diagnosticReportStatus: string;
  observations: Observation;
  labResultDiv: string;
  specimenCollectionTime: string;
  specimenReceivedTime: string;
  specimenSource: string;
  observationReferenceValue: string;
  observationComponent: string;
  observationValue: string;
  observationReferenceRange: ObservationReferenceRange;
  observationDeviceReference: Reference;
  observationNote: string;
  observationOrganism: string;
  observationAntibiotic: string;
  observationOrganismMethod: string;
  observationSusceptibility: string;
  observationResultStatus: string;
  organizations: Organization;
  patientTravelHistory: Observation;
  travelHistoryStartDate: string;
  travelHistoryEndDate: string;
  travelHistoryLocation: string;
  travelHistoryPurpose: string;
  stampedImmunizations: Immunization;
  effectivePeriod: Period;
  effectiveX: TimeX;
  valueX: ValueX;
};

export type FhirPathKeys = keyof PathTypes;

export interface FhirPath<K> {
  type: string;
  path: string;
  name: K;
}

// Make sure the "type" here matches the type-land type described in `PathTypes`
// "name" field is added programmatically below
const _fhirPathMappings: { [K in FhirPathKeys]: Omit<FhirPath<K>, "name"> } = {
  patientNameList: {
    type: "HumanName",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').name",
  },
  patientAddressList: {
    type: "Address",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').address",
  },
  patientTelecom: {
    type: "ContactPoint",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').telecom",
  },
  patientCounty: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').address.first().county",
  },
  patientCountry: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').address.first().country",
  },

  patientIds: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').identifier.where(system != 'urn:ietf:rfc:3986').value.join('\n')",
  },
  patientDOB: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').birthDate",
  },
  patientVitalStatus: {
    type: "boolean",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').deceasedBoolean",
  },
  patientDOD: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').deceasedDate",
  },
  patientGender: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').gender",
  },
  patientRace: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url = 'ombCategory').value",
  },
  patientRaceDetailed: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension.where(url = 'detailed').value",
  },
  patientEthnicity: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension.where(url = 'ombCategory').value",
  },
  patientEthnicityDetailed: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension.where(url = 'detailed').value",
  },
  patientCommunication: {
    type: "PatientCommunication",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').communication",
  },
  patientProficiencyExtension: {
    type: "Extension",
    path: "extension.where(url = 'http://hl7.org/fhir/StructureDefinition/patient-proficiency')",
  },
  patientTribalAffiliation: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-tribal-affiliation-extension').extension.where(url = 'TribeName').value",
  },
  patientEmergencyContact: {
    type: "PatientContact",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').contact",
  },
  patientGuardian: {
    type: "RelatedPerson",
    path: "Bundle.entry.resource.where(resourceType = 'RelatedPerson')",
  },

  // Social History
  patientOccupation: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork')",
  },
  patientOccupationHistory: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob')",
  },
  patientEmploymentStatus: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '74165-2')",
  },
  patientTobaccoUse: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '72166-2').where(category.coding.code = 'social-history').value",
  },
  patientHomelessStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '75274-1').where(category.coding.code = 'social-history').value",
  },
  patientAlcoholUse: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.where(code = '11331-6' and system = 'http://loinc.org')).value",
  },
  patientAlcoholIntake: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.where(code = '74013-4' and system = 'http://loinc.org')).value",
  },
  patientAlcoholComment: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.display = 'Alcohol Comment').value",
  },
  patientSexualOrientation: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '76690-7').value",
  },
  patientGenderIdentity: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-genderidentity-extension').value",
  },
  patientReligion: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').extension.where(url = 'http://hl7.org/fhir/StructureDefinition/patient-religion').value",
  },
  patientMaritalStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Patient').maritalStatus",
  },
  patientNationality: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.where(code = '186034007' and system = 'http://snomed.info/sct')).value",
  },
  patientCountryResidence: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.where(code = '77983-5' and system = 'http://loinc.org')).value",
  },
  patientDisabilityStatus: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-disability-status')",
  },
  disabilityStatusQuestion: {
    type: "string",
    path: "code.coding.display",
  },

  // Pregnancy Data
  lastMenstrualPeriod: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(code.coding.exists(system = 'http://loinc.org' and code = '8665-2'))",
  },
  pregnancyStatus: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-pregnancy-status-observation')",
  },
  postpartumStatus: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(code.coding.exists(system = 'http://snomed.info/sct' and code = '249197004'))",
  },

  // eCR Metadata
  eicrIdentifier: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').id",
  },
  eicrReleaseVersion: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').extension.where(url = 'https://www.hl7.org/implement/standards/product_brief.cfm?product_id=436').value",
  },
  eicrCustodianRef: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').custodian.reference",
  },
  dateTimeEcrCreated: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').date",
  },
  ehrSoftware: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Device').where(property[0].type.coding.code = 'software').version.value",
  },
  ehrManufacturerModel: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Device').where(property[0].type.coding.code = 'software').manufacturer",
  },
  eICRProcessingStatus: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-observation').code.coding.code",
  },
  eICRProcessingStatusReason: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-reason-observation')",
  },
  compositionAuthorRefs: {
    type: "Reference",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').author",
  },

  // Encounter Info
  encounterPeriod: {
    type: "Period",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter').period",
  },
  encounterDiagnosis: {
    type: "EncounterDiagnosis",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter').diagnosis",
  },
  encounterType: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter')[0].class.display",
  },
  encounterID: {
    type: "Identifier",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter')[0].identifier",
  },

  hospitalEncounterDiagnosisRef: {
    type: "Reference",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').section.where(code.coding.code = %code).entry",
  },

  conditionCode: {
    type: "CodeableConcept",
    path: "Condition.code",
  },
  conditionOnsetDateTime: {
    type: "string",
    path: "Condition.onsetDateTime",
  },

  facilityContact: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Location')[0].telecom.where(system = 'phone')[0].value",
  },
  facilityContactAddress: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter')[0].serviceProvider.reference",
  },
  facilityLocation: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter')[0].location[0].location.reference",
  },
  facilityName: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter')[0].location[0].location.display",
  },
  facilityAddress: {
    type: "Address",
    path: "Bundle.entry.resource.where(resourceType = 'Location')[0].address",
  },
  facilityType: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter')[0].location[0].extension.where(url = 'http://build.fhir.org/ig/HL7/case-reporting/StructureDefinition-us-ph-location-definitions.html//Location.type').value",
  },
  compositionEncounterRef: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').encounter.reference",
  },
  encounterAttendingRefs: {
    type: "EncounterParticipant",
    path: "Encounter.participant.where(type.coding.code = 'ATND')",
  },
  encounterParticipants: {
    type: "EncounterParticipant",
    path: "Encounter.participant",
  },

  rrDetails: {
    type: "Observation",
    path: "Bundle.entry.resource.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-reportability-information-observation')",
  },

  // Vitals
  patientVitalSigns: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(category.coding.code = 'vital-signs')",
  },
  vitalSignType: {
    type: "CodeableConcept",
    path: "code",
  },

  resolve: {
    type: "unknown",
    path: "Bundle.entry.resource.where(resourceType = %resourceType).where(id = %id)",
  },

  // Clinical Info
  clinicalReasonForVisit: {
    type: "ValueX",
    path: "Bundle.entry.resource.section.where(title.lower() = 'reason for visit')[0].extension[0].value",
  },
  activeProblems: {
    type: "Condition",
    path: "Bundle.entry.resource.where(resourceType = 'Condition').where(category.coding.code = 'problem-item-list')",
  },
  activeProblemsDisplay: {
    type: "string",
    path: "Condition.code.coding.display.first()",
  },
  activeProblemsStatus: {
    type: "string",
    path: "Condition.clinicalStatus.coding.display",
  },
  activeProblemsOnsetDate: { type: "string", path: "Condition.onsetDateTime" },
  activeProblemsOnsetAge: { type: "ValueX", path: "Condition.onsetAge.value" },
  activeProblemsComments: { type: "string", path: "Condition.note[0].text" },
  historyOfPresentIllness: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').section.where(code.coding.code = '10164-2').text.`div`.first()",
  },
  emergencyOutbreakInfo: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-emergency-outbreak-information')",
  },

  // Treatment Details
  planOfTreatment: {
    type: "string",
    path: "Bundle.entry.resource.section.where(title = 'Plan of Treatment').text.first().`div`",
  },
  plannedProcedures: {
    type: "CarePlanActivity",
    path: "Bundle.entry.resource.where(resourceType = 'CarePlan').activity",
  },
  plannedProcedureName: {
    type: "string",
    path: "detail.code.coding[0].display",
  },
  plannedProcedureOrderedDate: {
    type: "string",
    path: "extension.where(url = 'dibbs.orderedDate').valueString",
  },
  plannedProcedureScheduledDate: {
    type: "string",
    path: "detail.scheduledString",
  },

  // Administered Medications
  adminMedicationsRefs: {
    type: "string",
    path: "Bundle.entry.resource.section.where(code.coding[0].code = '29549-3').entry.reference",
  },
  adminMedicationTherapeuticResponseObs: {
    type: "CodeableConcept",
    path: "extension.where(url = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-therapeutic-medication-response-extension').valueCodeableConcept",
  },

  // CareTeam
  careTeamParticipants: {
    type: "CareTeamParticipant",
    path: "Bundle.entry.resource.where(resourceType = 'CareTeam').participant",
  },
  careTeamParticipantMemberName: { type: "string", path: "member.name" },
  careTeamParticipantRole: { type: "string", path: "role.text" },
  careTeamParticipantStatus: {
    type: "string",
    path: "modifierExtension.where(url = 'participant.status').valueString",
  },
  careTeamParticipantPeriod: { type: "string", path: "period.text" },

  // Immunization Info
  immunizations: {
    type: "Immunization",
    path: "Bundle.entry.resource.where(resourceType = 'Immunization')",
  },
  immunizationsName: {
    type: "string",
    path: "Immunization.vaccineCode.coding.display.first()",
  },
  immunizationsAdminDate: {
    type: "string",
    path: "Immunization.occurrenceDateTime",
  },
  immunizationsDoseNumber: {
    // TODO #469: This should strictly speaking be "number", but conversion is buggy
    type: "ValueX",
    path: "Immunization.protocolApplied.where(doseNumberPositiveInt.exists()).doseNumberPositiveInt",
  },
  immunizationsManufacturerName: {
    type: "string",
    path: "Immunization.manufacturer.name",
  },
  immunizationsLotNumber: { type: "unknown", path: "Immunization.lotNumber" },

  // === Procedure ===
  procedures: {
    type: "Procedure",
    path: "Bundle.entry.resource.where(resourceType = 'Procedure')",
  },
  procedureHistoryRefs: {
    type: "Reference",
    path: "Bundle.entry.resource.section.where(code.coding[0].code = '47519-4').entry.where(reference.startsWith('Observation/'))",
  },

  // core fields
  procedureName: {
    type: "CodeableConcept",
    path: "code",
  },
  procedureDate: {
    type: "TimeX",
    path: "Procedure.performed | Observation.effective",
  },
  procedureStatus: { type: "string", path: "status" },

  // extra details
  procedureReason: { type: "CodeableConcept", path: "Procedure.reasonCode" },
  procedureLocationRef: { type: "Reference", path: "Procedure.location" },
  procedureOrgRef: { type: "Reference", path: "Procedure.performer.actor" },
  procedureBodySite: { type: "CodeableConcept", path: "bodySite" },
  procedureOutcome: { type: "CodeableConcept", path: "Observation.value" },
  procedureComplication: {
    type: "CodeableConcept",
    path: "Procedure.complication",
  },
  procedureProductRef: { type: "Reference", path: "Procedure.usedReference" },
  procedureMedRef: {
    type: "Reference",
    path: "Procedure.extension.where(url = 'medicationAdministration').value",
  },
  procedureSpecimen: {
    type: "CodeableConcept",
    path: "Procedure.extension.where(url = 'specimen').value",
  },
  procedureMethod: {
    type: "CodeableConcept",
    path: "Procedure.extension.where(url = 'http://hl7.org/fhir/StructureDefinition/procedure-method').value | Observation.method",
  },
  procedurePriority: {
    type: "CodeableConcept",
    path: "Procedure.extension.where(url = 'priorityCode').value",
  },

  // === Lab Info ===
  diagnosticReports: {
    type: "DiagnosticReport",
    path: "Bundle.entry.resource.where(resourceType = 'DiagnosticReport')",
  },
  diagnosticReportStatus: {
    type: "string",
    path: "iif(extension.where(url = 'http://terminology.hl7.org/CodeSystem/v2-0123').valueCodeableConcept.coding[0].display.exists(), extension.where(url = 'http://terminology.hl7.org/CodeSystem/v2-0123').valueCodeableConcept.coding[0].display, status)",
  },
  observations: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation')",
  },
  labResultDiv: {
    type: "string",
    path: "Bundle.entry.resource.section.where(code.coding[0].code = '30954-2').text.`div`.first()",
  },
  specimenCollectionTime: {
    type: "string",
    path: "Observation.extension[0].extension.where(url = 'specimen collection time').valueDateTime",
  },
  specimenReceivedTime: {
    type: "string",
    path: "Observation.extension[0].extension.where(url = 'specimen receive time').valueDateTime",
  },
  specimenSource: {
    type: "string",
    path: "Observation.extension[0].extension.where(url = 'specimen source').valueString",
  },
  observationReferenceValue: {
    type: "string",
    path: "Observation.extension[0].extension.where(url = 'observation entry reference value').valueString",
  },
  observationComponent: { type: "string", path: "code.coding.display.first()" },
  observationValue: {
    type: "string",
    path: "(valueQuantity.value.toString() | valueString | valueCodeableConcept.coding.display | iif(valueQuantity.unit.exists(), iif(valueQuantity.unit = '%', valueQuantity.unit, ' ' + valueQuantity.unit), '') | iif(interpretation.coding.display.exists(), ' (' + interpretation.coding.display + ')', '')).join('')",
  },
  observationReferenceRange: {
    type: "ObservationReferenceRange",
    path: "referenceRange",
  },
  observationDeviceReference: { type: "string", path: "device.reference" },
  observationNote: { type: "string", path: "note.text" },
  observationOrganism: { type: "string", path: "code.coding.display.first()" },
  observationAntibiotic: {
    type: "string",
    path: "code.coding.display.first()",
  },
  observationOrganismMethod: {
    type: "string",
    path: "extension.where(url = 'methodCode originalText').valueString",
  },
  observationSusceptibility: { type: "string", path: "valueString" },
  observationResultStatus: {
    type: "string",
    path: "iif(extension.where(url = 'http://terminology.hl7.org/ValueSet/v2-0085').valueCodeableConcept.coding[0].display.exists(), extension.where(url = 'http://terminology.hl7.org/ValueSet/v2-0085').valueCodeableConcept.coding[0].display, status)",
  },

  // Organization
  organizations: {
    type: "Organization",
    path: "Bundle.entry.resource.where(resourceType = 'Organization')",
  },

  // Travel History
  patientTravelHistory: {
    type: "Observation",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-travel-history')",
  },
  travelHistoryStartDate: { type: "string", path: "effectivePeriod.start" },
  travelHistoryEndDate: { type: "string", path: "effectivePeriod.end" },
  travelHistoryLocation: {
    type: "string",
    path: "component.where(code.coding.code = 'LOC').valueCodeableConcept.text",
  },
  travelHistoryPurpose: {
    type: "string",
    path: "component.where(code.coding.code = '280147009').valueCodeableConcept.coding.display",
  },

  // Stamped
  stampedImmunizations: {
    type: "Immunization",
    path: "entry.resource.where(extension('https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code').valueCoding.code = %snomedCode and resourceType = 'Immunization')",
  },

  // Generic Observation
  effectivePeriod: {
    type: "Period",
    path: "effectivePeriod",
  },
  valueX: {
    type: "ValueX",
    path: "value",
  },
  effectiveX: {
    type: "TimeX",
    path: "effective",
  },
};

const fhirPathMappings: { [K in FhirPathKeys]: FhirPath<K> } = (
  Object.keys(_fhirPathMappings) as FhirPathKeys[]
).reduce(
  (acc, cur) => {
    acc[cur].name = cur;
    return acc;
  },
  _fhirPathMappings as { [K in FhirPathKeys]: FhirPath<K> },
);

export default fhirPathMappings;
