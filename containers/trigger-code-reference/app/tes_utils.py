import json

from sqlalchemy import func
from sqlmodel import Session, select
from tes_data import get_engine
from tes_models import Concept, ConceptType, Condition, ConditionConceptLink
from utils import get_clean_snomed_code, get_concepts_dict


def _get_concepts_list_test(snomed_code: list) -> list[tuple]:
    engine = get_engine()
    code = get_clean_snomed_code(snomed_code)[0]
    # get code ID

    with Session(engine) as session:
        # `('concept.type', 'concept.code(s)', 'concept.system', None)`

        stmt = select(Condition).where(Condition.code == code)
        condition = session.exec(stmt).first()
        if not condition:
            return []

        stmt = (
            select(
                ConceptType.type,
                func.group_concat(Concept.code, "|").label("codes"),
                Concept.system,
            )
            .join(ConditionConceptLink, ConditionConceptLink.concept_id == Concept.id)
            .join(ConceptType, ConceptType.concept_id == Concept.id)
            .where(ConditionConceptLink.condition_id == condition.id)
            .group_by(ConceptType.type, Concept.system)
            .having(ConceptType.type.isnot(None))  # Exclude rows where type is None
        )

        results = session.exec(stmt).all()
        if not results:
            return []

        return results


if __name__ == "__main__":
    concepts_list = _get_concepts_list_test(["276197005"])
    values = get_concepts_dict(concepts_list, "")
    json_string = json.dumps(values, indent=4)
    print(json_string)
    # Need to add icd9 cross walk

    # """
    # Given a SNOMED code, this function runs a SQL query that joins
    # conditions to value sets, then uses the value set ids to get the
    # value set type, concept codes, and concept system
    # from the eRSD database grouped by value set type and system. It
    # also uses the GEM crosswalk tables to find any ICD-9 conversion
    # codes that might be represented under the given condition's
    # umbrella.

    # :param snomed_code: SNOMED code to check
    # :return: A list of tuples with valueset type, a delimited-string of
    #   the relevant codes (including any found ICD-9 conversions, if they
    #   exist), and code systems as objects within.
    # """
    # sql_query = """
    # SELECT
    #     vs.type AS valueset_type,
    #     GROUP_CONCAT(cs.code, '|') AS codes,
    #     cs.code_system AS system,
    #     GROUP_CONCAT(icd9_conversions, '|') AS crosswalk_conversions
    # FROM
    #     conditions c
    # LEFT JOIN
    #     condition_to_valueset cv ON c.id = cv.condition_id
    # LEFT JOIN
    #     valuesets vs ON cv.valueset_id = vs.id
    # LEFT JOIN
    #     valueset_to_concept vc ON vs.id = vc.valueset_id
    # LEFT JOIN
    #     concepts cs ON vc.concept_id = cs.id
    # LEFT JOIN
    #     (SELECT icd10_code, GROUP_CONCAT(icd9_code, '|') AS icd9_conversions from icd_crosswalk GROUP BY icd10_code) ON gem_formatted_code = icd10_code
    # WHERE
    #     c.id = ?
    # GROUP BY
    #     vs.type, cs.code_system
    # """
    # # Connect to the SQLite database, execute sql query, then close
    # try:
    #     with sqlite3.connect("seed-scripts/ersd.db") as conn:
    #         cursor = conn.cursor()
    #         code = get_clean_snomed_code(snomed_code)
    #         cursor.execute(sql_query, code)
    #         concept_list = cursor.fetchall()
    #         print(concept_list[len(concept_list)-1])

    #         # We know it's not an actual error because we didn't get kicked to
    #         # except, so just return the lack of results
    #         if not concept_list:
    #             return []

    #     # Add any existing ICD-9 codes into the main code components
    #     # Tuples are immutable so we'll need to make some fresh ones
    #     refined_list = format_icd9_crosswalks(concept_list)
    #     return refined_list
    # except sqlite3.Error as e:
    #     return {"error": f"An SQL error occurred: {str(e)}"}
