import { findUserByNip } from "@/lib/googleSheets";
import { ROLES } from "@/lib/roles";

/**
 * Memastikan pegawai dengan NIP `nip` termasuk dalam kewenangan `session`
 * yang sedang login di menu Verifikasi Koreksi Nilai (dan menu Pengaturan >
 * Update Data Pegawai): Admin KKPA boleh menyasar siapa saja, LO Subdit
 * hanya boleh menyasar pegawai pada Subdit (Eselon III) dia sendiri.
 * Dipanggil di SETIAP endpoint yang mengubah data pegawai lain (edit/hapus/
 * unggah bukti dukung) — bukan cuma disembunyikan di UI — supaya
 * pembatasannya tidak bisa dilewati lewat permintaan langsung ke API.
 *
 * Mengembalikan `{ target }` kalau boleh, atau `{ error: { message, status } }`
 * kalau tidak.
 */
export async function assertPegawaiDalamWewenang(session, nip) {
  const target = await findUserByNip(nip);
  if (!target) {
    return { error: { message: "Data pegawai tidak ditemukan.", status: 404 } };
  }

  if (session.role === ROLES.LO_SUBDIT) {
    if (!session.es3 || target.es3 !== session.es3) {
      return {
        error: { message: "Anda hanya dapat mengubah data pegawai pada Subdit Anda sendiri.", status: 403 },
      };
    }
  } else if (session.role !== ROLES.ADMIN_KKPA) {
    return { error: { message: "Anda tidak memiliki akses untuk melakukan ini.", status: 403 } };
  }

  return { target };
}
