"use client";
import React from "react";
import { Button } from "@trussworks/react-uswds";

type SortButtonProps = {
  columnId: string;
  columnName: string;
  className: string;
  handleSort: () => void;
  direction: string;
};

/**
 * Functional component for a sort button.
 * @param props - Props containing button configurations.
 * @param props.columnId - The ID of the column to sort
 * @param props.columnName - The display name of the column to sort
 * @param props.className   - The class name of the button
 * @param props.handleSort - The function to handle the click event
 * @returns The JSX element representing the sort button.
 */
export const SortButton: React.FC<SortButtonProps> = ({
  columnId,
  columnName,
  className,
  handleSort,
}) => {
  return (
    <Button
      id={`${columnId}-sort-button`}
      aria-label={`Sort by ${columnName}`}
      className={`sort-button usa-button ${className}`}
      type="button"
      onClick={handleSort}
      children={""}
    ></Button>
  );
};
