/**
 * Saves a key-value pair to session storage.
 * @param key - The key under which the value will be stored.
 * @param value - The value to be stored. Can be a string or any serializable object.
 */
export const saveToSessionStorage = (
  key: string,
  value: string | object,
): void => {
  const serializedValue = JSON.stringify(value);

  if (typeof window !== "undefined" && window.sessionStorage) {
    sessionStorage.setItem(key, serializedValue);
  } else {
    console.warn("sessionStorage is not available");
  }
};

/**
 * Retrieves a key-value pair from session storage.
 * @param key - The key under which the value was stored.
 * @returns string or null - The stored value from session storage or null if it finds nothing
 */
export const retrieveFromSessionStorage = (
  key: string,
): string | object | null => {
  if (typeof window !== "undefined" && window.sessionStorage) {
    const storedValue = sessionStorage.getItem(key);
    return JSON.parse(<string>storedValue);
  } else {
    console.warn("sessionStorage is not available");
    return null;
  }
};
