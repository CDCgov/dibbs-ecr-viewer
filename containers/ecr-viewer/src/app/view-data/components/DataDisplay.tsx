"use client";
import React, { ReactNode } from "react";

import classNames from "classnames";

import { FieldValue } from "./FieldValue";
import { ToolTipElement } from "./ToolTipElement";

export interface DisplayDataProps {
  title?: ReactNode;
  className?: string;
  toolTip?: string;
  value?: ReactNode;
  dividerLine?: boolean;
  table?: boolean;
  fullWidthContent?: boolean;
  titleNormal?: boolean;
}

/**
 * Functional component for displaying data.
 * @param props - Props for the component.
 * @param props.item - The display data item to be rendered.
 * @param [props.className] - Additional class name for styling purposes.
 * @param [props.themeColor] - Color to use for theming (default="gray").
 * @returns - A React element representing the display of data.
 */
export const DataDisplay = ({
  item,
  className,
  themeColor = "gray",
}: {
  item: DisplayDataProps;
  className?: string;
  themeColor?: string;
}): React.JSX.Element => {
  item.dividerLine =
    item.dividerLine === null || item.dividerLine === undefined
      ? true
      : item.dividerLine;
  return (
    <div>
      <div
        className={classNames("grid-row", {
          "flex-column": item.fullWidthContent,
        })}
      >
        <div
          className={classNames(
            { "text-normal": item.titleNormal },
            "data-title padding-right-1",
          )}
        >
          <ToolTipElement toolTip={item.toolTip}>{item.title}</ToolTipElement>
        </div>
        <div
          className={classNames(
            "grid-col text-pre-line p-list",
            className,
            item.className ? item.className : "",
            item.fullWidthContent ? "width-full" : "maxw7",
          )}
        >
          <FieldValue>{item.value}</FieldValue>
        </div>
      </div>
      {item.dividerLine ? (
        <div className={`section__line_${themeColor}`} />
      ) : (
        ""
      )}
    </div>
  );
};

/**
 * Functional component for displaying (a list of) data tables.
 * @param props - Props containing the item to be displayed.
 * @param props.item - The data item to be displayed.
 * @param props.themeColor - The color used in the line (default "gray").
 * @returns The JSX element representing the data table display.
 */
export const DataTableDisplay: React.FC<{
  item: DisplayDataProps;
  themeColor?: string;
}> = ({ item, themeColor = "gray" }): React.JSX.Element => {
  const dividerLine = item.dividerLine ?? true;
  return (
    <>
      <div className="grid-row">
        <div className="grid-col-auto width-full text-pre-line">
          {item.value}
        </div>
      </div>
      {dividerLine && <div className={`section__line_${themeColor}`} />}
    </>
  );
};
