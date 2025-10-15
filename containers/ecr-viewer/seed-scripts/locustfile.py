import os
import random
import shutil
import subprocess

from locust import HttpUser, between, task


class EcrViewer(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        """zip all files in baceECR folder at start"""
        self.files = get_zipped_files()
        self.len_files = len(self.files)

    @task
    def process_ecr(self): 
        token = os.getenv("DUMMY_NBS_JWT")

        """upload a zip file to the orchestration endpoint"""
        file = self.files[random.randint(0, self.len_files - 1)]

        with open(file, "rb") as opened_file:
            data = {
                "return_fhir_bundle": "true"
            }
            print(f"Uploading {file}")
            file_tuple = {
                "ecr": (file, opened_file.read(), "application/zip")
            }
            headers = {
                "Authorization": f"Bearer {token}"
            }

            with self.client.post(
                "api/process-ecr", data=data, files=file_tuple, headers=headers, catch_response=True
            ) as response:
                if response.status_code in [200, 409]: # eCR already loaded is 409
                    response.success()
                    print("Success", response.status_code)
                else:
                    response.failure(f"Failed with status code {response.status_code}")


def check_ecr(self, file, response):
    """Check the ecr viewer response for eicr_id and view the ecr"""
    if "detail" in response:
        print(f"{file}", response["detail"])
    if "message" in response:
        print(f"{file}", response["message"])
    if "processed_values" not in response:
        print("No processed_values found in response")
        return
    if "parsed_values" not in response["processed_values"]:
        print("No parsed_values found in response")
        return
    if "eicr_id" in response["processed_values"]["parsed_values"]:
        print(response["processed_values"]["parsed_values"]["eicr_id"])
        eicr_id = response["processed_values"]["parsed_values"]["eicr_id"]
        print(f"/ecr-viewer/view-data?id={eicr_id}")
        response = self.client.get(f"/ecr-viewer/view-data?id={eicr_id}")
        print(response)
    else:
        print("No eicr_id found in response")


def get_zipped_files():
    """Get all the zipped files in the baseECR folder"""
    files = []
    BASEDIR = os.path.dirname(os.path.abspath(__file__))
    subfolders = ["star-wars"]
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

            if os.path.exists(os.path.join(folder_path, "CDA_eICR.xml")):
                random_number = random.randint(1, 30)
                zipped_file = shutil.make_archive(
                    f"{random_number}", "zip", folder_path
                )
                print(f"Zipped {folder_path} to {zipped_file}")
                files.append(zipped_file)
            # If neither `bundle.json` nor `CDA_eICR.xml` exists, skip processing
            else:
                print(
                    f"Neither `bundle.json` nor `CDA_eICR.xml` found in {folder_path}. Skipping."
                )
                continue

    return files
