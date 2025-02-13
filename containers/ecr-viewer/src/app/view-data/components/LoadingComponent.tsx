import {
  Accordion,
  Grid,
  GridContainer,
  SideNav,
} from "@trussworks/react-uswds";
import { ExpandCollapseButtons } from "./ExpandCollapseButtons";
import { AccordionSection, AccordionSubSection } from "../component-utils";
import classNames from "classnames";
import { BackButton } from "./BackButton";
import React from "react";
import { range } from "../../utils/data-utils";
import { env } from "next-runtime-env";
import { ECRViewerLayout } from "./ECRViewerLayout";

/**
 * Renders the loading blobs in gray or in blue
 * @param props - Props for the component.
 * @param [props.numberOfRows] - number of rows to render
 * @param [props.themeColor] - Color to use for theming (default="gray")
 * @returns Rows of blobs.
 */
const LoadingBlobs = ({
  numberOfRows,
  themeColor = "gray",
}: {
  numberOfRows: number;
  themeColor?: string;
}) => {
  const loadingBlobStyle = `loading-blob-${themeColor}`;
  const sectionLineStyle = `section__line_${themeColor}`;

  return (
    <div>
      {range(numberOfRows).map((_, index) => (
        <div key={index}>
          <div className="grid-row">
            <div className="grid-col-4">
              <div
                className={`${loadingBlobStyle} margin-right-1 loading-blob`}
              >
                &nbsp;
              </div>
            </div>
            <div className={`loading-blob grid-col-8 ${loadingBlobStyle}`}>
              &nbsp;
            </div>
          </div>
          {numberOfRows > 1 && <div className={`${sectionLineStyle}`}></div>}
        </div>
      ))}
    </div>
  );
};

const SideNavLoadingItems = () => {
  const loadingBlobStyle = "loading-blob-gray";

  return (
    <a>
      <div className="grid-row">
        <div
          className={`loading-blob grid-col-8 ${loadingBlobStyle} width-full`}
        >
          &nbsp;
        </div>
      </div>
    </a>
  );
};

/**
 * Side nav loading blobs
 * @returns Loading blobs for the sid nave
 */
export const SideNavLoadingSkeleton = () => {
  const isNonIntegratedViewer =
    env("NEXT_PUBLIC_NON_INTEGRATED_VIEWER") === "true";

  const sideNavLoadingItems = [
    <a>eCR Summary</a>,
    <a>eCR Document</a>,
    <SideNav
      items={[
        "Patient Info",
        "Clinical Info",
        "Lab Info",
        "eCR Metadata",
        "Unavailable Info",
      ].flatMap((title) => [
        <a>{title}</a>,
        <SideNav items={[<SideNavLoadingItems />]} isSubnav={true}></SideNav>,
      ])}
      isSubnav={true}
    />,
  ];

  return (
    <nav
      className={classNames("nav-wrapper", {
        "top-0": !isNonIntegratedViewer,
        "top-550": isNonIntegratedViewer,
      })}
    >
      <BackButton className="margin-bottom-3" iconClassName="text-base" />
      <SideNav items={sideNavLoadingItems} />
    </nav>
  );
};
/**
 * Renders ECR Summary of the loading state
 * @returns A JSX component with rows of blobs.
 */
const EcrSummaryLoadingSkeleton = () => {
  return (
    <div className={"info-container"}>
      <div
        className="usa-summary-box padding-x-3 padding-y-0"
        aria-labelledby="summary-box-key-information"
      >
        <h3 className="summary-box-key-information side-nav-ignore font-sans-lg">
          Patient Summary
        </h3>
        <LoadingBlobs numberOfRows={4} themeColor="blue" />
        <h3 className="summary-box-key-information side-nav-ignore font-sans-lg">
          Encounter Summary
        </h3>
        <LoadingBlobs numberOfRows={4} themeColor="blue" />
        <h3 className="summary-box-key-information side-nav-ignore font-sans-lg">
          Condition Summary
        </h3>
        <LoadingBlobs numberOfRows={4} themeColor="blue" />
      </div>
    </div>
  );
};

const EcrDocumentFiller = ({
  title,
  numberOfRows,
}: {
  title: string;
  numberOfRows: number;
}) => {
  return (
    <AccordionSection>
      <AccordionSubSection title={title}>
        <LoadingBlobs numberOfRows={numberOfRows} />
      </AccordionSubSection>
    </AccordionSection>
  );
};

/**
 * Renders Accordion of the loading state
 * @returns A JSX component with rows of blobs.
 */
const AccordionLoadingSkeleton = () => {
  const accordionItems: any[] = [
    {
      title: "Patient Info",
      expanded: true,
      content: (
        <>
          <EcrDocumentFiller title="Demographics" numberOfRows={10} />
          <EcrDocumentFiller title="Social History" numberOfRows={3} />
        </>
      ),
      headingLevel: "h3",
    },
    {
      title: "Encounter Info",
      expanded: true,
      content: (
        <>
          <EcrDocumentFiller title="Encounter Details" numberOfRows={7} />
          <EcrDocumentFiller title="Provider Details" numberOfRows={2} />
        </>
      ),
      headingLevel: "h3",
    },
    {
      title: "Clinical Info",
      expanded: true,
      content: (
        <>
          <EcrDocumentFiller title="Symptoms and Problems" numberOfRows={3} />
          <EcrDocumentFiller title="Treatment Details" numberOfRows={4} />
          <EcrDocumentFiller title="Immunizations" numberOfRows={1} />
          <EcrDocumentFiller
            title="Diagnostic and Vital Signs"
            numberOfRows={2}
          />
        </>
      ),
      headingLevel: "h3",
    },
    {
      title: "Lab Info",
      expanded: true,
      content: <EcrDocumentFiller title="Lab Results from" numberOfRows={4} />,
      headingLevel: "h3",
    },
    {
      title: "eCR Metadata",
      expanded: true,
      content: (
        <>
          <EcrDocumentFiller title="RR Details" numberOfRows={1} />
          <EcrDocumentFiller title="eICR Details" numberOfRows={5} />
          <EcrDocumentFiller title="eICR Custodian Details" numberOfRows={4} />
        </>
      ),
      headingLevel: "h3",
    },
    {
      title: "Unavailable Info",
      expanded: true,
      headingLevel: "h3",
    },
  ];
  return (
    <Accordion
      className="info-container"
      items={accordionItems}
      multiselectable={true}
    />
  );
};

/**
 * Creates the loading skeleton for the main ecr page
 * @returns ECR page loading skeleton
 */
export const EcrLoadingSkeleton = () => {
  return (
    <ECRViewerLayout>
      <div>
        <SideNavLoadingSkeleton />
      </div>
      <div className={"ecr-viewer-container"}>
        <div className="margin-bottom-3">
          <h2 className="margin-bottom-05 margin-top-3" id="ecr-summary">
            eCR Summary
          </h2>
          <div className="text-base-darker line-height-sans-5">
            Provides key info upfront to help you understand the eCR at a glance
          </div>
        </div>
        <EcrSummaryLoadingSkeleton />
        <div className="margin-top-10">
          <GridContainer className={"padding-0 margin-bottom-3 maxw-none"}>
            <Grid row className="margin-bottom-05">
              <Grid>
                <h2 className="margin-bottom-0" id="ecr-document">
                  eCR Document
                </h2>
              </Grid>
              <Grid className={"flex-align-self-center margin-left-auto"}>
                <ExpandCollapseButtons
                  id={"main"}
                  buttonSelector={"h3 > .usa-accordion__button"}
                  accordionSelector={
                    ".info-container > .usa-accordion__content"
                  }
                  expandButtonText={"Expand all sections"}
                  collapseButtonText={"Collapse all sections"}
                />
              </Grid>
            </Grid>
            <div className="text-base-darker line-height-sans-5">
              Displays entire eICR and RR documents to help you dig further into
              eCR data
            </div>
          </GridContainer>
          <AccordionLoadingSkeleton />
        </div>
      </div>
    </ECRViewerLayout>
  );
};
