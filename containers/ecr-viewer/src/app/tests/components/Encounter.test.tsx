import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import EncounterDetails from "../../view-data/components/Encounter";
import React from "react";

describe("Encounter", () => {
  let container: HTMLElement;
  beforeAll(() => {
    const mockChildMethod = jest.fn();
    // This gets the dynamic tooltip IDs to show up as stable "[object Object]"
    jest.spyOn(React, "useRef").mockReturnValue({
      current: {
        childMethod: mockChildMethod,
      },
    });
    const encounterData = [
      {
        title: "Encounter Type",
        value: "Ambulatory",
      },
      {
        title: "Encounter ID",
        value: "123456789",
      },
      {
        title: "Encounter Care Team",
        table: true,
        value: (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Test</td>
                <td>ATND</td>
                <td>Start: 1/2/2023</td>
              </tr>
            </tbody>
          </table>
        ),
      },
    ];
    const facilityData = [
      {
        title: "Facility Name",
        value: "PRM- Palmdale Regional Medical Center",
      },
      {
        title: "Facility Address",
        value:
          "5001 North Mount Washington Circle Drive\nNorth Canton, MA 02740",
      },
      {
        title: "Facility Contact Address",
        value:
          "5001 North Mount Washington Circle Drive\nNorth Canton, MA 02740",
      },
      {
        title: "Facility Type",
        value: "Healthcare Provider",
      },
      {
        title: "Facility ID",
        value: "2.16.840.1.113883.4.6",
      },
    ];
    const providerData = [
      {
        title: "Provider Name",
        value: "test provider name",
      },
      {
        title: "Provider Contact",
        value: "test provider contact",
      },
    ];
    container = render(
      <EncounterDetails
        encounterData={encounterData}
        facilityData={facilityData}
        providerData={providerData}
      />,
    ).container;
  });
  it("should match snapshot", () => {
    expect(container).toMatchSnapshot();
  });
  it("should pass accessibility test", async () => {
    expect(await axe(container)).toHaveNoViolations();
  });
});
