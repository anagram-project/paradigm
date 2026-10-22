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
} from "docx";

// Menghasilkan dokumen Individual Performance Review (.docx) mengikuti
// struktur "Format IPR" (KMK-127 Tahun 2026) yang dicontohkan pengguna:
// judul -> identitas -> HASIL KERJA -> PERILAKU KERJA -> USULAN PELATIHAN
// -> KESIMPULAN -> blok tandatangan elektronik.

const NAVY = "16294F"; // dekat var(--navy) di UI PARADIGM
const HEADER_TEXT_COLOR = "FFFFFF";
const TTD_LABEL_COLOR = "999999"; // abu-abu untuk label "Ditandatangani secara elektronik"

// Font seragam di seluruh dokumen: Arial 11pt (size dalam half-points, jadi 11pt = 22).
const FONT_FAMILY = "Arial";
const FONT_SIZE = 22;

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
const NO_BORDERS = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
};

// Kertas A4 Landscape + margin sempit mengikuti "Format IPR" yang
// dicontohkan pengguna (ukuran & margin diambil dari file contohnya,
// dikonversi ke twip: 1 twip = 1/1440 inci).
// Catatan: library `docx` menukar width/height saat orientation=LANDSCAPE,
// jadi di sini width/height yang dikirim adalah nilai dasar bentuk potret
// (11906x16838) — hasil akhirnya tetap lanskap (lebar cetak = 16838 twip).
const PAGE_LANDSCAPE_A4 = { orientation: PageOrientation.LANDSCAPE, width: 11906, height: 16838 };
const PAGE_MARGIN = { top: 567, bottom: 993, left: 709, right: 536 };
const RENDERED_PAGE_WIDTH_TWIPS = PAGE_LANDSCAPE_A4.height; // lebar cetak aktual setelah swap lanskap
const TABLE_WIDTH_TWIPS = RENDERED_PAGE_WIDTH_TWIPS - PAGE_MARGIN.left - PAGE_MARGIN.right;

const CM_TO_TWIP = 1440 / 2.54;
const CAPAIAN_COL_WIDTH_TWIPS = Math.round(3 * CM_TO_TWIP); // kolom "Capaian pada Periode IPR" = 3cm

function pct(size) {
  return { size, type: WidthType.PERCENTAGE };
}
function dxa(size) {
  return { size, type: WidthType.DXA };
}

// Lebar kolom tabel HASIL KERJA / PERILAKU KERJA dalam twip (DXA) — kolom
// "Capaian pada Periode IPR" dipatok 3cm, sisanya dibagi proporsional
// seperti rasio sebelumnya (IKI 22 : Umpan Balik 21 : Kendala 21 : Usulan 21).
function feedbackColWidths() {
  const capaian = CAPAIAN_COL_WIDTH_TWIPS;
  const remaining = TABLE_WIDTH_TWIPS - capaian;
  const iki = Math.round((remaining * 22) / 85);
  const umpanBalik = Math.round((remaining * 21) / 85);
  const kendala = Math.round((remaining * 21) / 85);
  const usulan = TABLE_WIDTH_TWIPS - capaian - iki - umpanBalik - kendala; // sisa, supaya total pas
  return { iki, capaian, umpanBalik, kendala, usulan };
}

function headerCell(text, width, { rowSpan } = {}) {
  return new TableCell({
    width,
    borders: CELL_BORDERS,
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    rowSpan,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text, bold: true, color: HEADER_TEXT_COLOR, font: FONT_FAMILY, size: FONT_SIZE }),
        ],
      }),
    ],
  });
}

// Sel polos tanpa garis tabel — dipakai untuk blok identitas (Nama/NIP/
// Jabatan dst), yang di "Format IPR" acuan murni rata kolom pakai titik
// dua, bukan tabel bergrid.
function plainCell(text, { width, bold = false } = {}) {
  return new TableCell({
    width,
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text || ""), bold, font: FONT_FAMILY, size: FONT_SIZE })],
      }),
    ],
  });
}

function bodyCell(text, { width, bold = false, align } = {}) {
  return new TableCell({
    width,
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: String(text || "")
      .split("\n")
      .map(
        (line) =>
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: line, bold, font: FONT_FAMILY, size: FONT_SIZE })],
          })
      ),
  });
}

function identityRow(label1, value1, label2, value2) {
  return new TableRow({
    children: [
      plainCell(label1, { width: pct(15), bold: true }),
      plainCell(":", { width: pct(2) }),
      plainCell(value1, { width: pct(33) }),
      plainCell(label2, { width: pct(15), bold: true }),
      plainCell(":", { width: pct(2) }),
      plainCell(value2, { width: pct(33) }),
    ],
  });
}

// Header 2 baris mengikuti "Format IPR" acuan: baris pertama judul kolom
// (4 kolom di antaranya membentang 2 baris lewat rowSpan), baris kedua
// hanya berisi label periode di bawah kolom "Capaian pada Periode IPR" —
// bukan ditumpuk jadi 3 baris teks dalam satu sel seperti sebelumnya.
// Lebar kolom dipatok dalam twip (DXA) supaya kolom "Capaian pada Periode
// IPR" bisa persis 3cm, bukan persentase.
function feedbackTable(headerLabel, periodeLabel, rows) {
  const W = feedbackColWidths();
  const headerRow1 = new TableRow({
    children: [
      headerCell(headerLabel, dxa(W.iki), { rowSpan: 2 }),
      headerCell("Capaian pada Periode IPR", dxa(W.capaian)),
      headerCell("Umpan Balik Berkelanjutan", dxa(W.umpanBalik), { rowSpan: 2 }),
      headerCell("Kendala/Hambatan dan Penyebabnya", dxa(W.kendala), { rowSpan: 2 }),
      headerCell("Usulan Strategi Penyelesaian", dxa(W.usulan), { rowSpan: 2 }),
    ],
    tableHeader: true,
  });
  const headerRow2 = new TableRow({
    children: [headerCell(periodeLabel, dxa(W.capaian))],
    tableHeader: true,
  });

  const body = rows.map(
    (r) =>
      new TableRow({
        children: [
          bodyCell(r.label, { width: dxa(W.iki) }),
          bodyCell(r.capaian, { width: dxa(W.capaian), align: AlignmentType.CENTER }),
          bodyCell(r.umpanBalik, { width: dxa(W.umpanBalik) }),
          bodyCell(r.kendala, { width: dxa(W.kendala) }),
          bodyCell(r.usulan, { width: dxa(W.usulan) }),
        ],
      })
  );

  return new Table({ width: dxa(TABLE_WIDTH_TWIPS), rows: [headerRow1, headerRow2, ...body] });
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, font: FONT_FAMILY, size: FONT_SIZE })],
  });
}

/**
 * data = {
 *   identitas: { nama, nip, jabatan, es4, es3, es2 },
 *   periodeLabel: "Triwulan II 2026",
 *   hasilKerja: [{ namaIki, capaian, umpanBalik, kendala, usulan }],
 *   perilakuKerja: { orientasiPelayanan: {capaian,umpanBalik,kendala,usulan}, ... },
 *   pelatihan: [{ topik, kompetensi, waktu, penyelenggara }],
 *   kesimpulan: "...",
 *   tanggalTtd: "2026-04-29" (ISO) atau teks bebas,
 * }
 */
export async function generateIprDocxBuffer(data) {
  const { identitas = {}, periodeLabel, hasilKerja = [], perilakuKerja = {}, pelatihan = [], kesimpulan, tanggalTtd } =
    data;

  const parsed = periodeLabel?.match(/Triwulan\s+(I{1,3}V?|IV)\s+(\d{4})/i);
  const romanLabel = parsed ? parsed[1].toUpperCase() : "";
  const tahunLabel = parsed ? parsed[2] : "";

  // 7 aspek BerAKHLAK (menggantikan 6 aspek penilaian lama), sesuai data
  // NPK/BerAKHLAK per triwulan dari hasil tarik Monitoring IPR Satu Kemenkeu.
  const ASPEK_PERILAKU = [
    { key: "berorientasiPelayanan", label: "Berorientasi Pelayanan" },
    { key: "akuntabel", label: "Akuntabel" },
    { key: "kompeten", label: "Kompeten" },
    { key: "harmonis", label: "Harmonis" },
    { key: "loyal", label: "Loyal" },
    { key: "adaptif", label: "Adaptif" },
    { key: "kolaboratif", label: "Kolaboratif" },
  ];

  const hasilKerjaRows = (hasilKerja.length ? hasilKerja : [{ namaIki: "" }]).map((r) => ({
    label: r.namaIki || "",
    capaian: r.capaian || "",
    umpanBalik: r.umpanBalik || "",
    kendala: r.kendala || "",
    usulan: r.usulan || "",
  }));

  const perilakuRows = ASPEK_PERILAKU.map((a) => {
    const v = perilakuKerja[a.key] || {};
    return {
      label: a.label,
      capaian: v.capaian || "",
      umpanBalik: v.umpanBalik || "",
      kendala: v.kendala || "",
      usulan: v.usulan || "",
    };
  });

  const pelatihanHeader = new TableRow({
    children: [
      headerCell("Nama/Topik Pelatihan", pct(30)),
      headerCell("Kompetensi yang Dikembangkan", pct(35)),
      headerCell("Waktu", pct(15)),
      headerCell("Penyelenggara", pct(20)),
    ],
    tableHeader: true,
  });
  const pelatihanBodyRows = (pelatihan.length ? pelatihan : [{ topik: "", kompetensi: "", waktu: "", penyelenggara: "" }]).map(
    (p) =>
      new TableRow({
        children: [
          bodyCell(p.topik, { width: pct(30) }),
          bodyCell(p.kompetensi, { width: pct(35) }),
          bodyCell(p.waktu, { width: pct(15) }),
          bodyCell(p.penyelenggara, { width: pct(20) }),
        ],
      })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_FAMILY, size: FONT_SIZE },
        },
      },
    },
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
            children: [
              new TextRun({ text: "INDIVIDUAL PERFORMANCE REVIEW", bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `TRIWULAN ${romanLabel} TAHUN ${tahunLabel}`,
                bold: true,
                font: FONT_FAMILY,
                size: FONT_SIZE,
              }),
            ],
          }),
          new Table({
            width: pct(100),
            rows: [
              identityRow("Nama", identitas.nama || "", "Unit Eselon IV", identitas.es4 || "-"),
              identityRow("NIP", identitas.nip || "", "Unit Eselon III", identitas.es3 || "-"),
              identityRow("Jabatan", identitas.jabatan || "", "Unit Eselon II", identitas.es2 || "-"),
            ],
          }),

          sectionHeading("HASIL KERJA"),
          feedbackTable("IKI", periodeLabel || "", hasilKerjaRows),

          sectionHeading("PERILAKU KERJA"),
          feedbackTable("Aspek Penilaian", periodeLabel || "", perilakuRows),

          sectionHeading("USULAN PELATIHAN (TRAINING)"),
          new Table({ width: pct(100), rows: [pelatihanHeader, ...pelatihanBodyRows] }),

          sectionHeading("KESIMPULAN"),
          new Table({
            width: pct(100),
            rows: [
              new TableRow({
                children: [bodyCell(kesimpulan || "", { width: pct(100) })],
              }),
            ],
          }),

          // Blok tandatangan elektronik: diposisikan di pojok KANAN bawah
          // halaman lewat tabel 3 kolom tanpa garis — kolom 1 & 2 dibiarkan
          // kosong sebagai pengisi, konten ttd hanya diisi di kolom ke-3
          // (paling kanan). Teks di dalam kolom itu sendiri tetap rata KIRI
          // (tidak diberi alignment RIGHT) — yang berubah cuma posisi
          // bloknya ke sisi kanan halaman, bukan rata teksnya.
          new Table({
            width: pct(100),
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: pct(34),
                    borders: NO_BORDERS,
                    children: [new Paragraph({ children: [new TextRun("")] })],
                  }),
                  new TableCell({
                    width: pct(33),
                    borders: NO_BORDERS,
                    children: [new Paragraph({ children: [new TextRun("")] })],
                  }),
                  new TableCell({
                    width: pct(33),
                    borders: NO_BORDERS,
                    children: [
                      // Jarak kosong di bawah tanggal (ruang untuk QR/stempel
                      // ttd elektronik), lalu label "Ditandatangani secara
                      // elektronik" berwarna abu-abu langsung menempel di
                      // atas nama.
                      new Paragraph({ spacing: { before: 400 }, children: [new TextRun("")] }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Jakarta, ${formatTanggalIndonesia(tanggalTtd)}`,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({ children: [new TextRun("")] }),
                      new Paragraph({ children: [new TextRun("")] }),
                      new Paragraph({ children: [new TextRun("")] }),
                      new Paragraph({ children: [new TextRun("")] }),
                      new Paragraph({ children: [new TextRun("")] }),
                      new Paragraph({ children: [new TextRun("")] }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Ditandatangani secara elektronik",
                            color: TTD_LABEL_COLOR,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: identitas.nama || "",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: `NIP ${identitas.nip || ""}`, font: FONT_FAMILY, size: FONT_SIZE }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
