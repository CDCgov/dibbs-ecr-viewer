import "server-only"; // FHIR evaluation/formatting should be done server side

import { CodeableConcept, Quantity, Range, Reference } from "fhir/r4";

/**
 * Attempts to return a human-readable display value for a CodeableConcept. It will return the first
 * available value in the following order:
 * 1) `undefined` if the `CodeableConcept` is falsy
 * 2) `CodeableConcept.text`
 * 3) value of first LOINC coding with a `display` value
 * 4) value of the first `coding` with a `display` value
 * 5) `code` and `system` values of the first `coding` with a `code` and `system values.
 * 6) `code` of the first `coding` with a `code` value
 * 7) `undefined`
 * @param codeableConcept - The CodeableConcept to get the display value from.
 * @returns - The human-readable display value of the CodeableConcept.
 */
export const formatCodeableConcept = (
  codeableConcept: CodeableConcept | undefined,
): string | undefined => {
  if (!codeableConcept) {
    return undefined;
  }

  const { coding, text } = codeableConcept;

  if (text) {
    return text;
  }

  const firstLoincCodingWithDisplay = coding?.find(
    (c) => c.display && c.system === "http://loinc.org",
  );
  if (firstLoincCodingWithDisplay?.display) {
    return firstLoincCodingWithDisplay.display;
  }

  const firstCodingWithDisplay = coding?.find((c) => c.display);
  if (firstCodingWithDisplay?.display) {
    return firstCodingWithDisplay.display;
  }

  const firstCodingWithCodeSystem = coding?.find((c) => c.code && c.system);
  if (firstCodingWithCodeSystem?.code && firstCodingWithCodeSystem?.system) {
    return `${firstCodingWithCodeSystem.code} (${firstCodingWithCodeSystem.system})`;
  }

  const firstCodingWithCode = coding?.find((c) => c.code);
  if (firstCodingWithCode?.code) {
    return firstCodingWithCode.code;
  }

  return undefined;
};

// Map from computer to human readable units
const UNIT_MAP = new Map([
  ["[lb_av]", "lb"],
  ["[in_i]", "in"],
  ["[in_us]", "in"],
]);

/**
 * Takes a quantity and formats it into a string. Handles spacing of units and re-maps
 * certain robot-looking units into human-looking units
 * @param data the Quantity to format
 * @returns formatted string
 */
export const formatQuantity = (
  data: Quantity | undefined,
): string | undefined => {
  if (!data || !data.value) return;
  let unit = data.unit || "";
  unit = UNIT_MAP.get(unit) || unit;
  const firstLetterRegex = /^[a-zA-Z0-9]/i;
  if (unit?.match(firstLetterRegex)) {
    unit = " " + unit;
  }
  return `${data.value ?? ""}${unit}`;
};

/**
 * Takes a range and formats it into a string. Handles spacing of units and re-maps
 * certain robot-looking units into human-looking units
 * @param data the Range to format
 * @returns formatted string
 */
export const formatRange = (data: Range | undefined): string | undefined => {
  if (!data) return;
  const low = formatQuantity(data.low);
  const high = formatQuantity(data.high);
  if (low && high) {
    return `${low} - ${high}`;
  } else if (low) {
    return `>=${low}`;
  } else if (high) {
    return `<=${high}`;
  }
};

/**
 * Returns the value of a Reference. While this function is currently very simple, it exists to future-proof a change in how we format references.
 * @param reference the reference being formatted
 * @returns .reference value of the supplied reference
 */
export const formatReference = (
  reference: Reference | undefined,
): string | undefined => {
  if (!reference) return;
  return reference.reference;
};
