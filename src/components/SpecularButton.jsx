import React, { useEffect, useRef } from "react";

export const DEFAULT_SPECULAR_BUTTON_PROPS = Object.freeze({
  baseColor: "#525252",
  followMouse: true,
  glow: 1,
  idleIntensity: 0.35,
  intensity: 1,
  lineColor: "#ffffff",
  proximity: 250,
  radius: 18,
  shineFade: 34,
  shineSize: 10,
  size: "lg",
  textColor: "#f5f5f5",
  thickness: 1.2,
  tint: "#ffffff",
  tintOpacity: 0.04,
});

const BUTTON_SELECTOR =
  'button, input[type="button"], input[type="submit"], input[type="reset"], a.button, [role="button"]';
const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_follow_mouse;
uniform float u_glow;
uniform float u_idle_intensity;
uniform float u_intensity;
uniform float u_proximity;
uniform float u_radius;
uniform float u_shine_fade;
uniform float u_shine_size;
uniform float u_thickness;
uniform float u_tint_opacity;
uniform float u_flash;
uniform vec3 u_base_color;
uniform vec3 u_line_color;
uniform vec3 u_tint;
out vec4 out_color;
void main() {
  vec2 size = max(u_resolution, vec2(1.0));
  vec2 p = (v_uv - 0.5) * size;
  float r = clamp(u_radius, 0.0, min(size.x, size.y) * 0.5);
  vec2 q = abs(p) - (size * 0.5 - vec2(r));
  float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float edge = 1.0 - smoothstep(0.0, max(1.25, u_thickness * 2.1), abs(sdf));
  vec2 mouse = u_mouse - size * 0.5;
  float distanceToPointer = length(mouse);
  float proximity = u_follow_mouse > 0.5
    ? max(0.0, 1.0 - distanceToPointer / max(1.0, u_proximity))
    : 0.0;
  float pointAngle = atan(mouse.y, mouse.x);
  float pixelAngle = atan(p.y, p.x);
  float delta = atan(sin(pixelAngle - pointAngle), cos(pixelAngle - pointAngle));
  float shine = exp(-pow(delta / max(0.025, u_shine_size), 2.0) * max(0.2, u_shine_fade / 17.0));
  float glint = edge * u_glow * (u_idle_intensity * 0.3 + proximity * shine * u_intensity + u_flash * 0.6);
  vec3 base = mix(u_base_color, u_tint, clamp(u_tint_opacity, 0.0, 0.25));
  vec3 color = mix(base, u_line_color, clamp(shine * proximity * u_intensity + u_flash * 0.45, 0.0, 1.0));
  float tintAlpha = clamp(u_tint_opacity, 0.0, 0.25);
  out_color = vec4(color, clamp(max(tintAlpha, glint), 0.0, 0.88));
}`;

function colorVector(value, fallback) {
  const hex = String(value || "")
    .trim()
    .replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [0, 2, 4].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || "SpecularButton shader compilation failed.");
  }
  return shader;
}

class SpecularRenderer {
  constructor() {
    this.targets = new Map();
    this.pointer = { x: -10000, y: -10000, pointerType: "" };
    this.frame = 0;
    this.ratio = 1;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "specular-webgl-overlay";
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.setAttribute("data-specular-overlay", "true");

    try {
      const gl = this.canvas.getContext("webgl2", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
      });
      if (!gl) throw new Error("WebGL2 is unavailable.");
      this.gl = gl;
      this.program = gl.createProgram();
      gl.attachShader(
        this.program,
        compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER),
      );
      gl.attachShader(
        this.program,
        compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER),
      );
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw new Error(
          gl.getProgramInfoLog(this.program) || "Shader link failed.",
        );
      }
      gl.useProgram(this.program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(this.program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      this.uniforms = Object.fromEntries(
        [
          "u_resolution",
          "u_mouse",
          "u_follow_mouse",
          "u_glow",
          "u_idle_intensity",
          "u_intensity",
          "u_proximity",
          "u_radius",
          "u_shine_fade",
          "u_shine_size",
          "u_thickness",
          "u_tint_opacity",
          "u_flash",
          "u_base_color",
          "u_line_color",
          "u_tint",
        ].map((name) => [name, gl.getUniformLocation(this.program, name)]),
      );
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      document.body.appendChild(this.canvas);
      this.resizeObserver = window.ResizeObserver
        ? new ResizeObserver(() => this.schedule())
        : null;
      this.onPointerMove = (event) => {
        if (event.pointerType === "touch") return;
        this.pointer = {
          x: event.clientX,
          y: event.clientY,
          pointerType: event.pointerType || "mouse",
        };
        this.schedule();
      };
      this.onViewportChange = () => this.schedule();
      window.addEventListener("pointermove", this.onPointerMove, {
        passive: true,
      });
      window.addEventListener("scroll", this.onViewportChange, {
        passive: true,
        capture: true,
      });
      window.addEventListener("resize", this.onViewportChange, {
        passive: true,
      });
      this.available = true;
      this.schedule();
    } catch (error) {
      this.available = false;
      this.canvas.remove();
      console.warn("Aura SpecularButton is using its CSS fallback.", error);
    }
  }

  register(element, configuration) {
    if (!this.available || !element) return () => {};
    const options = {
      ...DEFAULT_SPECULAR_BUTTON_PROPS,
      ...configuration,
      colors: {
        base: colorVector(configuration.baseColor, [0.32, 0.32, 0.32]),
        line: colorVector(configuration.lineColor, [1, 1, 1]),
        tint: colorVector(configuration.tint, [1, 1, 1]),
      },
    };
    const previousRadius = element.style.getPropertyValue("--specular-radius");
    const previousTextColor = element.style.getPropertyValue(
      "--specular-text-color",
    );
    element.classList.add("specular-enhanced");
    element.dataset.specularReady = "true";
    element.dataset.specularSize = options.size;
    element.style.setProperty("--specular-radius", `${options.radius}px`);
    element.style.setProperty("--specular-text-color", options.textColor);
    const record = { element, options, flashUntil: 0, handlers: {} };
    record.handlers.click = (event) => {
      if (element.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      record.flashUntil = performance.now() + 220;
      this.schedule();
      window.setTimeout(() => this.schedule(), 240);
    };
    record.handlers.focus = () => this.schedule();
    element.addEventListener("click", record.handlers.click, true);
    element.addEventListener("focus", record.handlers.focus, true);
    element.addEventListener("blur", record.handlers.focus, true);
    this.targets.set(element, record);
    this.resizeObserver?.observe(element);
    this.schedule();
    return () => {
      element.removeEventListener("click", record.handlers.click, true);
      element.removeEventListener("focus", record.handlers.focus, true);
      element.removeEventListener("blur", record.handlers.focus, true);
      this.resizeObserver?.unobserve(element);
      this.targets.delete(element);
      element.classList.remove("specular-enhanced");
      delete element.dataset.specularReady;
      delete element.dataset.specularSize;
      if (previousRadius) {
        element.style.setProperty("--specular-radius", previousRadius);
      } else {
        element.style.removeProperty("--specular-radius");
      }
      if (previousTextColor) {
        element.style.setProperty("--specular-text-color", previousTextColor);
      } else {
        element.style.removeProperty("--specular-text-color");
      }
      this.schedule();
    };
  }

  schedule() {
    if (!this.available || this.frame) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  draw() {
    if (!this.available || !this.gl) return;
    const width = Math.max(1, document.documentElement.clientWidth);
    const height = Math.max(
      1,
      window.innerHeight || document.documentElement.clientHeight,
    );
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (
      this.canvas.width !== pixelWidth ||
      this.canvas.height !== pixelHeight
    ) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    this.ratio = ratio;
    const gl = this.gl;
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    for (const record of this.targets.values()) {
      const { element, options } = record;
      if (!element.isConnected) continue;
      const rect = element.getBoundingClientRect();
      if (
        rect.width < 1 ||
        rect.height < 1 ||
        rect.bottom < 0 ||
        rect.top > height ||
        rect.right < 0 ||
        rect.left > width
      ) {
        continue;
      }
      const viewportX = Math.round(rect.left * ratio);
      const viewportY = Math.round((height - rect.bottom) * ratio);
      const drawWidth = Math.max(1, Math.round(rect.width * ratio));
      const drawHeight = Math.max(1, Math.round(rect.height * ratio));
      gl.viewport(viewportX, viewportY, drawWidth, drawHeight);
      const u = this.uniforms;
      gl.uniform2f(u.u_resolution, drawWidth, drawHeight);
      gl.uniform2f(
        u.u_mouse,
        (this.pointer.x - rect.left) * ratio,
        (rect.bottom - this.pointer.y) * ratio,
      );
      const disabled =
        Boolean(element.disabled) ||
        element.getAttribute("aria-disabled") === "true";
      gl.uniform1f(u.u_follow_mouse, options.followMouse && !disabled ? 1 : 0);
      gl.uniform1f(u.u_glow, options.glow * (disabled ? 0.22 : 1));
      gl.uniform1f(
        u.u_idle_intensity,
        options.idleIntensity * (disabled ? 0.16 : 1),
      );
      gl.uniform1f(u.u_intensity, options.intensity);
      gl.uniform1f(u.u_proximity, options.proximity * ratio);
      gl.uniform1f(
        u.u_radius,
        Math.min(options.radius * ratio, drawWidth * 0.5, drawHeight * 0.5),
      );
      gl.uniform1f(u.u_shine_fade, options.shineFade);
      gl.uniform1f(u.u_shine_size, (options.shineSize * Math.PI) / 180);
      const sizeScale =
        options.size === "sm" ? 0.84 : options.size === "md" ? 1 : 1.12;
      gl.uniform1f(u.u_thickness, options.thickness * ratio * sizeScale);
      gl.uniform1f(u.u_tint_opacity, options.tintOpacity);
      gl.uniform1f(
        u.u_flash,
        performance.now() < record.flashUntil && !disabled ? 1 : 0,
      );
      gl.uniform3fv(u.u_base_color, options.colors.base);
      gl.uniform3fv(u.u_line_color, options.colors.line);
      gl.uniform3fv(u.u_tint, options.colors.tint);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.viewport(0, 0, pixelWidth, pixelHeight);
  }

  dispose() {
    if (!this.available) return;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("scroll", this.onViewportChange, true);
    window.removeEventListener("resize", this.onViewportChange);
    this.resizeObserver?.disconnect();
    if (this.frame) window.cancelAnimationFrame(this.frame);
    this.canvas.remove();
    this.targets.clear();
    this.available = false;
  }
}

let sharedRenderer;
let rendererUnavailable = false;
function getRenderer() {
  if (!sharedRenderer && !rendererUnavailable) {
    sharedRenderer = new SpecularRenderer();
    rendererUnavailable = !sharedRenderer.available;
    if (rendererUnavailable) sharedRenderer = null;
  }
  return sharedRenderer;
}

function addSpecularFallback(element, options) {
  element.classList.add("specular-enhanced", "specular-fallback");
  element.dataset.specularReady = "true";
  element.dataset.specularSize = options.size;
  element.style.setProperty("--specular-radius", `${options.radius}px`);
  element.style.setProperty("--specular-text-color", options.textColor);
  return () => {
    element.classList.remove("specular-enhanced", "specular-fallback");
    delete element.dataset.specularReady;
    delete element.dataset.specularSize;
    element.style.removeProperty("--specular-radius");
    element.style.removeProperty("--specular-text-color");
  };
}

function registerButton(element, options) {
  const renderer = getRenderer();
  if (renderer) return renderer.register(element, options);
  return addSpecularFallback(element, options);
}

function inferSize(element) {
  if (element.dataset.specularSize) return element.dataset.specularSize;
  if (
    element.matches(
      ".nav-toggle, .thumbnail, .remove-item, .text-button, .quick-add, .header-search button, .newsletter-input button, [data-edit], [data-delete], #clear-filters",
    )
  ) {
    return "sm";
  }
  if (element.matches(".button")) return "lg";
  const rect = element.getBoundingClientRect();
  return rect.height < 34 || rect.width < 38
    ? "sm"
    : rect.height < 44
      ? "md"
      : "lg";
}

export function enhanceAllSpecularButtons(
  root = document.body,
  configuration = DEFAULT_SPECULAR_BUTTON_PROPS,
) {
  if (!root) return () => {};
  const registered = new Map();
  const scan = (scope) => {
    if (scope?.matches?.(BUTTON_SELECTOR) && !registered.has(scope)) {
      registered.set(
        scope,
        registerButton(scope, { ...configuration, size: inferSize(scope) }),
      );
    }
    scope?.querySelectorAll?.(BUTTON_SELECTOR).forEach((element) => {
      if (!registered.has(element)) {
        registered.set(
          element,
          registerButton(element, {
            ...configuration,
            size: inferSize(element),
          }),
        );
      }
    });
  };
  scan(root);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "childList") {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
      } else if (record.target.matches?.(BUTTON_SELECTOR)) {
        getRenderer()?.schedule();
      }
    });
    for (const [element, unregister] of registered) {
      if (!element.isConnected) {
        unregister();
        registered.delete(element);
      }
    }
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "aria-disabled", "class", "style"],
  });
  return () => {
    observer.disconnect();
    for (const unregister of registered.values()) unregister();
    registered.clear();
  };
}

function useTargetRegistration(target, options, ref) {
  useEffect(() => {
    const element = target || ref.current;
    if (!element) return undefined;
    return registerButton(element, options);
  }, [
    target,
    ref,
    options.baseColor,
    options.followMouse,
    options.glow,
    options.idleIntensity,
    options.intensity,
    options.lineColor,
    options.proximity,
    options.radius,
    options.shineFade,
    options.shineSize,
    options.size,
    options.textColor,
    options.thickness,
    options.tint,
    options.tintOpacity,
  ]);
}

export function SpecularButton({
  as = "button",
  target = null,
  enhanceAll = false,
  children,
  onClick,
  type = "button",
  disabled = false,
  href,
  className = "",
  style,
  baseColor = DEFAULT_SPECULAR_BUTTON_PROPS.baseColor,
  followMouse = DEFAULT_SPECULAR_BUTTON_PROPS.followMouse,
  glow = DEFAULT_SPECULAR_BUTTON_PROPS.glow,
  idleIntensity = DEFAULT_SPECULAR_BUTTON_PROPS.idleIntensity,
  intensity = DEFAULT_SPECULAR_BUTTON_PROPS.intensity,
  lineColor = DEFAULT_SPECULAR_BUTTON_PROPS.lineColor,
  proximity = DEFAULT_SPECULAR_BUTTON_PROPS.proximity,
  radius = DEFAULT_SPECULAR_BUTTON_PROPS.radius,
  shineFade = DEFAULT_SPECULAR_BUTTON_PROPS.shineFade,
  shineSize = DEFAULT_SPECULAR_BUTTON_PROPS.shineSize,
  size = DEFAULT_SPECULAR_BUTTON_PROPS.size,
  textColor = DEFAULT_SPECULAR_BUTTON_PROPS.textColor,
  thickness = DEFAULT_SPECULAR_BUTTON_PROPS.thickness,
  tint = DEFAULT_SPECULAR_BUTTON_PROPS.tint,
  tintOpacity = DEFAULT_SPECULAR_BUTTON_PROPS.tintOpacity,
  ...domProps
}) {
  const ref = useRef(null);
  const options = {
    ...DEFAULT_SPECULAR_BUTTON_PROPS,
    baseColor,
    followMouse,
    glow,
    idleIntensity,
    intensity,
    lineColor,
    proximity,
    radius,
    shineFade,
    shineSize,
    size,
    textColor,
    thickness,
    tint,
    tintOpacity,
  };
  useTargetRegistration(enhanceAll ? null : target, options, ref);
  useEffect(
    () =>
      enhanceAll
        ? enhanceAllSpecularButtons(document.body, options)
        : undefined,
    [enhanceAll],
  );

  if (enhanceAll || target) return null;
  const Tag = as;
  const mergedStyle = {
    ...style,
    "--specular-radius": `${options.radius}px`,
    "--specular-text-color": options.textColor,
    color: style?.color || options.textColor,
  };
  return React.createElement(
    Tag,
    {
      ...domProps,
      ref,
      href,
      type: Tag === "button" ? type : undefined,
      disabled: Tag === "button" ? disabled : undefined,
      "aria-disabled":
        Tag !== "button" && disabled ? true : domProps["aria-disabled"],
      tabIndex: Tag !== "button" && disabled ? -1 : domProps.tabIndex,
      onClick:
        Tag !== "button" && disabled
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
            }
          : onClick,
      className:
        `specular-button specular-size-${options.size} ${className}`.trim(),
      style: mergedStyle,
      "data-specular-size": options.size,
    },
    React.createElement(
      "span",
      { className: "specular-button__label" },
      children,
    ),
  );
}
