import { ReactNode } from "react";

/**
 * Layout component to use when signaling no data in a table
 * @param props react props
 * @param props.children Content of the rolw
 * @returns accessible no data table row
 */
export const NoDataRow = ({ children }: { children: ReactNode }) => (
  <tr>
    <td colSpan={999} className="text-middle text-center height-card">
      <span className="text-bold font-body-lg" tabIndex={0}>
        {children}
      </span>
    </td>
  </tr>
);
