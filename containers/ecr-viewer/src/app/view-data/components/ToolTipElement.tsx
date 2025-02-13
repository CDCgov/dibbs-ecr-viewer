"use client";
import React from "react";
import { Tooltip } from "@trussworks/react-uswds";
import { ForceClient } from "./ForceClient";

type CustomDivProps = React.PropsWithChildren<{
  className?: string;
}> &
  JSX.IntrinsicElements["div"] &
  React.RefAttributes<HTMLDivElement>;
/**
 * `CustomDivForwardRef` is a React forward reference component that renders a div element
 *  with extended capabilities. This component supports all standard div properties along with
 *  additional features provided by `tooltipProps`.
 * @component
 * @param props - The props for the CustomDiv component.
 * @param props.className - CSS class to apply to the div element.
 * @param props.children - Child elements or content to be rendered within the div.
 * @param props.tooltipProps - Additional props to be spread into the div element, typically used for tooltip logic or styling.
 * @param ref - Ref forwarded to the div element.
 * @returns A React element representing a customizable div.
 */
const CustomDivForwardRef: React.ForwardRefRenderFunction<
  HTMLDivElement,
  CustomDivProps
> = ({ className, children, ...tooltipProps }: CustomDivProps, ref) => (
  <div ref={ref} className={className} {...tooltipProps}>
    {children}
  </div>
);
export const TooltipDiv = React.forwardRef(CustomDivForwardRef);

interface ToolTipProps {
  toolTip?: string;
  children: React.ReactNode;
}

/**
 * Creates a tooltip-wrapped element if a tooltip text is provided, or returns the content directly otherwise.
 * The tooltip is only applied when the `toolTip` parameter is not null or undefined. If the tooltip text
 * is less than 100 characters, a specific class `short-tooltip` is added to style the tooltip differently.
 * @param content - The properties object for tooltips.
 * @param content.toolTip - The text for the tooltip. If this is provided, the content will be wrapped in a tooltip.
 * @param content.children - The content to be displayed, which can be any valid React node or text
 * @returns A React JSX element containing either the plain content or content wrapped in a tooltip, depending on the tooltip parameter.
 */
export const ToolTipElement = ({
  toolTip,
  children,
}: ToolTipProps): React.JSX.Element => {
  return toolTip ? (
    <ForceClient loading={children}>
      <Tooltip
        label={toolTip}
        asCustom={TooltipDiv}
        className={`usa-tooltip${toolTip.length < 100 ? " short-tooltip" : ""}`}
      >
        {children}
      </Tooltip>
    </ForceClient>
  ) : (
    <>{children}</>
  );
};
