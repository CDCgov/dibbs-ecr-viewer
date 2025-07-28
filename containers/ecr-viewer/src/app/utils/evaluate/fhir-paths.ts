import {
  Address,
  CarePlanActivity,
  CareTeamParticipant,
  CodeableConcept,
  Coding,
  Condition,
  ContactPoint,
  DiagnosticReport,
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
  encounterDiagnosisRef: Reference;
  encounterType: string;
  encounterID: Identifier;
  hospitalEncounterDiagnosisRef: Reference;
  facilityOrgRef: string;
  facilityLocationRef: string;
  facilityName: string;
  facilityType: ValueX;
  compositionEncounterRef: string;
  encounterAttendingRefs: EncounterParticipant;
  encounterParticipants: EncounterParticipant;
  rrDetails: Observation;
  clinicalReasonForVisit: ValueX;
  patientVitalSigns: Observation;
  resolve: unknown;
  activeProblems: Condition;
  activeProblemsStatus: string;
  activeProblemsOnsetAge: ValueX;
  historyOfPresentIllness: string;
  emergencyOutbreakInfo: Observation;
  planOfTreatment: CarePlanActivity;
  authoredOn: TimeX;
  plannedActivityName: CodeableConcept;
  plannedActivityType: string;
  plannedActivityTime: TimeX;
  plannedMedicationName: CodeableConcept;
  plannedMedicationDosage: ValueX;
  adminMedicationsRefs: string;
  adminMedicationTherapeuticResponseObs: CodeableConcept;
  careTeamParticipants: CareTeamParticipant;
  careTeamParticipantMemberName: string;
  careTeamParticipantRole: string;
  careTeamParticipantStatus: string;
  careTeamParticipantPeriod: string;
  immunizations: Immunization;
  immunizationsName: CodeableConcept;
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
  specimenCollectionTime: TimeX;
  specimenReceivedTime: TimeX;
  specimenSource: CodeableConcept;
  specimenBodySite: CodeableConcept;
  observationReferenceValue: string;
  observationValue: string;
  observationReferenceRange: ObservationReferenceRange;
  observationDeviceReference: Reference;
  observationOrganismMethod: ValueX;
  observationResultStatus: string;
  organizations: Organization;
  patientTravelHistory: Observation;
  travelHistoryStartDate: string;
  travelHistoryEndDate: string;
  travelHistoryLocation: string;
  travelHistoryPurpose: ValueX;
  stampedImmunizations: Immunization;
  codeableConceptDisplay: string;
  conditionOnsetDate: string;
  effectiveX: TimeX;
  code: CodeableConcept;
  noteText: string;
  valueX: ValueX;
  occurrenceX: TimeX;
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
    path: "entry.resource.Patient.name",
  },
  patientAddressList: {
    type: "Address",
    path: "entry.resource.Patient.address",
  },
  patientTelecom: {
    type: "ContactPoint",
    path: "entry.resource.Patient.telecom",
  },

  patientIds: {
    type: "string",
    path: "entry.resource.Patient.identifier.where(system != 'urn:ietf:rfc:3986').value.join('\n')",
  },
  patientDOB: {
    type: "string",
    path: "entry.resource.Patient.birthDate",
  },
  patientVitalStatus: {
    type: "boolean",
    path: "entry.resource.Patient.deceasedBoolean",
  },
  patientDOD: {
    type: "string",
    path: "entry.resource.Patient.deceasedDate",
  },
  patientGender: {
    type: "string",
    path: "entry.resource.Patient.gender",
  },
  patientRace: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension('ombCategory').value",
  },
  patientRaceDetailed: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-race').extension('detailed').value",
  },
  patientEthnicity: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension('ombCategory').value",
  },
  patientEthnicityDetailed: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity').extension('detailed').value",
  },
  patientCommunication: {
    type: "PatientCommunication",
    path: "entry.resource.Patient.communication",
  },
  patientProficiencyExtension: {
    type: "Extension",
    path: "extension('http://hl7.org/fhir/StructureDefinition/patient-proficiency')",
  },
  patientTribalAffiliation: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-tribal-affiliation-extension').extension('TribeName').value",
  },
  patientEmergencyContact: {
    type: "PatientContact",
    path: "entry.resource.Patient.contact",
  },
  patientGuardian: {
    type: "RelatedPerson",
    path: "entry.resource.RelatedPerson",
  },

  // Social History
  patientOccupation: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-UsualWork')",
  },
  patientOccupationHistory: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob')",
  },
  patientEmploymentStatus: {
    type: "Observation",
    path: "entry.resource.Observation.where(code.coding.code = '74165-2')",
  },
  patientTobaccoUse: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.code = '72166-2').where(category.coding.code = 'social-history').value",
  },
  patientHomelessStatus: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.code = '75274-1').where(category.coding.code = 'social-history').value",
  },
  patientAlcoholUse: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.where(code = '11331-6' and system = 'http://loinc.org')).value",
  },
  patientAlcoholIntake: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.where(code = '74013-4' and system = 'http://loinc.org')).value",
  },
  patientAlcoholComment: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.display = 'Alcohol Comment').value",
  },
  patientSexualOrientation: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.code = '76690-7').value",
  },
  patientGenderIdentity: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-genderidentity-extension').value",
  },
  patientReligion: {
    type: "ValueX",
    path: "entry.resource.Patient.extension('http://hl7.org/fhir/StructureDefinition/patient-religion').value",
  },
  patientMaritalStatus: {
    type: "ValueX",
    path: "entry.resource.Patient.maritalStatus",
  },
  patientNationality: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.where(code = '186034007' and system = 'http://snomed.info/sct')).value",
  },
  patientCountryResidence: {
    type: "ValueX",
    path: "entry.resource.Observation.where(code.coding.where(code = '77983-5' and system = 'http://loinc.org')).value",
  },
  patientDisabilityStatus: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-disability-status')",
  },

  // Pregnancy Data
  lastMenstrualPeriod: {
    type: "Observation",
    path: "entry.resource.Observation.where(code.coding.exists(system = 'http://loinc.org' and code = '8665-2'))",
  },
  pregnancyStatus: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-pregnancy-status-observation')",
  },
  postpartumStatus: {
    type: "Observation",
    path: "entry.resource.Observation.where(code.coding.exists(system = 'http://snomed.info/sct' and code = '249197004'))",
  },

  // eCR Metadata
  eicrIdentifier: {
    type: "string",
    path: "entry.resource.Composition.id",
  },
  eicrReleaseVersion: {
    type: "ValueX",
    path: "entry.resource.Composition.extension('https://www.hl7.org/implement/standards/product_brief.cfm?product_id=436').value",
  },
  eicrCustodianRef: {
    type: "string",
    path: "entry.resource.Composition.custodian.reference",
  },
  dateTimeEcrCreated: {
    type: "string",
    path: "entry.resource.Composition.date",
  },
  ehrSoftware: {
    type: "ValueX",
    path: "entry.resource.Device.where(property.type.coding.code = 'software').version.value",
  },
  ehrManufacturerModel: {
    type: "string",
    path: "entry.resource.Device.where(property.type.coding.code = 'software').manufacturer",
  },
  eICRProcessingStatus: {
    type: "string",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-observation').code.coding.code",
  },
  eICRProcessingStatusReason: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-eicr-processing-status-reason-observation')",
  },
  compositionAuthorRefs: {
    type: "Reference",
    path: "entry.resource.Composition.author",
  },

  // Encounter Info
  encounterPeriod: {
    type: "Period",
    path: "entry.resource.Encounter.period",
  },
  encounterDiagnosisRef: {
    type: "Reference",
    path: "entry.resource.Encounter.diagnosis.condition",
  },
  encounterType: {
    type: "string",
    path: "entry.resource.Encounter.class.display",
  },
  encounterID: {
    type: "Identifier",
    path: "entry.resource.Encounter.identifier",
  },

  hospitalEncounterDiagnosisRef: {
    type: "Reference",
    path: "entry.resource.Composition.section.where(code.coding.code = %code).entry",
  },

  facilityOrgRef: {
    type: "string",
    path: "entry.resource.Encounter.serviceProvider.reference",
  },
  facilityLocationRef: {
    type: "string",
    path: "entry.resource.Encounter.location.location.reference",
  },
  facilityName: {
    type: "string",
    path: "entry.resource.Encounter.location.location.display",
  },
  facilityType: {
    type: "ValueX",
    path: "entry.resource.Encounter.location.extension('http://build.fhir.org/ig/HL7/case-reporting/StructureDefinition-us-ph-location-definitions.html//Location.type').value",
  },
  compositionEncounterRef: {
    type: "string",
    path: "entry.resource.Composition.encounter.reference",
  },
  encounterAttendingRefs: {
    type: "EncounterParticipant",
    path: "participant.where(type.coding.code = 'ATND')",
  },
  encounterParticipants: {
    type: "EncounterParticipant",
    path: "participant",
  },

  rrDetails: {
    type: "Observation",
    path: "entry.resource.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/rr-reportability-information-observation')",
  },

  // Vitals
  patientVitalSigns: {
    type: "Observation",
    path: "entry.resource.Observation.where(category.coding.code = 'vital-signs')",
  },

  resolve: {
    type: "unknown",
    path: "entry.resource.where(resourceType = %resourceType).where(id = %id)",
  },

  // Clinical Info
  clinicalReasonForVisit: {
    type: "ValueX",
    path: "entry.resource.section.where(title.lower() = 'reason for visit').extension.value",
  },
  activeProblems: {
    type: "Condition",
    path: "entry.resource.Condition.where(category.coding.code = 'problem-item-list')",
  },
  activeProblemsStatus: {
    type: "string",
    path: "clinicalStatus.coding.display",
  },
  activeProblemsOnsetAge: { type: "ValueX", path: "onsetAge.value" },
  historyOfPresentIllness: {
    type: "string",
    path: "entry.resource.Composition.section.where(code.coding.code = '10164-2').text.`div`",
  },
  emergencyOutbreakInfo: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-emergency-outbreak-information')",
  },

  // Treatment Details
  planOfTreatment: {
    type: "CarePlanActivity",
    path: "entry.resource.CarePlan.activity",
  },
  authoredOn: {
    type: "TimeX",
    path: "authoredOn",
  },
  plannedActivityName: {
    type: "CodeableConcept",
    path: "detail.code",
  },
  plannedActivityType: {
    type: "string",
    path: "detail.kind",
  },
  plannedActivityTime: {
    type: "TimeX",
    path: "detail.scheduled",
  },
  plannedMedicationName: {
    type: "CodeableConcept",
    path: "medicationCodeableConcept",
  },
  plannedMedicationDosage: {
    type: "ValueX",
    path: "dosageInstruction.doseAndRate.dose",
  },

  // Administered Medications
  adminMedicationsRefs: {
    type: "string",
    path: "entry.resource.section.where(code.coding.code = '29549-3').entry.reference",
  },
  adminMedicationTherapeuticResponseObs: {
    type: "CodeableConcept",
    path: "extension.where(url = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-therapeutic-medication-response-extension').valueCodeableConcept",
  },

  // CareTeam
  careTeamParticipants: {
    type: "CareTeamParticipant",
    path: "entry.resource.CareTeam.participant",
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
    path: "entry.resource.Immunization",
  },
  immunizationsName: {
    type: "CodeableConcept",
    path: "vaccineCode",
  },
  immunizationsAdminDate: {
    type: "string",
    path: "occurrenceDateTime",
  },
  immunizationsDoseNumber: {
    // TODO #469: This should strictly speaking be "number", but conversion is buggy
    type: "ValueX",
    path: "protocolApplied.where(doseNumberPositiveInt.exists()).doseNumberPositiveInt",
  },
  immunizationsManufacturerName: {
    type: "string",
    path: "manufacturer.name",
  },
  immunizationsLotNumber: { type: "unknown", path: "lotNumber" },

  // === Procedure ===
  procedures: {
    type: "Procedure",
    path: "entry.resource.Procedure",
  },
  procedureHistoryRefs: {
    type: "Reference",
    path: "entry.resource.section.where(code.coding.code = '47519-4').entry.where(reference.startsWith('Observation/'))",
  },

  // core fields
  procedureDate: {
    type: "TimeX",
    path: "performed | effective",
  },
  procedureStatus: { type: "string", path: "status" },

  // extra details
  procedureReason: { type: "CodeableConcept", path: "reasonCode" },
  procedureLocationRef: { type: "Reference", path: "location" },
  procedureOrgRef: { type: "Reference", path: "performer.actor" },
  procedureBodySite: { type: "CodeableConcept", path: "bodySite" },
  procedureComplication: {
    type: "CodeableConcept",
    path: "complication",
  },
  procedureProductRef: { type: "Reference", path: "usedReference" },
  procedureMedRef: {
    type: "Reference",
    path: "extension('medicationAdministration').value",
  },
  procedureSpecimen: {
    type: "CodeableConcept",
    path: "extension('specimen').value",
  },
  procedureMethod: {
    type: "CodeableConcept",
    path: "extension('http://hl7.org/fhir/StructureDefinition/procedure-method').value | method",
  },
  procedurePriority: {
    type: "CodeableConcept",
    path: "extension('priorityCode').value",
  },

  // === Lab Info ===
  diagnosticReports: {
    type: "DiagnosticReport",
    path: "entry.resource.DiagnosticReport",
  },
  diagnosticReportStatus: {
    type: "string",
    path: "iif(extension('http://terminology.hl7.org/CodeSystem/v2-0123').valueCodeableConcept.coding.display.exists(), extension('http://terminology.hl7.org/CodeSystem/v2-0123').valueCodeableConcept.coding.display, status)",
  },
  observations: {
    type: "Observation",
    path: "entry.resource.Observation",
  },
  labResultDiv: {
    type: "string",
    path: "entry.resource.section.where(code.coding.code = '30954-2').text.`div`",
  },
  specimenCollectionTime: {
    type: "TimeX",
    path: "Specimen.collection.collected",
  },
  specimenReceivedTime: {
    type: "TimeX",
    path: "Specimen.receivedTime",
  },
  specimenSource: {
    type: "CodeableConcept",
    path: "Specimen.type",
  },
  specimenBodySite: {
    type: "CodeableConcept",
    path: "Specimen.collection.bodySite",
  },
  observationReferenceValue: {
    type: "string",
    path: "extension('observation entry reference value').valueString",
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
  /**
   * The shorthand `extension(url)` will only work where there is also a `resourceType`, i.e, a `Resource`. This
   * path is used on `Observation.component` which is merely a `BackboneElement`.
   */
  observationOrganismMethod: {
    type: "ValueX",
    path: "extension('methodCode').value",
  },
  observationResultStatus: {
    type: "string",
    path: "iif(extension('http://terminology.hl7.org/ValueSet/v2-0085').valueCodeableConcept.coding.display.exists(), extension('http://terminology.hl7.org/ValueSet/v2-0085').valueCodeableConcept.coding.display, status)",
  },

  // Organization
  organizations: {
    type: "Organization",
    path: "entry.resource.Organization",
  },

  // Travel History
  patientTravelHistory: {
    type: "Observation",
    path: "entry.resource.Observation.where(meta.profile = 'http://hl7.org/fhir/us/ecr/StructureDefinition/us-ph-travel-history')",
  },
  travelHistoryStartDate: { type: "string", path: "effectivePeriod.start" },
  travelHistoryEndDate: { type: "string", path: "effectivePeriod.end" },
  travelHistoryLocation: {
    type: "string",
    path: "component.where(code.coding.code = 'LOC').valueCodeableConcept.text",
  },
  travelHistoryPurpose: {
    type: "ValueX",
    path: "component.where(code.coding.code = '280147009').value",
  },

  // Stamped
  stampedImmunizations: {
    type: "Immunization",
    path: "entry.resource.where(extension('https://reportstream.cdc.gov/fhir/StructureDefinition/condition-code').valueCoding.code = %snomedCode and resourceType = 'Immunization')",
  },

  // Generic

  /**
   * Instead of getting the display directly, ideally we would want to get the whole
   * CodeableConcept so we can use our own logic to get the most appropriate string representation.
   * However `code` only works if the resource has the FHIR path info on it, i.e. it is an object
   * returned by an `evaluate` function.
   */
  codeableConceptDisplay: {
    type: "string",
    path: "code.coding.display",
  },
  conditionOnsetDate: {
    type: "string",
    path: "onsetDateTime",
  },
  code: {
    type: "CodeableConcept",
    path: "code",
  },
  /**
   * A FHIR path that is only the name of a choice element, e.g. `value` for the field `value[x]`, will only return
   * the value of the choice element if it is on a resource, e.g. `Observation`. Otherwise it will return an empty
   * list. For all other non-resource elements you will either specify the full name of the element, e.g.
   * `valueString`.
   */
  effectiveX: {
    type: "TimeX",
    path: "effective",
  },
  noteText: { type: "string", path: "note.text" },
  valueX: {
    type: "ValueX",
    path: "value",
  },
  occurrenceX: {
    type: "TimeX",
    path: "occurrence",
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
