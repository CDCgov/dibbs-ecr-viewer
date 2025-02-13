import {
  saveToSessionStorage,
  retrieveFromSessionStorage,
} from "../../utils/storage-utils";

describe("Session Storage saving utils", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("saveToSessionStorage", () => {
    it("should save a string value to session storage", () => {
      const key = "Bread";
      const value = "Baguette";
      saveToSessionStorage(key, value);

      expect(sessionStorage.getItem(key)).toBe(JSON.stringify(value));
    });

    it("should save an object value to session storage", () => {
      const key = "testKey";
      const value = { name: "Heironymous", age: 37 };
      saveToSessionStorage(key, value);

      expect(sessionStorage.getItem(key)).toBe(JSON.stringify(value));
    });
  });

  describe("retrieveFromSessionStorage", () => {
    it("should retrieve a string value from session storage", () => {
      const key = "fruit";
      const value = "Apples";
      sessionStorage.setItem(key, JSON.stringify(value));

      const retrievedValue = retrieveFromSessionStorage(key);
      expect(retrievedValue).toBe(value);
    });

    it("should retrieve an object value from session storage", () => {
      const key = "patient";
      const value = { name: "Arabelle", age: 22 };
      sessionStorage.setItem(key, JSON.stringify(value));

      const retrievedValue = retrieveFromSessionStorage(key);
      expect(retrievedValue).toEqual(value);
    });

    it("should return null if the key does not exist", () => {
      const key = "nonExistentKey";
      const retrievedValue = retrieveFromSessionStorage(key);

      expect(retrievedValue).toBeNull();
    });

    it("should throw an error for invalid JSON in session storage", () => {
      const key = "aKey";
      sessionStorage.setItem(key, "invalid-json");

      expect(() => retrieveFromSessionStorage(key)).toThrow(SyntaxError);
    });
  });
});
