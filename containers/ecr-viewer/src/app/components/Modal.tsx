// This file is adapted from https://github.com/trussworks/react-uswds/tree/main/src/components/modal to allow
// for multi-modal support
import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import { Button } from "@trussworks/react-uswds";
import classnames from "classnames";
import FocusTrap from "focus-trap-react";
import ReactDOM from "react-dom";

import { Close } from "./Icon";

interface ModalComponentProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isLarge?: boolean;
  onClose?: () => void;
  isInitiallyOpen?: boolean;
}

export type ModalProps = ModalComponentProps & JSX.IntrinsicElements["div"];

export type ModalRef = {
  modalId: string;
  modalIsOpen: boolean;
  toggleModal: (event?: React.MouseEvent, open?: boolean) => boolean;
};

const incrementAttribute = (el: Element, attr: string) => {
  el.setAttribute(attr, `${parseInt(el.getAttribute(attr) || "0") + 1}`);
};

const getAttributeCount = (el: Element, attr: string) =>
  parseInt(el.getAttribute(attr) || "1");

/**
 *
 * @param props React props
 * @param props.id component ID
 * @param props.children modal content
 * @param props.isLarge whether to make the modal big. Default false
 * @param props.isInitiallyOpen whether modal should start open
 * @param props.onClose Handler to call when modal closes
 * @param ref Reference to the modal
 * @returns Modal
 */
export const ModalForwardRef: React.ForwardRefRenderFunction<
  ModalRef,
  ModalProps
> = (
  { id, children, isLarge = false, isInitiallyOpen, onClose, ...divProps },
  ref,
): React.ReactElement => {
  const modalRootSelector = `[id="${id}"]`;

  const { isOpen, toggleModal } = useModal(isInitiallyOpen, modalRootSelector);
  const [mounted, setMounted] = useState(false);
  const initialPaddingRef = useRef<string>();
  const tempPaddingRef = useRef<string>();
  const modalEl = useRef<HTMLDivElement>(null);

  const NON_MODALS = `body > *:not(${modalRootSelector}):not([aria-hidden]:not([data-modal-hidden]))`;
  const NON_MODALS_HIDDEN = `[data-modal-hidden]`;

  const closeModal = (e?: React.MouseEvent) => {
    toggleModal(e, false);
    onClose?.();
  };

  useImperativeHandle(
    ref,
    () => ({
      modalId: id,
      modalIsOpen: isOpen,
      toggleModal,
    }),
    [id, isOpen],
  );

  const handleOpenEffect = () => {
    const { body } = document;
    body.style.paddingRight = tempPaddingRef.current || "";
    body.classList.add("usa-js-modal--active");
    incrementAttribute(body, "data-modal-count");

    document.querySelectorAll(NON_MODALS).forEach((el) => {
      if (el.id === "modal-root") return;
      el.setAttribute("aria-hidden", "true");
      incrementAttribute(el, "data-modal-hidden");
    });
  };

  const handleCloseEffect = () => {
    const { body } = document;
    const count = getAttributeCount(body, "data-modal-count");
    if (count === 1) {
      body.style.paddingRight = initialPaddingRef.current || "";
      body.classList.remove("usa-js-modal--active");
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

  const modal = (
    <FocusTrap active={isOpen} focusTrapOptions={focusTrapOptions}>
      <ModalWrapper
        role="dialog"
        id={id}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        isVisible={isOpen}
        handleClose={closeModal}
        style={{ isolation: "isolate" }}
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

export const Modal = forwardRef(ModalForwardRef);

export default Modal;

// ========= utils ============ //

type ModalHook = {
  isOpen: boolean;
  toggleModal: (e?: React.MouseEvent, open?: boolean) => boolean;
};

const useModal = (
  isInitiallyOpen: boolean | undefined,
  modalRootSelector: string,
): ModalHook => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen || false);

  const allowToggle = (e: React.MouseEvent): boolean => {
    const clickedElement = e.target as Element;

    if (e && clickedElement) {
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

    if (open === true) setIsOpen(true);
    else if (open === false) setIsOpen(false);
    else {
      setIsOpen((state) => !state);
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
  modalId: string;
  children: React.ReactNode;
  handleClose: () => void;
  className?: string;
  isLarge?: boolean;
}

const ModalWindowForwardRef: React.ForwardRefRenderFunction<
  HTMLDivElement,
  ModalWindowProps & JSX.IntrinsicElements["div"]
> = (
  { modalId, className, children, handleClose, isLarge = false, ...divProps },
  ref,
): React.ReactElement => {
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

const ModalWindow = forwardRef(ModalWindowForwardRef);

// ======== ModalWrapper ========= //
interface ModalWrapperProps {
  id: string;
  children: React.ReactNode;
  isVisible: boolean;
  handleClose: () => void;
  className?: string;
}

const ModalWrapperForwardRef: React.ForwardRefRenderFunction<
  HTMLDivElement,
  ModalWrapperProps & JSX.IntrinsicElements["div"]
> = (
  { id, children, isVisible, className, handleClose, ...divProps },
  ref,
): React.ReactElement => {
  const classes = classnames(
    "usa-modal-wrapper",
    {
      "is-visible": isVisible,
      "is-hidden": !isVisible,
    },
    className,
  );

  return (
    <div {...divProps} ref={ref} id={id} className={classes} role="dialog">
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

const ModalWrapper = forwardRef(ModalWrapperForwardRef);

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
