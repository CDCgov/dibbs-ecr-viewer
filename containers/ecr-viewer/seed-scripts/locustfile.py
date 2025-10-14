import os
import random
import shutil
import subprocess

from locust import HttpUser, between, task


class EcrViewer(HttpUser):
    wait_time = between(1, 5)

    # ? ANGELA: Does this mean that User will pick one of the declared tasks at random & execute?
        # ? Don't We want these things to happen sequentially?
    # @task
    # def ecr_viewer(self):
    #     """get the ecr viewer library page"""
    #     self.client.get("/ecr-viewer")

    # ? Delete right?
    # @task
    # def orchestration(self):
    #     """get the orchestration endpoint"""
    #     self.client.get("/orchestration")

    @task
    def process_ecr(self): 
        # TODO ANGELA: Remove hard-coding
        token = "eyJhbGciOiJSUzI1NiIsImlkIjoiYmxhaCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.hXmX6wu9ThiSqNEl6Y3pBETppiIt0j4RKSVPO_AAYZJZsngSFiu8GuGDtA13kJ-texfUHshqcy4euoVwfmN-naDi2Ly6p6lPjY6xzmTuQ1DtiKLZDNBsDupjoLAuIJQ3K8uWRnCdRGG1ZlTkZa-SG8b4jfDLRrl1fPiJCWM62XV7_gIvqCvRAPdP9kMrOV1LtLEuXgoXZGifVNnPQhtT7fQ7kDmbM-HDG4MquZy89CIRy2q22xIclePOAoe0Ifz6q7-NG3I9CzKOAa_Vx6Oy5ZYBYphfV1n46gp4OC0Cb_w-wFLfRDuDPJZvcS5ed2HxdyZrU_GeD4WSN5IQpEn_45CZifBzmv9-jweEUD2or3sp1DReORLZG2CvBqtixC0p3gIeGnY4HROduafmDfyI0gcv7pDM-fcreMCBG-7uqUPkk9rqhCPw9n6fhWvNMSGrtW9tx6hAPNxjKJ2AsyTh7cJyR0teVpijhXZz0dGJOtYY1-nlR7_BnJH2lC9tLiIJcVl1JKfGRu18MV1bHs7y25Wp1HxVDUXllShXa7_oD7ljnE3stmpO5GPMbxvWC_RKO_bu_e2mAgJ3yiPImFpLVYZZgBqClctciZMQeV1lZTAy-7Xlzgdx-IvFc9VuigKw6hfk4on98BxMUENeh20KIgVv8cMr4ZjAGV3MjnFnHWw"

        """upload a zip file to the orchestration endpoint"""
        # TODO ANGELA: Pull out zipping files logic to on start
        # TODO ANGELA: Each task should upload only one file, not all files
        for file in get_zipped_files():
            with open(file, "rb") as opened_file:
                # ! THIS NEEDS THE HOST
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
                response = self.client.post(
                    "api/process-ecr", data=data, files=file_tuple, headers=headers
                )

                try:
                    result = response.json()
                    print(result)
                except ValueError:
                    print(f"❌ Non-JSON response ({response.status_code}): {response.text[:200]}")
                    continue

                # self.tasks.append(check_ecr(self, file, response.json()))

    # ! Need db migration to occur (getting eCR viewer setup incomplete error)
    # don't care to test Azure AD, just use JWT
    # TODO ANGELA: hit the migration endpoint on start?
    # def on_start(self):
    #     """on start, run migrations"""
    #     print("Running migrations...")
    #     print(f"Host: {self.host}")
    #     token = "eyJhbGciOiJSUzI1NiIsImlkIjoiYmxhaCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.hXmX6wu9ThiSqNEl6Y3pBETppiIt0j4RKSVPO_AAYZJZsngSFiu8GuGDtA13kJ-texfUHshqcy4euoVwfmN-naDi2Ly6p6lPjY6xzmTuQ1DtiKLZDNBsDupjoLAuIJQ3K8uWRnCdRGG1ZlTkZa-SG8b4jfDLRrl1fPiJCWM62XV7_gIvqCvRAPdP9kMrOV1LtLEuXgoXZGifVNnPQhtT7fQ7kDmbM-HDG4MquZy89CIRy2q22xIclePOAoe0Ifz6q7-NG3I9CzKOAa_Vx6Oy5ZYBYphfV1n46gp4OC0Cb_w-wFLfRDuDPJZvcS5ed2HxdyZrU_GeD4WSN5IQpEn_45CZifBzmv9-jweEUD2or3sp1DReORLZG2CvBqtixC0p3gIeGnY4HROduafmDfyI0gcv7pDM-fcreMCBG-7uqUPkk9rqhCPw9n6fhWvNMSGrtW9tx6hAPNxjKJ2AsyTh7cJyR0teVpijhXZz0dGJOtYY1-nlR7_BnJH2lC9tLiIJcVl1JKfGRu18MV1bHs7y25Wp1HxVDUXllShXa7_oD7ljnE3stmpO5GPMbxvWC_RKO_bu_e2mAgJ3yiPImFpLVYZZgBqClctciZMQeV1lZTAy-7Xlzgdx-IvFc9VuigKw6hfk4on98BxMUENeh20KIgVv8cMr4ZjAGV3MjnFnHWw"
    #     headers = {
    #         "Authorization": f"Bearer {token}"
    #     }
    #     form_data = {
    #         "migration_secret": "test",
    #         "init_admin_email": "ecr-viewer@admin.com"
    #     }
    #     response = self.client.post("api/migrate-db", files=form_data, headers=headers, verify=False)
    #     if response.status_code == 200:
    #         print("Migrations ran successfully.")
    #     else:
    #         print(f"Failed to run migrations. Status code: {response.status_code}, Response: {response.text}")

    #     """install the requirements"""
    #     subprocess.run(["pip", "install", "-r", "requirements.txt"])


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
    subfolders = ["star-wars"] # TODO ANGELA - update directory
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
