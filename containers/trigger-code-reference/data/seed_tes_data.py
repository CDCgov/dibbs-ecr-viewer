import os
import string
import sys

import requests
from dotenv import load_dotenv
from fhir.resources.backboneelement import BackboneElement
from fhir.resources.bundle import Bundle
from fhir.resources.coding import Coding
from fhir.resources.valueset import ValueSet
from sqlmodel import Session, SQLModel, create_engine
from tes_models import Concept, ConceptType, Condition, IcdCrosswalk
from tqdm import tqdm

load_dotenv()

# TES API key can be obtained here once registered: https://tes.tools.aimsplatform.org/
_TES_API_URL = "https://tes.tools.aimsplatform.org/api/fhir/ValueSet"
_TES_API_KEY = os.getenv("TES_API_KEY")

_BATCH_SIZE = 1000
_TES_HEADER = {"X-API-KEY": _TES_API_KEY}
_CONTEXT_SYSTEM = "http://terminology.hl7.org/CodeSystem/usage-context-type"
_CONTEXT_CODE = "focus"

_DB_URL = "sqlite:///tes.db"
_DEBUG = True  # Set this to True if you'd like to see DB migration output

_engine = create_engine(_DB_URL, echo=_DEBUG)
SQLModel.metadata.create_all(_engine)


def _get_engine():
    """
    Returns the engine for the database
    """
    return _engine


def _retrieve_tes_info_and_save(concept_code_to_type_dict: dict[str, list[str]]):
    """
    Fetches Condition and Concept data from the TES API and builds out the SQLite database.
    """
    with Session(_get_engine()) as session:
        current_iteration = 0
        conditions: set[Condition] = set()
        all_concepts: dict[(str, str)] = {}
        while True:
            print(f"Fetching batch {current_iteration + 1}")
            bundle = _fetch_conditions_bundle(current_iteration)

            for entry in tqdm(
                bundle.entry, desc="Processing ValueSets", unit=" ValueSet", leave=False
            ):
                valueSet: ValueSet = entry.resource  # type: ignore

                concepts: set[Concept] = set()
                if valueSet.compose and valueSet.compose.include:
                    for system in tqdm(
                        valueSet.compose.include,
                        desc=f"Processing concepts in compose.indclude for {valueSet.title}",
                        unit=" Concept",
                        leave=False,
                    ):
                        for concept in system.concept:
                            _build_concept(
                                session,
                                concepts,
                                all_concepts,
                                concept_code_to_type_dict,
                                concept,
                                system,
                            )

                if valueSet.expansion and valueSet.expansion.contains:
                    for system in tqdm(
                        valueSet.expansion.contains,
                        desc=f"Processing concepts in expansion.contains for {valueSet.title}",
                        unit=" Concept",
                        leave=False,
                    ):
                        _build_concept(
                            session,
                            concepts,
                            all_concepts,
                            concept_code_to_type_dict,
                            system,
                            system,
                        )

                coding = _get_coding(valueSet)

                condition = Condition(
                    name=valueSet.title,
                    code=coding.code,
                    system=coding.system,
                    version=valueSet.version,
                    concepts=list(concepts),
                )

                conditions.add(condition)

            # If we got less than BATCH_SIZE, we are done
            if len(bundle.entry) < _BATCH_SIZE:
                break

            current_iteration += 1

        session.add_all(conditions)
        session.commit()


def _build_concept(
    session: Session,
    concepts: set[Concept],
    all_concepts: dict[(str, str)],
    concept_code_to_type_dict: dict[str, list[str]],
    currentConcept: Coding,
    currentSystem: BackboneElement,
):
    """
    Creates a new Concept and its associated data.
    """
    concept_code_and_system = (currentConcept.code, currentSystem.system)

    if concept_code_and_system in all_concepts:
        concepts.add(all_concepts[concept_code_and_system])
    else:
        new_types = _get_concept_types(currentConcept.code, concept_code_to_type_dict)

        new_concept = Concept(
            name=currentConcept.display,
            code=currentConcept.code,
            gem_formatted_code=_get_gem_formatted_code(currentConcept.code),
            system=currentSystem.system,
            types=new_types,
        )
        all_concepts[concept_code_and_system] = new_concept
        concepts.add(new_concept)

        for new_type in new_types:
            new_type.concept = new_concept
        session.add_all(new_types)


def _get_concept_types(
    conceptCode: str, concept_code_to_type_dict: dict
) -> list[ConceptType]:
    """
    Helper function that returns a list of concept types associated with a Concept
    """
    new_types = []
    for type in concept_code_to_type_dict.get(conceptCode, []):
        new_type = ConceptType(type=type)
        new_types.append(new_type)
    return new_types


def _get_coding(valueSet: ValueSet) -> list[str]:
    """
    Helper function that takes a ValueSet and returns a filtered list
    """
    return list(
        filter(
            lambda x: x.code.code == "focus"
            and x.code.system
            == "http://terminology.hl7.org/CodeSystem/usage-context-type",
            valueSet.useContext,
        )
    )[0].valueCodeableConcept.coding[0]


def _fetch_conditions_bundle(current_iteration: int) -> Bundle:
    """
    Makes a request to the TES API and returns the data as a FHIR bundle
    """
    response = requests.get(
        _TES_API_URL,
        params={
            "context-type": f"{_CONTEXT_SYSTEM}|{_CONTEXT_CODE}",
            "_getpagesoffset": current_iteration * _BATCH_SIZE,
            "_count": _BATCH_SIZE,
        },
        headers=_TES_HEADER,
    )

    if response.status_code != 200:
        print("Error fetching condition data")
        print(response.url)
        print(response.text)
        sys.exit(1)

    data = response.json()

    return Bundle(**data)


def _build_concept_type_by_code_dict() -> dict[str, list[str]]:
    """
    Makes a request to the TES API and builds a dictionary from the results. This
    dictionary maps a Concept to one or more types.
    """
    # Make a request to grab all 6 available concept types
    response = requests.get(
        _TES_API_URL,
        params={
            "_id": "dxtc,ostc,lotc,lrtc,mrtc,sdtc",
        },
        headers=_TES_HEADER,
    )

    if response.status_code != 200:
        print("Error fetching condition data")
        print(response.url)
        print(response.text)
        sys.exit(1)

    data = response.json()

    bundle = Bundle(**data)
    dict = {}
    concept_types_found = []
    for entry in tqdm(
        bundle.entry, desc="Processing ValueSets", unit=" ValueSet", leave=False
    ):
        valueSet: ValueSet = entry.resource

        # The ValueSet's id is the concept type
        concept_types_found.append(valueSet.id)

        for concept in tqdm(
            valueSet.expansion.contains,
            desc=f"Processing concepts in expansion.contains for {valueSet.id}",
            unit=" Concept",
            leave=False,
        ):
            # A concept can have multiple types
            if concept.code in dict:
                dict[concept.code].append(valueSet.id)
            else:
                dict[concept.code] = [valueSet.id]
    print("Concept types found:", ", ".join(concept_types_found))
    return dict


def _get_gem_formatted_code(code: str) -> str:
    """
    Takes a code and converts it to the Generalized Equivalency Mapping code format
    """
    return code.translate(str.maketrans("", "", string.punctuation))


def _build_crosswalk_table():
    """
    Reads the ICD-10-CM Generalized Equivalency Mappings file published by CMS
    to create a crosswalk table between ICD10 codes and a selected set of ICD9
    codes (the selected set are those relevant to ICD10 codes).
    """
    with Session(_get_engine()) as session:
        table_rows = []
        row_id = 1
        with open("./diagnosis_gems_2018/2018_I10gem.txt") as gem:
            for row in gem:
                line = row.strip()
                if line != "":
                    # Some formatting in the file is a tab, others are 4 spaces...
                    code_components = line.split()
                    code_components = [row_id] + [
                        x for x in code_components if x.strip() != ""
                    ]
                    crosswalk_row = IcdCrosswalk(
                        id=code_components[0],
                        icd10_code=code_components[1],
                        icd9_code=code_components[2],
                        match_flags=code_components[3],
                    )
                    table_rows.append(crosswalk_row)
                    row_id += 1

        session.add_all(table_rows)
        session.commit()


if __name__ == "__main__":
    concept_code_types_dict = _build_concept_type_by_code_dict()
    _retrieve_tes_info_and_save(concept_code_types_dict)
    _build_crosswalk_table()
