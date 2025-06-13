import { TableHeader } from "./components/table/SortableHeader";

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
