"use client";
import React, { ReactNode } from "react";

import classNames from "classnames";

import { FieldValue } from "./FieldValue";
import { ToolTipElement } from "./ToolTipElement";

export interface DisplayDataProps {
  /**
   * Title of the field to display
   */
  title?: ReactNode;

  /**
   * Extra classnames to pass to the wrapper around the value
   */
  className?: string;

  /**
   * Text to display in a tooltip next to the title
   */
  toolTip?: string;

  /**
   * Value of the field
   */
  value?: ReactNode;

  /**
   * Include a divider line below the field
   */
  dividerLine?: boolean;

  /**
   * Whether this item contains a table - NOTE this isn't actually used
   * by `DataDisplay` and should probably be removed - don't use it more please
   */
  table?: boolean;

  /**
   * Whether the content should go below the title in the full width of the container
   */
  fullWidthContent?: boolean;

  /**
   * Display the title as un-bolded regular font
   */
  titleNormal?: boolean;
}

/**
 * Functional component for displaying data. Typically, this is as a title and value in a single row, however the `fullWidthContent` option will instead by the value below the title.
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
  const { dividerLine = true } = item;
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
            "grid-col",
            item.fullWidthContent ? "width-full" : "maxw7",
            "text-pre-line",
            "p-list",
            className,
            item.className ? item.className : "",
          )}
        >
          <FieldValue>{item.value}</FieldValue>
        </div>
      </div>
      {dividerLine ? <div className={`section__line_${themeColor}`} /> : ""}
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
