import json

from sqlalchemy import text
from sqlmodel import Session, select
from tes_data import get_engine
from tes_models import (
    Condition,
)
from utils import format_icd9_crosswalks, get_clean_snomed_code, get_concepts_dict


def _get_concepts_list_test(snomed_code: list) -> list[tuple]:
    engine = get_engine()
    code = get_clean_snomed_code(snomed_code)[0]
    # get code ID

    with Session(engine) as session:
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

        # Ensure this with SQL instead?
        filtered_array = [t for t in rs if t[0] is not None]

        refined_list = format_icd9_crosswalks(filtered_array)

        return refined_list


if __name__ == "__main__":
    concepts_list = _get_concepts_list_test(["276197005"])
    values = get_concepts_dict(concepts_list, "")
    json_string = json.dumps(values, indent=8)
    print(json_string)
