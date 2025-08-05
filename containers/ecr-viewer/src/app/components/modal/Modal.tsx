// This file is adapted from https://github.com/trussworks/react-uswds/tree/main/src/components/modal to allow
// for multi-modal support.
//
// The original modal would assume only one modal existed so it would not open additional modals
// (or in some configs would, but not allow interacting with them) and then would remove added attributes
// un-conditionally when one modal was closed. We needed to handle layers of modals.

import React, {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  RefObject,
  JSX,
  Ref,
} from "react";

import { Button } from "@trussworks/react-uswds";
import classnames from "classnames";
import FocusTrap from "focus-trap-react";
import ReactDOM from "react-dom";

import { Close } from "@/app/components/Icon";
import { ForceClient } from "@/app/view-data/components/ForceClient";

// Fork: forceAction, modalRoot, isInitiallyOpen, and renderToPortal were removed as those
// can cause some strange interaction effects with multi-modal usage and
// we want to be more opinionated in the usage for the viewer. Add `onClose`
// prop to allow event handling when the modal is closed for any reason
// (e.g. escape, click on button, click on overlay)
interface ModalComponentProps {
  ref: RefObject<ModalRef | null>;
  id: string;
  children: React.ReactNode;
  className?: string;
  isLarge?: boolean;
  zIndex?: number;
  onClose?: () => void;
}

export type ModalProps = ModalComponentProps &
  Omit<JSX.IntrinsicElements["div"], "ref">;

export type ModalRef = {
  modalId: string;
  modalIsOpen: boolean;
  toggleModal: (event?: React.MouseEvent, open?: boolean) => boolean;
};

// Fork: We use counting attributes to handle knowing when the last modal
// that caused an attribute to be added is removed. This way when two modals are open
// and we close one, the aria-hidden isn't removed from the background yet

// Get an attribute from an element and set it to 1 bigger than its current value
const incrementAttribute = (el: Element, attr: string) => {
  el.setAttribute(attr, `${parseInt(el.getAttribute(attr) || "0") + 1}`);
};

// Get the current value of an attribute as a number
const getAttributeCount = (el: Element, attr: string) =>
  parseInt(el.getAttribute(attr) || "1");

const InnerModal = ({
  ref,
  id,
  children,
  isLarge = false,
  zIndex = 99999,
  onClose,
  ...divProps
}: ModalProps): React.ReactElement => {
  const modalRootSelector = `[id="${id}"]`;

  const { isOpen, toggleModal } = useModal(modalRootSelector, onClose);
  const [mounted, setMounted] = useState(false);
  const initialPaddingRef = useRef<string>("");
  const tempPaddingRef = useRef<string>("");
  const modalEl = useRef<HTMLDivElement>(null);
  const wrapperEl = useRef<HTMLDivElement>(null);

  // Fork: handle multiple layers of aria-hidden-ing by making sure we don't un-hide things
  // that we didn't hide in the first place
  const NON_MODALS = `body > *:not(${modalRootSelector}):not([aria-hidden]:not([data-modal-hidden]))`;
  const NON_MODALS_HIDDEN = `[data-modal-hidden]`;

  const closeModal = (e?: React.MouseEvent) => {
    toggleModal(e, false);
  };

  useImperativeHandle<ModalRef, ModalRef>(
    ref,
    () => ({
      modalId: id,
      modalIsOpen: isOpen,
      toggleModal,
    }),
    [id, isOpen],
  );

  // Fork: add the `data-modal-count` attribute to the body and make the
  // `data-modal-hidden` attribute a counter instead of a boolean
  const handleOpenEffect = () => {
    const { body } = document;
    body.style.paddingRight = tempPaddingRef.current || "";
    body.classList.add("usa-js-modal--active");
    incrementAttribute(body, "data-modal-count");
    wrapperEl.current?.removeAttribute("aria-hidden");

    document.querySelectorAll(NON_MODALS).forEach((el) => {
      if (el.id === "modal-root") return;
      el.setAttribute("aria-hidden", "true");
      incrementAttribute(el, "data-modal-hidden");
    });
  };

  // Fork: only remove attributes when the last modal that added the attribute
  // is closed
  const handleCloseEffect = () => {
    const { body } = document;
    const count = getAttributeCount(body, "data-modal-count");
    if (count === 1) {
      body.style.paddingRight = initialPaddingRef.current || "";
      body.classList.remove("usa-js-modal--active");
      body.removeAttribute("data-modal-count");
    } else {
      body.setAttribute("data-modal-count", `${count - 1}`);
    }

    document.querySelectorAll(NON_MODALS_HIDDEN).forEach((el) => {
      const count = getAttributeCount(el, "data-modal-hidden");
      if (count === 1) {
        el.removeAttribute("aria-hidden");
        el.removeAttribute("data-modal-hidden");
      } else {
        el.setAttribute("data-modal-hidden", `${count - 1}`);
      }
    });
  };

  useEffect(() => {
    const SCROLLBAR_WIDTH = getScrollbarWidth();
    const INITIAL_PADDING =
      window
        .getComputedStyle(document.body)
        .getPropertyValue("padding-right") || "0px";

    const TEMPORARY_PADDING = `${
      parseInt(INITIAL_PADDING.replace(/px/, ""), 10) +
      parseInt(SCROLLBAR_WIDTH.replace(/px/, ""), 10)
    }px`;

    initialPaddingRef.current = INITIAL_PADDING;
    tempPaddingRef.current = TEMPORARY_PADDING;

    setMounted(true);

    return () => {
      // Reset as if the modal is being closed
      handleCloseEffect();
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      if (isOpen === true) {
        handleOpenEffect();
      } else if (isOpen === false) {
        handleCloseEffect();
      }
    }
  }, [isOpen]);

  const ariaLabelledBy = divProps["aria-labelledby"];
  const ariaDescribedBy = divProps["aria-describedby"];

  if (!ariaLabelledBy) {
    console.error(`${id} is missing aria-labelledby attribute`);
  }
  if (!ariaDescribedBy) {
    console.error(`${id} is missing aria-describedby attribute`);
  }

  delete divProps["aria-labelledby"];
  delete divProps["aria-describedby"];

  const initialFocus = () => {
    const focusEl = modalEl.current?.querySelector("[data-focus]") as
      | HTMLElement
      | SVGElement;

    return focusEl ? focusEl : modalEl.current || false;
  };

  const focusTrapOptions = {
    initialFocus,
    escapeDeactivates: (): boolean => {
      closeModal();
      return true;
    },
  };

  // Fork: add isolation: isolate style to ensure each modal's z-stack is independent
  const modal = (
    <FocusTrap active={isOpen} focusTrapOptions={focusTrapOptions}>
      <ModalWrapper
        role="dialog"
        id={id}
        wrapperRef={wrapperEl}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        isVisible={isOpen}
        handleClose={closeModal}
        style={{ zIndex }}
      >
        <ModalWindow
          modalId={id}
          {...divProps}
          ref={modalEl}
          isLarge={isLarge}
          tabIndex={-1}
          handleClose={closeModal}
        >
          {children}
        </ModalWindow>
      </ModalWrapper>
    </FocusTrap>
  );

  return ReactDOM.createPortal(modal, document.body);
};

/**
 * A modal component which supports layered modals.
 *
 * Adapted from the @trussworks/react-uswds Modal to suit the needs of the viewer.
 * @param props React props
 * @param props.ref modal ref
 * @param props.id component ID
 * @param props.children modal content
 * @param props.isLarge whether to make the modal big. Default false
 * @param props.zIndex z index of the modal. Should only be set if a modal can't be
 * placed in the markup in the correct view-order.
 * @param props.onClose Handler to call when modal closes
 * @returns Modal
 */
export const Modal = (props: ModalProps) => {
  return (
    <ForceClient loading={null}>
      <InnerModal {...props} />
    </ForceClient>
  );
};

export default Modal;

// ========= utils ============ //

type ModalHook = {
  isOpen: boolean;
  toggleModal: (e?: React.MouseEvent, open?: boolean) => boolean;
};

const useModal = (
  modalRootSelector: string,
  onClose?: () => void,
): ModalHook => {
  const [isOpen, setIsOpen] = useState(false);

  const allowToggle = (e: React.MouseEvent): boolean => {
    const clickedElement = e.target as Element;

    if (e && clickedElement) {
      // Fork: this was updated to be more specific that the button was in
      // its modal vs any modal
      if (clickedElement.closest(`${modalRootSelector} .usa-modal`)) {
        // Element is inside its modal

        // Only allow toggle if element is a close button, don't allow opening a modal from with a modal
        return (
          clickedElement.hasAttribute("[data-close-modal]") ||
          !!clickedElement.closest("[data-close-modal]")
        );
      }
    }

    return true;
  };

  const toggleModal = (e?: React.MouseEvent, open?: boolean): boolean => {
    if (e && !allowToggle(e)) {
      e.stopPropagation();
      return false;
    }

    // toggling
    if (open === undefined) {
      open = !isOpen;
    }

    if (open === true) {
      setIsOpen(true);
    } else {
      onClose?.();
      setIsOpen(false);
    }

    return true;
  };

  return { isOpen, toggleModal };
};

const getScrollbarWidth = (): string => {
  // Only run in browser
  if (typeof document !== "undefined") {
    const outer = document.createElement("div");

    outer.setAttribute(
      "style",
      "visibility: hidden; overflow: scroll; ms-overflow-style: scrollbar",
    );

    document.body.appendChild(outer);

    const inner = document.createElement("div");
    outer.appendChild(inner);

    const scrollbarWidth = `${outer.offsetWidth - inner.offsetWidth}px`;
    outer.parentNode?.removeChild(outer);

    return scrollbarWidth;
  }

  return "";
};

// ========= ModalWindow ========== //

interface ModalWindowProps {
  ref: RefObject<HTMLDivElement | null>;
  modalId: string;
  children: React.ReactNode;
  handleClose: () => void;
  className?: string;
  isLarge?: boolean;
}

const ModalWindow = ({
  ref,
  modalId,
  className,
  children,
  handleClose,
  isLarge = false,
  ...divProps
}: ModalWindowProps &
  Omit<JSX.IntrinsicElements["div"], "ref">): React.ReactElement => {
  const classes = classnames(
    "usa-modal",
    {
      "usa-modal--lg": isLarge,
    },
    className,
  );

  return (
    <div {...divProps} data-testid="modalWindow" className={classes} ref={ref}>
      <div className="usa-modal__content">
        <div className="usa-modal__main">{children}</div>
        <ModalCloseButton aria-controls={modalId} handleClose={handleClose} />
      </div>
    </div>
  );
};

// ======== ModalWrapper ========= //
interface ModalWrapperProps {
  wrapperRef: Ref<HTMLDivElement>;
  id: string;
  children: React.ReactNode;
  isVisible: boolean;
  handleClose: () => void;
  className?: string;
}

const ModalWrapper = ({
  wrapperRef,
  id,
  children,
  isVisible,
  className,
  handleClose,
  ...divProps
}: ModalWrapperProps &
  Omit<JSX.IntrinsicElements["div"], "ref">): React.ReactElement => {
  const classes = classnames(
    "usa-modal-wrapper",
    {
      "is-visible": isVisible,
      "is-hidden": !isVisible,
    },
    "isolate",
    className,
  );

  return (
    <div
      {...divProps}
      ref={wrapperRef}
      id={id}
      className={classes}
      role="dialog"
    >
      <div
        data-testid="modalOverlay"
        className="usa-modal-overlay"
        onClick={handleClose}
        aria-controls={id}
      >
        {children}
      </div>
    </div>
  );
};

// =========== ModalCloseButton ========== //

interface ModalCloseButtonProps {
  handleClose: () => void;
}

const ModalCloseButton = ({
  handleClose,
  ...buttonProps
}: ModalCloseButtonProps &
  JSX.IntrinsicElements["button"]): React.ReactElement => {
  return (
    <Button
      aria-label="Close this window"
      {...buttonProps}
      className="usa-modal__close"
      onClick={handleClose}
      data-close-modal={true}
      type="button"
    >
      <Close aria-hidden="true" />
    </Button>
  );
};
