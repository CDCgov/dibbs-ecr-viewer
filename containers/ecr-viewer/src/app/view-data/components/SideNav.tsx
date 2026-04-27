"use client";
import React, { useState, useEffect, useMemo } from "react";

import { SideNav as UswdsSideNav } from "@trussworks/react-uswds";

import { BackButton } from "@/app/components/BackButton";
import { toKebabCase } from "@/app/utils/format-utils";

import { SideNavLoadingSkeleton } from "./LoadingComponent";
import { EcrDocumentNavConfig } from "./EcrDocument/accordion-items";

export class SectionConfig {
  title: string;
  id: string;
  subNavItems?: SectionConfig[];

  constructor(title: string, subNavItems?: string[] | SectionConfig[]) {
    this.title = title;
    this.id = toKebabCase(title);

    if (subNavItems) {
      this.subNavItems = subNavItems.map((item) => {
        if (typeof item === "string") {
          return new SectionConfig(item);
        } else {
          return item;
        }
      });
    }
  }
}

const headingSelector =
  "h2:not([id^='unavailable-']):not(.side-nav-ignore), h3:not([id^='unavailable-']):not(.side-nav-ignore), h4:not([id^='unavailable-']):not(.side-nav-ignore)";

/**
 * Functional component for the side navigation.
 * @returns The JSX element representing the side navigation.
 */
const SideNav: React.FC<{
  ecrDocumentNavConfig: EcrDocumentNavConfig[];
}> = ({ ecrDocumentNavConfig }) => {
  const sectionConfigs: SectionConfig[] = useMemo(
    () => [
      new SectionConfig("eCR Summary"),
      new SectionConfig(
        "eCR Document",
        ecrDocumentNavConfig.map(
          (item) => new SectionConfig(item.title, item.subNavItems)
        )
      ),
    ],
    [ecrDocumentNavConfig]
  );
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (sectionConfigs.length === 0) return;

    const oneRem = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    const topOffset = 5 * oneRem;

    const validIds = new Set(
      (function flatten(items: SectionConfig[]): string[] {
        return items.flatMap(({ id, subNavItems }) => [
          id,
          ...flatten(subNavItems || []),
        ]);
      })(sectionConfigs)
    );

    // Intersection Observer: sets section in view as active section
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-sectionid") || null;
            if (id) {
              setActiveSection(id);
              break;
            }
          }
        }
      },
      {
        root: null,
        rootMargin: `-${topOffset}px 0px -${
          window.innerHeight - topOffset - 1
        }px 0px`,
        threshold: 0,
      }
    );
    const observedIds = new Set<string>();

    // Adds intersection observer to each heading section
    // Runs on initial load & when the DOM changes
    const tagAndObserve = () => {
      const headingElements = Array.from(
        document.querySelector("main")?.querySelectorAll(headingSelector) || []
      ) as HTMLElement[];

      headingElements.forEach((heading) => {
        const text = heading.textContent;
        const sectionId = text ? toKebabCase(text) : null;

        if (sectionId && validIds.has(sectionId)) {
          heading.setAttribute("data-sectionid", sectionId);

          if (!observedIds.has(sectionId)) {
            observedIds.add(sectionId);
            intersectionObserver.observe(heading);
          }
        }
      });

      return headingElements.filter((el) => el.getAttribute("data-sectionid"));
    };

    // Set initial active section
    const tagged = tagAndObserve();
    const initialActive = [...tagged]
      .reverse()
      .find((el) => el.getBoundingClientRect().top <= topOffset);
    setActiveSection(
      initialActive?.getAttribute("data-sectionid") ??
        tagged[0]?.getAttribute("data-sectionid") ??
        ""
    );

    // Mutation Observer: Watch for DOM changes (sections render after expand)
    const mutationObserver = new MutationObserver(() => {
      tagAndObserve();
    });
    mutationObserver.observe(document.querySelector("main") || document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [sectionConfigs]);

  /**
   * Constructs a side navigation menu as an array of React nodes based on the provided section configurations.
   * @param sectionConfigs - An array of `SectionConfig` objects that describe the sections
   *   and potential sub-sections of the side navigation. Each `SectionConfig`
   *   should have an `id` for linking, a `title` for display, and may have
   *   `subNavItems` for nested navigation structures.
   * @returns An array of React nodes representing the side navigation items, including any
   *   nested sub-navigation items. These nodes are ready to be rendered in a React
   *   component to display the side navigation.
   */
  function buildSideNav(sectionConfigs: SectionConfig[]) {
    const sideNavItems: React.ReactNode[] = [];
    for (const section of sectionConfigs) {
      const sideNavItem = (
        <a
          key={section.id}
          href={"#" + section.id}
          className={activeSection === section.id ? "usa-current" : ""}
          data-testid="sidenav-link"
        >
          {section.title}
        </a>
      );
      sideNavItems.push(sideNavItem);

      if (section.subNavItems) {
        const subSideNavItems = buildSideNav(section.subNavItems);
        sideNavItems.push(
          <UswdsSideNav isSubnav={true} items={subSideNavItems} />
        );
      }
    }

    return sideNavItems;
  }

  const sideNavItems = buildSideNav(sectionConfigs);

  // Add a separate loading state here as the side nav is much slower than the main content
  return sectionConfigs.length === 0 ? (
    <SideNavLoadingSkeleton />
  ) : (
    <nav className="nav-wrapper">
      <BackButton className="margin-bottom-3" iconClassName="text-base" />
      <UswdsSideNav items={sideNavItems} />
    </nav>
  );
};

export default SideNav;
