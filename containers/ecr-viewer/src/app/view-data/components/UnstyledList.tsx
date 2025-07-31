import { ReactNode } from "react";

/**
 * An unstyled list of items with padding between them
 * @param props react props
 * @param props.items Items to render as a list
 * @returns unstyled list component
 */
export const UnstyledList = ({ items }: { items: ReactNode[] }) => {
  return (
    <ul className="add-list-reset">
      {items.map((item, i) => (
        <li
          key={`list-item-${i}`}
          className={i > 0 ? "margin-top-4" : undefined}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};
