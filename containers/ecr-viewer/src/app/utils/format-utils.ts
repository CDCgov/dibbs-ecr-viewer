/**
 * Formats a string by converting it to lowercase, replacing spaces with hyphens, and removing special characters except underscores.
 * @param input - The input string to be formatted.
 * @returns The formatted string.
 */
export const toKebabCase = (input: string): string => {
  // Convert to lowercase
  let result = input.toLowerCase();

  // Replace spaces with hyphens
  result = result.replace(/\s+/g, "-");

  // Remove all special characters except hyphens
  result = result.replace(/[^a-z0-9\-]/g, "");

  return result;
};

/**
 * Converts a string to sentence case, making the first character uppercase and the rest lowercase.
 * @param str - The string to convert to sentence case.
 * @returns The converted sentence-case string. If the input is empty or not a string, the original input is returned.
 */
export function toSentenceCase(str: string | undefined) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts a string to title case, making the first character of each word uppercase.
 * @param str - The string to convert to title case.
 * @returns The converted title-case string. If the input is empty or not a string, the original input is returned.
 */
export const toTitleCase = (str: string | undefined) => {
  if (!str) return str;
  return str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
  );
};

/**
 * Extracts and concatenates all sequences of numbers and periods from each string in the input array,
 * excluding any leading and trailing periods in the first matched sequence of each string.
 * @param inputValues - An array of strings from which numbers and periods will be extracted.
 * @returns An array of strings, each corresponding to an input string with all found sequences
 * of numbers and periods concatenated together, with any leading period in the first sequence removed.
 * @example @param inputValues - ['#Result.1.2.840.114350.1.13.297.3.7.2.798268.1670845.Comp2']
 * @example @returns - ['1.2.840.114350.1.13.297.3.7.2.798268.1670845']
 */
export function extractNumbersAndPeriods(inputValues: string[]): string[] {
  return inputValues.map((value) => {
    // Find all sequences of numbers and periods up to the first occurrence of a letter
    const pattern: RegExp = /[0-9.]+(?=[a-zA-Z])/;
    const match: RegExpMatchArray | null = value.match(pattern);

    if (match && match[0]) {
      // Remove leading and trailing periods from the match
      const cleanedMatch = match[0].replace(/^\./, "").replace(/\.$/, "");
      return cleanedMatch;
    }
    return "";
  });
}
