import type { TableHeader } from "./components/table/SortableHeader";

export const INITIAL_HEADERS: TableHeader[] = [
  {
    id: "patient",
    value: "Patient",
    className: "library-patient-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "date_created",
    value: "Received date",
    className: "library-received-date-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "encounter_date",
    value: "Encounter date",
    className: "library-encounter-date-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "organization",
    value: "Organization",
    className: "library-organization-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "reportable_condition",
    value: "Reportable condition",
    className: "library-condition-column",
    dataSortable: false,
    sortDirection: "",
  },
  {
    id: "rule_summary",
    value: "RCKMS rule summary",
    className: "library-rule-column",
    dataSortable: false,
    sortDirection: "",
  },
];

export const PAGE_SIZES = [10, 25, 50, 75, 100];
export const DEFAULT_ITEMS_PER_PAGE = PAGE_SIZES[1];

export const NO_CONDITIONS_REPORTED_OPTION = "No conditions reported";

export const USER_TYPE = {
  ADMIN: "admin",
  PROG_ADMIN: "prog_admin",
  STANDARD: "standard",
} as const;

export type UserType = (typeof USER_TYPE)[keyof typeof USER_TYPE];

export const USER_TYPE_DISPLAY: Record<string, string> &
  Record<UserType, string> = {
  [USER_TYPE.ADMIN]: "Admin",
  [USER_TYPE.PROG_ADMIN]: "Program admin",
  [USER_TYPE.STANDARD]: "Standard user",
};
