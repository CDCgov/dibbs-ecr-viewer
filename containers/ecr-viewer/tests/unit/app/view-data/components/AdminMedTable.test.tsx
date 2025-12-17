import { render, screen } from "@testing-library/react";

import { AdministeredMedication } from "@/app/view-data/components/AdministeredMedication";

describe("AdminMedTable", () => {
  it("should not render anything if there is no administered medications", () => {
    render(<AdministeredMedication medicationData={[]} />);

    expect(
      screen.queryByText("Administered Medications"),
    ).not.toBeInTheDocument();
  });

  it("should render administered medications", () => {
    render(
      <AdministeredMedication
        medicationData={[
          {
            name: "aspirin tablet",
            date: "09/29/2022",
            dose: "325 mg",
            route: "Intravenous",
            therapeuticResponse: "Improved condition",
          },
          {
            name: "aleve tablet",
            date: "09/29/2022 4:53",
            dose: "250 mg",
          },
        ]}
      />,
    );

    expect(screen.getByText("aspirin tablet")).toBeVisible();
    expect(screen.getByText("325 mg")).toBeVisible();
    expect(screen.getByText("09/29/2022")).toBeVisible();
    expect(screen.getByText("Intravenous")).toBeVisible();
    expect(screen.getByText("Improved condition")).toBeVisible();

    expect(screen.getByText("aleve tablet")).toBeVisible();
    expect(screen.getByText("250 mg")).toBeVisible();
    expect(screen.getByText("09/29/2022 4:53 AM")).toBeVisible();
    expect(screen.getAllByText("No data")).toBeArrayOfSize(2);
  });
});
