
// TODO: Add resources/links

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