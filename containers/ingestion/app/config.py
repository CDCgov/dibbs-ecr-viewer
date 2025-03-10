from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cred_manager: Literal["azure", "gcp"] | None = None
    salt_str: str | None = None
    fhir_url: str | None = None
    smarty_auth_id: str | None = None
    smarty_auth_token: str | None = None
    license_type: str | None = None
    cloud_provider: Literal["azure", "gcp"] | None = None
    bucket_name: str | None = None
    storage_account_url: str | None = None


@lru_cache
def get_settings() -> dict:
    """
    Load the values specified in the Settings class from the environment and return a
    dictionary containing them. The dictionary is cached to reduce overhead accessing
    these values.

    :return: A dictionary with keys specified by the Settings. The value of each key is
    read from the corresponding environment variable.
    """
    return Settings().model_dump()
