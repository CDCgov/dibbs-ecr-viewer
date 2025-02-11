from functools import lru_cache
from typing import Literal

from pydantic import BaseSettings


class Settings(BaseSettings):
    cred_manager: Literal["azure", "gcp"] | None
    salt_str: str | None
    fhir_url: str | None
    smarty_auth_id: str | None
    smarty_auth_token: str | None
    license_type: str | None
    cloud_provider: Literal["azure", "gcp"] | None
    bucket_name: str | None
    storage_account_url: str | None


@lru_cache
def get_settings() -> dict:
    """
    Load the values specified in the Settings class from the environment and return a
    dictionary containing them. The dictionary is cached to reduce overhead accessing
    these values.

    :return: A dictionary with keys specified by the Settings. The value of each key is
    read from the corresponding environment variable.
    """
    return Settings().dict()
