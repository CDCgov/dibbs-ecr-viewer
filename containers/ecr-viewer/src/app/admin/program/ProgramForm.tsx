"use client";
import { useState } from "react";

import { Accordion } from "@trussworks/react-uswds";

import { ConditionReference } from "@/app/data/metadataDb/types/core";

interface FormCondition extends ConditionReference {
  checked?: boolean;
}

interface FormValues {
  name?: string;
  conditions: FormCondition[];
}

const groupByCategory = (conditions: FormCondition[]) => {
  return conditions.reduce(
    (acc, cur) => {
      const category = cur.condition_category || "Unknown";
      acc[category] ||= [] as ConditionReference[];
      acc[category].push(cur);
      return acc;
    },
    {} as { [key: string]: ConditionReference[] },
  );
};

/**
 *
 * @param root0
 * @param root0.initValues
 */
export const ProgramForm = ({ initValues }: { initValues: FormValues }) => {
  const [name, setName] = useState(initValues.name || "");
  const [conditionCategories, setConditionCategories] = useState(
    groupByCategory(initValues.conditions),
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        console.log(e);
      }}
    >
      <fieldset>
        <label>
          Name:
          <input
            type="text"
            required={true}
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Conditions:</legend>
        <Accordion
          multiselectable={true}
          className="accordion-dibbs"
          items={Object.keys(conditionCategories)
            .sort()
            .map((category) => {
              const conditions = conditionCategories[category];
              return {
                title: (
                  <label className="usa-checkbox__label usa-checkbox">
                    {category}
                    <input
                      type="checkbox"
                      className="usa-checkbox__input"
                      name="conditions"
                      value={category}
                    />
                  </label>
                ),
                content: conditions.map((condition, i) => (
                  <label className="usa-checkbox__label usa-checkbox" key={i}>
                    {condition.condition_name}
                    <input
                      type="checkbox"
                      className="usa-checkbox__input"
                      name="conditions"
                      value={condition.code}
                    />
                  </label>
                )),
                id: category,
                expanded: true,
                headingLevel: "h4",
              };
            })}
        />
      </fieldset>
      <fieldset>
        <button type="submit">Create New Program Area</button>
      </fieldset>
    </form>
  );
};
