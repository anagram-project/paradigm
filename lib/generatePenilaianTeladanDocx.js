import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  ShadingType,
  PageOrientation,
  TableLayoutType,
} from "docx";

// Menghasilkan dokumen cetak (.docx) tabel "Perhitungan Nilai Pegawai
// Teladan" dari menu admin "Penilaian Pegawai Teladan" — formatnya meniru
// struktur berkas acuan "FINAL_Form_Penilaian_Pegawai_Teladan_Dit_PA_Tahun
// _2025.xlsx" (judul + tabel 5 komponen berbobot 20), tapi sudah terisi
// dari hasil perhitungan aplikasi (lib/penilaianTeladanSkor.js), bukan
// templat kosong. Gaya visual (font, warna, border) sengaja disamakan
// dengan lib/generateIprDocx.js supaya dokumen-dokumen PARADIGM konsisten.

const NAVY = "16294F";
const AMBER = "EC9A3C";
const HEADER_TEXT_COLOR = "FFFFFF";

const FONT_FAMILY = "Arial";
const FONT_SIZE = 20; // 10pt (half-points) — tabel 14 kolom, dibuat sedikit lebih kecil dari IPR (11pt) biar muat

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTanggalIndonesia(isoOrText) {
  const d = isoOrText ? new Date(isoOrText) : new Date();
  if (Number.isNaN(d.getTime())) return isoOrText || "";
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const CELL_BORDERS = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

const PAGE_LANDSCAPE_A4 = { orientation: PageOrientation.LANDSCAPE, width: 11906, height: 16838 };
const PAGE_MARGIN = { top: 567, bottom: 709, left: 567, right: 567 };
const RENDERED_PAGE_WIDTH_TWIPS = PAGE_LANDSCAPE_A4.height; // lebar cetak aktual setelah swap lanskap
const TABLE_WIDTH_TWIPS = RENDERED_PAGE_WIDTH_TWIPS - PAGE_MARGIN.left - PAGE_MARGIN.right;

function dxa(size) {
  return { size, type: WidthType.DXA };
}

// 14 kolom: Nominee (lebih lebar) + 13 kolom angka (dibagi rata dari sisa
// lebar tabel, kolom terakhir menyesuaikan sisa supaya total pas).
const NUM_NARROW_COLS = 13;
function columnWidths() {
  const nominee = Math.round(TABLE_WIDTH_TWIPS * 0.17);
  const sisa = TABLE_WIDTH_TWIPS - nominee;
  const tiap = Math.floor(sisa / NUM_NARROW_COLS);
  const widths = [nominee];
  for (let i = 0; i < NUM_NARROW_COLS - 1; i++) widths.push(tiap);
  widths.push(sisa - tiap * (NUM_NARROW_COLS - 1)); // kolom terakhir (Peringkat) ambil sisa pembulatan
  return widths;
}

function headerCell(text, width, { rowSpan, colSpan } = {}) {
  return new TableCell({
    width: dxa(width),
    borders: CELL_BORDERS,
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    rowSpan,
    columnSpan: colSpan,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text, bold: true, color: HEADER_TEXT_COLOR, font: FONT_FAMILY, size: FONT_SIZE - 2 }),
        ],
      }),
    ],
  });
}

function bodyCell(text, { width, bold = false, fill, align = AlignmentType.CENTER } = {}) {
  return new TableCell({
    width,
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? ""), bold, font: FONT_FAMILY, size: FONT_SIZE })],
      }),
    ],
  });
}

function fmt(n) {
  const num = Number(n) || 0;
  // Tampilkan tanpa desimal kalau bilangan bulat, 2 desimal kalau tidak —
  // supaya "100" tidak jadi "100.00" tapi "117.8" tetap "117.8".
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, "");
}

export async function generatePenilaianTeladanDocxBuffer({
  periode,
  rows = [],
  totalPemilih = 0,
  voteTertinggi = 0,
  dibuatOleh = "",
}) {
  const widths = columnWidths();
  const [wNominee, wKerapian, wKepatuhan, wSkorDisiplin, wIntegritas, wSkorIntegritas, wKehadiran, wSkorKehadiran, wVote, wSkorVote, wKinerja, wSkorKinerja, wFinal, wPeringkat] =
    widths;

  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Nominee", wNominee, { rowSpan: 2 }),
      headerCell("a. Disiplin Pegawai", wKerapian + wKepatuhan + wSkorDisiplin, { colSpan: 3 }),
      headerCell("b. Integritas Pegawai", wIntegritas + wSkorIntegritas, { colSpan: 2 }),
      headerCell("c. Kehadiran Pegawai", wKehadiran + wSkorKehadiran, { colSpan: 2 }),
      headerCell("d. Vote Pegawai", wVote + wSkorVote, { colSpan: 2 }),
      headerCell("e. Nilai Kinerja Pegawai", wKinerja + wSkorKinerja, { colSpan: 2 }),
      headerCell("Nilai Final", wFinal, { rowSpan: 2 }),
      headerCell("Peringkat", wPeringkat, { rowSpan: 2 }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Kerapian Berpakaian", wKerapian),
      headerCell("Kepatuhan Jam Kerja", wKepatuhan),
      headerCell("Skor", wSkorDisiplin),
      headerCell("Nilai (0-100)", wIntegritas),
      headerCell("Skor", wSkorIntegritas),
      headerCell("Nilai (0-100)", wKehadiran),
      headerCell("Skor", wSkorKehadiran),
      headerCell("Jumlah", wVote),
      headerCell("Skor", wSkorVote),
      headerCell("Nilai Raw (indeks 120)", wKinerja),
      headerCell("Skor", wSkorKinerja),
    ],
  });

  const bodyRows = [...rows]
    .sort((a, b) => (a.peringkat || 0) - (b.peringkat || 0))
    .map((r) => {
      const juara = r.peringkat === 1;
      const finalFill = juara ? AMBER : undefined;
      return new TableRow({
        children: [
          new TableCell({
            width: dxa(wNominee),
            borders: CELL_BORDERS,
            verticalAlign: VerticalAlign.CENTER,
            shading: juara ? { type: ShadingType.CLEAR, fill: "FFF3D6", color: "auto" } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: r.nama || "", bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${r.namaPanggilan ? `${r.namaPanggilan} — ` : ""}${r.subdit || ""}`,
                    font: FONT_FAMILY,
                    size: FONT_SIZE - 2,
                    color: "666666",
                  }),
                ],
              }),
            ],
          }),
          bodyCell(fmt(r.kerapianBerpakaian), { width: dxa(wKerapian) }),
          bodyCell(fmt(r.kepatuhanJamKerja), { width: dxa(wKepatuhan) }),
          bodyCell(fmt(r.skorDisiplin), { width: dxa(wSkorDisiplin), bold: true, fill: "E3EFFC" }),
          bodyCell(fmt(r.nilaiIntegritas), { width: dxa(wIntegritas) }),
          bodyCell(fmt(r.skorIntegritas), { width: dxa(wSkorIntegritas), bold: true, fill: "E3EFFC" }),
          bodyCell(fmt(r.nilaiKehadiran), { width: dxa(wKehadiran) }),
          bodyCell(fmt(r.skorKehadiran), { width: dxa(wSkorKehadiran), bold: true, fill: "E3EFFC" }),
          bodyCell(fmt(r.jumlahVote), { width: dxa(wVote) }),
          bodyCell(fmt(r.skorVote), { width: dxa(wSkorVote), bold: true, fill: "E3EFFC" }),
          bodyCell(fmt(r.nilaiKinerjaRaw), { width: dxa(wKinerja) }),
          bodyCell(fmt(r.skorKinerja), { width: dxa(wSkorKinerja), bold: true, fill: "E3EFFC" }),
          bodyCell(fmt(r.nilaiFinal), { width: dxa(wFinal), bold: true, fill: finalFill }),
          bodyCell(r.peringkat || "", { width: dxa(wPeringkat), bold: true }),
        ],
      });
    });

  const table = new Table({
    width: { size: TABLE_WIDTH_TWIPS, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: widths,
    rows: [headerRow1, headerRow2, ...bodyRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: PAGE_LANDSCAPE_A4,
            margin: PAGE_MARGIN,
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: "PERHITUNGAN NILAI PEGAWAI TELADAN",
                bold: true,
                font: FONT_FAMILY,
                size: FONT_SIZE + 6,
                color: NAVY,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: "DIREKTORAT PELAKSANAAN ANGGARAN",
                bold: true,
                font: FONT_FAMILY,
                size: FONT_SIZE + 2,
                color: NAVY,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `PERIODE ${String(periode || "").toUpperCase()}`, bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
            ],
          }),
          table,
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Total pegawai yang memilih: ${totalPemilih} · Vote tertinggi: ${voteTertinggi} · Dicetak ${formatTanggalIndonesia()}${
                  dibuatOleh ? ` oleh ${dibuatOleh}` : ""
                }`,
                italics: true,
                color: "666666",
                font: FONT_FAMILY,
                size: FONT_SIZE - 2,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
