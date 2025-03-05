"use client";
import React from "react";

import { Button } from "@trussworks/react-uswds";

/**
 * Functional component for a pair of expand and collapse buttons.
 * @param props - Props containing button configurations.
 * @param props.expandHandler - handler for when the "expand all" button is clicked
 * @param props.collapseHandler - handler for when the "collapse all" button is clicked
 * @param props.descriptor - descriptor for the buttons
 * @returns The JSX element representing the expand and collapse buttons.
 */
export const ExpandCollapseButtons = ({
  expandHandler,
  collapseHandler,
  descriptor,
}: {
  expandHandler: () => void;
  collapseHandler: () => void;
  descriptor: string;
}) => {
  return (
    <>
      <Button type="button" unstyled={true} onClick={expandHandler}>
        Expand all {descriptor}
      </Button>
      <span className="vertical-line"></span>
      <Button type="button" unstyled={true} onClick={collapseHandler}>
        Collapse all {descriptor}
      </Button>
    </>
  );
};
