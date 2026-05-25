from __future__ import annotations

import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


def clean_inline(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("**", "").replace("`", "")
    return text


def run(text: str, *, bold: bool = False, font: str | None = None) -> str:
    properties = []
    if bold:
        properties.append("<w:b/>")
    if font:
        properties.append(f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}"/>')
        properties.append("<w:sz w:val=\"20\"/>")
    rpr = f"<w:rPr>{''.join(properties)}</w:rPr>" if properties else ""
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'


def paragraph(text: str = "", style: str | None = None, *, bold: bool = False,
              font: str | None = None, shading: str | None = None) -> str:
    properties = []
    if style:
        properties.append(f'<w:pStyle w:val="{style}"/>')
    if shading:
        properties.append(f'<w:shd w:fill="{shading}"/>')
    ppr = f"<w:pPr>{''.join(properties)}</w:pPr>" if properties else ""
    return f"<w:p>{ppr}{run(text, bold=bold, font=font)}</w:p>"


def table(rows: list[list[str]]) -> str:
    output = [
        "<w:tbl>",
        "<w:tblPr><w:tblStyle w:val=\"TableGrid\"/>"
        "<w:tblW w:w=\"0\" w:type=\"auto\"/></w:tblPr>",
    ]
    for row_index, row in enumerate(rows):
        output.append("<w:tr>")
        for cell in row:
            output.append(
                "<w:tc><w:tcPr><w:tcW w:w=\"0\" w:type=\"auto\"/></w:tcPr>"
                + paragraph(clean_inline(cell.strip()), bold=row_index == 0)
                + "</w:tc>"
            )
        output.append("</w:tr>")
    output.append("</w:tbl>")
    return "".join(output)


def markdown_body(markdown: str) -> str:
    lines = markdown.splitlines()
    output: list[str] = []
    index = 0
    in_code = False

    while index < len(lines):
        line = lines[index]

        if line.strip().startswith("```"):
            in_code = not in_code
            index += 1
            continue

        if in_code:
            output.append(paragraph(line, font="Consolas", shading="F4F4F4"))
            index += 1
            continue

        if line.startswith("|") and index + 1 < len(lines):
            table_lines: list[str] = []
            while index < len(lines) and lines[index].startswith("|"):
                table_lines.append(lines[index])
                index += 1
            rows = []
            for row_index, table_line in enumerate(table_lines):
                cells = [item.strip() for item in table_line.strip("|").split("|")]
                if row_index == 1 and all(set(cell) <= {"-", ":", " "} for cell in cells):
                    continue
                rows.append(cells)
            output.append(table(rows))
            output.append(paragraph())
            continue

        heading = re.match(r"^(#{1,4})\s+(.*)$", line)
        if heading:
            level = min(len(heading.group(1)), 3)
            output.append(paragraph(clean_inline(heading.group(2)), f"Heading{level}"))
        elif line.startswith("- "):
            output.append(paragraph("• " + clean_inline(line[2:])))
        else:
            output.append(paragraph(clean_inline(line)))
        index += 1

    return "".join(output)


def write_docx(source: Path, target: Path) -> None:
    body = markdown_body(source.read_text(encoding="utf-8"))
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}"
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" '
        'w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
        "</w:body></w:document>"
    )
    styles = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
        '<w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" '
        'w:hAnsi="Times New Roman"/><w:sz w:val="26"/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading1">'
        '<w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading2">'
        '<w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading3">'
        '<w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="27"/></w:rPr></w:style>'
        '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/>'
        '<w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/>'
        '<w:left w:val="single" w:sz="4" w:color="BFBFBF"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/>'
        '<w:right w:val="single" w:sz="4" w:color="BFBFBF"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/>'
        '</w:tblBorders></w:tblPr></w:style></w:styles>'
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/></Relationships>'
    )
    document_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/></Relationships>'
    )
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document)
        archive.writestr("word/styles.xml", styles)
        archive.writestr("word/_rels/document.xml.rels", document_rels)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: markdown_to_docx.py INPUT.md OUTPUT.docx")
    write_docx(Path(sys.argv[1]), Path(sys.argv[2]))
