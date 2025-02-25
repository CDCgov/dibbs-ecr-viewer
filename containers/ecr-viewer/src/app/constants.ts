export const INITIAL_HEADERS = [
  {
    id: "patient",
    value: "Patient",
    className: "library-patient-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "date_created",
    value: "Received Date",
    className: "library-received-date-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "encounter_date",
    value: "Encounter Date",
    className: "library-encounter-date-column",
    dataSortable: true,
    sortDirection: "",
  },
  {
    id: "reportable_condition",
    value: "Reportable Condition",
    className: "library-condition-column",
    dataSortable: false,
    sortDirection: "",
  },
  {
    id: "rule_summary",
    value: "RCKMS Rule Summary",
    className: "library-rule-column",
    dataSortable: false,
    sortDirection: "",
  },
];

export const PAGE_SIZES = [25, 50, 75, 100];
export const DEFAULT_ITEMS_PER_PAGE = PAGE_SIZES[0];
