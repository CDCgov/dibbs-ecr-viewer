import { ReactNode } from "react";

/**
 * @param props React props
 * @param props.children Page content
 * @returns Basic elements present on all admin pages
 */
const AdminPageLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="overflow-y-auto display-flex flex-column height-viewport-header-footer">{children}</div>
  );
};

export default AdminPageLayout;
