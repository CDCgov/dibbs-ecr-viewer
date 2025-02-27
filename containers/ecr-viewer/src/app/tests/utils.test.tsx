import { loadYamlConfig } from "@/app/api/utils";
import { Bundle } from "fhir/r4";
import BundleWithTravelHistory from "./assets/BundleTravelHistory.json";
import BundleWithTravelHistoryEmpty from "./assets/BundleTravelHistoryEmpty.json";
import BundleWithPatient from "./assets/BundlePatient.json";
import BundleWithDeceasedPatient from "./assets/BundlePatientDeceased.json";
import BundleWithSexualOrientation from "./assets/BundleSexualOrientation.json";
import BundleWithMiscNotes from "./assets/BundleMiscNotes.json";
import BundleWithPendingResultsOnly from "./assets/BundlePendingResultsOnly.json";
import BundleWithScheduledOrdersOnly from "./assets/BundleScheduledOrdersOnly.json";
import BundleNoActiveProblems from "./assets/BundleNoActiveProblems.json";
import BundleCareTeam from "./assets/BundleCareTeam.json";
import React from "react";
import { render, screen } from "@testing-library/react";
import { CarePlanActivity } from "fhir/r4b";
import { evaluate } from "@/app/utils/evaluate";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "@trussworks/react-uswds";
import {
  evaluateSocialData,
  evaluatePatientName,
  calculatePatientAge,
  evaluatePatientAddress,
  calculatePatientAgeAtDeath,
} from "../services/evaluateFhirDataService";
import {
  evaluateClinicalData,
  returnCareTeamTable,
  returnPlannedProceduresTable,
} from "../view-data/components/EcrDocument/clinical-data";
import { returnProblemsTable } from "../view-data/components/common";
import { DataDisplay } from "@/app/view-data/components/DataDisplay";
import {
  TooltipDiv,
  ToolTipElement,
} from "@/app/view-data/components/ToolTipElement";

describe("Utils", () => {
  const mappings = loadYamlConfig();
  describe("Evaluate Social Data", () => {
    it("should have no available data when there is no data", () => {
      const actual = evaluateSocialData(undefined as any, mappings);

      expect(actual.availableData).toBeEmpty();
      expect(actual.unavailableData).not.toBeEmpty();
    });
    it("should have travel history when there is a travel history observation present", () => {
      const actual = evaluateSocialData(
        BundleWithTravelHistory as unknown as Bundle,
        mappings,
      );

      render(actual.availableData[0].value);
      expect(screen.getByText("Travel History"));
    });
    it("should not have travel history when there is an empty travel history observation present", () => {
      const actual = evaluateSocialData(
        BundleWithTravelHistoryEmpty as unknown as Bundle,
        mappings,
      );

      expect(actual.availableData).toBeEmpty();
    });
    it("should have patient sexual orientation when available", () => {
      const actual = evaluateSocialData(
        BundleWithSexualOrientation as unknown as Bundle,
        mappings,
      );

      expect(actual.availableData[0].value).toEqual("Other");
    });
    it("should return religion if available", () => {
      const actual = evaluateSocialData(
        BundleWithPatient as unknown as Bundle,
        mappings,
      );
      const ext = actual.availableData.filter(
        (d) => d.title === "Religious Affiliation",
      );
      expect(ext).toHaveLength(1);
      expect(ext[0].value).toEqual("Baptist");
    });
    it("should return marital status if available", () => {
      const actual = evaluateSocialData(
        BundleWithPatient as unknown as Bundle,
        mappings,
      );
      const ext = actual.availableData.filter(
        (d) => d.title === "Marital Status",
      );
      expect(ext).toHaveLength(1);
      expect(ext[0].value).toEqual("Married");
    });
  });

  describe("Evaluate Clinical Info", () => {
    it("Should return notes", () => {
      const actual = evaluateClinicalData(
        BundleWithMiscNotes as unknown as Bundle,
        mappings,
      );
      render(actual.clinicalNotes.availableData[0].value as React.JSX.Element);
      expect(actual.clinicalNotes.availableData[0].title).toEqual(
        "Miscellaneous Notes",
      );
      expect(screen.getByText("Active Problems")).toBeInTheDocument();
      expect(actual.clinicalNotes.unavailableData).toBeEmpty();
    });
    it("Should not include Treatment details if medications is not available", () => {
      const actual = evaluateClinicalData(
        BundleWithMiscNotes as unknown as Bundle,
        mappings,
      );
      expect(actual.treatmentData.availableData).toBeEmpty();
    });
    it("Should return Plan of Treatment when only pending results", () => {
      const actual = evaluateClinicalData(
        BundleWithPendingResultsOnly as unknown as Bundle,
        mappings,
      );
      expect(actual.treatmentData.availableData[0].title).toEqual(
        "Plan of Treatment",
      );
    });
    it("Should return Plan of Treatment when only scheduled orders", () => {
      const actual = evaluateClinicalData(
        BundleWithScheduledOrdersOnly as unknown as Bundle,
        mappings,
      );
      expect(actual.treatmentData.availableData[0].title).toEqual(
        "Plan of Treatment",
      );
    });
  });

  describe("Evaluate Care Team Table", () => {
    it("should evaluate care team table results", () => {
      const actual: React.JSX.Element = returnCareTeamTable(
        BundleCareTeam as unknown as Bundle,
        mappings,
      ) as React.JSX.Element;

      render(actual);

      expect(screen.getByText("Dr Toob Nix SR")).toBeInTheDocument();
      expect(screen.getByText("family")).toBeInTheDocument();
      expect(
        screen.getByText("Start: 11/16/1884 End: 05/21/1896"),
      ).toBeInTheDocument();
    });

    it("the table should not appear when there are no results", () => {
      const actual = returnCareTeamTable(
        BundleWithPatient as unknown as Bundle,
        mappings,
      );
      expect(actual).toBeUndefined();
    });
  });

  describe("Evaluate Patient Name", () => {
    it("should return name", () => {
      const actual = evaluatePatientName(
        BundleWithPatient as unknown as Bundle,
        mappings,
        false,
      );
      expect(actual).toEqual("Han Solo");
    });
  });
  describe("Extract Patient Address", () => {
    it("should return empty string if no address is available", () => {
      const actual = evaluatePatientAddress(undefined as any, mappings);

      expect(actual).toBeEmpty();
    });
    it("should get patient address", () => {
      const actual = evaluatePatientAddress(
        BundleWithPatient as unknown as Bundle,
        mappings,
      );

      expect(actual).toEqual("1 Main St\nCloud City, CA\n00000, US");
    });
  });
  describe("Calculate Patient Age", () => {
    it("when no date is given, should return patient age when DOB is available", () => {
      // Fixed "today" for testing purposes
      jest.useFakeTimers().setSystemTime(new Date("2024-03-12"));

      const patientAge = calculatePatientAge(
        BundleWithPatient as unknown as Bundle,
        mappings,
      );

      expect(patientAge).toEqual(146);

      // Return to real time
      jest.useRealTimers();
    });
    it("should return nothing when DOB is unavailable", () => {
      const patientAge = calculatePatientAge(undefined as any, mappings);

      expect(patientAge).toEqual(undefined);
    });
    it("when date is given, should return age at given date", () => {
      const givenDate = "2020-01-01";
      const expectedAge = 142;

      const resultAge = calculatePatientAge(
        BundleWithPatient as unknown as Bundle,
        mappings,
        givenDate,
      );

      expect(resultAge).toEqual(expectedAge);
    });
  });

  it("should have a defined Current Age, and not have a defined Age at Death when Date of Death is not given", () => {
    jest.useFakeTimers().setSystemTime(new Date("2024-03-12"));

    const expectedAgeAtDeath = undefined;
    const expectedAge = 146;

    const patientAge = calculatePatientAge(
      BundleWithPatient as unknown as Bundle,
      mappings,
    );

    const patientAgeAtDeath = calculatePatientAgeAtDeath(
      BundleWithPatient as unknown as Bundle,
      mappings,
    );

    expect(patientAgeAtDeath).toEqual(expectedAgeAtDeath);
    expect(patientAge).toEqual(expectedAge);

    // Return to real time
    jest.useRealTimers();
  });
  describe("Calculate Age at Death", () => {
    it("should return age at death when DOD is given", () => {
      const patientAgeAtDeath = calculatePatientAgeAtDeath(
        BundleWithDeceasedPatient as unknown as Bundle,
        mappings,
      );

      const expectedAgeAtDeath = 4;

      expect(patientAgeAtDeath).toEqual(expectedAgeAtDeath);
    });
    it("should have a defined Age at Death, and not have a defined Current Age when Date of Death is given", () => {
      jest.useFakeTimers().setSystemTime(new Date("2024-03-12"));

      const expectedAgeAtDeath = 4;
      const expectedAge = undefined;

      const patientAge = calculatePatientAge(
        BundleWithDeceasedPatient as unknown as Bundle,
        mappings,
      );

      const patientAgeAtDeath = calculatePatientAgeAtDeath(
        BundleWithDeceasedPatient as unknown as Bundle,
        mappings,
      );

      expect(patientAgeAtDeath).toEqual(expectedAgeAtDeath);
      expect(patientAge).toEqual(expectedAge);

      // Return to real time
      jest.useRealTimers();
    });
  });

  describe("Planned Procedures Table", () => {
    it("should return table when data is provided", () => {
      const carePlanActivities = [
        {
          detail: {
            scheduledString: "02/01/2024",
            code: {
              coding: [
                {
                  display: "activity 1",
                },
              ],
            },
          },
          extension: [
            {
              url: "dibbs.orderedDate",
              valueString: "01/01/2024",
            },
          ],
        },
      ] as CarePlanActivity[];
      const actual = returnPlannedProceduresTable(carePlanActivities, mappings);
      render(actual!);

      expect(screen.getByText("activity 1")).toBeInTheDocument();
      expect(screen.getByText("01/01/2024")).toBeInTheDocument();
      expect(screen.getByText("02/01/2024")).toBeInTheDocument();
    });
    it("should not return table when data is provided", () => {
      const actual = returnPlannedProceduresTable([], mappings);

      expect(actual).toBeUndefined();
    });
  });

  describe("Render Active Problem table", () => {
    it("should return empty if active problem name is undefined", () => {
      const actual = returnProblemsTable(
        BundleNoActiveProblems as unknown as Bundle,
        evaluate(BundleNoActiveProblems, mappings.activeProblems),
        mappings,
      );

      expect(actual).toBeUndefined();
    });
  });

  describe("DataDisplay", () => {
    describe("string value", () => {
      it("should display text up to 500 characters", () => {
        const FiveHundredChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz";
        expect(FiveHundredChars).toHaveLength(500);

        render(
          <DataDisplay item={{ title: "field", value: FiveHundredChars }} />,
        );

        expect(screen.getByText(FiveHundredChars)).toBeInTheDocument();
      });
      it("should only show first 300 characters when full string is greater than 500 characters", () => {
        const FiveHundredOneChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz1";
        expect(FiveHundredOneChars).toHaveLength(501);

        render(
          <DataDisplay item={{ title: "field", value: FiveHundredOneChars }} />,
        );

        expect(
          screen.getByText(FiveHundredOneChars.substring(0, 300) + "..."),
        ).toBeInTheDocument();
        expect(screen.getByText("View more")).toBeInTheDocument();
        expect(
          screen.queryByText(FiveHundredOneChars.substring(300)),
        ).not.toBeInTheDocument();
      });
      it("should show full text when view more is clicked", async () => {
        const user = userEvent.setup();
        const FiveHundredOneChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz1";
        expect(FiveHundredOneChars).toHaveLength(501);

        render(
          <DataDisplay item={{ title: "field", value: FiveHundredOneChars }} />,
        );

        await user.click(screen.getByText("View more"));

        expect(screen.getByText(FiveHundredOneChars)).toBeInTheDocument();
        expect(screen.getByText("View less")).toBeInTheDocument();
        expect(screen.queryByText("View more")).not.toBeInTheDocument();
        expect(screen.queryByText("...")).not.toBeInTheDocument();
      });
      it("should hide text when view less is clicked", async () => {
        const user = userEvent.setup();
        const FiveHundredOneChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz1";
        expect(FiveHundredOneChars).toHaveLength(501);

        render(
          <DataDisplay item={{ title: "field", value: FiveHundredOneChars }} />,
        );

        await user.click(screen.getByText("View more"));
        expect(screen.getByText(FiveHundredOneChars)).toBeInTheDocument();

        await user.click(screen.getByText("View less"));

        expect(
          screen.getByText(FiveHundredOneChars.substring(0, 300) + "..."),
        ).toBeInTheDocument();
        expect(screen.getByText("View more")).toBeInTheDocument();
        expect(
          screen.queryByText(FiveHundredOneChars.substring(300)),
        ).not.toBeInTheDocument();
      });
    });
    describe("Array ReactNode value", () => {
      it("should only show first 300 characters when the full element contains greater than 500 characters", () => {
        const OneHundredTwentyFiveCharStrings = [
          "gFuhsHGaiecclYWTrp7EvwBAr2JAhfN9Kv09RtBbj4QevWU1FolfXZJBWPgW6LCTUaDaiYMiHDOhNXrIeqn1ICE7fBHTRY1Gq8f5f9g9oAyCKwf2uluoe8nDzXJmV",
          "pHW6mej26PNCPI1GRAkq7ForT93tNROGU4D4FE8fJETXar1hLVCZXGSQRZBDwBOtXCK0jT7LxtNedMAt4RxLFsM23KpFpvx7ke3EfOOBBOeyulFcXqZaonYkObOv9",
          "KCu7m7fYs5Jw2IeNf9PtmVHmNJakfdwu19783oUXwHcm9gUAMnQ5FQEgnsfCLy1r79Fx4hQhLm8rdz4sA4cMMD6r8Cpsgt9KsImZRNH2RC5BRgb6cMsGAfOTb8Kri",
          "qWF7VqoRKetCfdzvRupMCtFNrwZBJb2NEReYStddzm4GGOADg6m5nhgC0goXgzB3GKVIp6qY60aOmyjPnyH2OrAZszdmnthkh6DwI4VROKwPTKbGJorQTy3B8oi8p",
          "C35z0HsExV59WKHHsBgupEXcHnxyp4rtlfmhWA067Go52PJvzeNgoKU4h27JWobzjWAQ6U9WdEboVvFkkp2SpSkUzG0YR38Ijl3vYpfumtJMFBLvFkPrEkjEbo7UF",
        ];
        const FiveHundredOneChars = [
          <ul key="1234">
            <li>{OneHundredTwentyFiveCharStrings[0]}</li>
            <li>{OneHundredTwentyFiveCharStrings[1]}</li>
            <li>{OneHundredTwentyFiveCharStrings[2]}</li>
            <li>{OneHundredTwentyFiveCharStrings[3]}</li>
            <li>{OneHundredTwentyFiveCharStrings[4]}</li>
          </ul>,
          "this is more text",
        ];

        render(
          <DataDisplay item={{ title: "field", value: FiveHundredOneChars }} />,
        );

        expect(
          screen.getByText(OneHundredTwentyFiveCharStrings[0]),
        ).toBeInTheDocument();
        expect(
          screen.getByText(OneHundredTwentyFiveCharStrings[1]),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            OneHundredTwentyFiveCharStrings[2].substring(0, 50) + "...",
          ),
        ).toBeInTheDocument();
        expect(screen.getByText("View more")).toBeInTheDocument();
        expect(
          screen.queryByText(OneHundredTwentyFiveCharStrings[2].substring(50)),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(OneHundredTwentyFiveCharStrings[3]),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(OneHundredTwentyFiveCharStrings[4]),
        ).not.toBeInTheDocument();
      });
      it("should show the whole ReactNode when view more is clicked", async () => {
        const user = userEvent.setup();
        const OneHundredTwentyFiveCharStrings = [
          "gFuhsHGaiecclYWTrp7EvwBAr2JAhfN9Kv09RtBbj4QevWU1FolfXZJBWPgW6LCTUaDaiYMiHDOhNXrIeqn1ICE7fBHTRY1Gq8f5f9g9oAyCKwf2uluoe8nDzXJmV",
          "pHW6mej26PNCPI1GRAkq7ForT93tNROGU4D4FE8fJETXar1hLVCZXGSQRZBDwBOtXCK0jT7LxtNedMAt4RxLFsM23KpFpvx7ke3EfOOBBOeyulFcXqZaonYkObOv9",
          "KCu7m7fYs5Jw2IeNf9PtmVHmNJakfdwu19783oUXwHcm9gUAMnQ5FQEgnsfCLy1r79Fx4hQhLm8rdz4sA4cMMD6r8Cpsgt9KsImZRNH2RC5BRgb6cMsGAfOTb8Kri",
          "qWF7VqoRKetCfdzvRupMCtFNrwZBJb2NEReYStddzm4GGOADg6m5nhgC0goXgzB3GKVIp6qY60aOmyjPnyH2OrAZszdmnthkh6DwI4VROKwPTKbGJorQTy3B8oi8p",
          "C35z0HsExV59WKHHsBgupEXcHnxyp4rtlfmhWA067Go52PJvzeNgoKU4h27JWobzjWAQ6U9WdEboVvFkkp2SpSkUzG0YR38Ijl3vYpfumtJMFBLvFkPrEkjEbo7UF",
        ];
        const LongReactNode = [
          <ul key="1234">
            <li>{OneHundredTwentyFiveCharStrings[0]}</li>
            <li>{OneHundredTwentyFiveCharStrings[1]}</li>
            <li>{OneHundredTwentyFiveCharStrings[2]}</li>
            <li>{OneHundredTwentyFiveCharStrings[3]}</li>
            <li>{OneHundredTwentyFiveCharStrings[4]}</li>
          </ul>,
          "this is more text",
        ];

        render(<DataDisplay item={{ title: "field", value: LongReactNode }} />);

        await user.click(screen.getByText("View more"));

        OneHundredTwentyFiveCharStrings.forEach((str) =>
          expect(screen.getByText(str)).toBeInTheDocument(),
        );
        expect(screen.getByText("this is more text")).toBeInTheDocument();
        expect(screen.getByText("View less")).toBeInTheDocument();
      });
      it("should only show first 300 characters when ReactNode element when view less is clicked", async () => {
        const user = userEvent.setup();
        const OneHundredTwentyFiveCharStrings = [
          "gFuhsHGaiecclYWTrp7EvwBAr2JAhfN9Kv09RtBbj4QevWU1FolfXZJBWPgW6LCTUaDaiYMiHDOhNXrIeqn1ICE7fBHTRY1Gq8f5f9g9oAyCKwf2uluoe8nDzXJmV",
          "pHW6mej26PNCPI1GRAkq7ForT93tNROGU4D4FE8fJETXar1hLVCZXGSQRZBDwBOtXCK0jT7LxtNedMAt4RxLFsM23KpFpvx7ke3EfOOBBOeyulFcXqZaonYkObOv9",
          "KCu7m7fYs5Jw2IeNf9PtmVHmNJakfdwu19783oUXwHcm9gUAMnQ5FQEgnsfCLy1r79Fx4hQhLm8rdz4sA4cMMD6r8Cpsgt9KsImZRNH2RC5BRgb6cMsGAfOTb8Kri",
          "qWF7VqoRKetCfdzvRupMCtFNrwZBJb2NEReYStddzm4GGOADg6m5nhgC0goXgzB3GKVIp6qY60aOmyjPnyH2OrAZszdmnthkh6DwI4VROKwPTKbGJorQTy3B8oi8p",
          "C35z0HsExV59WKHHsBgupEXcHnxyp4rtlfmhWA067Go52PJvzeNgoKU4h27JWobzjWAQ6U9WdEboVvFkkp2SpSkUzG0YR38Ijl3vYpfumtJMFBLvFkPrEkjEbo7UF",
        ];
        const FiveHundredOneChars = [
          <ul key="1234">
            <li>{OneHundredTwentyFiveCharStrings[0]}</li>
            <li>{OneHundredTwentyFiveCharStrings[1]}</li>
            <li>{OneHundredTwentyFiveCharStrings[2]}</li>
            <li>{OneHundredTwentyFiveCharStrings[3]}</li>
            <li>{OneHundredTwentyFiveCharStrings[4]}</li>
          </ul>,
          "this is more text",
        ];

        render(
          <DataDisplay item={{ title: "field", value: FiveHundredOneChars }} />,
        );
        await user.click(screen.getByText("View more"));
        await user.click(screen.getByText("View less"));

        expect(
          screen.getByText(OneHundredTwentyFiveCharStrings[0]),
        ).toBeInTheDocument();
        expect(
          screen.getByText(OneHundredTwentyFiveCharStrings[1]),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            OneHundredTwentyFiveCharStrings[2].substring(0, 50) + "...",
          ),
        ).toBeInTheDocument();
        expect(screen.getByText("View more")).toBeInTheDocument();
        expect(
          screen.queryByText(OneHundredTwentyFiveCharStrings[2].substring(50)),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(OneHundredTwentyFiveCharStrings[3]),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText(OneHundredTwentyFiveCharStrings[4]),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("ToolTips", () => {
    it("should return the tool tip with the custom jsx", () => {
      render(
        <Tooltip label="test label" asCustom={TooltipDiv} className="testClass">
          Test child
        </Tooltip>,
      );
      const tip = screen.getByTestId("triggerElement");
      expect(tip.className).toInclude("testClass");
      expect(tip.textContent).toInclude("Test child");
    });
    it("should make a tooltip", () => {
      render(<ToolTipElement toolTip="Tooltip">Item Title</ToolTipElement>);
      const tip = screen.getByTestId("triggerElement");
      expect(tip.className).toInclude("short-tooltip");
      expect(tip.textContent).toInclude("Item Title");
    });
    it("should not make the tool tip short if the tip has more than 100 character", () => {
      const toolTip =
        "1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890";
      render(<ToolTipElement toolTip={toolTip}>Item Title</ToolTipElement>);
      const tip = screen.getByTestId("triggerElement");
      expect(tip.className).not.toInclude("short-tooltip");
    });
  });
});
