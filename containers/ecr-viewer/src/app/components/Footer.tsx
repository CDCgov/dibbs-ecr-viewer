import Image from "next/image";

/**
 * Footer component for the ECR Viewer.
 * This component renders the footer section of the application. It uses USWDS (U.S. Web Design System)
 * classes for styling with some customization.
 * @returns The footer section of the application.
 */
const Footer: React.FC = () => (
  <footer className="usa-footer usa-footer--slim">
    <div className="footer-content display-flex flex-justify flex-align-center">
      <div className="flex-shrink-0">
        <Image
          src="/ecr-viewer/cdc-logo.png"
          alt="Centers for Disease Control and Prevention Logo"
          width={206}
          height={48}
        />
      </div>
      <p className="margin-left-2">
        For more information about this solution, send us an email at{" "}
        <a href="mailto:dibbs@cdc.gov">dibbs@cdc.gov</a>
      </p>
    </div>
  </footer>
);

export default Footer;
