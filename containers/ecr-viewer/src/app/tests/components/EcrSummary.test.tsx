import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import EcrSummary, {
  ConditionSummary,
} from "../../view-data/components/EcrSummary";
import { findCurrentAddress } from "@/app/services/ecrSummaryService";

describe("EcrSummary tests", () => {
  describe("EcrSummary", () => {
    const patientDetails = [
      {
        title: "Patient Name",
        value: "Han Solo",
      },
      {
        title: "DOB",
        value: "04/15/1900",
      },
      {
        title: "Sex",
        value: "male",
      },
      {
        title: "Patient Address",
        value: "1050 Millennium Falcon ST\nSpace, CA\n00123, US",
      },
      {
        title: "Patient Contact",
        value: "Home 555-555-55555\nHANSOLOFAKEEMAIL@EXAMPLE.COM",
      },
    ];
    const encounterDetails = [
      {
        title: "Facility Name",
        value: "Millennium Falcon Med Bay",
      },
      {
        title: "Facility Contact",
        value: "555-555-5555",
      },
      {
        title: "Encounter Date/Time",
        value: "Start: 05/13/2000 7:25 AM UTC\nEnd: 05/13/2000 9:57 AM UTC",
      },
      {
        title: "Encounter Type",
        value: "Emergency",
      },
    ];
    const covidConditionDetails: ConditionSummary[] = [
      {
        title: "Influenza caused by Influenza A virus subtype H5N1 (disorder)",
        snomed: "test-snomed-123",
        conditionDetails: [
          {
            title: "RCKMS Rule Summary",
            value: "covid summary",
          },
        ],
        clinicalDetails: [
          {
            title: "Relevant Clinical",
            value: "covid clinical",
          },
        ],
        labDetails: [
          {
            title: "Relevant Labs",
            value: "covid lab",
          },
        ],
        immunizationDetails: [
          {
            title: "Relevant immmunizations",
            value: "table would be here",
            dividerLine: true,
          },
        ],
      },
    ];
    const hepConditionDetails: ConditionSummary[] = [
      {
        title: "Hep C",
        snomed: "test-snomed-456",
        conditionDetails: [
          {
            title: "RCKMS Rule Summary",
            value: "hep c summary",
          },
        ],
        clinicalDetails: [
          {
            title: "Relevant Clinical",
            value: "hep c clinical",
          },
        ],
        labDetails: [
          {
            title: "Relevant Labs",
            value: "hep c lab",
          },
        ],
        immunizationDetails: [],
      },
    ];

    beforeAll(() => {});
    it("should match snapshot", () => {
      const { container } = render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={covidConditionDetails}
        />,
      );

      expect(container).toMatchSnapshot();
    });
    it("should pass accessibility test", async () => {
      const { container } = render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={covidConditionDetails}
        />,
      );

      expect(await axe(container)).toHaveNoViolations();
    });
    it("should open the condition details when there is one", () => {
      render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={covidConditionDetails}
        />,
      );

      expect(screen.getByText("covid summary")).toBeVisible();
    });
    it("should open the condition when the snomed matches", () => {
      render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={[...covidConditionDetails, ...hepConditionDetails]}
          snomed={"test-snomed-456"}
        />,
      );

      expect(screen.getByText("hep c summary")).toBeVisible();
    });
    it("should open no condition details when there is many and no match", () => {
      render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={[...covidConditionDetails, ...hepConditionDetails]}
        />,
      );

      expect(screen.getByText("hep c summary")).not.toBeVisible();
      expect(screen.getByText("covid summary")).not.toBeVisible();
    });
    it("should show 0 reportable conditions tag", () => {
      render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={[]}
        />,
      );

      expect(screen.getByText("0 CONDITIONS FOUND"));
    });
    it("should show 1 reportable condition tag", () => {
      render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={covidConditionDetails}
        />,
      );

      expect(screen.getByText("1 CONDITION FOUND"));
    });
    it("should show 2 reportable conditions tag", () => {
      render(
        <EcrSummary
          patientDetails={patientDetails}
          encounterDetails={encounterDetails}
          conditionSummary={[...covidConditionDetails, ...hepConditionDetails]}
        />,
      );

      expect(screen.getByText("2 CONDITIONS FOUND"));
    });
  });

  describe("findCurrentAddress", () => {
    const base = {
      line: ["123 Main St"],
    };

    it("should return empty when no addresses available", () => {
      const actual = findCurrentAddress([]);

      expect(actual).toEqual("");
    });

    it("should return first address when no use or period", () => {
      const actual = findCurrentAddress([
        { ...base, city: "1" },
        { ...base, city: "2" },
      ]);

      expect(actual).toEqual("123 Main St\n1");
    });

    it("should return first home address when no current period", () => {
      const actual = findCurrentAddress([
        { ...base, use: "work", city: "1" },
        { ...base, use: "home", city: "2" },
        { ...base, use: "home", city: "3" },
        {
          ...base,
          use: "home",
          city: "3",
          period: { start: "2020-03-01", end: "2020-04-01" },
        },
      ]);

      expect(actual).toEqual("123 Main St\n2");
    });

    it("should return current home address", () => {
      const actual = findCurrentAddress([
        { ...base, use: "work", city: "1" },
        { ...base, use: "home", city: "2" },
        { ...base, use: "home", city: "3", period: { start: "2024-03-13" } },
        {
          ...base,
          use: "home",
          city: "4",
          period: { start: "2024-03-10", end: "2024-03-12" },
        },
      ]);

      expect(actual).toEqual("123 Main St\n3");
    });
  });
});
