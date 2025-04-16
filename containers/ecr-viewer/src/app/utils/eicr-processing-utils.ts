/* 
EICR Processing Status Value Sets
EICR Processing Status: https://phinvads.cdc.gov/vads/ViewValueSet.action?oid=2.16.840.1.113883.10.20.15.2.5.8
EICR Processing Status Reason: https://phinvads.cdc.gov/vads/ViewValueSet.action?oid=2.16.840.1.113883.10.20.15.2.5.7
EICR Processing Status Reason Detail: https://phinvads.cdc.gov/vads/ViewValueSet.action?oid=2.16.840.1.113883.10.20.15.2.5.10
*/

export const eicrProcessingReasonMap: Record<string, string> = {
  RRVS23:
    "eICR was not processed with an error of: fatal problem with the eICR that was received",
  RRVS25:
    "eICR was not processed with an error of: significant content or format issues",
  RRVS24: "eICR was not processed with an error of: an ongoing server problem",
  RRVS26:
    "eICR was processed with the severe warning of: invalid eICR identifier",
  RRVS27:
    "eICR was processed with the severe warning of: required data not found",
  RRVS28: "eICR was processed with the warning of: content or format issues",
  RRVS30: "Inactive eRSD (RCTC) Code",
  RRVS34: "Malformed eRSD (RCTC) Version",
  RRVS29: "Outdated eRSD (RCTC) Version",
};

// Note: Only have these suggested solutions currently. Long-term, we will figure out suggested solutions for the other warning reasons with APHL
export const ersdWarningsSuggestedSolutionsMap: Record<string, string> = {
  RRVS34:
    "The trigger code version your organization is using could not be determined. The trigger codes may be out date. Please have your EHR administrators update the version format for complete eCR functioning.",
  RRVS29:
    "The trigger code version your organization is using is out-of-date. Please have your EHR administration install the current version for complete eCR functioning.",
};

export enum ReasonDetailMap {
  RRVS29 = "RRVS31", // Outdated eRSD Version --> Outdated eRSD Version Detail
  RRVS34 = "RRVS35", // Malformed eRSD Version --> Malformed eRSD Version Detail
  RRVS30 = "RRVS32" // Inactive eRSD Code --> Inactive eRSD Code Detail
};