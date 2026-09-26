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
} from "docx";

// Menghasilkan dokumen Individual Performance Review (.docx) mengikuti
// struktur "Format IPR" (KMK-127 Tahun 2026) yang dicontohkan pengguna:
// judul -> identitas -> HASIL KERJA -> PERILAKU KERJA -> USULAN PELATIHAN
// -> KESIMPULAN -> blok tandatangan elektronik.

const NAVY = "16294F"; // dekat var(--navy) di UI PARADIGM
const HEADER_TEXT_COLOR = "FFFFFF";

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

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: HEADER_TEXT_COLOR, size: 18 })],
      }),
    ],
  });
}

function bodyCell(text, { widthPct, bold = false } = {}) {
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: String(text || "")
      .split("\n")
      .map((line) => new Paragraph({ children: [new TextRun({ text: line, bold, size: 18 })] })),
  });
}

function identityRow(label1, value1, label2, value2) {
  return new TableRow({
    children: [
      bodyCell(label1, { widthPct: 15, bold: true }),
      bodyCell(":", { widthPct: 2 }),
      bodyCell(value1, { widthPct: 33 }),
      bodyCell(label2, { widthPct: 15, bold: true }),
      bodyCell(":", { widthPct: 2 }),
      bodyCell(value2, { widthPct: 33 }),
    ],
  });
}

function feedbackTable(headerLabel, periodeLabel, rows) {
  const COLS = [22, 15, 21, 21, 21];
  const header = new TableRow({
    children: [
      headerCell(headerLabel, COLS[0]),
      headerCell(`Capaian pada\nPeriode IPR\n${periodeLabel}`, COLS[1]),
      headerCell("Umpan Balik Berkelanjutan", COLS[2]),
      headerCell("Kendala/Hambatan dan Penyebabnya", COLS[3]),
      headerCell("Usulan Strategi Penyelesaian", COLS[4]),
    ],
    tableHeader: true,
  });

  const body = rows.map(
    (r) =>
      new TableRow({
        children: [
          bodyCell(r.label, { widthPct: COLS[0] }),
          bodyCell(r.capaian, { widthPct: COLS[1] }),
          bodyCell(r.umpanBalik, { widthPct: COLS[2] }),
          bodyCell(r.kendala, { widthPct: COLS[3] }),
          bodyCell(r.usulan, { widthPct: COLS[4] }),
        ],
      })
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] });
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22 })],
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
      headerCell("Nama/Topik Pelatihan", 30),
      headerCell("Kompetensi yang Dikembangkan", 35),
      headerCell("Waktu", 15),
      headerCell("Penyelenggara", 20),
    ],
    tableHeader: true,
  });
  const pelatihanBodyRows = (pelatihan.length ? pelatihan : [{ topik: "", kompetensi: "", waktu: "", penyelenggara: "" }]).map(
    (p) =>
      new TableRow({
        children: [
          bodyCell(p.topik, { widthPct: 30 }),
          bodyCell(p.kompetensi, { widthPct: 35 }),
          bodyCell(p.waktu, { widthPct: 15 }),
          bodyCell(p.penyelenggara, { widthPct: 20 }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "INDIVIDUAL PERFORMANCE REVIEW", bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `TRIWULAN ${romanLabel} TAHUN ${tahunLabel}`, bold: true, size: 24 })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
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
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [pelatihanHeader, ...pelatihanBodyRows] }),

          sectionHeading("KESIMPULAN"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [bodyCell(kesimpulan || "", { widthPct: 100 })],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 400 }, children: [new TextRun("")] }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun(`Jakarta, ${formatTanggalIndonesia(tanggalTtd)}`)],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun("Ditandatangani secara elektronik")],
          }),
          new Paragraph({ spacing: { before: 300 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: identitas.nama || "", bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun(`NIP ${identitas.nip || ""}`)],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
