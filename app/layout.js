import "./globals.css";

export const metadata = {
  title: "PARADIGM",
  description:
    "Pelaksanaan Anggaran Performance & Risk Action Digitalized Management — Direktorat Pelaksanaan Anggaran, DJPb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
