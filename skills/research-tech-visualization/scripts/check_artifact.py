"""Read-only checks for explicitly closed HTML and SVG; not a renderer or security audit."""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
import hashlib
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


VOID_TAGS = set("area base br col embed hr img input link meta param source track wbr".split())
URL_PATTERN = re.compile(r"url\(\s*['\"]?([^)'\"]+)", re.I)


@dataclass
class Element:
    tag: str
    attrs: dict[str, str]
    parent: int | None
    line: int = 0
    text: str = ""


@dataclass
class Document:
    elements: list[Element] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    doctype: bool = False


class ExplicitHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.document = Document()
        self.stack: list[int] = []

    def handle_decl(self, declaration):
        if declaration.lower().strip() == "doctype html":
            self.document.doctype = True

    def handle_starttag(self, tag, attributes):
        names = [name for name, value in attributes]
        if len(names) != len(set(names)):
            self.document.errors.append(f"DUPLICATE_ATTRIBUTE: line {self.getpos()[0]}")
        element = Element(tag, {name: value or "" for name, value in attributes},
                          self.stack[-1] if self.stack else None, self.getpos()[0])
        self.document.elements.append(element)
        if tag not in VOID_TAGS:
            self.stack.append(len(self.document.elements) - 1)

    def handle_startendtag(self, tag, attributes):
        inside_svg = any(self.document.elements[index].tag == "svg" for index in self.stack)
        if tag not in VOID_TAGS and tag != "svg" and not inside_svg:
            self.document.errors.append(f"SELF_CLOSING_HTML_ELEMENT: {tag}")
        self.handle_starttag(tag, attributes)
        if tag not in VOID_TAGS:
            self.stack.pop()

    def handle_endtag(self, tag):
        if not self.stack or self.document.elements[self.stack[-1]].tag != tag:
            self.document.errors.append(f"UNEXPECTED_CLOSE: {tag} at line {self.getpos()[0]}")
            return
        self.stack.pop()

    def handle_data(self, data):
        if data.strip() and not self.stack:
            self.document.errors.append("TEXT_OUTSIDE_ROOT")
        for index in self.stack:
            self.document.elements[index].text += data

    def finish(self):
        self.close()
        for index in self.stack:
            self.document.errors.append(f"UNCLOSED_TAG: {self.document.elements[index].tag}")
        return self.document


def parse_document(text: str, kind: str) -> Document:
    if kind == "html":
        parser = ExplicitHTML()
        parser.feed(text)
        return parser.finish()
    if re.search(r"<!\s*(DOCTYPE|ENTITY)\b", text, re.I):
        raise ValueError("SVG DTD/entity declarations are outside the supported subset")
    root = ET.fromstring(text)
    if root.tag != "{http://www.w3.org/2000/svg}svg":
        raise ValueError("SVG root must use the SVG XML namespace")
    document = Document()

    def visit(node, parent):
        index = len(document.elements)
        attrs = {name.rsplit("}", 1)[-1].lower(): value for name, value in node.attrib.items()}
        document.elements.append(Element(node.tag.rsplit("}", 1)[-1].lower(), attrs,
                                          parent, text="".join(node.itertext())))
        for child in node:
            visit(child, index)

    visit(root, None)
    return document


def inspect(text: str, kind: str) -> dict:
    document = parse_document(text, kind)
    elements = document.elements
    errors = document.errors
    warnings: list[str] = []
    resources: set[str] = set()
    ids: dict[str, Element] = {}
    references: list[tuple[str, str]] = []
    if kind == "html":
        if not document.doctype:
            errors.append("MISSING_HTML_DOCTYPE")
        for tag in ("html", "head", "body"):
            if sum(element.tag == tag for element in elements) != 1:
                errors.append(f"DOCUMENT_TAG_COUNT: {tag} must occur exactly once")
        for element in elements:
            if element.tag == "html" and (element.parent is not None or not element.attrs.get("lang")):
                errors.append("HTML_ROOT_OR_LANG_INVALID")
            if element.tag in {"head", "body"} and (
                element.parent is None or elements[element.parent].tag != "html"
            ):
                errors.append(f"DOCUMENT_PARENT_INVALID: {element.tag}")
        if not any(element.tag == "meta" and element.attrs.get("charset", "").lower() == "utf-8"
                   for element in elements):
            warnings.append("UTF8_META_NOT_FOUND")
        if not any(element.tag == "title" and element.text.strip() and element.parent is not None
                   and elements[element.parent].tag == "head" for element in elements):
            errors.append("DOCUMENT_TITLE_MISSING")
    for element in elements:
        attrs = element.attrs
        identity = attrs.get("id")
        if "data-viz-node" in attrs and not identity:
            errors.append("NODE_ID_MISSING")
        if "data-viz-node" in attrs and attrs["data-viz-node"] not in {"container", "component"}:
            errors.append("NODE_KIND_INVALID")
        if identity is not None:
            if not identity or identity in ids:
                errors.append(f"INVALID_OR_DUPLICATE_ID: {identity!r}")
            ids[identity] = element
        for attribute in ("aria-labelledby", "aria-describedby"):
            references.extend((attribute, target) for target in attrs.get(attribute, "").split())
        for attribute in ("href", "xlink:href"):
            if attrs.get(attribute, "").startswith("#"):
                references.append((attribute, attrs[attribute][1:]))
        snippets = list(attrs.values()) + ([element.text] if element.tag == "style" else [])
        for snippet in snippets:
            for match in URL_PATTERN.finditer(snippet):
                target = match.group(1).strip()
                if target.startswith("#"):
                    references.append(("url", target[1:]))
                elif not target.lower().startswith("data:"):
                    resources.add(target)
        if element.tag in {"script", "img", "image", "link", "iframe", "object", "embed",
                            "source", "video", "audio", "track", "input", "base"}:
            for attribute in ("src", "href", "xlink:href", "poster", "data"):
                target = attrs.get(attribute, "")
                if target and not target.startswith("#") and not target.lower().startswith("data:"):
                    resources.add(target)
            if "srcset" in attrs:
                warnings.append("SRCSET_REQUIRES_RESOURCE_REVIEW")
        if element.tag == "style" and "@import" in element.text.lower():
            warnings.append("CSS_IMPORT_REQUIRES_RESOURCE_REVIEW")
        if element.tag in {"script", "foreignobject", "iframe", "object", "embed", "animate", "set"}:
            warnings.append(f"DYNAMIC_OR_EMBEDDED_CONTENT: {element.tag}")
        if any(name.startswith("on") for name in attrs):
            warnings.append("EVENT_HANDLER_REQUIRES_RUNTIME_REVIEW")
        if element.tag == "img" and "alt" not in attrs:
            warnings.append("IMG_ALT_MISSING")
    for attribute, target in references:
        if target not in ids:
            errors.append(f"DANGLING_REFERENCE: {attribute} -> {target}")

    svg_count = 0
    for index, element in enumerate(elements):
        if element.tag != "svg":
            continue
        svg_count += 1
        try:
            viewbox = [float(value) for value in re.split(r"[\s,]+", element.attrs.get("viewbox", "").strip())]
            if len(viewbox) != 4 or not all(math.isfinite(value) for value in viewbox) or min(viewbox[2:]) <= 0:
                raise ValueError
        except ValueError:
            errors.append(f"INVALID_VIEWBOX: svg {svg_count}")
        if element.attrs.get("aria-hidden") == "true":
            continue
        children = [child for child in elements if child.parent == index]
        labels = element.attrs.get("aria-labelledby", "").split()
        described = {child.tag for child in children if child.tag in {"title", "desc"}
                     and child.text.strip() and child.attrs.get("id") in labels}
        if element.attrs.get("role") != "img" or described != {"title", "desc"}:
            errors.append(f"SVG_DESCRIPTION_INVALID: svg {svg_count} needs title/desc IDs in aria-labelledby")

    nodes = {identity: element for identity, element in ids.items() if "data-viz-node" in element.attrs}
    edge_count = 0
    for identity, element in nodes.items():
        seen = {identity}
        parent = element.attrs.get("data-viz-parent")
        while parent:
            if parent in seen:
                errors.append(f"PARENT_CYCLE: {identity}")
                break
            if parent not in nodes or nodes[parent].attrs.get("data-viz-node") != "container":
                errors.append(f"INVALID_PARENT: {identity} -> {parent}")
                break
            seen.add(parent)
            parent = nodes[parent].attrs.get("data-viz-parent")
    for element in elements:
        attrs = element.attrs
        if "data-viz-owner" in attrs and attrs["data-viz-owner"] not in nodes:
            errors.append(f"INVALID_TEXT_OWNER: {attrs['data-viz-owner']}")
        if any(key in attrs for key in ("data-viz-from", "data-viz-to", "data-viz-kind")):
            edge_count += 1
            if not attrs.get("data-viz-kind", "").strip():
                errors.append("EDGE_KIND_MISSING")
            for key in ("data-viz-from", "data-viz-to"):
                if attrs.get(key) not in nodes:
                    errors.append(f"INVALID_EDGE_ENDPOINT: {key}={attrs.get(key)!r}")
    if resources:
        warnings.append("RESOURCE_DEPENDENCIES_FOUND: offline operation is not proven")
    return {
        "status": "failed" if errors else "needs_review" if warnings else "checks_passed",
        "errors": sorted(set(errors)), "warnings": sorted(set(warnings)),
        "resources": sorted(resources),
        "counts": {"svg": svg_count, "nodes": len(nodes), "edges": edge_count},
        "coverage": {"explicit_document_structure": "checked", "declared_graph_references": "checked" if nodes else "not_run",
                     "source_fidelity": "not_run", "geometry": "not_run", "visual": "not_run", "offline": "not_proven"},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path)
    args = parser.parse_args()
    try:
        kind = {".html": "html", ".htm": "html", ".svg": "svg"}.get(args.artifact.suffix.lower())
        if kind is None:
            raise ValueError("Supported extensions: .html, .htm, .svg")
        raw = args.artifact.read_bytes()
        result = inspect(raw.decode("utf-8-sig"), kind)
        result.update(source=str(args.artifact.resolve()), sha256=hashlib.sha256(raw).hexdigest())
    except (OSError, ValueError, ET.ParseError) as error:
        print(json.dumps({"status": "not_run", "error": str(error)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
