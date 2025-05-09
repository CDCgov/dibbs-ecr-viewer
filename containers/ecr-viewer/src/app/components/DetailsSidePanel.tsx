import React, { ReactNode, RefObject, useId, useRef } from "react";

import {
  Modal,
  ModalHeading,
  ModalRef,
  ModalToggleButton,
} from "@trussworks/react-uswds";
import classnames from "classnames";

import { ForceClient } from "@/app/view-data/components/ForceClient";

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
      onClick={onClick}
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
 * triggerred by a `DetailsTrigger`. The side panel should un-conditionally be in the markup, its
 * visibility is controlled by the trigger.
 * @param props React Props
 * @param props.details Array of title-value pairs
 * @param props.title Title of the side panel (usually the subject)
 * @param props.subtitle Subtitle of the side panel (such as logged in date)
 * @param props.description Side panel description (usually generic)
 * @param props.detailsRef Ref linking the trigger(s) and panel - see `useDetailsRef`
 * @returns Side Panel component
 */
export const DetailsSidePanel = ({
  detailsRef,
  details,
  title,
  subtitle,
  description,
}: {
  detailsRef: RefObject<ModalRef>;
  details: Detail[];
  title: string;
  subtitle: string;
  description: string;
}) => {
  const id = useId();
  return (
    <ForceClient loading={<></>}>
      <Modal
        id={`details-sidepanel-${id}`}
        className="sidepanel-modal"
        ref={detailsRef}
        aria-labelledby={`details-sidepanel-${id}-heading`}
        aria-describedby={`details-sidepanel-${id}-description`}
      >
        <div>
          <ModalHeading
            id={`details-sidepanel-${id}-heading`}
            className="font-sans-3xl margin-bottom-0"
          >
            {title}
          </ModalHeading>
          <p className="text-base margin-bottom-2 margin-top-1">{subtitle}</p>
        </div>
        <div className="section__line_gray" />

        <section>
          <h3 id={`details-sidepanel-${id}-description`}>{description}</h3>

          <dl>
            {details.map(({ title, value }, i) => (
              <React.Fragment key={`detail-${i}`}>
                <dt>{title}</dt>
                <dd>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>
      </Modal>
    </ForceClient>
  );
};
