import argparse
import json
import os

import grequests

URL = "http://orchestration-service:8080"
BASEDIR = os.path.dirname(os.path.abspath(__file__))


def _get_args():
    parser = argparse.ArgumentParser(
        prog="Create Seed Data",
        description="Convert eICR and RR files to FHIR bundles and insert them into the database.",
        epilog="For each directory in baseECR/LA the script will look for a `CDA_eICR.xml` and `CDA_RR.xml` file. If they are found, it will convert them into a FHIR bundle (saved as `bundle.json`) and insert that into the database using the Orchestration service.",
    )
    parser.add_argument(
        "-s",
        "--skip_convert",
        action="store_true",
        help="If this is set, if `bundle.json` already exists, the script will not look for `CDA_eICR.xml` and `CDA_RR.xml` files to convert them again, and use the existing `bundle.json`.",
    )
    return parser.parse_args()


def _process_files(args):
    """
    Convert eICR and RR into FHIR bundles using the FHIR converter.

    :return: A list of fhir bundles
    """
    print("Converting files...")
    subfolders_raw = os.getenv("SEED_DATA_DIRECTORIES")
    subfolders = subfolders_raw.split(",")

    # Holds all of the rquests we are going to make
    requests = []
    folder_paths = []
    configName = "integrated.json"
    if (
        os.getenv("CONFIG_NAME") == "AWS_SQLSERVER_NON_INTEGRATED"
        or os.getenv("CONFIG_NAME") == "AZURE_SQLSERVER_NON_INTEGRATED"
    ):
        configName = "non-integrated-extended.json"
    elif (
        os.getenv("CONFIG_NAME") == "AZURE_PG_NON_INTEGRATED"
        or os.getenv("CONFIG_NAME") == "AWS_PG_NON_INTEGRATED"
    ):
        configName = "non-integrated-core.json"

    def _process_eicrs(subfolder, folder, folder_path, payload):
        r = grequests.post(f"{URL}/process-message", json=payload)
        requests.append(r)
        folder_paths.append(folder_path)

    # Iterate over the subfolders to collect requests
    for subfolder in subfolders:
        subfolder_path = os.path.join(BASEDIR, "baseECR", subfolder)

        # Check if the subfolder exists and is a directory
        if not os.path.isdir(subfolder_path):
            print(f"{subfolder_path} is not a valid directory.")
            continue

        # Now iterate through the folders inside each subfolder
        for folder in os.listdir(subfolder_path):
            folder_path = os.path.join(subfolder_path, folder)

            # Check if it's a directory
            if not os.path.isdir(folder_path):
                continue

            if os.path.exists(os.path.join(folder_path, "bundle.json")) and (
                args.skip_convert
                or not os.path.exists(os.path.join(folder_path, "CDA_eICR.xml"))
            ):
                # Just upload the bundle
                with open(os.path.join(folder_path, "bundle.json")) as fhir_file:
                    payload = {
                        "message_type": "fhir",
                        "data_type": "fhir",
                        "config_file_name": "save-bundle-to-ecr-viewer.json",
                        "message": json.load(fhir_file),
                    }
                    _process_eicrs(subfolder, folder, folder_path, payload)

            # If we are not just inserting the bundle, check for the necessary files
            elif os.path.exists(os.path.join(folder_path, "CDA_eICR.xml")):
                # Get the RR data if available
                rr_data = None
                if os.path.exists(os.path.join(folder_path, "CDA_RR.xml")):
                    with (
                        open(os.path.join(folder_path, "CDA_RR.xml")) as rr_file,
                    ):
                        rr_data = rr_file.read()

                # Open the necessary files in the folder
                with (
                    open(os.path.join(folder_path, "CDA_eICR.xml")) as eicr_file,
                ):
                    payload = {
                        "message_type": "ecr",
                        "data_type": "ecr",
                        "config_file_name": configName,
                        "message": eicr_file.read(),
                        "rr_data": rr_data,
                    }

                    _process_eicrs(subfolder, folder, folder_path, payload)
            # If neither `bundle.json` nor `CDA_eICR.xml` exists, skip processing
            else:
                print(
                    f"Neither `bundle.json` nor `CDA_eICR.xml` found in {folder_path}. Skipping."
                )
                continue

    # Asynchronously send our collected requests
    n = 0
    failed = []
    num_requests = len(requests)
    print(f"Starting conversion and load of {num_requests} requests")
    for index, response in grequests.imap_enumerated(requests, size=8):
        n += 1
        print(f"Received response {n} of {num_requests}")
        folder_path = folder_paths[index]
        responses_json = response.json()
        if response.status_code != 200:
            failed.append(folder_path)
            print(f"Failed to convert {folder_path}.\nResponse:\n{responses_json}")
            continue

        if "responses" in responses_json.get("processed_values", {}):
            for response in responses_json["processed_values"]["responses"]:
                if "stamped_ecr" in response:
                    with open(
                        os.path.join(folder_path, "bundle.json"),
                        "w",
                    ) as fhir_file:
                        json.dump(
                            response["stamped_ecr"]["extended_bundle"],
                            fhir_file,
                            indent=4,
                        )
        print(f"Converted {folder_path} successfully.")

    print(
        f"Conversion complete: {n} records attempted and {len(failed)} failed : {failed}"
    )

    if len(failed) > 0:
        exit(1)


if __name__ == "__main__":
    args = _get_args()
    _process_files(args)
