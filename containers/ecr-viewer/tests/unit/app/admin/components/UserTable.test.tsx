import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserTable } from "@/app/admin/user/UserTable";
import { ListedProgramArea } from "@/app/services/programAreaService";
import { ListedUser } from "@/app/services/userService";

jest.mock("@/app/data/metadataDb/database");
jest.mock("@/app/services/programAreaService");
jest.mock("@/app/utils/auth-utils", () => ({
  isLoggedInUser: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/app/components/AuthSessionProvider", () => ({
  useIsLoggedInUser: () => true,
}));
jest.mock("@/app/services/userService");
jest.mock("@/app/services/loggedInUserService");

const programA: ListedProgramArea = {
  uuid: "program-a",
  name: "Program A",
  author_uuid: "admin",
  date_created: new Date("2025-01-01"),
  conditions: [
    {
      code: "a",
      concept_name: "Condition A (disease)",
      condition_name: "Condition A",
      condition_category: "category",
      program_area_uuid: "program-a",
      is_duplicate: false,
    },
  ],
};
const programB: ListedProgramArea = {
  ...programA,
  uuid: "program-b",
  name: "Program B",
  conditions: [
    {
      ...programA.conditions[0],
      code: "b",
      concept_name: "Condition B (disease)",
      condition_name: "Condition B",
      program_area_uuid: "program-b",
    },
  ],
};

const makeUser = (
  uuid: string,
  email: string,
  userType: ListedUser["user_type"],
  programs: ListedUser["program_areas"],
): ListedUser => ({
  uuid,
  email,
  name: null,
  user_type: userType,
  status: "active",
  date_of_last_login: null,
  date_created: new Date("2025-01-01"),
  author_uuid: "admin",
  program_areas: programs,
});

const programAssignment = (userUuid: string, program: ListedProgramArea) => ({
  user_uuid: userUuid,
  program_area_uuid: program.uuid,
  name: program.name,
});

const admin = makeUser("admin", "admin@example.com", "admin", []);
const programAdmin = makeUser(
  "program-admin",
  "program-admin@example.com",
  "prog-admin",
  [programAssignment("prgoram-admin", programA)],
);
const standardUserShared = makeUser(
  "shared",
  "shared@example.com",
  "standard",
  [
    programAssignment("shared", programA),
    programAssignment("shared", programB),
  ],
);
const standardUserRestricted = makeUser(
  "restricted",
  "restricted@example.com",
  "standard",
  [programAssignment("restricted", programB)],
);
const standardUserUnassigned = makeUser(
  "unassigned",
  "unassigned@example.com",
  "standard",
  [],
);

const renderTable = (
  isLoggedInUserAdmin: boolean,
  programAreas: ListedProgramArea[] = isLoggedInUserAdmin
    ? [programA, programB]
    : [programA],
) =>
  render(
    <UserTable
      users={[
        admin,
        programAdmin,
        standardUserShared,
        standardUserRestricted,
        standardUserUnassigned,
      ]}
      programAreas={programAreas}
      detailProgramAreas={[programA, programB]}
      isLoggedInUserAdmin={isLoggedInUserAdmin}
      deleteAction={jest.fn().mockResolvedValue({})}
    />,
  );

describe("UserTable", () => {
  describe("as an admin", () => {
    it("shows admin-only user type and program area filters", async () => {
      const user = userEvent.setup();
      renderTable(true);

      await user.click(screen.getByLabelText(/Filter by user type/));
      expect(screen.getByRole("radio", { name: "Admin" })).toBeInTheDocument();

      await user.click(screen.getByLabelText(/Filter by program area/));
      expect(
        screen.getByRole("checkbox", { name: "All program areas (Admin)" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", {
          name: "No program areas (Standard)",
        }),
      ).toBeInTheDocument();
    });

    it("shows a divider between the All/No program area checkboxes and the program areas when program areas exist", async () => {
      const user = userEvent.setup();
      renderTable(true, [programA, programB]);

      await user.click(screen.getByLabelText(/Filter by program area/));
      expect(screen.getByTestId("program-area-divider")).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: "Program A" }),
      ).toBeInTheDocument();
    });

    it("does not show a divider when no program areas exist to filter on", async () => {
      const user = userEvent.setup();
      renderTable(true, []);

      await user.click(screen.getByLabelText(/Filter by program area/));
      expect(
        screen.getByRole("checkbox", { name: "All program areas (Admin)" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("program-area-divider"),
      ).not.toBeInTheDocument();
    });
  });

  describe("as a program admin", () => {
    it("shows only users in accessible program areas and restricted filters", async () => {
      const user = userEvent.setup();
      renderTable(false);

      expect(screen.getByText("program-admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("shared@example.com")).toBeInTheDocument();
      expect(screen.queryByText("admin@example.com")).not.toBeInTheDocument();
      expect(
        screen.queryByText("restricted@example.com"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("unassigned@example.com"),
      ).not.toBeInTheDocument();

      await user.click(screen.getByLabelText(/Filter by user type/));
      expect(
        screen.queryByRole("radio", { name: "Admin" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("radio", { name: "Program admin" }),
      ).toBeInTheDocument();

      await user.click(screen.getByLabelText(/Filter by program area/));
      expect(
        screen.queryByRole("checkbox", { name: "All program areas (Admin)" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("checkbox", {
          name: "No program areas (Standard)",
        }),
      ).not.toBeInTheDocument();
    });

    describe("User details side panel", () => {
      it("shows all program areas and conditions for a visible user", async () => {
        const user = userEvent.setup();
        renderTable(false); // Program admin has access to Program A

        await user.click(
          screen.getByRole("button", { name: "shared@example.com" }),
        );

        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveTextContent("Program A");
        expect(dialog).toHaveTextContent("Program B");

        await user.click(
          screen.getByRole("button", { name: /Program A.*1 condition/ }),
        );
        // Program admin should see Program B (& conditions) listed because
        // their user has access to Program B
        await user.click(
          screen.getByRole("button", { name: /Program B.*1 condition/ }),
        );
        expect(dialog).toHaveTextContent("Condition A");
        expect(dialog).toHaveTextContent("Condition B");
      });
    });
  });
});
