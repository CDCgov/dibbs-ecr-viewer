"use client";
import React, { useState } from "react";

import {
  Button,
  RequiredMarker,
  TextInput,
  Radio,
} from "@trussworks/react-uswds";

import { FieldSet } from "@/app/components/forms/FieldSet";
import { FormPageContent } from "@/app/components/forms/FormPageContent";
import { ToastContext } from "@/app/components/toast/ToastProvider";
import { ServerActionResult } from "@/app/services/errorService";
import { ListedProgramArea } from "@/app/services/programAreaService";
import { makePlural, toKebabCase, toTitleCase } from "@/app/utils/format-utils";
import { ExpandCollapseAccordionControlled } from "@/app/view-data/components/ExpandCollapseAccordion";
import { AccordionItem } from "@/app/view-data/types";

export type UserType = "admin" | "standard";

export interface FormProgram extends ListedProgramArea {
  checked?: boolean;
}

interface FormValues {
  email?: string;
  userType?: UserType;
  programs: FormProgram[];
}

const sortedIds = (programs: FormProgram[]) => {
  return programs
    .filter(({ checked }) => !!checked)
    .map(({ uuid }) => uuid)
    .sort();
};

/**
 *
 * @param props React props
 * @param props.initValues Initial values the form is set to
 * @param props.action Action of the form (e.g. "Create", "Edit")
 * @param props.submitAction Handler for the submitted data
 * @returns Program area add/edit form
 */
export const UserForm = ({
  action,
  initValues,
  submitAction,
}: {
  action: string;
  initValues: FormValues;
  submitAction: (
    email: string,
    userType: UserType,
    programs: string[],
  ) => Promise<ServerActionResult<void>>;
}) => {
  const [email, setEmail] = useState(initValues.email || "");
  const [userType, setUserType] = useState<UserType>(
    initValues.userType || "standard",
  );
  const [programs, setPrograms] = useState(initValues.programs);

  const { createToast } = React.useContext(ToastContext);

  const selectedPrograms = sortedIds(programs);
  const numProgramsSelected = selectedPrograms.length;

  const initSelectedPrograms = sortedIds(initValues.programs);

  const valid =
    !!email &&
    (userType === "admin" || userType === "standard") &&
    (userType === "admin" || numProgramsSelected > 0);
  const touched =
    (email && email !== initValues.email) ||
    userType !== (initValues.userType || "standard") ||
    numProgramsSelected !== initSelectedPrograms.length ||
    selectedPrograms.some((uuid, i) => uuid !== initSelectedPrograms[i]);

  return (
    <FormPageContent
      itemType="user"
      action={action}
      itemHomeRoute="/admin/user"
      formValid={valid}
      formTouched={touched}
      submitAction={async () => {
        const res = await submitAction(
          email.trim(),
          userType,
          userType === "admin" ? [] : selectedPrograms, // admins should not be saved with assigned programs
        );
        if (!res.error)
          createToast(`${email.trim()} successfully saved`, "success");
        return res;
      }}
    >
      <EmailFieldSet email={email} setEmail={setEmail} />
      <UserTypeFieldSet userType={userType} setUserType={setUserType} />
      <ProgramFieldSet
        programs={programs}
        setPrograms={setPrograms}
        numProgramsSelected={numProgramsSelected}
        userType={userType}
      />
    </FormPageContent>
  );
};

const EmailFieldSet = ({
  email,
  setEmail,
}: {
  email: string;
  setEmail: (n: string) => void;
}) => {
  return (
    <FieldSet legend="Email">
      <span>Add the new user by their login email</span>
      <label className="usa-label">
        Email
        <RequiredMarker />
        <TextInput
          type="email"
          required={true}
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
    </FieldSet>
  );
};

const UserTypeFieldSet = ({
  userType,
  setUserType,
}: {
  userType: UserType;
  setUserType: (n: UserType) => void;
}) => {
  return (
    <FieldSet legend="User type">
      <span>
        Select the user type
        <RequiredMarker />
      </span>
      {[
        {
          name: "admin",
          description:
            "Admins have full access to user management, program management, and the eCR Library",
        },
        {
          name: "standard",
          description:
            "Standard users can only use the eCR Library with limited access to program area(s)",
        },
      ].map((option) => (
        <Radio
          key={option.name}
          label={toTitleCase(option.name)}
          labelDescription={option.description}
          type="radio"
          required={true}
          name="userType"
          id={`userType-${option.name}`}
          value={option.name}
          checked={userType === option.name}
          onChange={(e) => setUserType(e.target.value as UserType)}
        />
      ))}
    </FieldSet>
  );
};

// eslint-disable-next-line jsdoc/require-jsdoc
export const ProgramFieldSet = ({
  programs,
  setPrograms,
  numProgramsSelected,
  userType,
}: {
  programs: FormProgram[];
  setPrograms: (c: FormProgram[]) => void;
  numProgramsSelected: number;
  userType: UserType;
}) => {
  const [expandedPrograms, setExpandedPrograms] = useState<
    Record<string, boolean>
  >(valsToBoolean(programs, false));
  const isStandardUser = userType === "standard";

  const accordionItems: AccordionItem[] = programs.map((program) => {
    const { name, conditions } = program;
    const numConditions = conditions.length;

    return {
      title: (
        <div className="display-flex flex-justify flex-align-center">
          <span>{name}</span>
          <span>
            {numConditions} condition{makePlural(numConditions)}
          </span>
        </div>
      ),
      content: conditions.map((c) => c.condition_name).join(", "),
      id: toKebabCase(name),
      expanded: !!expandedPrograms[toKebabCase(name)],
      headingLevel: "h3",
      checkboxGroup: "program",
      checkboxLabel: `Select ${program.name}`,
      isChecked: program.checked === true,
      onChecked: isStandardUser
        ? (checked: boolean) => {
            setPrograms(
              programs.map((c) =>
                c.uuid === program.uuid ? { ...c, checked } : c,
              ),
            );
          }
        : undefined,
    };
  });

  return (
    <FieldSet legend="Program area access">
      <span>
        {isStandardUser ? (
          <>
            Select one or more program areas
            <RequiredMarker />
          </>
        ) : (
          <>Admins will be able to see all program areas and conditions</>
        )}
      </span>

      {isStandardUser && (
        <>
          <p className="text-bold font-size-md">
            {numProgramsSelected} program area{makePlural(numProgramsSelected)}{" "}
            selected
          </p>
          <div className="margin-right-auto">
            {[
              { type: "Select", checked: true },
              { type: "Deselect", checked: false },
            ].map(({ type, checked }) => (
              <Button
                key={type}
                type="button"
                outline={true}
                onClick={() =>
                  setPrograms(
                    programs.map((c) => ({
                      ...c,
                      checked,
                    })),
                  )
                }
                aria-controls={programs
                  .map(({ name }) => `${toKebabCase(name)}`)
                  .join(" ")}
                className="margin-top-0"
              >
                {type} all
              </Button>
            ))}
          </div>
        </>
      )}

      <ExpandCollapseAccordionControlled
        descriptor="program areas"
        className="accordion-dibbs margin-top-3"
        handleToggle={(p) =>
          setExpandedPrograms({
            ...expandedPrograms,
            [p]: !expandedPrograms[p],
          })
        }
        handleToggleAll={(expanded) =>
          setExpandedPrograms(valsToBoolean(programs, expanded))
        }
        items={accordionItems}
      />
    </FieldSet>
  );
};

// Converts an array of program objects into
// Record<[program-name]: boolean indicating expanded state>
const valsToBoolean = (programs: FormProgram[], val: boolean) => {
  return programs
    .map((obj) => obj.name)
    .reduce(
      (acc, cur) => {
        acc[toKebabCase(cur)] = val;
        return acc;
      },
      {} as Record<string, boolean>,
    );
};
