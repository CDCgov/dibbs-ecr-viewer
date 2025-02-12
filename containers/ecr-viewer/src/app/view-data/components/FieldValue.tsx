"use client";
import React, { ReactNode, useState, useId } from "react";
import { Button } from "@trussworks/react-uswds";

/**
 * Functional component for displaying a value. If the value has a length greater than 500 characters, it will be split after 300 characters with a view more button to view the entire value.
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

  const fieldValue = trimField(children, cutLength, setHidden).value;

  return hidden ? (
    fieldValue
  ) : (
    <>
      <span id={id}>{children}&nbsp;</span>
      <Button
        type={"button"}
        unstyled={true}
        onClick={() => setHidden(true)}
        aria-expanded="true"
        aria-controls={id}
      >
        View less
      </Button>
    </>
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
 * @param setHidden - a function used to signify that the view more button has been clicked.
 * @returns - an object with the shortened value and the length left over.
 */
const trimField = (
  value: React.ReactNode,
  remainingLength: number,
  setHidden: (val: boolean) => void,
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
            <Button
              type={"button"}
              unstyled={true}
              onClick={() => setHidden(false)}
              aria-expanded={"false"}
              aria-controls={id}
            >
              View more
            </Button>
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
    let newValArr = [];
    for (let i = 0; i < value.length; i++) {
      let splitVal = trimField(value[i], remainingLength, setHidden);
      remainingLength = splitVal.remainingLength;
      newValArr.push(
        <React.Fragment key={`arr-${i}-${splitVal.value}`}>
          {splitVal.value}
        </React.Fragment>,
      );
    }
    return { value: newValArr, remainingLength: remainingLength };
  } else if (React.isValidElement(value) && value.props.children) {
    let childrenCopy: ReactNode;
    if (Array.isArray(value.props.children)) {
      childrenCopy = [...value.props.children];
    } else {
      childrenCopy = value.props.children;
    }
    let split = trimField(childrenCopy, remainingLength, setHidden);
    const newElement = React.cloneElement(
      value,
      { ...value.props },
      split.value,
    );
    return { value: newElement, remainingLength: split.remainingLength };
  }
  return { value, remainingLength };
};
