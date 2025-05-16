"use client";
import React, { useState } from "react";

import { Checkbox, RequiredMarker, TextInput } from "@trussworks/react-uswds";

import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";
import { ConditionReference } from "@/app/data/metadataDb/types/core";
import { createProgramArea } from "@/app/services/programAreaService";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";

interface FormCondition extends ConditionReference {
  checked?: boolean;
}

type ConditionCateogires = Record<string, FormCondition[]>;

interface FormValues {
  name?: string;
  conditions: FormCondition[];
}

const groupByCategory = (conditions: FormCondition[]) => {
  return conditions.reduce(
    (acc, cur) => {
      const category = cur.condition_category || "Unknown";
      acc[category] ||= [] as FormCondition[];
      acc[category].push(cur);
      acc[category].sort((a, b) =>
        a.condition_name < b.condition_name ? -1 : 1,
      );
      return acc;
    },
    {} as { [key: string]: FormCondition[] },
  );
};

/**
 *
 * @param props React props
 * @param props.initValues Initial values the form is set to
 * @param props.action Action of the form (e.g. "Create", "Edit")
 * @returns Program area add/edit form
 */
export const ProgramForm = ({
  action,
  initValues,
}: {
  action: string;
  initValues: FormValues;
}) => {
  const [name, setName] = useState(initValues.name || "");
  const [conditionCategories, setConditionCategories] = useState(
    groupByCategory(initValues.conditions),
  );

  const selectedConditions = Object.values(conditionCategories)
    .flatMap((id) => id)
    .filter(({ checked }) => !!checked)
    .map(({ code }) => code);
  const numConditionsSelected = selectedConditions.length;

  const valid = !!name.trim() && numConditionsSelected > 0;

  return (
    <FormPageContent
      action={`${action} program area`}
      formValid={valid}
      submitAction={async () => {
        await createProgramArea(name, selectedConditions);
      }}
      successRoute="/admin/program"
    >
      <NameFieldSet name={name} setName={setName} />
      <ConditionFieldSet
        conditionCategories={conditionCategories}
        setConditionCategories={setConditionCategories}
        numConditionsSelected={numConditionsSelected}
      />
    </FormPageContent>
  );
};

const CategoryTitle = ({
  category,
  conditions,
  onChecked,
}: {
  category: string;
  conditions: FormCondition[];
  onChecked: (checked: boolean) => void;
}) => {
  return (
    <div className="display-flex flex-justify">
      <Checkbox
        name="category"
        id={category}
        label={
          <div>
            <strong>{category}</strong>
            <br />
            <span className="text-base">RCKMS condition category</span>
          </div>
        }
        checked={conditions.every(({ checked }) => !!checked)}
        onChange={(e) => onChecked(e.target.checked)}
      />

      <p>
        {conditions.filter(({ checked }) => checked).length}/{conditions.length}{" "}
        conditions selected
      </p>
    </div>
  );
};

const ConditionCheckBox = ({
  condition,
  onChecked,
}: {
  condition: FormCondition;
  onChecked: (checked: boolean) => void;
}) => {
  return (
    <Checkbox
      id={`condition-${condition.code}`}
      name="conditions"
      value={condition.code}
      label={condition.condition_name}
      checked={condition.checked === true}
      onChange={(e) => onChecked(e.target.checked)}
    />
  );
};

const keysToBoolean = <T extends object>(obj: T, val: boolean) => {
  return Object.keys(obj).reduce(
    (acc, cur) => {
      acc[cur] = val;
      return acc;
    },
    {} as Record<string, boolean>,
  );
};

const ConditionFieldSet = ({
  conditionCategories,
  setConditionCategories,
  numConditionsSelected,
}: {
  numConditionsSelected: number;
  conditionCategories: ConditionCateogires;
  setConditionCategories: (c: ConditionCateogires) => void;
}) => {
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(keysToBoolean(conditionCategories, true));

  const accordionItems: AccordionItem[] = Object.keys(conditionCategories)
    .sort()
    .map((category) => {
      const conditions = conditionCategories[category];
      return {
        title: (
          <CategoryTitle
            category={category}
            conditions={conditions}
            onChecked={(checked) => {
              const nextConditionCategories = {
                ...conditionCategories,
                [category]: conditionCategories[category].map((c) => ({
                  ...c,
                  checked,
                })),
              };
              setConditionCategories(nextConditionCategories);
            }}
          />
        ),
        content: conditions.map((condition, i) => (
          <React.Fragment key={`condition-${condition.code}`}>
            {i !== 0 && <div className="section__line_light_gray" />}
            <ConditionCheckBox
              condition={condition}
              onChecked={(checked) => {
                const nextConditionCategories = {
                  ...conditionCategories,
                  [category]: conditionCategories[category].map((c) =>
                    c.code === condition.code ? { ...c, checked } : c,
                  ),
                };
                setConditionCategories(nextConditionCategories);
              }}
            />
          </React.Fragment>
        )),
        id: category,
        expanded: !!expandedCategories[category],
        headingLevel: "h4",
      };
    });

  return (
    <FieldSet legend="Add conditions">
      <span>
        Select a minimum of 1 condition
        <RequiredMarker />
      </span>
      <p className="text-bold font-size-md">
        {numConditionsSelected} condition
        {numConditionsSelected === 1 ? "" : "s"} selected
      </p>
      <ExpandCollapseAccordionControlled
        descriptor="condition categories"
        className="accordion-dibbs margin-top-3"
        handleToggle={(category) =>
          setExpandedCategories({
            ...expandedCategories,
            [category]: !expandedCategories[category],
          })
        }
        handleToggleAll={(expanded) =>
          setExpandedCategories(keysToBoolean(conditionCategories, expanded))
        }
        items={accordionItems}
      />
    </FieldSet>
  );
};

const NameFieldSet = ({
  name,
  setName,
}: {
  name: string;
  setName: (n: string) => void;
}) => {
  return (
    <FieldSet legend="Name program area">
      <span>
        Required fields are marked with an asterisk (<RequiredMarker />)
      </span>
      <label className="usa-label">
        Program area name
        <RequiredMarker />
        <TextInput
          type="text"
          required={true}
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
    </FieldSet>
  );
};
