import argparse
import io
import json
import os
import zipfile

import grequests
import requests as rqsts

MIGRATION_URL = "http://host.docker.internal:3000/ecr-viewer/api/migrate-db"
BASEDIR = os.path.dirname(os.path.abspath(__file__))


def _get_args():
    parser = argparse.ArgumentParser(
        description="Zip subfolders and upload them to the ECR Viewer API.",
    )
    return parser.parse_args()


def zip_folder(folder_path):
    """Zips the given folder into an in-memory ZIP file."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, _, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, folder_path)
                zip_file.write(file_path, arcname=arcname)
    zip_buffer.seek(0)  # Move to the beginning of the buffer
    return zip_buffer


def _process_files():
    """Zips subfolders and sends them to the API."""
    print("Processing subfolders...")

    subfolders_raw = os.getenv("SEED_DATA_DIRECTORIES")
    if not subfolders_raw:
        print("No subfolders found in SEED_DATA_DIRECTORIES.")
        return

    subfolders = subfolders_raw.split(",")

    print("Requesting API token...")
    token_req = rqsts.post(
        f"{os.getenv('AUTH_ISSUER').replace('localhost', 'host.docker.internal')}/protocol/openid-connect/token",
        data={
            "client_id": os.getenv("AUTH_CLIENT_ID"),
            "client_secret": os.getenv("AUTH_CLIENT_SECRET"),
            "username": os.getenv("AUTH_USER"),
            "password": os.getenv("AUTH_PASSWORD"),
            "grant_type": "password",
            "scope": "openid email profile",
        },
    )
    assert token_req.status_code == 200, f"{token_req.json()}"
    token = token_req.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("Requesting db migration...")
    rs = rqsts.post(
        MIGRATION_URL,
        data={"migration_secret": "test", "init_admin_email": "ecr-viewer@admin.com"},
        headers=headers,
    )
    assert rs.status_code == 200, f"{rs.json()}"

    UPLOAD_URL = os.getenv("UPLOAD_URL")

    requests = []
    folder_paths = []
    for subfolder in subfolders:
        subfolder_path = os.path.join(BASEDIR, "baseECR", subfolder)

        if not os.path.isdir(subfolder_path):
            print(f"Skipping: {subfolder_path} is not a valid directory.")
            continue

        for folder in os.listdir(subfolder_path):
            folder_path = os.path.join(subfolder_path, folder)
            if not os.path.isdir(folder_path):
                continue

            if UPLOAD_URL.endswith("process-zip"):
                request = process_zip(UPLOAD_URL, folder_path, folder, headers)
            elif UPLOAD_URL.endswith("process-message"):
                request = process_message(UPLOAD_URL, folder_path, headers)
            else:
                raise ("Unknown endpoint type")

            requests.append(request)
            folder_paths.append(folder_path)

    print(f"Sending {len(requests)} ZIP files...")

    # Send requests asynchronously
    n = 0
    failed = []
    num_requests = len(requests)
    for index, response in grequests.imap_enumerated(requests, size=8):
        n += 1
        folder_path = folder_paths[index]
        if response is None:
            failed.append(folder_path)
            print(
                f"Received response {n} of {num_requests} - Failed to upload {folder_path}: No response received"
            )
            continue
        if response.status_code != 200:
            failed.append(folder_path)
            print(
                f"Received response {n} of {num_requests} - Failed to upload {folder_path}. Status: {response.status_code}. Body: {json.dumps(response.json())}"
            )
        else:
            response_json = response.json()
            if "bundle" in response_json:
                with open(
                    os.path.join(folder_path, "bundle.json"),
                    "w",
                ) as fhir_file:
                    json.dump(
                        response_json["bundle"],
                        fhir_file,
                        indent=4,
                    )
            print(
                f"Received response {n} of {num_requests} - Successfully uploaded {folder_path}"
            )

    print(
        f"Conversion complete: {n} records attempted and {len(failed)} failed : {failed}"
    )
    if failed:
        exit(1)


def process_zip(url, folder_path, folder, headers):
    """Process a zip and submit post to API"""
    print(f"Zipping and uploading: {folder_path}")

    zip_buffer = zip_folder(folder_path)

    files = [("upload_file", (f"{folder}.zip", zip_buffer, "application/zip"))]
    return grequests.post(
        url,
        files=files,
        data={"return_fhir_bundle": True},
        headers=headers,
    )


def process_message(url, folder_path, headers):
    """Process a message and submit post to API"""
    print(f"Uploading files from: {folder_path}")

    data = {"return_fhir_bundle": True}
    with open(f"{folder_path}/CDA_eICR.xml") as f:
        data["message"] = f.read()

    try:
        with open(f"{folder_path}/CDA_RR.xml") as f:
            data["rr_data"] = f.read()
    except:  # noqa: E722
        print(f"No RR data found to upload from {folder_path}")

    return grequests.post(
        url,
        data=data,
        headers=headers,
    )


if __name__ == "__main__":
    args = _get_args()
    _process_files()
