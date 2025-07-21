import { UserFacingError, makeServerAction } from "@/app/services/errorService";

describe("error service", () => {
  describe("makeServerAction", () => {
    const myFn = async (cse: string) => {
      switch (cse) {
        case "happy":
          return 123;
        case "user-facing-error":
          throw new UserFacingError("I failed");
        case "failure":
          throw new Error("Whoops");
      }
    };
    const myAction = makeServerAction(myFn);

    it("should handle the happy path", async () => {
      const expected = await myFn("happy");
      const res = await myAction("happy");
      expect(res.payload).toEqual(expected);
      expect(res.error).toBeUndefined();
    });

    it("should handle user facing errors", async () => {
      let errMsg = "";
      try {
        await myFn("user-facing-error");
      } catch (err) {
        expect(err).toBeInstanceOf(UserFacingError);
        errMsg = (err as UserFacingError).message;
      }
      const res = await myAction("user-facing-error");
      expect(res.error).toEqual(errMsg);
      expect(res.payload).toBeUndefined();
    });

    it("should handle unexpected errors", async () => {
      const errLog: any[] = [];
      jest.spyOn(console, "error").mockImplementation((err) => {
        errLog.push(err);
      });
      let errMsg = "";
      try {
        await myFn("failure");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        errMsg = (err as Error).message;
      }
      const res = await myAction("failure");
      expect(res.error).toEqual("Action failed");
      expect(res.payload).toBeUndefined();
      expect(errMsg).toEqual("Whoops");
      expect(errLog).toHaveLength(1);
      expect(errLog[0]?.message).toEqual("Internal server error");
      expect(errLog[0]?.error).not.toBeEmpty();
    });
  });
});
