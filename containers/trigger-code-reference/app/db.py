import sqlite3

from app.utils import format_icd9_crosswalks, get_clean_snomed_code

_TES_DB_URL = "./data/tes.db"


def get_concepts_list_tes(snomed_code: list) -> list[tuple]:
    """
    Given a SNOMED code, this function runs a SQL query to get the
    concept type, concept codes, and concept system
    from the TES database grouped by concept type and system. It
    also uses the GEM crosswalk tables to find any ICD-9 conversion
    codes that might be represented under the given condition's
    umbrella.

    :param snomed_code: SNOMED code to check
    :return: A list of tuples with concept type, a delimited-string of
      the relevant codes (including any found ICD-9 conversions, if they
      exist), and code systems as objects within.
    """

    query = """
    SELECT
        ct.type,
        GROUP_CONCAT(cs.code, '|') AS codes,
        cs.system AS system,
        GROUP_CONCAT(icd9_conversions, '|') AS crosswalk_conversions
    FROM
        condition c
    JOIN
        conditionconceptlink ccl on ccl.condition_id = c.id
    JOIN
        concepttype ct on ct.concept_id = ccl.concept_id
    JOIN
        concept cs on ct.concept_id = cs.id
    LEFT JOIN
        (SELECT icd10_code, GROUP_CONCAT(icd9_code, '|') AS icd9_conversions FROM icdcrosswalk GROUP BY icd10_code) ON gem_formatted_code = icd10_code
    WHERE
        c.id = ?
    GROUP BY
        ct.type, cs.system
    """
    # Connect to the SQLite database, execute sql query, then close
    try:
        with sqlite3.connect(_TES_DB_URL) as conn:
            cursor = conn.cursor()
            code = get_clean_snomed_code(snomed_code)[0]
            condition_id = _get_condition_id_from_snowmed_code_tes(code)
            cursor.execute(query, [condition_id])
            concept_list = cursor.fetchall()

            # We know it's not an actual error because we didn't get kicked to
            # except, so just return the lack of results
            if not concept_list:
                return []

        # Add any existing ICD-9 codes into the main code components
        # Tuples are immutable so we'll need to make some fresh ones
        refined_list = format_icd9_crosswalks(concept_list)
        return refined_list
    except sqlite3.Error as e:
        return {"error": f"An SQL error occurred: {str(e)}"}


def _get_condition_id_from_snowmed_code_tes(condition_code: str) -> str:
    """
    Given a condition code, this function retrieves the condition id
    """
    with sqlite3.connect(_TES_DB_URL) as conn:
        row = conn.execute(
            "SELECT id FROM condition WHERE code = ?", (condition_code,)
        ).fetchone()

    return row[0] if row else None


def _get_condition_name_from_snomed_code_tes(condition_code: str) -> str:
    """
    Given a condition code, this function retrieves the condition name
    """
    with sqlite3.connect(_TES_DB_URL) as conn:
        row = conn.execute(
            "SELECT name FROM condition WHERE code = ?", (condition_code,)
        ).fetchone()

    return row[0] if row else None


def add_human_readable_reportable_condition_name_tes(resource: dict) -> dict:
    """
    Add a human readable name to the valueCodeableConcept.text field of a condition resource.

    If the resource is a Condition, get the SNOMED code to look up the human-readable name
    If we we do not have a human-readable name, we will use the display of the SNOMED code
    If we do not have a SNOMED code in the valueCodeableConcept, we will use the display of the
    first coding, if any.
    None of these fallbacks should be used, however in the situation where data is missing in our
    database and in the FHIR bundle, we still need to be able to handle valid FHIR bundles.
    """
    if not resource.get("code"):
        return resource

    # Check if there's a SNOMED "Condition" coding in resource["code"]["coding"]
    has_condition = any(
        x.get("system") == "http://snomed.info/sct" and x.get("code") == "64572001"
        for x in resource["code"]["coding"]
    )
    if not has_condition:
        return resource

    # Get the first SNOMED coding from resource["valueCodeableConcept"]["coding"], if any
    condition_code = next(
        (
            x
            for x in resource["valueCodeableConcept"]["coding"]
            if x["system"] == "http://snomed.info/sct"
        ),
        None,
    )

    if condition_code:
        human_readable_condition_name = _get_condition_name_from_snomed_code_tes(
            condition_code["code"]
        )

        if human_readable_condition_name:
            resource["valueCodeableConcept"]["text"] = human_readable_condition_name
        elif "display" in condition_code:
            resource["valueCodeableConcept"]["text"] = condition_code["display"]
    else:
        # Fallback to the first available display text if condition_code is absent
        fallback_display = next(
            (
                x["display"]
                for x in resource["valueCodeableConcept"]["coding"]
                if "display" in x
            ),
            None,
        )
        if fallback_display:
            resource["valueCodeableConcept"]["text"] = fallback_display

    return resource
