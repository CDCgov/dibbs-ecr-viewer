import { Bundle } from "fhir/r4";

export interface Response {
  status: number;
  payload: object;
}

export interface SuccessResponse extends Response {
  status: 200;
  payload: { fhirBundle: Bundle };
}
export interface ErrorResponse extends Response {
  payload: { message: string };
}

export type FhirDataResponse = SuccessResponse | ErrorResponse;
