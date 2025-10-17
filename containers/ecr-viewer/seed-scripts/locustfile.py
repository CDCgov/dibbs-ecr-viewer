import os
import random
import shutil
import subprocess

from locust import HttpUser, between, task


class ProcessEcrUser(HttpUser):
    """
    Load testing the /process-ecr endpoint
    On start: Zips all files in baseECR/star-wars
    Task: Chooses random zip file to send through /process-ecr. Expects a 200 or 409
    """
    wait_time = between(1, 5)

    def on_start(self):
        """zip all files in baseECR/star-wars folder at start"""
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


class ViewEcrUser(HttpUser):
    """
    Load testing the /view-data endpoint
    On start: Zips all files in baseECR/star-wars & sends through /process-ecr
    Task: Chooses random eCR to view at the /view-data endpoint. Expects a 200
    """
    wait_time = between(1, 5)

    def on_start(self):
        """zip all files and process all eCRs in baseECR/star-wars"""
        token = os.getenv("DUMMY_NBS_JWT")

        self.files = get_zipped_files()
        for file in self.files:
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
                    
    @task
    def view_ecr(self): 
        # Future improvement: Remove hardcoding of star-wars eCRs
        # Currently: eCRs processed with a 409 don't have the ecr_id in the response body
        eicr_ids = ["999-86a8-4a9a-aec6-b615921178df", "e91bc1e8-2523-4047-a663-1e3e07812948", "9408ddce-4dcb-416c-a153-82cce01839e2", "10c13861-86a8-4a9a-aec6-b615921178df", "db734647-fc99-424c-a864-7e3cda82e703"]
        for eicr_id in eicr_ids:
            with self.client.get(
                f"/view-data?id={eicr_id}", catch_response=True
            ) as response:
                if response.status_code == 200:
                    response.success()
                    print(f"Successfully viewed {eicr_id}")
                else:
                    response.failure(f"Failed to view {eicr_id}: Status {response.status_code}")


def get_zipped_files():
    """Get all the zipped files in the baseECR folder"""
    files = []
    BASEDIR = os.path.dirname(os.path.abspath(__file__))
    subfolders = ["star-wars"] # Only processing star-wars eCRs
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
