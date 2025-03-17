import json

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.tes_data import get_engine
from app.tes_models import (
    Condition,
)
from app.utils import format_icd9_crosswalks, get_clean_snomed_code, get_concepts_dict


def get_concepts_list_tes(snomed_code: list) -> list[tuple]:
    """
    Given a SNOMED code, this function runs a SQL query to get the
    value set type, concept codes, and concept system
    from the TES database grouped by value set type and system. It
    also uses the GEM crosswalk tables to find any ICD-9 conversion
    codes that might be represented under the given condition's
    umbrella.

    :param snomed_code: SNOMED code to check
    :return: A list of tuples with valueset type, a delimited-string of
      the relevant codes (including any found ICD-9 conversions, if they
      exist), and code systems as objects within.
    """
    try:
        engine = get_engine()
        with Session(engine) as session:
            # get code ID
            code = get_clean_snomed_code(snomed_code)[0]

            # Get the condition by code
            stmt = select(Condition).where(Condition.code == code)
            condition = session.exec(stmt).first()

            if not condition:
                return []

            query = """
            SELECT
                ct.type,
                GROUP_CONCAT(cs.code, '|') AS codes,
                cs.system AS system,
                GROUP_CONCAT(icd9_conversions, '|') AS crosswalk_conversions
            FROM
                condition c
            LEFT JOIN
                conditionconceptlink ccl on ccl.condition_id = c.id
            LEFT JOIN
                concepttype ct on ct.concept_id = ccl.concept_id
            LEFT JOIN
                concept cs on ct.concept_id = cs.id
            LEFT JOIN
                (SELECT icd10_code, GROUP_CONCAT(icd9_code, '|') AS icd9_conversions FROM icdcrosswalk GROUP BY icd10_code) ON gem_formatted_code = icd10_code
            WHERE
                c.id = :condition_id
            GROUP BY
                ct.type, cs.system
            """
            rs = session.execute(text(query), {"condition_id": condition.id}).all()

            if not rs:
                return []

            # Ensure this with SQL instead?
            filtered_array = [t for t in rs if t[0] is not None]

            refined_list = format_icd9_crosswalks(filtered_array)

            return refined_list
    except SQLAlchemyError:
        return {"error": "An SQL error occurred"}


if __name__ == "__main__":
    concepts_list = get_concepts_list_tes(["276197005"])
    # concepts_list = _get_concepts_list_tes(["840539006"])
    values = get_concepts_dict(concepts_list, "")
    json_string = json.dumps(values, indent=8)
    print(json_string)
