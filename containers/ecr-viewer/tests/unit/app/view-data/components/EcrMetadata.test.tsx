import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";

import { DisplayDataProps } from "@/app/view-data/components/DataDisplay";
import EcrMetadata from "@/app/view-data/components/EcrMetadata";
import { ERSDInfo } from "@/app/view-data/services/ecrMetadataService";
import { ReportableConditions } from "@/app/view-data/services/reportabilityService";

const rrConditionsList: ReportableConditions = {
  "Disease caused by severe acute respiratory syndrome coronavirus 2(disorder)":
    [
      {
        participants: [
          {
            name: "Coruscant Department of Public Health",
            role: "Routing Entity",
          },
          {
            name: "Coruscant Department of Public Health",
            role: "Rules Authoring Agency",
          },
        ],
        rules: new Set([
          "Detection of SARS-CoV-2 nucleic acid in a clinical or post-mortem specimen by any method",
        ]),
        reasons: new Set([]),
      },
      {
        participants: [
          {
            name: "Coruscant City Department of Public Health",
            role: "Routing Entity",
          },
        ],
        rules: new Set([
          "Detection of SARS-CoV-2 nucleic acid in a clinical or post-mortem specimen by any method",
          "Close contact in the 14 days prior to onset of symptoms with a confirmed or probable case of COVID-19 (Partially implemented as exposure with no timeframe parameters)",
          "COVID-19 (as a diagnosis or active problem)",
        ]),
        reasons: new Set(["Reason 1"]),
      },
    ],
  // "Hep C": [
  //   {
  //     participants: [
  //       {
  //         name: "Hep C Routing Entity",
  //         role: "Routing Entity",
  //       },
  //     ],
  //     rules: new Set(["Hep C Rule"]),
  //     reasons: new Set([]),
  //   },
  // ],
};

const eicrDetails: DisplayDataProps[] = [
  {
    title: "eICR Identifier",
    value: "1dd10047-2207-4eac-a993-0f706c88be5d",
  },
  {
    title: "Date/Time eCR Created",
    value: "2022-05-14T12:56:38Z",
  },
  { title: "eICR Release Version", value: "R1.1 (2016-12-01)" },
  {
    title: "EHR Software Name",
    value: "Epic - Version 10.1",
  },
  { title: "EHR Manufacturer Model Name", value: "Epic - Version 10.1" },
];

const eRSDProcessingInfo: ERSDInfo = {
  success: false,
  eRSDWarning: {
    warning: "Sending organization is using an malformed eRSD (RCTC) version",
    versionUsed: "2020-06-23",
    versionExpected:
      "Sending organization should be using one of the following: 2023-10-06, 1.2.2.0, 3.x.x.x.",
    suggestedSolution:
      "The trigger code version your organization is using could not be determined. The trigger codes may be out date. Please have your EHR administrators update the version format for complete eCR functioning.",
  },
};

const ecrCustodianDetails: DisplayDataProps[] = [
  {
    title: "Custodian ID",
    value: "112233445566",
  },
  {
    title: "Custodian Name",
    value: "Hoth University Medical Center",
  },
  {
    title: "Custodian Address",
    value: "5555 Snowy Ave\nSnowtown, TN\n00123, USA",
  },
  {
    title: "Custodian Contact",
    value: "Work 1-555-555-5555",
  },
];

const eicrAuthorDetails = [
  [
    {
      title: "Author Name",
      value: "Dr. R2D2",
    },
    {
      title: "Author Address",
      value: "1 Droid st",
    },
    {
      title: "Author Contact",
      value: "(555)555-5555",
    },
    {
      title: "Author Facility Name",
      value: "Echo Base Medical Facility",
    },
    {
      title: "Author Facility Address",
      value: "5555 Echo Base Drive\nEcho Base, CA\n00123, USA",
    },
    {
      title: "Author Facility Contact",
      value: "555-555-5555",
    },
  ],
];

describe("eCR Metadata", () => {
  beforeAll(() => {
    const mockChildMethod = jest.fn();
    jest.spyOn(React, "useRef").mockReturnValue({
      current: {
        childMethod: mockChildMethod,
      },
    });
  });

  it("should match snapshot", () => {
    const { container } = render(
      <EcrMetadata
        eicrDetails={eicrDetails}
        rrConditions={rrConditionsList}
        eRSDProcessingInfo={eRSDProcessingInfo}
        eCRCustodianDetails={ecrCustodianDetails}
        eicrAuthorDetails={eicrAuthorDetails}
      />,
    );
    expect(container).toMatchSnapshot();
  });
  it("should pass accessibility test", async () => {
    const { container } = render(
      <EcrMetadata
        eicrDetails={eicrDetails}
        rrConditions={rrConditionsList}
        eRSDProcessingInfo={eRSDProcessingInfo}
        eCRCustodianDetails={ecrCustodianDetails}
        eicrAuthorDetails={eicrAuthorDetails}
      />,
    );
    // ignore duplicate ids due to mocking making all useId return the same
    expect(
      await axe(container, {
        rules: { "duplicate-id-aria": { enabled: false } },
      }),
    ).toHaveNoViolations();
  });
  it("should not render eRSD Processing Info section if no eRSD Processing Info is available", () => {
    render(
      <EcrMetadata
        eicrDetails={eicrDetails}
        rrConditions={rrConditionsList}
        eRSDProcessingInfo={undefined}
        eCRCustodianDetails={ecrCustodianDetails}
        eicrAuthorDetails={eicrAuthorDetails}
      />,
    );
    expect(screen.queryByText("Warning")).not.toBeInTheDocument();
  });

  describe("eCR Metadata: Reportability Summary Table", () => {
    it("should let the user know that a reportable condition hasn't been found if there is no data available", () => {
      const emptyRrConditions: ReportableConditions = {};
      render(
        <EcrMetadata
          eicrDetails={eicrDetails}
          rrConditions={emptyRrConditions}
          eRSDProcessingInfo={eRSDProcessingInfo}
          eCRCustodianDetails={ecrCustodianDetails}
          eicrAuthorDetails={eicrAuthorDetails}
        />,
      );
      expect(
        screen.getByText("Reportability Summary", { selector: "h5" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("No reportable condition found"),
      ).toBeInTheDocument();
    });
    it("should open correct hidden details", async () => {
      const user = userEvent.setup();
      const conditionName =
        "Disease caused by severe acute respiratory syndrome coronavirus 2(disorder)";
      render(
        <EcrMetadata
          eicrDetails={eicrDetails}
          rrConditions={rrConditionsList}
          eRSDProcessingInfo={eRSDProcessingInfo}
          eCRCustodianDetails={ecrCustodianDetails}
          eicrAuthorDetails={eicrAuthorDetails}
        />,
      );
      expect(screen.getByText(conditionName)).toHaveAttribute("rowSpan", "2");

      await user.click(screen.getAllByText("View")[0]);

      // Note should be visible & 'View' should be replaced with 'Hide'
      expect(screen.getAllByText("Hide")).toHaveLength(1);
      expect(screen.getByText("Rules Authoring Agency")).toBeVisible();

      // Should have only opened one hidden row
      expect(screen.getAllByText("View")).toHaveLength(1);
      expect(screen.getByText("Reason 1")).not.toBeVisible();

      // Row span of condition cell should have +1 with expanded hidden row
      expect(screen.getByText(conditionName)).toHaveAttribute("rowSpan", "3");
    });
  });
});
