import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import router from "next-router-mock";

import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";

describe("FormPageContent", () => {
  beforeEach(() => {
    router.setCurrentUrl("/");
  });
  it("should render a valid form page as submittable", async () => {
    let submitted = false;
    render(
      <FormPageContent
        action="File a form"
        formValid={true}
        successRoute="/path/to/somewhere"
        submitAction={async () => {
          submitted = true;
        }}
      >
        <FieldSet legend="A field">
          <input type="text" />
        </FieldSet>
      </FormPageContent>,
    );

    const submitButtons = screen.getAllByRole("button", {
      name: "File a form",
    });
    expect(submitButtons).toHaveLength(2);

    const user = userEvent.setup();
    await user.click(submitButtons[0]);
    expect(submitted).toBeTrue();
    expect(screen.queryByText("Submission failed")).not.toBeInTheDocument();
    expect(router.pathname).toBe("/path/to/somewhere");
  });

  it("should render an invalid form page as not submittable", async () => {
    let submitted = false;
    render(
      <FormPageContent
        action="File a form"
        formValid={false}
        successRoute="/path/to/somewhere"
        submitAction={async () => {
          submitted = true;
        }}
      >
        <FieldSet legend="A field">
          <input type="text" />
        </FieldSet>
      </FormPageContent>,
    );

    const submitButtons = screen.getAllByRole("button", {
      name: "File a form",
    });
    expect(submitButtons).toHaveLength(2);
    for (const button of submitButtons) {
      expect(button).toBeDisabled();
    }

    const user = userEvent.setup();
    await user.click(submitButtons[0]);
    expect(submitted).toBeFalse();
    expect(screen.queryByText("Submission failed")).not.toBeInTheDocument();
    expect(router.pathname).not.toBe("/path/to/somewhere");
  });

  it("should handle a submission failure", async () => {
    render(
      <FormPageContent
        action="File a form"
        formValid={true}
        successRoute="/path/to/somewhere"
        submitAction={async () => {
          throw new Error("I failed!");
        }}
      >
        <FieldSet legend="A field">
          <input type="text" />
        </FieldSet>
      </FormPageContent>,
    );

    const submitButtons = screen.getAllByRole("button", {
      name: "File a form",
    });
    expect(submitButtons).toHaveLength(2);

    const user = userEvent.setup();
    await user.click(submitButtons[0]);

    const afterSubmitButtons = screen.getAllByRole("button", {
      name: "File a form",
    });
    for (const button of afterSubmitButtons) {
      expect(button).not.toBeDisabled();
    }

    expect(screen.queryByText("Submission failed")).toBeInTheDocument();
    expect(screen.queryByText("I failed!")).toBeInTheDocument();
    expect(router.pathname).not.toBe("/path/to/somewhere");
  });
});
