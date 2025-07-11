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
  patientPregnancyStatus: ValueX;
  patientAlcoholUse: ValueX;
  patientAlcoholIntake: ValueX;
  patientAlcoholComment: ValueX;
  patientSexualOrientation: ValueX;
  patientGenderIdentity: ValueX;
  patientReligion: ValueX;
  patientMaritalStatus: ValueX;
  patientNationality: ValueX;
  patientCountryResidence: ValueX;
  patientDisabilityStatus: Observation;
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
  resolve: unknown;
  activeProblems: Condition;
  activeProblemsDisplay: string;
  activeProblemsStatus: string;
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
  observationValue: string;
  observationReferenceRange: ObservationReferenceRange;
  observationDeviceReference: Reference;
  observationNote: string;
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
  codeableConceptDisplay: string;
  conditionOnsetDate: string;
  effectiveX: TimeX;
  code: CodeableConcept;
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
    path: "Bundle.entry.resource.Patient.name",
  },
  patientAddressList: {
    type: "Address",
    path: "Bundle.entry.resource.Patient.address",
  },
  patientTelecom: {
    type: "ContactPoint",
    path: "Bundle.entry.resource.Patient.telecom",
  },
  patientCounty: {
    type: "string",
    path: "Bundle.entry.resource.Patient.address.county",
  },
  patientCountry: {
    type: "string",
    path: "Bundle.entry.resource.Patient.address.country",
  },

  patientIds: {
    type: "string",
    path: "Bundle.entry.resource.Patient.identifier.where(system != 'urn:ietf:rfc:3986').value.join('\n')",
  },
  patientDOB: {
    type: "string",
    path: "Bundle.entry.resource.Patient.birthDate",
  },
  patientVitalStatus: {
    type: "boolean",
    path: "Bundle.entry.resource.Patient.deceasedBoolean",
  },
  patientDOD: {
    type: "string",
    path: "Bundle.entry.resource.Patient.deceasedDate",
  },
  patientGender: {
    type: "string",
    path: "Bundle.entry.resource.Patient.gender",
  },
  patientRace: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension('ombCategory').value",
  },
  patientRaceDetailed: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension('detailed').value",
  },
  patientEthnicity: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension('ombCategory').value",
  },
  patientEthnicityDetailed: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension('detailed').value",
  },
  patientCommunication: {
    type: "PatientCommunication",
    path: "Bundle.entry.resource.Patient.communication",
  },
  patientProficiencyExtension: {
    type: "Extension",
    path: "extension('http://hl7.org/fhir/StructureDefinition/patient-proficiency')",
  },
  patientTribalAffiliation: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-tribal-affiliation-extension').extension('TribeName').value",
  },
  patientEmergencyContact: {
    type: "PatientContact",
    path: "Bundle.entry.resource.Patient.contact",
  },
  patientGuardian: {
    type: "RelatedPerson",
    path: "Bundle.entry.resource.RelatedPerson",
  },

  // Social History
  patientOccupation: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork')",
  },
  patientOccupationHistory: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob')",
  },
  patientEmploymentStatus: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(code.coding.code = '74165-2')",
  },
  patientTobaccoUse: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.code = '72166-2').where(category.coding.code = 'social-history').value",
  },
  patientHomelessStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.code = '75274-1').where(category.coding.code = 'social-history').value",
  },
  patientPregnancyStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-pregnancy-status-observation').value",
  },
  patientAlcoholUse: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.where(code = '11331-6' and system = 'http://loinc.org')).value",
  },
  patientAlcoholIntake: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.where(code = '74013-4' and system = 'http://loinc.org')).value",
  },
  patientAlcoholComment: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.display = 'Alcohol Comment').value",
  },
  patientSexualOrientation: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.code = '76690-7').value",
  },
  patientGenderIdentity: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-genderidentity-extension').value",
  },
  patientReligion: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.extension('http://hl7.org/fhir/StructureDefinition/patient-religion').value",
  },
  patientMaritalStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.Patient.maritalStatus",
  },
  patientNationality: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.where(code = '186034007' and system = 'http://snomed.info/sct')).value",
  },
  patientCountryResidence: {
    type: "ValueX",
    path: "Bundle.entry.resource.Observation.where(code.coding.where(code = '77983-5' and system = 'http://loinc.org')).value",
  },
  patientDisabilityStatus: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-disability-status')",
  },

  // eCR Metadata
  eicrIdentifier: {
    type: "string",
    path: "Bundle.entry.resource.Composition.id",
  },
  eicrReleaseVersion: {
    type: "ValueX",
    path: "Bundle.entry.resource.Composition.extension('https://www.hl7.org/implement/standards/product_brief.cfm?product_id=436').value",
  },
  eicrCustodianRef: {
    type: "string",
    path: "Bundle.entry.resource.Composition.custodian.reference",
  },
  dateTimeEcrCreated: {
    type: "string",
    path: "Bundle.entry.resource.Composition.date",
  },
  ehrSoftware: {
    type: "ValueX",
    path: "Bundle.entry.resource.Device.where(property.type.coding.code = 'software').version.value",
  },
  ehrManufacturerModel: {
    type: "string",
    path: "Bundle.entry.resource.Device.where(property.type.coding.code = 'software').manufacturer",
  },
  eICRProcessingStatus: {
    type: "string",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-observation').code.coding.code",
  },
  eICRProcessingStatusReason: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-reason-observation')",
  },
  compositionAuthorRefs: {
    type: "Reference",
    path: "Bundle.entry.resource.Composition.author",
  },

  // Encounter Info
  encounterPeriod: {
    type: "Period",
    path: "Bundle.entry.resource.Encounter.period",
  },
  encounterDiagnosis: {
    type: "EncounterDiagnosis",
    path: "Bundle.entry.resource.Encounter.diagnosis",
  },
  encounterType: {
    type: "string",
    path: "Bundle.entry.resource.Encounter.class.display",
  },
  encounterID: {
    type: "Identifier",
    path: "Bundle.entry.resource.Encounter.identifier",
  },

  hospitalEncounterDiagnosisRef: {
    type: "Reference",
    path: "Bundle.entry.resource.Composition.section.where(code.coding.code = %code).entry",
  },

  conditionCode: {
    type: "CodeableConcept",
    path: "Condition.code",
  },

  facilityContact: {
    type: "string",
    path: "Bundle.entry.resource.Location.telecom.where(system = 'phone').value",
  },
  facilityContactAddress: {
    type: "string",
    path: "Bundle.entry.resource.Encounter.serviceProvider.reference",
  },
  facilityLocation: {
    type: "string",
    path: "Bundle.entry.resource.Encounter.location.location.reference",
  },
  facilityName: {
    type: "string",
    path: "Bundle.entry.resource.Encounter.location.location.display",
  },
  facilityAddress: {
    type: "Address",
    path: "Bundle.entry.resource.Location.address",
  },
  facilityType: {
    type: "ValueX",
    path: "Bundle.entry.resource.Encounter.location.extension('http://build.fhir.org/ig/HL7/case-reporting/StructureDefinition-us-ph-location-definitions.html//Location.type').value",
  },
  compositionEncounterRef: {
    type: "string",
    path: "Bundle.entry.resource.Composition.encounter.reference",
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
    path: "Bundle.entry.resource.Observation.where(category.coding.code = 'vital-signs')",
  },

  resolve: {
    type: "unknown",
    path: "Bundle.entry.resource.where(resourceType = %resourceType).where(id = %id)",
  },

  // Clinical Info
  clinicalReasonForVisit: {
    type: "ValueX",
    path: "Bundle.entry.resource.section.where(title.lower() = 'reason for visit').extension.value",
  },
  activeProblems: {
    type: "Condition",
    path: "Bundle.entry.resource.Condition.where(category.coding.code = 'problem-item-list')",
  },
  activeProblemsDisplay: {
    type: "string",
    path: "Condition.code.coding.display",
  },
  activeProblemsStatus: {
    type: "string",
    path: "Condition.clinicalStatus.coding.display",
  },
  activeProblemsOnsetAge: { type: "ValueX", path: "Condition.onsetAge.value" },
  activeProblemsComments: { type: "string", path: "Condition.note.text" },
  historyOfPresentIllness: {
    type: "string",
    path: "Bundle.entry.resource.Composition.section.where(code.coding.code = '10164-2').text.`div`",
  },
  emergencyOutbreakInfo: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-emergency-outbreak-information')",
  },

  // Treatment Details
  planOfTreatment: {
    type: "string",
    path: "Bundle.entry.resource.section.where(title = 'Plan of Treatment').text.`div`",
  },
  plannedProcedures: {
    type: "CarePlanActivity",
    path: "Bundle.entry.resource.CarePlan.activity",
  },
  plannedProcedureName: {
    type: "string",
    path: "detail.code.coding.display",
  },
  plannedProcedureOrderedDate: {
    type: "string",
    path: "extension('dibbs.orderedDate').valueString",
  },
  plannedProcedureScheduledDate: {
    type: "string",
    path: "detail.scheduledString",
  },

  // Administered Medications
  adminMedicationsRefs: {
    type: "string",
    path: "Bundle.entry.resource.section.where(code.coding.code = '29549-3').entry.reference",
  },

  // CareTeam
  careTeamParticipants: {
    type: "CareTeamParticipant",
    path: "Bundle.entry.resource.CareTeam.participant",
  },
  careTeamParticipantMemberName: { type: "string", path: "member.name" },
  careTeamParticipantRole: { type: "string", path: "role.text" },
  careTeamParticipantStatus: {
    type: "string",
    path: "modifierextension('participant.status').valueString",
  },
  careTeamParticipantPeriod: { type: "string", path: "period.text" },

  // Immunization Info
  immunizations: {
    type: "Immunization",
    path: "Bundle.entry.resource.Immunization",
  },
  immunizationsName: {
    type: "string",
    path: "Immunization.vaccineCode.coding.display",
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
    path: "Bundle.entry.resource.Procedure",
  },
  procedureHistoryRefs: {
    type: "Reference",
    path: "Bundle.entry.resource.section.where(code.coding.code = '47519-4').entry.where(reference.startsWith('Observation/'))",
  },

  // core fields
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
    path: "Procedure.extension('medicationAdministration').value",
  },
  procedureSpecimen: {
    type: "CodeableConcept",
    path: "Procedure.extension('specimen').value",
  },
  procedureMethod: {
    type: "CodeableConcept",
    path: "Procedure.extension('http://hl7.org/fhir/StructureDefinition/procedure-method').value | Observation.method",
  },
  procedurePriority: {
    type: "CodeableConcept",
    path: "Procedure.extension('priorityCode').value",
  },

  // === Lab Info ===
  diagnosticReports: {
    type: "DiagnosticReport",
    path: "Bundle.entry.resource.DiagnosticReport",
  },
  diagnosticReportStatus: {
    type: "string",
    path: "iif(extension('http://terminology.hl7.org/CodeSystem/v2-0123').valueCodeableConcept.coding.display.exists(), extension('http://terminology.hl7.org/CodeSystem/v2-0123').valueCodeableConcept.coding.display, status)",
  },
  observations: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation",
  },
  labResultDiv: {
    type: "string",
    path: "Bundle.entry.resource.section.where(code.coding.code = '30954-2').text.`div`",
  },
  specimenCollectionTime: {
    type: "string",
    path: "Observation.extension.extension('specimen collection time').valueDateTime",
  },
  specimenReceivedTime: {
    type: "string",
    path: "Observation.extension.extension('specimen receive time').valueDateTime",
  },
  specimenSource: {
    type: "string",
    path: "Observation.extension.extension('specimen source').valueString",
  },
  observationReferenceValue: {
    type: "string",
    path: "Observation.extension.extension('observation entry reference value').valueString",
  },
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
  observationOrganismMethod: {
    type: "string",
    path: "extension('methodCode originalText').valueString",
  },
  observationSusceptibility: { type: "string", path: "valueString" },
  observationResultStatus: {
    type: "string",
    path: "iif(extension('http://terminology.hl7.org/ValueSet/v2-0085').valueCodeableConcept.coding.display.exists(), extension('http://terminology.hl7.org/ValueSet/v2-0085').valueCodeableConcept.coding.display, status)",
  },

  // Organization
  organizations: {
    type: "Organization",
    path: "Bundle.entry.resource.Organization",
  },

  // Travel History
  patientTravelHistory: {
    type: "Observation",
    path: "Bundle.entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-travel-history')",
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

  // Generic

  codeableConceptDisplay: {
    type: "string",
    path: "code.coding.display",
  },

  conditionOnsetDate: {
    type: "string",
    path: "Condition.onsetDateTime",
  },

  code: {
    type: "CodeableConcept",
    path: "code",
  },
  effectiveX: {
    type: "TimeX",
    path: "effective",
  },
  valueX: {
    type: "ValueX",
    path: "value",
  },
};

type FhirPathMappings = { [K in FhirPathKeys]: FhirPath<K> };

const fhirPathMappings: FhirPathMappings = (
  Object.keys(_fhirPathMappings) as FhirPathKeys[]
).reduce((acc, cur) => {
  acc[cur].name = cur;
  return acc;
}, _fhirPathMappings as FhirPathMappings);

export default fhirPathMappings;
