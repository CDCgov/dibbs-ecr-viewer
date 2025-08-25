import { ReactNode } from "react";

/**
 * An unstyled list of items with padding and a faint line between them
 * @param props react props
 * @param props.items Items to render as a list
 * @returns unstyled list component
 */
export const UnstyledDividedList = ({ items }: { items: ReactNode[] }) => {
  return (
    <ul className="add-list-reset">
      {items.map((item, i) => (
        <li
          key={`list-item-${i}`}
          className={`padding-y-2 ${i > 0 ? "border-top border-base-lightest" : ""}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};
