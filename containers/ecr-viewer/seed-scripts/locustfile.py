import os
import random
import shutil
import subprocess

from locust import HttpUser, between, task


class EcrViewer(HttpUser):
    wait_time = between(1, 5)

    @task
    def ecr_viewer(self):
        """get the ecr viewer library page"""
        self.client.get("/ecr-viewer")

    @task
    def orchestration(self):
        """get the orchestration endpoint"""
        self.client.get("/orchestration")

    @task
    def upload_zip(self):
        """upload a zip file to the orchestration endpoint"""
        for file in get_zipped_files():
            with open(file, "rb") as opened_file:
                data = {
                    "content_type": "application/zip",
                    "config_file_name": "sample-orchestration-s3-config.json",
                    "data_type": "zip",
                    "message_type": "ecr",
                }
                # print(f"Uploading {file}")
                file_tuple = {
                    "upload_file": (file, opened_file.read(), "application/zip")
                }
                response = self.client.post(
                    "/orchestration/process-zip", data=data, files=file_tuple
                )
                self.tasks.append(check_ecr(self, file, response.json()))

    def on_start(self):
        """install the requirements"""
        subprocess.run(["pip", "install", "-r", "requirements.txt"])
        pass


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
    subfolders = ["LA"]
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
