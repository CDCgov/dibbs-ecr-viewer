import React, { ReactNode, RefObject, useId, useRef } from "react";

import {
  ModalFooter,
  ModalHeading,
  ModalRef,
  ModalToggleButton,
} from "@trussworks/react-uswds";
import classnames from "classnames";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ServerActionResult } from "@/app/services/errorService";
import { toSentenceCase } from "@/app/utils/format-utils";

import ConfirmationFooter from "./modal/ConfirmationFooter";
import Modal from "./modal/Modal";
import { ToastContext } from "./toast/ToastProvider";

/**
 * The details ref links the trigger(s) and side panel.
 * @returns details ref
 */
export const useDetailsRef = () => useRef<ModalRef>(null);

/**
 * When clicked, the details trigger will open the side panel it is linked to via the `detailsRef`
 * @param props React props
 * @param props.onClick Click handler (run in addition to the triggering of the side panel)
 * @param props.className Optional. Class names to pass to the button
 * @param props.children Content of the button
 * @param props.detailsRef Ref to the side panel. See `useDetailsRef`.
 * @returns details trigger button
 */
export const DetailsTrigger = ({
  onClick,
  detailsRef,
  className,
  children,
}: {
  onClick: () => void;
  detailsRef: RefObject<ModalRef>;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <ModalToggleButton
      type="button"
      modalRef={detailsRef}
      className={classnames("action-text", className)}
      unstyled={true}
      onClick={() => {
        // move the initial focus to the close button
        document &&
          document
            .querySelector<HTMLButtonElement>("button.usa-modal__close")
            ?.setAttribute("data-focus", "");

        // call passed in on click handler
        onClick();
      }}
    >
      {children}
    </ModalToggleButton>
  );
};

interface Detail {
  title: string;
  value: ReactNode;
}

/**
 * The Details side panel is a modal that takes up half-ish of the right side of the page when
 * triggered by a `DetailsTrigger`. The side panel should un-conditionally be in the markup, its
 * visibility is controlled by the trigger.
 * @param props React Props
 * @param props.details Array of title-value pairs
 * @param props.title Title of the side panel (usually the subject)
 * @param props.subtitle Subtitle of the side panel (such as logged in date)
 * @param props.detailsRef Ref linking the trigger(s) and panel - see `useDetailsRef`
 * @param props.editHref Link to the edit page for this item
 * @param props.itemType string describing item type of details (e.g. "user")
 * @param props.deleteAction Optional function to handle deleting the item. Adds delete button if available
 * @param props.deleteExplainerText Optional text to explain implications of deleting the item
 * @param props.deleteModalTitle Optional title of modal
 * @param props.deleteModalBody Optional content for delete modal
 * @returns Side Panel component
 */
export const DetailsSidePanel = ({
  detailsRef,
  details,
  title,
  subtitle,
  editHref,
  itemType,
  deleteAction,
  deleteExplainerText,
  deleteModalTitle,
  deleteModalBody,
}: {
  detailsRef: RefObject<ModalRef>;
  details: Detail[];
  title: string;
  subtitle: string;
  editHref?: string;
  itemType: string;
  deleteAction: () => Promise<ServerActionResult<void>>;
  deleteExplainerText: string;
  deleteModalTitle: string;
  deleteModalBody?: ReactNode;
}) => {
  const id = useId();
  const confirmRef = useRef<ModalRef>(null);
  const router = useRouter();
  const { createToast } = React.useContext(ToastContext);

  return (
    <>
      <Modal
        id={`details-sidepanel-${id}`}
        className="sidepanel-modal"
        ref={detailsRef}
        aria-labelledby={`details-sidepanel-${id}-heading`}
        aria-describedby={`details-sidepanel-${id}-description`}
      >
        <div>
          <div className="border-bottom border-base-lightest">
            <ModalHeading
              id={`details-sidepanel-${id}-heading`}
              className="font-sans-3xl margin-bottom-0"
            >
              {title}
            </ModalHeading>
            <p className="text-base margin-bottom-2 margin-top-1">{subtitle}</p>
          </div>

          <section>
            <div className="display-flex flex-justify flex-align-center">
              <h3 id={`details-sidepanel-${id}-description`}>
                {toSentenceCase(itemType)} information
              </h3>
              {!!editHref && (
                <div>
                  <Link
                    href={editHref}
                    className="usa-button usa-button--outline"
                  >
                    Edit {itemType}
                  </Link>
                </div>
              )}
            </div>

            <dl>
              {details.map(({ title, value }, i) => (
                <React.Fragment key={`detail-${i}`}>
                  <dt>{title}</dt>
                  <dd>{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        </div>
        <ModalFooter className="border-top border-base-lighter display-flex flex-justify padding-top-3 gap-1">
          <div>
            <h3 className="margin-top-0">Remove {itemType}</h3>
            <p>{deleteExplainerText}</p>
          </div>
          <div>
            <ModalToggleButton
              type="button"
              outline={true}
              modalRef={confirmRef}
              className="text-no-wrap"
              opener={true}
              closer={false}
            >
              Remove {itemType}
            </ModalToggleButton>
          </div>
        </ModalFooter>
      </Modal>

      {/* NOTE: order is important here so the confirmation goes on top of the side panel*/}
      <Modal
        id={`delete-confirm-${id}`}
        className="delete-confirm-modal"
        ref={confirmRef}
        aria-labelledby={`delete-confirm-${id}-heading`}
        aria-describedby={`delete-confirm-${id}-description`}
      >
        <ModalHeading
          id={`delete-confirm-${id}-heading`}
        >
          {deleteModalTitle}
        </ModalHeading>
        {deleteModalBody}

        <ConfirmationFooter
          modalRef={confirmRef}
          onConfirm={async () => {
            const res = await deleteAction();
            detailsRef.current?.toggleModal(undefined, false);
            if (res.error) {
              createToast(res.error, "error");
            } else {
              createToast(`${title} successfully removed`, "success");
            }
            router.refresh();
          }}
        >
          Yes, remove {itemType}
        </ConfirmationFooter>
      </Modal>
    </>
  );
};
