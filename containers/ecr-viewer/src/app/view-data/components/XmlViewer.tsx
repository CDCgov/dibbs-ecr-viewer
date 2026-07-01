"use client";

import { useState } from "react";
import XMLViewer from "react-xml-viewer";

import { EcrXmls } from "@/app/view-data/services/xmlService";

type TabId = "ecr" | "rr";

const tabConfig: { id: TabId; label: string }[] = [
  { id: "ecr", label: "eICR XML" },
  { id: "rr", label: "RR XML" },
];

interface XmlViewerProps {
  children: React.ReactNode;
  sideNav: React.ReactNode;
  ecrId?: string;
}

const XmlViewer = ({ children, sideNav, ecrId }: XmlViewerProps) => {
  const xmlApiUrl = ecrId
    ? `${process.env.BASE_PATH}/api/view-xml?id=${ecrId}`
    : undefined;
  const [showXml, setShowXml] = useState(false);
  const [xmls, setXmls] = useState<EcrXmls | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("ecr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const openXml = async () => {
    if (!xmls) {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(xmlApiUrl!);
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error("view-xml failed", res.status, body);
          throw new Error();
        }
        const data: EcrXmls = await res.json();
        setXmls(data);
        setActiveTab(data.ecrXml ? "ecr" : "rr");
      } catch {
        setError(true);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setShowXml(true);
  };

  const xmlMap: Record<TabId, string | null> = {
    ecr: xmls?.ecrXml ?? null,
    rr: xmls?.rrXml ?? null,
  };
  const availableTabs = xmls
    ? tabConfig.filter(({ id }) => xmlMap[id] !== null)
    : [];

  return (
    <>
      {!showXml && sideNav}
      <div className="ecr-viewer-container">
        {!showXml && (
          <>
            <div className="margin-bottom-3">
              <div className="display-flex flex-align-center margin-top-3">
                <h2
                  className="margin-bottom-05 margin-top-0 margin-right-auto"
                  id="ecr-summary"
                >
                  eCR Summary
                </h2>
                {xmlApiUrl && (
                  <button
                    onClick={openXml}
                    disabled={loading}
                    className="usa-button usa-button--outline usa-button--small text-primary"
                  >
                    {loading ? "Loading..." : "View XML"}
                  </button>
                )}
              </div>
              <div className="text-base-darker line-height-sans-5">
                Provides key info upfront to help you understand the eCR at a
                glance
              </div>
            </div>
            {children}
          </>
        )}

        {showXml && (
          <>
            <div className="display-flex flex-align-center margin-top-3 margin-bottom-2">
              <button
                className="usa-button--unstyled text-primary font-sans-sm"
                onClick={() => setShowXml(false)}
              >
                ← Back to eCR
              </button>
            </div>

            {availableTabs.length >= 1 && (
              <div
                role="tablist"
                className="display-flex border-bottom border-base-light"
              >
                {availableTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    aria-controls={`panel-${id}`}
                    onClick={() => setActiveTab(id)}
                    className={`usa-button--unstyled padding-x-3 padding-y-105 font-sans-sm text-no-underline border-bottom-05 ${
                      activeTab === id
                        ? "border-primary text-primary"
                        : "border-transparent text-base"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {availableTabs.map(({ id }) => (
              <div
                key={id}
                id={`panel-${id}`}
                role="tabpanel"
                hidden={activeTab !== id}
                className="overflow-auto margin-top-2"
                style={{ maxHeight: "calc(100vh - 160px)" }}
              >
                <XMLViewer xml={xmlMap[id] ?? ""} collapsible showLineNumbers />
              </div>
            ))}
          </>
        )}

        {error && !showXml && (
          <div className="usa-alert usa-alert--error margin-top-2">
            <div className="usa-alert__body">
              <p className="usa-alert__text">
                Failed to load XML. Please try again.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default XmlViewer;
