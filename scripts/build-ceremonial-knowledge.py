from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

from pypdf import PdfReader


SOURCE_DIR = Path(r"C:\Users\mayco\OneDrive\Desktop\Vade Mecum")
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "ceremonial-knowledge.json"
MANUALS_DIR = Path(__file__).resolve().parents[1] / "src" / "data" / "manuals"
FILES = [
    "EB10-VM-12.007_-_Prática_de_Cerimonial_e_Protocolo.pdf",
    "Escolta_de_Honra_e_Salvas_de_Gala.pdf",
    "Guarda_de_Honra.pdf",
    "Guarda-Bandeira.pdf",
    "Honras_de_Recepcao_e_Despedida.pdf",
    "Honras_Funebres.pdf",
    "Passagem_de_Comando - Copia.pdf",
    "Passagem_de_Comando.pdf",
    "Pratica_de_Cerimonial_e_Protocolo.pdf",
    "Valores_Deveres_e_Etica_Militares.pdf",
]


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ").replace("\u00ad", "")
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_page(text: str, max_chars: int = 3600, overlap: int = 350) -> list[str]:
    if len(text) <= max_chars:
        return [text] if text else []
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            boundary = max(text.rfind("\n", start + 1800, end), text.rfind(". ", start + 1800, end))
            if boundary > start:
                end = boundary + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks


def title_for(path: Path) -> str:
    return path.stem.replace("_", " ").replace(" - Copia", "").strip()


def main() -> None:
    seen_hashes: set[str] = set()
    documents = []
    chunks = []
    MANUALS_DIR.mkdir(parents=True, exist_ok=True)
    for old_pdf in MANUALS_DIR.glob("*.pdf"):
        old_pdf.unlink()

    for filename in FILES:
        path = SOURCE_DIR / filename
        if not path.exists():
            raise FileNotFoundError(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in seen_hashes:
            print(f"Duplicado ignorado: {path.name}")
            continue
        seen_hashes.add(digest)
        reader = PdfReader(str(path))
        document_id = f"doc-{len(documents) + 1}"
        title = title_for(path)
        stored_name = f"{document_id}.pdf"
        shutil.copy2(path, MANUALS_DIR / stored_name)
        documents.append({"id": document_id, "title": title, "pages": len(reader.pages), "sha256": digest, "fileName": stored_name})

        for page_number, page in enumerate(reader.pages, start=1):
            page_text = clean_text(page.extract_text() or "")
            for part, content in enumerate(split_page(page_text), start=1):
                chunks.append({
                    "id": f"{document_id}-p{page_number}-{part}",
                    "documentId": document_id,
                    "source": title,
                    "page": page_number,
                    "part": part,
                    "content": content,
                })

    payload = {"version": 1, "documents": documents, "chunks": chunks}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(documents)} documentos, {len(chunks)} trechos, {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
