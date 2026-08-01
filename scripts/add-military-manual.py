"""Adiciona um PDF local à base pesquisável do Assistente Militar."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_PATH = ROOT / "src" / "data" / "ceremonial-knowledge.json"
MANUALS_DIR = ROOT / "src" / "data" / "manuals"


def split_content(content: str, max_length: int = 3600, overlap: int = 350) -> list[str]:
    normalized = re.sub(r"\s+", " ", content).strip()
    if not normalized:
        return []
    parts: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + max_length, len(normalized))
        if end < len(normalized):
            boundaries = [normalized.rfind(". ", start, end), normalized.rfind("; ", start, end)]
            boundary = max(boundaries)
            if boundary > start + int(max_length * 0.6):
                end = boundary + 1
        parts.append(normalized[start:end].strip())
        if end >= len(normalized):
            break
        start = max(start + 1, end - overlap)
    return parts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("document_id")
    parser.add_argument("title")
    parser.add_argument("--page-one-text", default="")
    args = parser.parse_args()

    source = Path(args.source).resolve()
    if not source.is_file() or source.suffix.lower() != ".pdf":
        raise FileNotFoundError(f"PDF não encontrado: {source}")

    MANUALS_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{args.document_id}.pdf"
    target = MANUALS_DIR / file_name
    shutil.copyfile(source, target)

    with pdfplumber.open(source) as pdf:
        pages = [(page.extract_text() or "").strip() for page in pdf.pages]
    if pages and not pages[0] and args.page_one_text:
        pages[0] = args.page_one_text.strip()

    with KNOWLEDGE_PATH.open("r", encoding="utf-8") as stream:
        knowledge = json.load(stream)

    knowledge["documents"] = [doc for doc in knowledge["documents"] if doc["id"] != args.document_id]
    knowledge["chunks"] = [chunk for chunk in knowledge["chunks"] if chunk["documentId"] != args.document_id]

    document = {
        "id": args.document_id,
        "title": args.title,
        "pages": len(pages),
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "fileName": file_name,
    }
    chunks = []
    for page_index, page_text in enumerate(pages, start=1):
        for part_index, part in enumerate(split_content(page_text), start=1):
            chunks.append(
                {
                    "id": f"{args.document_id}-p{page_index}-{part_index}",
                    "documentId": args.document_id,
                    "source": args.title,
                    "page": page_index,
                    "part": part_index,
                    "content": part,
                }
            )

    knowledge["documents"].append(document)
    knowledge["chunks"].extend(chunks)
    knowledge["version"] = max(2, int(knowledge.get("version", 1)))
    with KNOWLEDGE_PATH.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(knowledge, stream, ensure_ascii=False, separators=(",", ":"))
        stream.write("\n")

    print(f"{args.title}: {len(pages)} páginas e {len(chunks)} trechos adicionados.")


if __name__ == "__main__":
    main()
