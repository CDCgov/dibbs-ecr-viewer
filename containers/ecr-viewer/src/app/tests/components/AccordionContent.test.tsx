import React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Bundle } from "fhir/r4";
import { loadYamlConfig } from "@/app/api/utils";
import { getEcrDocumentAccordionItems } from "@/app/view-data/components/EcrDocument/accordion-items";
import { EcrDocument } from "@/app/view-data/components/EcrDocument";

const mappings = loadYamlConfig();

describe("Snapshot test for Accordion Content", () => {
  it("Given no data, info message for empty sections should appear", async () => {
    const bundleEmpty: Bundle = {
      resourceType: "Bundle",
      type: "batch",
      entry: [],
    };

    let items = getEcrDocumentAccordionItems(bundleEmpty, mappings);

    let { container } = render(<EcrDocument initialAccordionItems={items} />);

    expect(await axe(container)).toHaveNoViolations();
    container.querySelectorAll("[id], [aria-describedby]").forEach((el) => {
      el.removeAttribute("id");
      el.removeAttribute("aria-describedby");
    });

    // This is an arbitrarily chosen test ID we expect one of the rendered accordion items to have.
    // There is nothing significant about "encounter-info_2" in particular.
    expect(
      screen.getByTestId("accordionButton_encounter-info_2"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("accordionItem_encounter-info_2"),
    ).toBeInTheDocument();

    expect(container).toMatchSnapshot();

    expect(
      screen.getByText("No patient information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No encounter information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No clinical information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No lab information was found in this eCR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No eCR metadata was found in this eCR."),
    ).toBeInTheDocument();
  });
});
