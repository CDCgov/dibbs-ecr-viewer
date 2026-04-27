"use client";
import React, { useState, useEffect, useMemo } from "react";

import { SideNav as UswdsSideNav } from "@trussworks/react-uswds";

import { BackButton } from "@/app/components/BackButton";
import { toKebabCase } from "@/app/utils/format-utils";

import { SideNavLoadingSkeleton } from "./LoadingComponent";
import { SideNavConfig } from "./EcrDocument/accordion-items";

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

// TODO ANGELA: DELETE
interface HeadingObject {
  text: string;
  level: string;
  priority: number;
}
const headingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"];

const headingSelector =
  "h2:not([id^='unavailable-']):not(.side-nav-ignore), h3:not([id^='unavailable-']):not(.side-nav-ignore), h4:not([id^='unavailable-']):not(.side-nav-ignore)";

// TODO ANGELA: DELETE
/**
 * Counts the total number of `SectionConfig` objects within a given array, including those nested
 * within `subNavItems` properties.
 * @param sectionConfigs - An array of `SectionConfig` objects, each potentially containing
 *   a `subNavItems` property with further `SectionConfig` objects.
 * @returns The total count of `SectionConfig` objects within the array, including all nested
 * objects within `subNavItems`.
 */
// export function countObjects(sectionConfigs: SectionConfig[]): number {
//   let count = 0;
//   sectionConfigs.forEach((config) => (count += countRecursively(config, 0)));

//   return count;
// }

// TODO ANGELA: DELETE
/**
 * Recursively counts the number of `SectionConfig` objects, including any nested objects within
 * `subNavItems`.
 * @param config - The `SectionConfig` object to be counted. This object may contain
 *   `subNavItems`, which are also `SectionConfig` objects and will be recursively counted.
 * @param count - The initial count of `SectionConfig` objects. Typically starts at 0 and
 *   increments as the function processes each item and its `subNavItems`.
 * @returns The total count of `SectionConfig` objects, including all nested `subNavItems`.
 */
// function countRecursively(config: SectionConfig, count: number): number {
//   count += 1;
//   if (config.subNavItems) {
//     config.subNavItems.forEach(
//       (subHead) => (count += countRecursively(subHead, 0)),
//     );
//   }
//   return count;
// }

// TODO ANGELA: DELETE
/**
 * Sorts an array of `HeadingObject` instances into a structured array of `SectionConfig` objects.
 * The sorting is based on the `priority` property of each heading, arranging them into a hierarchy
 * where headings of lower priority become nested within those of higher priority. This function
 * recursively processes headings to construct a nested structure, encapsulated as `SectionConfig`
 * instances, which may contain other `SectionConfig` objects as nested sections.
 *
 * The function evaluates each heading in sequence and determines its placement in the result based
 * on its priority relative to subsequent headings. Headings with the same priority are placed at the
 * same level, while a heading with a lower priority than its predecessor is nested within the previous
 * heading's section.
 * @param headings - An array of heading objects to be sorted. Each `HeadingObject`
 *   must have a `text` property for the section title and a
 *   `priority` property that determines the heading's hierarchical level.
 * @returns An array of `SectionConfig` objects representing the structured hierarchy
 *   of headings. Each `SectionConfig` may contain nested `SectionConfig` objects
 *   if the original headings array indicated a nested structure based on priorities.
 */
// export const sortHeadings = (headings: HeadingObject[]): SectionConfig[] => {
//   const result: SectionConfig[] = [];
//   let headingIndex = 0;
//   while (headingIndex < headings.length) {
//     const currentHeading = headings[headingIndex];
//     const nextHeadings = headings.slice(headingIndex + 1);
//     if (
//       nextHeadings.length > 0 &&
//       nextHeadings[0].priority > currentHeading.priority
//     ) {
//       const nestedResult = sortHeadings(nextHeadings);
//       result.push(new SectionConfig(currentHeading.text, nestedResult));
//       const nestedLength = countObjects(nestedResult);
//       headingIndex += nestedLength + 1;
//     } else if (
//       nextHeadings.length > 0 &&
//       nextHeadings[0].priority === currentHeading.priority
//     ) {
//       result.push(new SectionConfig(currentHeading.text));
//       headingIndex++;
//     } else if (
//       nextHeadings.length > 0 &&
//       nextHeadings[0].priority < currentHeading.priority
//     ) {
//       result.push(new SectionConfig(currentHeading.text));
//       headingIndex += headings.length + 1;
//     } else {
//       result.push(new SectionConfig(currentHeading.text));
//       headingIndex++;
//     }
//   }
//   return result;
// };

/**
 * Functional component for the side navigation.
 * @returns The JSX element representing the side navigation.
 */
const SideNav: React.FC<{
  sideNavConfig: SideNavConfig[];
}> = ({ sideNavConfig }) => {
  const sectionConfigs: SectionConfig[] = useMemo(
    () => [
      new SectionConfig("eCR Summary"),
      new SectionConfig(
        "eCR Document",
        sideNavConfig.map(
          (item) => new SectionConfig(item.title, item.subNavItems)
        )
      ),
    ],
    [sideNavConfig]
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
        document.querySelector("main")?.querySelectorAll(headingSelector) ||
          []
      ) as HTMLElement[];
      console.log(sectionConfigs);

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
    }
    
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
    mutationObserver.observe(
      document.querySelector("main") || document.body,
      { childList: true, subtree: true }
    );

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
