from functools import lru_cache
from typing import Literal, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cred_manager: Optional[Literal["azure", "gcp"]] = None
    salt_str: Optional[str] = None
    fhir_url: Optional[str] = None
    smarty_auth_id: Optional[str] = None
    smarty_auth_token: Optional[str] = None
    license_type: Optional[str] = None
    cloud_provider: Optional[Literal["azure", "gcp"]] = None
    bucket_name: Optional[str] = None
    storage_account_url: Optional[str] = None


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
