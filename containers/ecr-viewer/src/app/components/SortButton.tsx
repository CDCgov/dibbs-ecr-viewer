"use client";
import React from "react";

import { Button } from "@trussworks/react-uswds";

import { ArrowDownward, ArrowUpward, SortArrow } from "./Icon";

type SortButtonProps = {
  columnId: string;
  columnName: string;
  direction: string;
  disabled?: boolean;
  handleSort: () => void;
};

/**
 * Functional component for a sort button.
 * @param props - Props containing button configurations.
 * @param props.columnId - The ID of the column to sort
 * @param props.columnName - The display name of the column to sort
 * @param props.direction - The direction of the sort
 * @param props.disabled - Whether to disable the button (default false)
 * @param props.handleSort - The function to handle the click event
 * @returns The JSX element representing the sort button.
 */
export const SortButton: React.FC<SortButtonProps> = ({
  columnId,
  columnName,
  direction,
  disabled = false,
  handleSort,
}) => {
  const IconTag =
    direction === "ASC"
      ? ArrowUpward
      : direction === "DESC"
        ? ArrowDownward
        : SortArrow;

  return (
    <Button
      id={`${columnId}-sort-button`}
      aria-label={`Sort by ${columnName}`}
      className="sort-button usa-button"
      type="button"
      disabled={disabled}
      onClick={handleSort}
      unstyled={true}
    >
      <span className="text-ink">{columnName}</span>
      <IconTag aria-hidden={true} className="square-3" />
    </Button>
  );
};
