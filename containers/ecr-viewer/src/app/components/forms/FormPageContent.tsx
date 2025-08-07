"use client";
import { ReactNode, useId, useState } from "react";

import { Alert, Button } from "@trussworks/react-uswds";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowBack } from "@/app/components/Icon";
import { ServerActionResult } from "@/app/services/errorService";

/**
 *
 * @param props React props
 * @param props.action Action of the form (e.g. "Create", "Edit")
 * @param props.formValid Whether the form is valid
 * @param props.submitAction Handler to run on submission
 * @param props.children Content of the form, typically a series of `FieldSet`
 * @param props.formTouched Whether the form has been touched (edited)
 * @param props.itemType The type of item the form is about (e.g. "user")
 * @param props.itemHomeRoute Route to redirect to upon successful submission or to go back to
 * @param props.formTouchedMsg Warning banner message when a user has touched the form.
 * @param props.banner markup to display as a banner above the form title
 * @returns form with header and submit buttons
 */
export const FormPageContent = <T,>({
  action,
  itemType,
  formValid,
  formTouched,
  itemHomeRoute,
  formTouchedMsg,
  banner,
  children,
  submitAction,
}: {
  action: string;
  itemType: string;
  formValid: boolean;
  formTouched: boolean;
  itemHomeRoute: string;
  formTouchedMsg?: string;
  banner?: ReactNode;
  children: ReactNode;
  submitAction: () => Promise<ServerActionResult<T>>;
}) => {
  const router = useRouter();
  const id = useId();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submitDisabled = !formValid || !formTouched || submitting;
  const actionPhrase = `${action} ${itemType}`;

  return (
    <main className="main-container display-flex flex-column flex-align-center">
      <div className="width-full border-bottom border-base-lighter position-sticky top-0 isolate z-500 padding-top-1 bg-container shadow-2 display-flex flex-justify-center">
        <div className="content-container">
          <Link
            href={itemHomeRoute}
            className="action-text display-inline-flex flex-align-center margin-bottom-1 margin-top-2"
          >
            <ArrowBack aria-hidden={true} className="square-3" />
            Back to {itemType} management
          </Link>
          <div className="margin-bottom-1">
            {banner}

            {formTouched && !submitting && !error && (
              <Alert
                type="warning"
                slim={true}
                noIcon={true}
                headingLevel="h4"
                aria-live="polite"
              >
                {formTouchedMsg ?? "You have unsaved changes."}
              </Alert>
            )}
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
          </div>

          <div className="display-flex flex-justify flex-align-center margin-bottom-2">
            <h2 className="margin-0">{actionPhrase}</h2>
            <div>
              <SubmitButton
                formId={id}
                disabled={submitDisabled}
                itemType={itemType}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="content-container margin-top-3">
        <form
          id={id}
          className="margin-top-3 isolate"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setError("");
            const res = await submitAction();
            if (res.error) {
              setSubmitting(false);
              setError(res.error);
              return;
            }

            router.push(itemHomeRoute);
          }}
        >
          {children}
          <div className="display-flex flex-justify-end margin-y-4">
            <SubmitButton
              formId={id}
              disabled={submitDisabled}
              itemType={itemType}
            />
          </div>
        </form>
      </div>
    </main>
  );
};

const SubmitButton = ({
  disabled,
  itemType,
  formId,
}: {
  disabled: boolean;
  itemType: string;
  formId: string;
}) => {
  return (
    <Button
      type="submit"
      form={formId}
      className="margin-0"
      disabled={disabled}
    >
      Save {itemType}
    </Button>
  );
};
