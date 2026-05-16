#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="${ROOT_DIR}/content/syllabus/sources"
SNAPSHOT_DATE="${SNAPSHOT_DATE:-$(date -u +%F)}"
SNAPSHOT_STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() {
  printf '[fetch-syllabus-sources] %s\n' "$1"
}

expected_content_length() {
  local headers="$1"

  if [[ ! -s "$headers" ]]; then
    return 1
  fi

  rg -i '^content-length:' "$headers" \
    | tail -n 1 \
    | awk '{print $2}' \
    | tr -d '\r'
}

artifact_is_complete() {
  local output="$1"
  local headers="$2"
  local expected
  local actual

  if [[ ! -s "$output" || ! -s "$headers" ]]; then
    return 1
  fi

  expected="$(expected_content_length "$headers" || true)"
  if [[ -z "$expected" ]]; then
    return 1
  fi

  actual="$(stat -c%s "$output")"
  [[ "$actual" = "$expected" ]]
}

download_with_headers() {
  local url="$1"
  local output="$2"
  local headers="$3"

  mkdir -p "$(dirname "$output")"

  if artifact_is_complete "$output" "$headers"; then
    return
  fi

  if [[ -s "$output" ]]; then
    if curl \
      --continue-at - \
      --fail \
      --silent \
      --show-error \
      --location \
      --retry 5 \
      --retry-all-errors \
      --retry-delay 2 \
      --dump-header "$headers" \
      --output "$output" \
      "$url"; then
      return
    fi
  fi

  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry 5 \
    --retry-all-errors \
    --retry-delay 2 \
    --dump-header "$headers" \
    --output "$output" \
    "$url"
}

download_with_wget_headers() {
  local url="$1"
  local output="$2"
  local headers="$3"

  mkdir -p "$(dirname "$output")"

  if artifact_is_complete "$output" "$headers"; then
    return
  fi

  wget \
    --server-response \
    --output-document="$output" \
    "$url" \
    2>"$headers"
}

write_snapshot_stamp() {
  local dir="$1"
  printf '%s\n' "$SNAPSHOT_STAMP" > "${dir}/retrieved_at_utc.txt"
}

write_checksums() {
  local dir="$1"

  if find "$dir" -type f ! -name 'SHA256SUMS' | read -r _; then
    (
      cd "$dir"
      find . -type f ! -name 'SHA256SUMS' -print0 \
        | sort -z \
        | xargs -0 sha256sum > SHA256SUMS
    )
  fi
}

extract_bunpro_urls() {
  local html_file="$1"

  rg -o 'href="/grammar_points/[^"]+"' "$html_file" \
    | sed 's/^href="//' \
    | sed 's/"$//' \
    | sort -u
}

download_bunpro_deck() {
  local deck_key="$1"
  local deck_url="$2"
  local deck_root="${BASE_DIR}/bunpro/raw/${SNAPSHOT_DATE}"
  local deck_dir="${deck_root}/decks"
  local url_dir="${deck_root}/manifests"
  local page_dir="${deck_root}/grammar_points/${deck_key}"
  local deck_html="${deck_dir}/${deck_key}.html"
  local deck_headers="${deck_dir}/${deck_key}.html.headers"
  local urls_file="${url_dir}/${deck_key}-grammar-point-urls.txt"
  local manifest_file="${url_dir}/${deck_key}-grammar-point-files.tsv"

  mkdir -p "$deck_dir" "$url_dir" "$page_dir"
  download_with_headers "$deck_url" "$deck_html" "$deck_headers"
  extract_bunpro_urls "$deck_html" > "$urls_file"

  : > "$manifest_file"

  local index=0
  while IFS= read -r relative_url; do
    local slug
    local absolute_url
    local base_slug
    local html_file
    local headers_file

    index=$((index + 1))
    slug="${relative_url#/grammar_points/}"
    base_slug="${slug%%\?*}"
    absolute_url="https://bunpro.jp${relative_url}"
    printf -v html_file '%s/%03d-%s.html' "$page_dir" "$index" "$base_slug"
    headers_file="${html_file}.headers"

    download_with_headers "$absolute_url" "$html_file" "$headers_file"
    printf '%s\t%s\t%s\n' "$index" "$relative_url" "$(basename "$html_file")" >> "$manifest_file"
  done < "$urls_file"
}

mkdir -p "$BASE_DIR"

KANJIDIC_DIR="${BASE_DIR}/kanjidic2/raw/${SNAPSHOT_DATE}"
mkdir -p "$KANJIDIC_DIR"
log "Downloading KANJIDIC2 snapshot into ${KANJIDIC_DIR}"
write_snapshot_stamp "$KANJIDIC_DIR"
download_with_headers "https://www.edrdg.org/kanjidic/kanjd2index_legacy.html" "${KANJIDIC_DIR}/kanjd2index_legacy.html" "${KANJIDIC_DIR}/kanjd2index_legacy.html.headers"
download_with_headers "http://www.edrdg.org/edrdg/licence.html" "${KANJIDIC_DIR}/licence.html" "${KANJIDIC_DIR}/licence.html.headers"
download_with_headers "https://www.edrdg.org/kanjidic/kanjidic2.xml.gz" "${KANJIDIC_DIR}/kanjidic2.xml.gz" "${KANJIDIC_DIR}/kanjidic2.xml.gz.headers"
write_checksums "$KANJIDIC_DIR"

JMDICT_DIR="${BASE_DIR}/jmdict/raw/${SNAPSHOT_DATE}"
mkdir -p "$JMDICT_DIR"
log "Downloading JMdict snapshot into ${JMDICT_DIR}"
write_snapshot_stamp "$JMDICT_DIR"
download_with_headers "https://www.edrdg.org/jmdict/j_jmdict.html" "${JMDICT_DIR}/j_jmdict.html" "${JMDICT_DIR}/j_jmdict.html.headers"
download_with_headers "http://www.edrdg.org/edrdg/licence.html" "${JMDICT_DIR}/licence.html" "${JMDICT_DIR}/licence.html.headers"
download_with_wget_headers "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz" "${JMDICT_DIR}/JMdict_e.gz" "${JMDICT_DIR}/JMdict_e.gz.headers"
write_checksums "$JMDICT_DIR"

TATOEBA_DIR="${BASE_DIR}/tatoeba/raw/${SNAPSHOT_DATE}"
mkdir -p "$TATOEBA_DIR"
log "Downloading Tatoeba snapshot into ${TATOEBA_DIR}"
write_snapshot_stamp "$TATOEBA_DIR"
download_with_headers "https://tatoeba.org/en/downloads" "${TATOEBA_DIR}/downloads.html" "${TATOEBA_DIR}/downloads.html.headers"
download_with_headers "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2" "${TATOEBA_DIR}/jpn_sentences.tsv.bz2" "${TATOEBA_DIR}/jpn_sentences.tsv.bz2.headers"
download_with_headers "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2" "${TATOEBA_DIR}/eng_sentences.tsv.bz2" "${TATOEBA_DIR}/eng_sentences.tsv.bz2.headers"
download_with_headers "https://downloads.tatoeba.org/exports/jpn_indices.tar.bz2" "${TATOEBA_DIR}/jpn_indices.tar.bz2" "${TATOEBA_DIR}/jpn_indices.tar.bz2.headers"
download_with_headers "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_transcriptions.tsv.bz2" "${TATOEBA_DIR}/jpn_transcriptions.tsv.bz2" "${TATOEBA_DIR}/jpn_transcriptions.tsv.bz2.headers"
download_with_headers "https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2" "${TATOEBA_DIR}/sentences_with_audio.tar.bz2" "${TATOEBA_DIR}/sentences_with_audio.tar.bz2.headers"
write_checksums "$TATOEBA_DIR"

YOMITAN_DIR="${BASE_DIR}/yomitan-jlpt-vocab/raw/${SNAPSHOT_DATE}"
mkdir -p "$YOMITAN_DIR"
log "Downloading Yomitan JLPT overlay snapshot into ${YOMITAN_DIR}"
write_snapshot_stamp "$YOMITAN_DIR"
download_with_headers "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/README.md" "${YOMITAN_DIR}/README.md" "${YOMITAN_DIR}/README.md.headers"
download_with_headers "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/LICENSE.txt" "${YOMITAN_DIR}/LICENSE.txt" "${YOMITAN_DIR}/LICENSE.txt.headers"
download_with_headers "https://codeload.github.com/stephenmk/yomitan-jlpt-vocab/zip/refs/heads/main" "${YOMITAN_DIR}/source-main.zip" "${YOMITAN_DIR}/source-main.zip.headers"
write_checksums "$YOMITAN_DIR"

BUNPRO_DIR="${BASE_DIR}/bunpro/raw/${SNAPSHOT_DATE}"
mkdir -p "$BUNPRO_DIR"
log "Downloading Bunpro deck and grammar point snapshots into ${BUNPRO_DIR}"
write_snapshot_stamp "$BUNPRO_DIR"
download_bunpro_deck "n5" "https://bunpro.jp/decks/nn10ai/Bunpro-N5-Grammar"
download_bunpro_deck "n4" "https://bunpro.jp/decks/m7omkx/bunpro-n4-grammar"
write_checksums "$BUNPRO_DIR"
