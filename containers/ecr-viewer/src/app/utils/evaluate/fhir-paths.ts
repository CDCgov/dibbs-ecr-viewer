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
  Organization,
  PatientCommunication,
  PatientContact,
  Procedure,
  Quantity,
  Reference,
} from "fhir/r4";

export type ValueX =
  | boolean
  | number
  | string
  | CodeableConcept
  | Coding
  | Quantity;

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
  patientMaritalStatus: ValueX;
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
  facilityContactAddress: string;
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

export type FhirPathKeys = keyof PathTypes;

export interface FhirPath<K> {
  type: string;
  path: string;
  name: K;
}

// Make sure the "type" here matches the type-land type descrived in `PathTypes`
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

  // Social History
  patientCurrentJobTitle: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob').where(effectivePeriod.end.exists().not()).value",
  },
  patientTobaccoUse: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '72166-2').where(category.coding.code = 'social-history').value",
  },
  patientHomelessStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '75274-1').where(category.coding.code = 'social-history').value",
  },
  patientPregnancyStatus: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-pregnancy-status-observation').value",
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
  eRSDwarnings: {
    type: "Coding",
    path: "Bundle.entry.resource.where(resourceType =  'Composition').section.where(title = 'Reportability Response Information Section').extension.where(url = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-extension').valueCodeableConcept.coding.entries.eRSDwarnings",
  },
  compositionAuthorRefs: {
    type: "Reference",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').author",
  },

  // Encounter Info
  encounterEndDate: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter').period.end",
  },
  encounterStartDate: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Encounter').period.start",
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
  encounterIndividualRef: {
    type: "string",
    path: "Encounter.participant.where(type.coding.code = 'ATND').individual.reference",
  },
  encounterParticipants: {
    type: "EncounterParticipant",
    path: "Encounter.participant",
  },

  rrDetails: {
    type: "Observation",
    path: "Bundle.entry.resource.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-reportability-information-observation')",
  },

  // Clinical Data
  clinicalReasonForVisit: {
    type: "ValueX",
    path: "Bundle.entry.resource.section.where(title.lower() = 'reason for visit')[0].extension[0].value",
  },

  // Vitals
  patientHeight: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.code = '8302-2').first().value",
  },
  patientHeightDate: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.first().code = '8302-2').first().effectiveDateTime",
  },
  patientWeight: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.first().code = '29463-7').first().value",
  },
  patientWeightDate: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.first().code = '29463-7').first().effectiveDateTime",
  },
  patientBmi: {
    type: "ValueX",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.first().code = '39156-5').value",
  },
  patientBmiDate: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Observation').where(code.coding.first().code = '39156-5').effectiveDateTime",
  },
  resolve: {
    type: "unknown",
    path: "Bundle.entry.resource.where(resourceType = %resourceType).where(id = %id)",
  },

  // Clinical Info
  activeProblems: {
    type: "Condition",
    path: "Bundle.entry.resource.where(resourceType = 'Condition').where(category.coding.code = 'problem-item-list')",
  },
  activeProblemsDisplay: {
    type: "string",
    path: "Condition.code.coding.display.first()",
  },
  activeProblemsOnsetDate: { type: "string", path: "Condition.onsetDateTime" },
  activeProblemsOnsetAge: { type: "ValueX", path: "Condition.onsetAge.value" },
  activeProblemsComments: { type: "string", path: "Condition.note[0].text" },
  historyOfPresentIllness: {
    type: "string",
    path: "Bundle.entry.resource.where(resourceType = 'Composition').section.where(code.coding.code = '10164-2').text.`div`.first()",
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

  // CareTEam
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
  procedures: {
    type: "Procedure",
    path: "Bundle.entry.resource.where(resourceType = 'Procedure')",
  },

  // Procedure
  procedureName: {
    type: "string",
    path: "Procedure.code.coding.iif(where(system = 'http://loinc.org').display.exists(), where(system = 'http://loinc.org').display, display.first())",
  },
  procedureDate: { type: "string", path: "Procedure.performedDateTime" },
  procedureReason: { type: "string", path: "Procedure.reason.display" },

  // Lab Info
  diagnosticReports: {
    type: "DiagnosticReport",
    path: "Bundle.entry.resource.where(resourceType = 'DiagnosticReport')",
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
  observationReferenceRange: { type: "string", path: "referenceRange.text" },
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
