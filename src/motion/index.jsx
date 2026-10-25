import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import FlexCarousel from "../components/FlexCarousel.jsx";
import CircularCarousel from "../components/CircularCarousel.jsx";
import {
  DEFAULT_SPECULAR_BUTTON_PROPS,
  SpecularButton,
} from "../components/SpecularButton.jsx";

const h = React.createElement;
const roots = new WeakMap();
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function FoldText({
  text,
  foldStyle = "paper",
  splitBy = "char",
  hinge = "top",
  duration = 0.72,
  stagger = 0.035,
  ease = "power3.out",
  perspective = 850,
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const panels = ref.current?.querySelectorAll(".fold-text__panel");
    if (!panels?.length) return undefined;
    if (reducedMotion()) {
      gsap.set(panels, { clearProps: "all", opacity: 1 });
      return undefined;
    }
    const origin = hinge === "bottom" ? "50% 100%" : "50% 0%";
    const timeline = gsap.timeline({ defaults: { ease } });
    timeline.fromTo(
      panels,
      {
        rotationX: hinge === "bottom" ? 88 : -88,
        y: hinge === "bottom" ? 8 : -8,
        opacity: 0.18,
        transformPerspective: perspective,
        transformOrigin: origin,
        filter: "brightness(0.55)",
      },
      {
        rotationX: 0,
        y: 0,
        opacity: 1,
        filter: "brightness(1)",
        duration,
        stagger,
        clearProps: "filter",
      },
    );
    return () => timeline.kill();
  }, [duration, ease, hinge, perspective, stagger, text]);

  const lines = String(text || "").split("\n");
  const children = lines.flatMap((line, lineIndex) => {
    const content = line.split(/(\s+)/).map((part, partIndex) => {
      const key = `line-${lineIndex}-${partIndex}`;
      if (!part.trim()) {
        return h(
          "span",
          { className: "fold-text__space", key, "aria-hidden": true },
          "\u00a0",
        );
      }
      if (splitBy === "word") {
        return h(
          "span",
          {
            className: "fold-text__panel",
            key,
            "aria-hidden": true,
          },
          part,
        );
      }
      return h(
        "span",
        {
          className: "fold-text__word",
          key,
          "aria-hidden": true,
        },
        Array.from(part).map((character, index) =>
          h(
            "span",
            {
              className: "fold-text__panel",
              key: `${index}-${character}`,
            },
            character,
          ),
        ),
      );
    });
    if (lineIndex < lines.length - 1) {
      content.push(
        h("br", {
          key: `line-break-${lineIndex}`,
          "aria-hidden": true,
        }),
      );
    }
    return content;
  });

  return h(
    "span",
    {
      ref,
      className: `fold-text fold-text--${foldStyle} ${className}`.trim(),
      "aria-label": String(text || "").replace(/\n/g, " "),
      role: "text",
    },
    children,
  );
}

function getFoldTextWithBreaks(element) {
  const read = (node) =>
    Array.from(node.childNodes)
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.textContent;
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "BR") {
          return "\n";
        }
        return read(child);
      })
      .join("");
  return read(element)
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .join("\n")
    .trim();
}

function mountFoldText(headings = document) {
  headings.querySelectorAll?.("[data-fold-text]").forEach((target) => {
    if (target.dataset.foldMounted) return;
    const text = getFoldTextWithBreaks(target);
    if (!text) return;
    target.dataset.foldMounted = "true";
    const root = createRoot(target);
    roots.set(target, root);
    root.render(
      h(FoldText, {
        text,
        foldStyle: "paper",
        splitBy: "char",
        hinge: "top",
        ease: "power3.out",
        perspective: 850,
        stagger: 0.026,
      }),
    );
  });
}

let specularLayerRoot;
function mountSpecularButtons() {
  if (specularLayerRoot || !document.body) return;
  const host = document.createElement("div");
  host.hidden = true;
  host.dataset.specularReactLayer = "true";
  document.body.appendChild(host);
  specularLayerRoot = createRoot(host);
  specularLayerRoot.render(
    h(SpecularButton, {
      enhanceAll: true,
      ...DEFAULT_SPECULAR_BUTTON_PROPS,
    }),
  );
}

function installMotion() {
  mountFoldText(document);
  mountSpecularButtons();
  const observer = new MutationObserver((records) => {
    records.forEach((record) =>
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) mountFoldText(node);
      }),
    );
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installMotion, { once: true });
} else {
  installMotion();
}

window.AuraMotion = {
  FoldText,
  SpecularButton,
  defaultSpecularButtonProps: DEFAULT_SPECULAR_BUTTON_PROPS,
  FlexCarousel,
  CircularCarousel,
  renderFlexCarousel(target, items, options = {}) {
    if (!target) return;
    let root = roots.get(target);
    if (!root) {
      root = createRoot(target);
      roots.set(target, root);
    }
    root.render(h(FlexCarousel, { items, ...options }));
  },
  renderCircularCarousel(target, items, options = {}) {
    if (!target) return;
    let root = roots.get(target);
    if (!root) {
      root = createRoot(target);
      roots.set(target, root);
    }
    root.render(h(CircularCarousel, { items, ...options }));
  },
};
