import { ReactNode } from "react";

import Header from "@/app/components/Header";

/**
 * @param props React props
 * @param props.children Page content
 * @returns Basic elements present on all admin pages
 */
const AdminPageLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="display-flex flex-column height-viewport">{children}</div>
  );
};

export default AdminPageLayout;
