"use client";
import React, { ReactNode, useState, useId } from "react";

import { Button } from "@trussworks/react-uswds";

/**
 * Functional component for displaying a value. If the value has a length greater than 500 characters, it will be split after 300 characters with a view more button to view the entire value. Once expanded, a `view less` button will be stickily viewable on the bottom of the container of the content, which as a max height set to avoid taking over the entire experience.
 * @param value - props for the component
 * @param value.children - the value to be displayed in the value
 * @returns - A React element representing the display of the value
 */
export const FieldValue: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [hidden, setHidden] = useState(true);
  const id = useId();

  const maxLength = 500;
  const cutLength = 300;

  const valueLength = getReactNodeLength(children);
  if (valueLength <= maxLength) {
    return children;
  }

  const formattedLength = Intl.NumberFormat().format(valueLength);

  const viewMoreButon = (
    <Button
      type="button"
      unstyled={true}
      onClick={() => setHidden(false)}
      aria-expanded="false"
      aria-controls={id}
    >
      View more ({formattedLength} characters total)
    </Button>
  );

  const fieldValue = trimField(children, cutLength, viewMoreButon).value;

  return hidden ? (
    fieldValue
  ) : (
    <div className="position-relative field-height">
      <span id={id}>{children}&nbsp;</span>
      <div className="bg-white position-sticky bottom-0 left-0">
        <Button
          type="button"
          unstyled={true}
          onClick={() => setHidden(true)}
          aria-expanded="true"
          aria-controls={id}
        >
          View less ({formattedLength} characters total)
        </Button>
      </div>
    </div>
  );
};

/**
 * Recursively determine the character length of a ReactNode
 * @param value - react node to be measured
 * @returns - the number of characters in the ReactNode
 */
const getReactNodeLength = (value: React.ReactNode): number => {
  if (typeof value === "string") {
    return value.length;
  } else if (Array.isArray(value)) {
    let count = 0;
    value.forEach((val) => (count += getReactNodeLength(val)));
    return count;
  } else if (React.isValidElement(value) && value.props.children) {
    return getReactNodeLength(value.props.children);
  }
  return 0;
};

/**
 * Create an element with `remainingLength` length followed by a view more button
 * @param value - the value that will be cut
 * @param remainingLength - the length of how long the returned element will be
 * @param viewMoreButton - a button to view more of the content.
 * @returns - an object with the shortened value and the length left over.
 */
const trimField = (
  value: React.ReactNode,
  remainingLength: number,
  viewMoreButton: ReactNode,
): { value: React.ReactNode; remainingLength: number } => {
  const id = useId();
  if (remainingLength < 1) {
    return { value: null, remainingLength };
  }
  if (typeof value === "string") {
    const cutString = value.substring(0, remainingLength);
    if (remainingLength - cutString.length === 0) {
      return {
        value: (
          <>
            <span id={id}>{cutString}...&nbsp;</span>
            {viewMoreButton}
          </>
        ),
        remainingLength: 0,
      };
    }
    return {
      value: cutString,
      remainingLength: remainingLength - cutString.length,
    };
  } else if (Array.isArray(value)) {
    const newValArr = [];
    for (let i = 0; i < value.length; i++) {
      const splitVal = trimField(value[i], remainingLength, viewMoreButton);
      remainingLength = splitVal.remainingLength;
      newValArr.push(
        <React.Fragment key={`arr-${i}-${splitVal.value}`}>
          {splitVal.value}
        </React.Fragment>,
      );
    }
    return { value: newValArr, remainingLength };
  } else if (React.isValidElement(value) && value.props.children) {
    let childrenCopy: ReactNode;
    if (Array.isArray(value.props.children)) {
      childrenCopy = [...value.props.children];
    } else {
      childrenCopy = value.props.children;
    }
    const split = trimField(childrenCopy, remainingLength, viewMoreButton);
    const newElement = React.cloneElement(
      value,
      { ...value.props },
      split.value,
    );
    return { value: newElement, remainingLength: split.remainingLength };
  }
  return { value, remainingLength };
};
