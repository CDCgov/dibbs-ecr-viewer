"use client";
import { ReactNode, useEffect, useId, useState } from "react";

import { Alert, Button } from "@trussworks/react-uswds";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowBack } from "@/app/components/Icon";

/**
 *
 * @param props React props
 * @param props.successRoute Route to redirect to upon successful submission
 * @param props.action Action of the form (e.g. "Create program area", "Edit program area")
 * @param props.formValid Whether the form is valid
 * @param props.submitAction Handler to run on submission
 * @param props.children Content of the form, typically a series of `FieldSet`
 * @param props.formTouched
 * @param props.itemType
 * @param props.itemHomeRoute
 * @returns form with header and submit buttons
 */
export const FormPageContent = ({
  action,
  itemType,
  formValid,
  formTouched,
  itemHomeRoute,
  children,
  submitAction,
}: {
  action: string;
  itemType: string;
  formValid: boolean;
  formTouched: boolean;
  itemHomeRoute: string;
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

  const actionPhrase = `${action} ${itemType}`;

  return (
    <main className="main-container">
      <div className="content-container margin-top-10 position-relative">
        <div className="border-bottom border-base-lighter position-sticky top-0 bg-white isolate z-500 padding-top-1">
          <Link
            href="/admin/program"
            className="action-text margin-bottom-3 display-inline-flex flex-align-center"
          >
            <ArrowBack aria-hidden={true} className="square-3" />
            Back to {itemType}
          </Link>
          <div className="display-flex flex-justify margin-bottom-3">
            <h2 className="margin-0">{actionPhrase}</h2>
            <div>
              <SubmitButton
                formId={id}
                disabled={submitDisabled}
                action={actionPhrase}
              />
            </div>
          </div>
        </div>

        <form
          id={id}
          className="margin-top-3 isolate"
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

            router.push(itemHomeRoute);
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
            <SubmitButton
              formId={id}
              disabled={submitDisabled}
              action={action}
            />
          </div>
        </form>
      </div>
    </main>
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
