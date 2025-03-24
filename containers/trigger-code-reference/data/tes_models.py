from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


class IcdCrosswalk(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    icd10_code: str = Field(default=None, foreign_key="concept.gem_formatted_code")
    icd9_code: str
    match_flags: str


class ConditionConceptLink(SQLModel, table=True):
    concept_id: int | None = Field(
        default=None, foreign_key="concept.id", primary_key=True
    )
    condition_id: int | None = Field(
        default=None, foreign_key="condition.id", primary_key=True
    )


class Concept(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str | None  # Some concepts in TES have a NULL name
    code: str
    gem_formatted_code: str
    system: str

    types: list["ConceptType"] = Relationship(back_populates="concept")
    conditions: list["Condition"] = Relationship(
        back_populates="concepts", link_model=ConditionConceptLink
    )

    __table_args__ = (UniqueConstraint("code", "system"),)

    def __eq__(self, other):
        """
        Two concepts are equal if they have the same code and system
        """
        if isinstance(other, self.__class__):
            return self.code == other.code and self.system == other.system
        return NotImplemented

    def __hash__(self):
        """
        Hashes the concept based on the code and system
        """
        return hash((self.code, self.system))


class ConceptType(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    type: str | None
    concept_id: int = Field(foreign_key="concept.id")

    concept: Concept = Relationship(back_populates="types")


class Condition(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    code: str = Field(index=True)
    system: str
    version: str

    concepts: list["Concept"] = Relationship(
        back_populates="conditions", link_model=ConditionConceptLink
    )

    __table_args__ = (UniqueConstraint("code", "system"),)

    def __eq__(self, other):
        """
        Two conditions are equal if they have the same code and system
        """
        if isinstance(other, self.__class__):
            return self.code == other.code and self.system == other.system
        return NotImplemented

    def __hash__(self):
        """
        Hashes the condition based on the code and system
        """
        return hash((self.code, self.system))
