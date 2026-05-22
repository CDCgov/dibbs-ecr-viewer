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
 * Builds flat map of child ID -> parent ID from the SectonConfig tree.
 * Determines which section needs to be expanded when a child's
 * heading is collapsed or not yet in the DOM.
 */
function buildParentMap(
  configs: SectionConfig[],
  parentId: string | null = null,
  map: Map<string, string> = new Map(),
): Map<string, string> {
  for (const config of configs) {
    if (parentId !== null) map.set(config.id, parentId);
    if (config.subNavItems) buildParentMap(config.subNavItems, config.id, map);
  }
  return map;
}

/**
 * Walks up the DOM from a heading element looking for an expand <button>
 * at any ancestor level.
 */
function findExpandButton(el: Element): HTMLButtonElement | null {
  // Element has expand button
  const childBtn = el.querySelector(
    "button[aria-expanded]",
  ) as HTMLButtonElement | null;
  if (childBtn) return childBtn;

  // Walk up DOM to look expand button
  let current: Element | null = el;
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (parent) {
      const siblingBtn = Array.from(parent.children).find(
        (child) =>
          child !== current &&
          child.tagName === "BUTTON" &&
          child.hasAttribute("aria-expanded"),
      ) as HTMLButtonElement | undefined;
      if (siblingBtn) return siblingBtn;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Check if element is hidden.
 */
function isHidden(el: Element): boolean {
  const rect = (el as HTMLElement).getBoundingClientRect();
  return (
    (el as HTMLElement).offsetParent === null ||
    (rect.width === 0 && rect.height === 0)
  );
}

/**
 * Scrolls to the heading tagged with the given sectionId.
 */
function scrollToSection(sectionId: string, topOffset: number) {
  const heading = document.querySelector(
    `[data-sectionid="${sectionId}"]`,
  ) as HTMLElement | null;
  if (!heading) return;
  const top = heading.getBoundingClientRect().top + window.scrollY - topOffset;
  window.scrollTo({ top, behavior: "instant" });
}

/**
 * Waits for a heading with the given sectionId to appear in the DOM
 * (i.e. after its parent accordion is expanded), then scrolls to it.
 * Falls back after a timeout if it never appears.
 */
function waitForHeadingThenScroll(sectionId: string, topOffset: number) {
  const TIMEOUT_MS = 2000;
  let settled = false;

  const observer = new MutationObserver(() => {
    const heading = document.querySelector(
      `[data-sectionid="${sectionId}"]`,
    ) as HTMLElement | null;
    if (heading && !isHidden(heading)) {
      settled = true;
      observer.disconnect();
      scrollToSection(sectionId, topOffset);
    }
  });

  observer.observe(document.querySelector("main") || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // Safety valve: disconnect if the heading never appears
  setTimeout(() => {
    if (!settled) observer.disconnect();
  }, TIMEOUT_MS);
}

/**
 * Expands the parent section (if needed) and navigates to the target section.
 *
 * Cases:
 * 1. Heading is in the DOM and visible → scroll immediately.
 * 2. Heading is in the DOM but hidden (parent collapsed) → click expand button, then scroll.
 * 3. Heading is not in the DOM yet (never opened) → find parent heading,
 *    click its expand button, wait for child to render, then scroll.
 */
function expandAndNavigate(
  sectionId: string,
  topOffset: number,
  parentMap: Map<string, string>,
) {
  const heading = document.querySelector(
    `[data-sectionid="${sectionId}"]`,
  ) as HTMLElement | null;

  // Case 1: Heading in DOM & visible - expand accordion if collapsed
  if (heading && !isHidden(heading)) {
    const btn = findExpandButton(heading);
    // If button exists and is not expanded, expand it
    if (btn && btn.getAttribute("aria-expanded") !== "true") {
      btn.click();
      waitForHeadingThenScroll(sectionId, topOffset);
    } else {
      // Already expanded or no button, just scroll
      scrollToSection(sectionId, topOffset);
    }
    return;
  }

  // Case 2: Heading in DOM, but hidden - expand parent accordion if collapsed
  // Wait for expand -> scroll to section
  if (heading && isHidden(heading)) {
    const parentId = parentMap.get(sectionId);
    if (parentId) {
      const parentHeading = document.querySelector(
        `[data-sectionid="${parentId}"]`,
      ) as HTMLElement | null;
      if (parentHeading) {
        const parentBtn = findExpandButton(parentHeading);
        // If parent button exists and is not expanded, expand it first
        if (parentBtn && parentBtn.getAttribute("aria-expanded") !== "true") {
          expandAndNavigate(parentId, topOffset, parentMap);
          waitForHeadingThenScroll(sectionId, topOffset);
          return;
        }
      }
    }

    const btn = findExpandButton(heading);
    if (btn) {
      btn.click();
      waitForHeadingThenScroll(sectionId, topOffset);
    } else {
      scrollToSection(sectionId, topOffset);
    }
    return;
  }

  // Case 3: Heading not in DOM. — find & expand nearest parent in the DOM
  // Wait for render & expand -> scroll to section
  let parentId: string | undefined = parentMap.get(sectionId);
  let parentHeading: HTMLElement | null = null;

  while (parentId) {
    const candidate = document.querySelector(
      `[data-sectionid="${parentId}"]`,
    ) as HTMLElement | null;
    if (candidate && !isHidden(candidate)) {
      parentHeading = candidate;
      break;
    }
    parentId = parentMap.get(parentId);
  }

  if (parentHeading) {
    const btn = findExpandButton(parentHeading);
    if (btn) {
      btn.click();
      waitForHeadingThenScroll(sectionId, topOffset);
    } else {
      scrollToSection(parentId!, topOffset);
    }
  }
}

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
          (item) => new SectionConfig(item.title, item.subNavItems),
        ),
      ),
    ],
    [ecrDocumentNavConfig],
  );

  const topOffset = useMemo(() => {
    return 5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }, []);
  const parentMap = buildParentMap(sectionConfigs);

  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (sectionConfigs.length === 0) return;
    const validIds = new Set(
      (function flatten(items: SectionConfig[]): string[] {
        return items.flatMap(({ id, subNavItems }) => [
          id,
          ...flatten(subNavItems || []),
        ]);
      })(sectionConfigs),
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
      },
    );
    const observedIds = new Set<string>();

    // Adds intersection observer to each heading section
    // Runs on initial load & when the DOM changes
    const tagAndObserve = () => {
      const headingElements = Array.from(
        document.querySelector("main")?.querySelectorAll(headingSelector) || [],
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
        "",
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
   * @param topOffset - Scroll offset to account for fixed header spacing.
   * @returns An array of React nodes representing the side navigation items, including any
   *   nested sub-navigation items. These nodes are ready to be rendered in a React
   *   component to display the side navigation.
   */
  function buildSideNav(sectionConfigs: SectionConfig[], topOffset: number) {
    const sideNavItems: React.ReactNode[] = [];
    for (const section of sectionConfigs) {
      const sideNavItem = (
        <a
          key={section.id}
          href={"#" + section.id}
          className={activeSection === section.id ? "usa-current" : ""}
          data-testid="sidenav-link"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection(section.id); // Set on click; prevents some sections not being tagged as active due to short page height
            expandAndNavigate(section.id, topOffset, parentMap);
          }}
        >
          {section.title}
        </a>
      );
      sideNavItems.push(sideNavItem);

      if (section.subNavItems) {
        const subSideNavItems = buildSideNav(section.subNavItems, topOffset);
        sideNavItems.push(
          <UswdsSideNav isSubnav={true} items={subSideNavItems} />,
        );
      }
    }

    return sideNavItems;
  }

  const sideNavItems = buildSideNav(sectionConfigs, topOffset);

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
