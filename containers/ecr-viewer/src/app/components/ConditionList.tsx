import { ConditionReference } from "@/app/data/metadataDb/types/core";

/**
 * A vertical, line-divided list of conditions. Conditions that share a
 * display name with another condition are differentiated with their SNOMED
 * concept name or code.
 * @param props react props
 * @param props.conditions conditions to display
 * @param props.emptyText text to show when there are no conditions
 * @returns condition list component
 */
export const ConditionList = ({
  conditions,
  emptyText = "No conditions assigned",
}: {
  conditions: (ConditionReference & { is_duplicate: boolean })[];
  emptyText?: string;
}) => {
  if (conditions.length === 0) {
    return emptyText;
  }

  return (
    <ul className="add-list-reset">
      {conditions.map(
        ({ condition_name, code, is_duplicate, concept_name }) => (
          <li
            key={code}
            className="border-bottom border-base-lightest padding-y-1"
          >
            <p className="margin-0">{condition_name}</p>
            {is_duplicate && (
              <p className="margin-0">
                <i className="text-base">{concept_name || `SNOMED ${code}`}</i>
              </p>
            )}
          </li>
        ),
      )}
    </ul>
  );
};
