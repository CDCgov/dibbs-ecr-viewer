import string
import sys

import requests
from fhir.resources.bundle import Bundle
from fhir.resources.valueset import ValueSet
from key import TEST_API_KEY
from sqlmodel import Session, SQLModel, create_engine
from tes_models import Concept, ConceptType, Condition, IcdCrosswalk
from tqdm import tqdm

_DB_URL = "sqlite:///../data/tes.db"

_TES_API_URL = "https://tes.tools.aimsplatform.org/api/fhir/ValueSet"
_TES_API_KEY = TEST_API_KEY
_BATCH_SIZE = 1000
_TES_HEADER = {"X-API-KEY": _TES_API_KEY}
_CONTEXT_SYSTEM = "http://terminology.hl7.org/CodeSystem/usage-context-type"
_CONTEXT_CODE = "focus"

_DEBUG = True

_engine = create_engine(_DB_URL, echo=_DEBUG)
SQLModel.metadata.create_all(_engine)


def get_engine():
    """
    Returns the engine for the database
    """
    return _engine


def retreive_tes_info_and_save(concept_code_to_type_dict: dict[str, list[str]]):
    """
    Fetches the TES API for ValueSets and saves them to the database
    """
    with Session(get_engine()) as session:
        current_iteration = 0
        conditions: set[Condition] = set()
        all_concepts: dict[(str, str)] = {}
        while True:
            print(f"Fetching batch {current_iteration + 1}")
            bundle = _fetch_bundle(current_iteration)

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
                            concept_code_and_system = (concept.code, system.system)

                            if concept_code_and_system in all_concepts:
                                concepts.add(all_concepts[concept_code_and_system])
                            else:
                                new_types = new_types = _get_concept_types(
                                    concept.code, concept_code_to_type_dict
                                )

                                new_concept = Concept(
                                    name=concept.display,
                                    code=concept.code,
                                    gem_formatted_code=_get_gem_formatted_code(
                                        concept.code
                                    ),
                                    system=system.system,
                                    types=new_types,
                                )
                                all_concepts[concept_code_and_system] = new_concept
                                concepts.add(new_concept)

                                for new_type in new_types:
                                    new_type.concept = new_concept

                                session.add_all(new_types)

                if valueSet.expansion and valueSet.expansion.contains:
                    for system in tqdm(
                        valueSet.expansion.contains,
                        desc=f"Processing concepts in expansion.contains for {valueSet.title}",
                        unit=" Concept",
                        leave=False,
                    ):
                        concept_code_and_system = (system.code, system.system)
                        if concept_code_and_system in all_concepts:
                            concepts.add(all_concepts[concept_code_and_system])
                        else:
                            new_types = _get_concept_types(
                                system.code, concept_code_to_type_dict
                            )

                            new_concept = Concept(
                                name=system.display,
                                code=system.code,
                                gem_formatted_code=_get_gem_formatted_code(system.code),
                                system=system.system,
                                types=new_types,
                            )
                            all_concepts[concept_code_and_system] = new_concept
                            concepts.add(new_concept)

                            for new_type in new_types:
                                new_type.concept = new_concept

                            session.add_all(new_types)

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


def _get_concept_types(
    conceptCode: str, concept_code_to_type_dict: dict
) -> list[ConceptType]:
    new_types = []
    for type in concept_code_to_type_dict.get(conceptCode, []):
        new_type = ConceptType(type=type)
        new_types.append(new_type)
    return new_types


def _get_coding(valueSet: ValueSet) -> list[str]:
    return list(
        filter(
            lambda x: x.code.code == "focus"
            and x.code.system
            == "http://terminology.hl7.org/CodeSystem/usage-context-type",
            valueSet.useContext,
        )
    )[0].valueCodeableConcept.coding[0]


def _fetch_bundle(current_iteration: int) -> Bundle:
    response = requests.get(
        f"{_TES_API_URL}",
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


def _build_concept_type_by_code_dict():
    url = "https://tes.tools.aimsplatform.org/api/fhir/ValueSet"
    response = requests.get(
        url,
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
    for entry in tqdm(
        bundle.entry, desc="Processing ValueSets", unit=" ValueSet", leave=False
    ):
        valueSet: ValueSet = entry.resource
        # valueSet.id is the type
        print(f"Found concept type: {valueSet.id}")
        for concept in tqdm(
            valueSet.expansion.contains,
            desc=f"Processing concepts in expansion.contains for {valueSet.id}",
            unit=" Concept",
            leave=False,
        ):
            ## these are not 1 to 1
            # a concept can have multiple types
            if concept.code in dict:
                dict[concept.code].append(valueSet.id)
            else:
                dict[concept.code] = [valueSet.id]
    return dict


def _get_gem_formatted_code(code: str) -> str:
    return code.translate(str.maketrans("", "", string.punctuation))


def _build_crosswalk_table():
    """
    Reads the ICD-10-CM Generalized Equivalency Mappings file published by CMS
    to create a crosswalk table between ICD10 codes and a selected set of ICD9
    codes (the selected set are those relevant to ICD10 codes).
    """
    with Session(get_engine()) as session:
        table_rows = []
        row_id = 1
        with open("../seed-scripts/diagnosis_gems_2018/2018_I10gem.txt") as gem:
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
    # print(concept_code_types_dict["14480-8"])
    retreive_tes_info_and_save(concept_code_types_dict)
    _build_crosswalk_table()
