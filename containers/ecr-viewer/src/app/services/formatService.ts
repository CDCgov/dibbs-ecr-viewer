import "server-only"; // FHIR evaluation/formatting should be done server side

import { Address, ContactPoint, HumanName } from "fhir/r4";
import { toSentenceCase, toTitleCase } from "@/app/utils/format-utils";
import { formatDate } from "./formatDateService";

/**
 * Formats a person's name: <use>: <prefix> <given> <family> <suffix>.
 * @param humanName - The HumanName object containing the name components.
 * @param withUse - Whether to include the name use in the formatted string.
 * @returns The formatted name string.
 */
export const formatName = (
  humanName: HumanName | undefined,
  withUse: boolean = false,
): string => {
  if (!humanName) {
    return "";
  }

  const { use, prefix, given, family, suffix } = humanName;

  const segments = [
    ...(withUse && use ? [`${toSentenceCase(use)}:`] : []),
    ...(prefix?.map(toTitleCase) ?? []),
    ...(given?.map(toTitleCase) ?? []),
    toTitleCase(family ?? ""),
    ...(suffix ?? []),
  ];

  return segments.filter(Boolean).join(" ");
};

const DEFAULT_ADDRESS_CONFIG = { includeUse: false, includePeriod: false };
type AddressConfig = { includeUse?: boolean; includePeriod?: boolean };

/**
 * Formats an address based on its components.
 * @param address - Object with address parts
 * @param address.line - An array containing street address lines.
 * @param address.city - The city name.
 * @param address.state - The state or region name.
 * @param address.postalCode - The ZIP code or postal code.
 * @param address.country - The country name.
 * @param address.use - Optional address use.
 * @param address.period - Optional address use.
 * @param config - Configuration object to customize formatting
 * @param config.includeUse - Include the use (e.g. `Home:`) on the address if available (default: false)
 * @param config.includePeriod - Include the perios (e.g. `Dates: 12/11/2023 - Present`) on the address if available (default: false)
 * @returns The formatted address string.
 */
export const formatAddress = (
  { line, city, state, postalCode, country, use, period }: Address = {},
  config: AddressConfig = {},
) => {
  const { includeUse, includePeriod } = {
    ...DEFAULT_ADDRESS_CONFIG,
    ...config,
  };

  const formatDateLine = () => {
    const stDt = formatDate(period?.start);
    const endDt = formatDate(period?.end);
    if (!stDt && !endDt) return false;
    return `Dates: ${stDt ?? "Unknown"} - ${endDt ?? "Present"}`;
  };

  return [
    includeUse && use && toSentenceCase(use) + ":",
    (line?.map(toTitleCase) || []).filter(Boolean).join("\n"),
    [toTitleCase(city), state].filter(Boolean).join(", "),
    [postalCode, country].filter(Boolean).join(", "),
    includePeriod && formatDateLine(),
  ]
    .filter(Boolean)
    .join("\n");
};

const VALID_PHONE_NUMBER_REGEX = /^\d{3}-\d{3}-\d{4}$/;
/**
 * Formats a phone number into a standard format of XXX-XXX-XXXX.
 * @param phoneNumber - The phone number to format.
 * @returns The formatted phone number or "Invalid Number" if the input is invalid or undefined if the input is empty.
 */
export const formatPhoneNumber = (
  phoneNumber: string | undefined,
): string | undefined => {
  if (!phoneNumber || phoneNumber.trim() === "") return undefined;

  const formatted = phoneNumber
    .replace("+1", "")
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");

  if (VALID_PHONE_NUMBER_REGEX.test(formatted)) {
    return formatted;
  } else {
    return "Invalid Number";
  }
};

/**
 * Formats vital signs information into separate strings with proper units.
 * @param heightAmount - The amount of height.
 * @param heightUnit - The measurement type of height (e.g., "[in_i]" for inches, "cm" for centimeters).
 * @param weightAmount - The amount of weight.
 * @param weightUnit - The measurement type of weight (e.g., "[lb_av]" for pounds, "kg" for kilograms).
 * @param bmiAmount - The Body Mass Index (BMI).
 * @param bmiUnit - The measurement type of Body Mass Index (BMI) (e.g., kg/m2)
 * @returns The formatted vital signs information.
 */
export const formatVitals = (
  heightAmount: string,
  heightUnit: string,
  weightAmount: string,
  weightUnit: string,
  bmiAmount: string,
  bmiUnit: string,
) => {
  let heightString = "";
  let weightString = "";
  let bmiString = "";
  let heightType = "";
  let weightType = "";

  if (heightAmount && heightUnit) {
    if (heightUnit === "[in_i]") {
      heightType = "in";
    } else if (heightUnit === "cm") {
      heightType = "cm";
    }
    heightString = `${heightAmount} ${heightType}`;
  }

  if (weightAmount && weightUnit) {
    if (weightUnit === "[lb_av]") {
      weightType = "lb";
    } else if (weightUnit === "kg") {
      weightType = "kg";
    }
    weightString = `${weightAmount} ${weightType}`;
  }

  if (bmiAmount && bmiUnit) {
    bmiString = `${bmiAmount} ${bmiUnit}`;
  }

  return { height: heightString, weight: weightString, bmi: bmiString };
};

const contactSortOrder = [
  "phone",
  "fax",
  "sms",
  "pager",
  "url",
  "email",
  "other",
  "",
];

/**
 * Sorts an array of contact points in display order (`contactSortOrder`).
 * @param contactPoints - array of contact points
 * @returns sorted array of contact points
 */
const sortContacts = (contactPoints: ContactPoint[]): ContactPoint[] => {
  return contactPoints.sort((a, b) => {
    const aInd =
      contactSortOrder.indexOf(a.system ?? "") ?? contactSortOrder.length;
    const bInd =
      contactSortOrder.indexOf(b.system ?? "") ?? contactSortOrder.length;
    return aInd - bInd;
  });
};

/**
 * Converts contact points into an array of phone numbers and emails and returns them
 * in a consistent sort order for display.
 * @param contactPoints - array of contact points
 * @returns string of formatted and sorted phone numbers and emails
 */
export const formatContactPoint = (
  contactPoints: ContactPoint[] | undefined,
): string => {
  if (!contactPoints || !contactPoints.length) {
    return "";
  }
  const contactArr: string[] = [];
  for (const { system, value, use } of sortContacts(contactPoints)) {
    // No value, nothing to format/show
    if (!value) continue;

    if (system === "phone") {
      const phoneNumberUse = toSentenceCase(use);
      contactArr.push(
        [phoneNumberUse, formatPhoneNumber(value)].filter((c) => c).join(": "),
      );
    } else if (system === "email") {
      contactArr.push(value.toLowerCase());
    } else {
      const _use = toSentenceCase(use ?? "");
      const _system = toSentenceCase(system ?? "");
      const _value = ["fax", "pager", "sms"].includes(system as string)
        ? formatPhoneNumber(value)
        : value;
      contactArr.push([_use, `${_system}:`, _value].join(" ").trim());
    }
  }
  return contactArr.join("\n");
};
