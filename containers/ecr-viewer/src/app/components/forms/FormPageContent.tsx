"use client";
import { ReactNode, useEffect, useId, useState } from "react";

import { Alert, Button } from "@trussworks/react-uswds";
import { useRouter } from "next/navigation";

/**
 *
 * @param props React props
 * @param props.successRoute Route to redirect to upon successful submission
 * @param props.action Action of the form (e.g. "Create program area", "Edit program area")
 * @param props.formValid Whether the form is valid
 * @param props.submitAction Handler to run on submission
 * @param props.children Content of the form, typically a series of `FieldSet`
 * @param props.formTouched
 * @returns form with header and submit buttons
 */
export const FormPageContent = ({
  action,
  formValid,
  formTouched,
  successRoute,
  children,
  submitAction,
}: {
  action: string;
  formValid: boolean;
  formTouched: boolean;
  successRoute: string;
  children: ReactNode;
  submitAction: () => Promise<void>;
}) => {
  const router = useRouter();
  const id = useId();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Warning to user that they have unsaved data
  useEffect(() => {
    if (!formTouched) return;

    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [formTouched]);

  const submitDisabled = !formValid || !formTouched || submitting;
  console.log({ formTouched, formValid, submitting, submitDisabled });

  return (
    <>
      <div className="display-flex flex-justify margin-bottom-3">
        <h2 className="margin-0">{action}</h2>
        <div>
          <SubmitButton formId={id} disabled={submitDisabled} action={action} />
        </div>
      </div>

      <div className="section__line_gray" style={{ marginBottom: "1.5rem" }} />
      <form
        id={id}
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setError("");
          try {
            await submitAction();
          } catch (error: unknown) {
            setSubmitting(false);
            if (error instanceof Error) {
              setError(error.message);
            } else {
              throw error;
            }
            return;
          }

          router.push(successRoute);
        }}
      >
        {error && (
          <Alert
            type="error"
            heading="Submission failed"
            headingLevel="h4"
            className="margin-bottom-3"
            aria-live="polite"
          >
            {error}
          </Alert>
        )}
        {children}
        <div className="display-flex flex-justify-end margin-y-4">
          <SubmitButton formId={id} disabled={submitDisabled} action={action} />
        </div>
      </form>
    </>
  );
};

const SubmitButton = ({
  disabled,
  action,
  formId,
}: {
  disabled: boolean;
  action: string;
  formId: string;
}) => {
  return (
    <Button
      type="submit"
      form={formId}
      className="margin-0"
      disabled={disabled}
    >
      {action}
    </Button>
  );
};
