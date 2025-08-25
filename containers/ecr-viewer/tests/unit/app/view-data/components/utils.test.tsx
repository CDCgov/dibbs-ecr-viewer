import React from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "@trussworks/react-uswds";
import { Bundle } from "fhir/r4";

import BundleNoActiveProblems from "@/../../../test-data/fhir/BundleNoActiveProblems.json";
import { evaluateAll } from "@/app/utils/evaluate";
import fhirPathMappings from "@/app/utils/evaluate/fhir-paths";
import { DataDisplay } from "@/app/view-data/components/DataDisplay";
import { FieldValue } from "@/app/view-data/components/FieldValue";
import {
  TooltipDiv,
  ToolTipElement,
} from "@/app/view-data/components/ToolTipElement";
import { returnProblemsTable } from "@/app/view-data/components/common";

describe("Utils", () => {
  describe("Render Active Problem table", () => {
    it("should return empty if active problem name is undefined", () => {
      const actual = returnProblemsTable(
        BundleNoActiveProblems as unknown as Bundle,
        evaluateAll(
          BundleNoActiveProblems as unknown as Bundle,
          fhirPathMappings.activeProblems,
        ),
      );

      expect(actual).toBeUndefined();
    });
  });

  describe("FieldValue", () => {
    describe("string value", () => {
      it("should display text up to 500 characters", () => {
        const FiveHundredChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz";
        expect(FiveHundredChars).toHaveLength(500);

        render(<FieldValue>{FiveHundredChars}</FieldValue>);

        expect(screen.getByText(FiveHundredChars)).toBeInTheDocument();
      });
      it("should only show first 300 characters when full string is greater than 500 characters", () => {
        const FiveHundredOneChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz1";
        expect(FiveHundredOneChars).toHaveLength(501);

        render(<FieldValue>{FiveHundredOneChars}</FieldValue>);

        expect(
          screen.getByText(FiveHundredOneChars.substring(0, 300) + "..."),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(FiveHundredOneChars.substring(300)),
        ).not.toBeInTheDocument();
      });
      it("should show full text when view more is clicked", async () => {
        const user = userEvent.setup();
        const FiveHundredOneChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz1";
        expect(FiveHundredOneChars).toHaveLength(501);

        render(<FieldValue>{FiveHundredOneChars}</FieldValue>);

        await user.click(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        );

        expect(screen.getByText(FiveHundredOneChars)).toBeInTheDocument();
        expect(
          screen.getByText(/View less \([0-9,]+ characters total\)/),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/View more \([0-9,]+ characters total\)/),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("...")).not.toBeInTheDocument();
      });
      it("should hide text when view less is clicked", async () => {
        const user = userEvent.setup();
        const FiveHundredOneChars =
          "xVP5yPfQAbNOFOOl8Vi1ytfcQ39Cz0dl73SBMj6xQHuCwRRO1FmS7v5wqD55U914tsDfqTtsEQ0mISsLoiMZbco4iwb2xU3nNL6YAneY0tMqsJdb55JWHSI2uqyuuwIvjjZY5Jl9vIda6lLoYke3ywsQFR6nlEFCipJMF9vA9OQqkZljCYirZJu4kZTENk6V1Yirwuzw9L6uV3avK6VhMK6o8qZbxLkDFnMgjzx8kf25tz98mU5m6Rp8zNcY2cf02xA2aV27WfeWvy5TS73SzJK8a9cFZxCe5xsHtAkVqNa4UzGINwt6i2mLN4kuGgmk7GZGoMaOcNyaOr80TfgpWVjqLMobAXvjv1JHBXLXHczFG8jKQtU3U3FoAxTu39CPcjuq43BWsNej1inbzexa7e9njXZUvZGa3z5Nep4vlrQQtV8F5jZFGHvdlhLr1ZdRJE8sAQEi9nWHviYHSYCVR1ijVNtcHVj9JKkJZ5FAn1a9hDFVq2Tz1";
        expect(FiveHundredOneChars).toHaveLength(501);

        render(<FieldValue>{FiveHundredOneChars}</FieldValue>);

        await user.click(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        );
        expect(screen.getByText(FiveHundredOneChars)).toBeInTheDocument();

        await user.click(
          screen.getByText(/View less \([0-9,]+ characters total\)/),
        );

        expect(
          screen.getByText(FiveHundredOneChars.substring(0, 300) + "..."),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        ).toBeInTheDocument();
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
        expect(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        ).toBeInTheDocument();
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

        await user.click(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        );

        OneHundredTwentyFiveCharStrings.forEach((str) =>
          expect(screen.getByText(str)).toBeInTheDocument(),
        );
        expect(screen.getByText("this is more text")).toBeInTheDocument();
        expect(
          screen.getByText(/View less \([0-9,]+ characters total\)/),
        ).toBeInTheDocument();
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
        await user.click(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        );
        await user.click(
          screen.getByText(/View less \([0-9,]+ characters total\)/),
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
        expect(
          screen.getByText(/View more \([0-9,]+ characters total\)/),
        ).toBeInTheDocument();
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
      expect(screen.getByText("Item Title")).toBeVisible();
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
