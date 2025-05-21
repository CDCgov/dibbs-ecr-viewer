import { ReactNode } from "react";

/**
 *
 * @param props React props
 * @param props.children Content of the field set
 * @param props.legend Legend (name) of the field set
 * @returns DIBBs styled fieldset component
 */
export const FieldSet = ({
  children,
  legend,
}: {
  children: ReactNode;
  legend: ReactNode;
}) => {
  return (
    <fieldset className="dibbs-fieldset">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
};
