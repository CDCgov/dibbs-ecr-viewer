from sqlmodel import SQLModel, create_engine

_DB_URL = "sqlite:///./data/tes.db"

_DEBUG = True

_engine = create_engine(_DB_URL, echo=_DEBUG)
SQLModel.metadata.create_all(_engine)


def get_engine():
    """
    Returns the engine for the database
    """
    return _engine
