"use client";
import React from "react";
import { Button } from "@trussworks/react-uswds";

type SortButtonProps = {
  columnId: string;
  columnName: string;
  className: string;
  handleSort: (columnName: string, direction: string) => void;
  direction: string;
};

/**
 * Functional component for a sort button.
 * @param props - Props containing button configurations.
 * @param props.columnId - The ID of the column to sort
 * @param props.columnName - The display name of the column to sort
 * @param props.className   - The class name of the button
 * @param props.handleSort - The function to handle the click event
 * @param props.direction - The direction to sort by
 * @returns The JSX element representing the sort button.
 */
export const SortButton: React.FC<SortButtonProps> = ({
  columnId,
  columnName,
  className,
  handleSort,
  direction,
}) => {
  const buttonSelector = `${columnId}-sort-button`;
  const headerSelectorToSort = `${columnId}-header`;

  function resetArrowDirections() {
    const arrowsToReset = document.querySelectorAll(
      'th[aria-sort="ascending"] button',
    );
    arrowsToReset.forEach((arrow) => {
      arrow.id !== buttonSelector
        ? arrow.setAttribute("class", "sort-button usa-button sortable-column")
        : "";
    });
  }

  function changeArrowDirection() {
    const buttons = document.querySelectorAll(`button#${buttonSelector}`);
    buttons.forEach((button) => {
      button.className === "sort-button usa-button sortable-column"
        ? button.setAttribute(
            "class",
            "sort-button usa-button sortable-asc-column",
          )
        : button.className === "sort-button usa-button sortable-asc-column"
          ? button.setAttribute(
              "class",
              "sort-button usa-button sortable-desc-column",
            )
          : button.setAttribute(
              "class",
              "sort-button usa-button sortable-asc-column",
            );
    });
  }

  function resetHeaderMarker() {
    const headersToReset = document.querySelectorAll(`th`);
    headersToReset.forEach((header) => {
      header.removeAttribute("aria-sort");
    });
  }

  function changeHeaderMarker() {
    const headerToSet = document.querySelectorAll(`th#${headerSelectorToSort}`);
    headerToSet.forEach((header) =>
      header.setAttribute("aria-sort", "ascending"),
    );
  }

  return (
    <Button
      id={`${columnId}-sort-button`}
      aria-label={`Sort by ${columnName}`}
      className={`sort-button usa-button ${className}`}
      type="button"
      onClick={() => {
        handleSort(columnId, direction);
        resetArrowDirections();
        changeArrowDirection();
        resetHeaderMarker();
        changeHeaderMarker();
      }}
      children={""}
    ></Button>
  );
};
