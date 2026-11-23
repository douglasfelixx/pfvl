import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import "./rich-text-content.css";

const allowedTags = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
  "h1", "h2", "h3", "blockquote", "a", "img", "code", "pre", "hr",
];
const allowedAttributes = ["href", "src", "alt", "title", "style", "width", "height"];

export function isSafeRichUrl(value: string): boolean {
  const url = value.trim();
  if (/^https:/i.test(url)) {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }

  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\\")) return false;
  try {
    const parsed = new URL(url, "https://pfvl.invalid");
    const path = decodeURIComponent(parsed.pathname);
    return parsed.origin === "https://pfvl.invalid" && !path.split("/").includes("..");
  } catch {
    return false;
  }
}

function sanitizeRichHtml(value: string): string {
  if (!value.trim()) return "";
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOW_DATA_ATTR: false,
  });
  const document = new DOMParser().parseFromString(clean, "text/html");
  document.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const canAlignText = ["P", "H1", "H2", "H3", "BLOCKQUOTE"].includes(element.tagName);
    const alignment = canAlignText ? element.style.textAlign : "";
    element.removeAttribute("style");
    if (["left", "center", "right", "justify"].includes(alignment)) {
      element.style.textAlign = alignment;
    }
  });
  document.querySelectorAll<HTMLElement>(":not(img)[width], :not(img)[height]").forEach((element) => {
    element.removeAttribute("width");
    element.removeAttribute("height");
  });
  document.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || !isSafeRichUrl(href)) anchor.removeAttribute("href");
  });
  document.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src");
    if (!src || !isSafeRichUrl(src)) image.remove();
    else {
      for (const dimension of ["width", "height"] as const) {
        const rawValue = image.getAttribute(dimension);
        if (rawValue === null) continue;
        const size = Number(rawValue);
        if (!Number.isInteger(size) || size < 1 || size > 2400) image.removeAttribute(dimension);
        else image.setAttribute(dimension, String(size));
      }
      image.setAttribute("loading", "lazy");
    }
  });
  return document.body.innerHTML;
}

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: false,
});
markdown.validateLink = isSafeRichUrl;

function isHtmlContent(value: string): boolean {
  return /^\s*<(?:p|br|strong|b|em|i|u|s|ul|ol|li|h[1-3]|blockquote|a|img|code|pre|hr)\b/i.test(value);
}

export function normalizeRichContent(value: string): string {
  if (!value.trim()) return "";
  return sanitizeRichHtml(isHtmlContent(value) ? value : markdown.render(value));
}

export function richContentToPlainText(value: string): string {
  const document = new DOMParser().parseFromString(normalizeRichContent(value), "text/html");
  document.querySelectorAll("img").forEach((image) => {
    image.replaceWith(document.createTextNode(image.alt ?? ""));
  });
  document.querySelectorAll("br").forEach((lineBreak) => {
    lineBreak.replaceWith(document.createTextNode(" "));
  });
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function RichTextContent({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const html = normalizeRichContent(value);
  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
