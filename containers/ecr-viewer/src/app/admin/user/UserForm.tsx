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

type UserType = "admin" | "standard";

export interface FormProgram extends ListedProgramArea {
  checked?: boolean;
}

interface FormValues {
  email?: string;
  userType?: UserType;
  programs: FormProgram[];
}

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
  ) => Promise<ServerActionResult<string>>;
}) => {
  const [email, setEmail] = useState(initValues.email || "");
  const [userType, setUserType] = useState<UserType>(
    initValues.userType || "standard",
  );
  const [programs, setPrograms] = useState(initValues.programs);

  const { createToast } = React.useContext(ToastContext);

  const selectedPrograms = Object.values(programs)
    .filter(({ checked }) => !!checked)
    .map(({ uuid }) => uuid);
  const numProgramsSelected = selectedPrograms.length;

  const valid =
    !!email &&
    (userType === "admin" || userType === "standard") &&
    (userType === "admin" || numProgramsSelected > 0);

  return (
    <FormPageContent
      action={`${action} new user`}
      formValid={valid}
      submitAction={async () => {
        const res = await submitAction(
          email.trim(),
          userType,
          selectedPrograms,
        );
        if (!res.error)
          createToast(`${email.trim()} successfully saved`, "success");
        return res;
      }}
      successRoute="/admin/user"
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
      <span>
        Add the new user by their login email (<RequiredMarker />)
      </span>
      <label className="usa-label">
        EMAIL
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
      <label className="display-block width-full">
        USER TYPE
        <RequiredMarker />
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
      </label>
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
  >(valsToBoolean(programs, true));
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
      content: conditions.map((c) => c.condition_name).join("; "),
      id: toKebabCase(name),
      expanded: !!expandedPrograms[toKebabCase(name)],
      headingLevel: "h3",
      group: "program",
      isChecked: () => isStandardUser && program.checked === true,
      onChecked: isStandardUser
        ? (e: React.ChangeEvent<HTMLInputElement>) => {
            setPrograms(
              programs.map((c) =>
                c.uuid === program.uuid
                  ? { ...c, checked: e.target.checked }
                  : c,
              ),
            );
          }
        : undefined,
    };
  });

  return (
    <FieldSet legend="Program area access">
      <span>
        Select one or more program areas. Program areas will apply to all users
        added.
        <RequiredMarker />
      </span>
      <p className="text-bold font-size-md">
        Program area ({numProgramsSelected}/{programs.length}) selected
      </p>
      <div className="margin-right-auto">
        {[
          { type: "Select", checked: true, disabledCount: programs.length },
          { type: "Deselect", checked: false, disabledCount: 0 },
        ].map(({ type, checked, disabledCount }) => (
          <Button
            key={type}
            type="button"
            outline={true}
            disabled={numProgramsSelected === disabledCount}
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
      <ExpandCollapseAccordionControlled
        descriptor="sections"
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
