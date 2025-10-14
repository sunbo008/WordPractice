#!/usr/bin/env python3
"""
Scan all JSON files under the words directory and output per-file word lists
to a CSV file.

Defaults:
- Input directory: ../words relative to this script (i.e., proj/words)
- Output file:     words.csv inside the input directory

CSV format:
- Includes header row: file,count,words
- Each data row contains: file, count, words (space-separated)
- Two trailing summary rows:
  __summary__, files, <N>
  __summary__, total_words, <M>

Usage:
  python3 scan_words.py
  python3 scan_words.py --input /absolute/path/to/words --output /absolute/path/to/words.csv
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
import csv
from typing import Iterable, Set, Any


WORD_PATTERN = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)*")


def extract_words_from_text(text: str) -> Set[str]:
    """Extract candidate English words from free text using a conservative regex.

    This is retained only for fallback when a JSON file fails to parse.
    We additionally filter out single-letter tokens to avoid noise like 'y'/'z'.
    """
    candidates = WORD_PATTERN.findall(text)
    return {w.lower() for w in candidates if w and len(w) >= 2}


def extract_words_from_json_data(data: Any) -> Set[str]:
    """Recursively collect ONLY vocabulary items from JSON schemas.

    Rules:
    - If an object contains a key 'word' whose value is a string, collect that value
    - Lists are traversed recursively
    - All other string values (ids, names, filenames, descriptions, categories, etc.) are ignored
    - Single-letter tokens are filtered out
    """
    collected: Set[str] = set()

    if data is None:
        return collected

    if isinstance(data, dict):
        # If this dict directly defines a word item
        if "word" in data and isinstance(data["word"], str):
            w = data["word"].strip().lower()
            if len(w) >= 2 and WORD_PATTERN.fullmatch(w.replace("'", "'") if True else w):
                collected.add(w)
        # Recurse into other nested structures
        for value in data.values():
            if isinstance(value, (dict, list)):
                collected |= extract_words_from_json_data(value)
        return collected

    if isinstance(data, list):
        for item in data:
            collected |= extract_words_from_json_data(item)
        return collected

    # Primitive strings without key context are ignored
    return collected


def read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def collect_words_per_file(input_dir: Path, output_path: Path) -> dict[Path, Set[str]]:
    """Walk the directory and collect words per JSON file.

    - Only .json files are considered
    - The output file itself is explicitly skipped if present
    - For invalid JSON, we fall back to conservative text extraction (still per-file)
    """
    file_to_words: dict[Path, Set[str]] = {}

    for path in input_dir.rglob("*"):
        if not path.is_file():
            continue

        # Skip the generated output file if present
        try:
            if path.resolve() == output_path.resolve():
                continue
        except Exception:
            # In case of permission or resolution issues, also skip by common names
            if path.name in {"words.csv", "words.txt"}:
                continue

        if path.suffix.lower() != ".json":
            # Ignore non-JSON files to avoid pulling in README/config noise
            continue

        text = read_text_file(path)
        if not text:
            continue

        words_for_file: Set[str] = set()
        try:
            data = json.loads(text)
        except Exception:
            words_for_file |= extract_words_from_text(text)
        else:
            words_for_file |= extract_words_from_json_data(data)

        if words_for_file:
            file_to_words[path] = words_for_file

    return file_to_words


def write_words_per_file(
    input_dir: Path,
    file_to_words: dict[Path, Set[str]],
    output_file: Path,
) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Sort files by basename (case-insensitive), fallback to relative path
    def sort_key(p: Path) -> tuple[str, str]:
        return (p.name.lower(), str(p.relative_to(input_dir)))

    total_files = len(file_to_words)
    total_words = 0

    with output_file.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        # Header row
        writer.writerow(["file", "count", "words"])
        for path in sorted(file_to_words.keys(), key=sort_key):
            words_sorted = sorted(file_to_words[path], key=lambda s: (s.lower(), s))
            count = len(words_sorted)
            total_words += count

            # CSV row: file, count, words (space-separated)
            writer.writerow([path.name, str(count), " ".join(words_sorted)])

        # Final summary rows
        writer.writerow(["__summary__", "files", str(total_files)])
        writer.writerow(["__summary__", "total_words", str(total_words)])


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    default_input = (script_dir.parent / "words").resolve()
    default_output = (default_input / "words.csv").resolve()

    parser = argparse.ArgumentParser(description="Scan words and output words.txt")
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=default_input,
        help="Input directory containing word source files (default: proj/words)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=default_output,
        help="Output file path for words.csv (default: proj/words/words.csv)",
    )

    args = parser.parse_args()

    input_dir: Path = args.input
    output_file: Path = args.output

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"[ERROR] Input directory does not exist or is not a directory: {input_dir}")
        return 1

    per_file = collect_words_per_file(input_dir, output_file)
    write_words_per_file(input_dir, per_file, output_file)

    # Compute stats for console output (same as file summary)
    total_files = len(per_file)
    total_words = sum(len(v) for v in per_file.values())

    print(f"[OK] Scanned JSON files: {total_files}")
    print(f"[OK] Total words (per-file sum): {total_words}")
    print(f"[OK] Wrote to: {output_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


