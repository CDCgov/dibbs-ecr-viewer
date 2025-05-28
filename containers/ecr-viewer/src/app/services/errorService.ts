/**
 * An error which has a message that is intended to be displayed to end users.
 */
export class UserFacingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    // Need to pass `options` as the second parameter to install the "cause" property.
    super(message, options);

    this.name = "UserFacingError";
  }
}

export interface ServerActionResult<T> {
  error?: string;
  payload?: T;
}

/**
 * @param fn service function to action-ify
 * @returns server result with error message in the `error` field and result in the `payload` field
 */
export const makeServerAction =
  // need the any to infer the function type, which ignoring then confuses jsdoc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, jsdoc/require-jsdoc
  <Func extends (...args: any) => any>(
      fn: Func,
    ): ((
      ...args: Parameters<Func>
    ) => Promise<ServerActionResult<Awaited<ReturnType<Func>>>>) =>
    async (...args) => {
      try {
        const res = await fn(...args);
        return { payload: res };
      } catch (e) {
        if (e instanceof UserFacingError) {
          return { error: e.message };
        } else {
          return { error: "Action failed" };
        }
      }
    };
