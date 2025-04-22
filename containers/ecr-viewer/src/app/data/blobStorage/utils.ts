export interface BlobResponse {
  message: string;
  status: number;
}

export const SAVE_SUCCESS = {
  message: "Success. Saved FHIR bundle.",
  status: 200,
};

export const SAVE_FAILURE = {
  message: "Failed to save FHIR bundle.",
  status: 500,
};

export const SAVE_MISCONFIGURED = {
  message: "Failed to save the FHIR bundle due to misconfiguration.",
  status: 500,
};

export const DELETE_SUCCESS = {
  message: "Success. Deleted FHIR bundle.",
  status: 200,
};

export const DELETE_FAILURE = {
  message: "Failed to delete FHIR bundle.",
  status: 500,
};

export const DELETE_MISCONFIGURED = {
  message: "Failed to delete the FHIR bundle due to misconfiguration.",
  status: 500,
};
