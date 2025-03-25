import "server-only"; // FHIR evaluation/formatting should be done server side

import {
  Address,
  CodeableConcept,
  ContactPoint,
  HumanName,
  PatientContact,
  RelatedPerson,
} from "fhir/r4";

import {
  makePlural,
  toSentenceCase,
  toTitleCase,
} from "@/app/utils/format-utils";

import { Age } from "./evaluateFhirDataService";
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

/**
 * Format's a list of a person's names. Adding the `use` if there is more
 * than one name
 * @param humanNames A list of (or single) name
 * @returns The formatted name string
 */
export const formatNameList = (
  humanNames: HumanName[] | HumanName | undefined,
): string => {
  if (!humanNames) return "";
  if (Array.isArray(humanNames)) {
    return humanNames
      .map((name) => formatName(name, humanNames.length > 1))
      .join("\n");
  } else {
    return formatName(humanNames);
  }
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
): string => {
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

/**
 * Formats a list of addresses with use if more than one and separated by double newlines
 * @param addresses A list of addresses, a single address, or undefined
 * @returns The formatted address list, can be empty string
 */
export const formatAddressList = (
  addresses: Address[] | Address | undefined,
): string => {
  if (!addresses) return "";
  if (Array.isArray(addresses)) {
    return addresses
      .map((address) =>
        formatAddress(address, {
          includeUse: addresses.length > 1,
          includePeriod: true,
        }),
      )
      .join("\n\n");
  } else {
    return formatAddress(addresses);
  }
};

/**
 * Find the most current home address.
 * @param addresses - List of addresses.
 * @returns A string with the formatted current address or an empty string if no address.
 */
export const formatCurrentAddress = (
  addresses: Address[] | Address | undefined,
): string => {
  if (!addresses) return "";
  if (!Array.isArray(addresses)) return formatAddress(addresses);

  // current home address is first pick
  let address = addresses.find(
    (a) => a.use === "home" && !!a.period?.start && !a.period?.end,
  );
  // then current address
  if (!address) {
    address = addresses.find((a) => !!a.period?.start && !a.period?.end);
  }

  // then home address
  if (!address) {
    address = addresses.find((a) => a.use === "home");
  }

  // then first address
  if (!address) {
    address = addresses[0];
  }

  return formatAddress(address);
};

const VALID_PHONE_NUMBER_REGEX = /^\d{3}-\d{3}-\d{4}( \D\w*)?$/;
/**
 * Formats a phone number into a standard format of XXX-XXX-XXXX x123.
 * @param phoneNumber - The phone number to format.
 * @returns The formatted phone number or "Invalid Number: <unformatted phone number>" if the input is invalid or undefined if the input is empty.
 */
export const formatPhoneNumber = (
  phoneNumber: string | undefined,
): string | undefined => {
  if (!phoneNumber || phoneNumber.trim() === "") return undefined;

  const formatted = phoneNumber
    .replace("+1", "")
    .replace(/\W/g, "")
    .replace(/(\d{3})(\d{3})(\d{4})(.*)/, "$1-$2-$3 $4")
    .trim();

  if (VALID_PHONE_NUMBER_REGEX.test(formatted)) {
    return formatted;
  } else {
    return `Invalid Number: ${phoneNumber}`;
  }
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

/**
 * Format a patient contact (emergency or guardian)
 * @param contacts A list of patient contacts
 * @param includeAllAddresses Whether to format all addresses, or just the most relevant (default false)
 * @returns Formatted patient contact, undefined if no contact
 */
export const formatPatientContactList = (
  contacts: RelatedPerson[] | PatientContact[],
  includeAllAddresses: boolean = false,
): string | undefined => {
  if (contacts.length === 0) return undefined;

  return contacts
    .map((contact) => {
      const relationship = toSentenceCase(
        formatCodeableConcept(contact.relationship?.[0]),
      );

      const contactName = formatNameList(contact.name);
      const address = includeAllAddresses
        ? formatAddressList(contact.address)
        : formatCurrentAddress(contact.address);
      const phoneNumbers = formatContactPoint(contact.telecom);

      return [relationship, contactName, address, phoneNumbers]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
};

/**
 * Attempts to return a human-readable display value for a CodeableConcept. It will return the first
 * available value in the following order:
 * 1) `undefined` if the `CodeableConcept` is falsy
 * 2) `CodeableConcept.text`
 * 3) value of the first `coding` with a `display` value
 * 4) `code` and `system` values of the first `coding` with a `code` and `system values.
 * 5) `code` of the first `coding` with a `code` value
 * 6) `undefined`
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

/**
 * Takes a patient's age and formats it into a string. If the patient is 2 years or older
 * the function will return `x years`. When the patient is under 2 years old, it will
 * return the age in `x months, y days`.
 * @param age the age of a patient
 * @returns patient age formatted as a string, either as `x years` or `x months, y days`
 */
export const formatAge = (age: Age | undefined): string | undefined => {
  if (!age) return undefined;

  const { years, months, days } = age;

  if (years >= 2) {
    return `${years} years`;
  }

  // when years is under 2, convert them to months and add to total
  const totalMonths = years * 12 + months;

  return `${getFormattedMonths(totalMonths)}${days} day${makePlural(days)}`;
};

const getFormattedMonths = (months: number): string => {
  if (months < 1) return "";

  return `${months} month${makePlural(months)}, `;
};
