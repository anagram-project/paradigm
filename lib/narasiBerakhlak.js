// Pemetaan narasi otomatis Perilaku Kerja (7 aspek BerAKHLAK) berdasarkan
// rentang nilai Capaian, sesuai tabel "Narasi Per Kategori" pada file Excel
// acuan pengguna (Narasi_Umpan_Balik_BerAKHLAK). Dipakai oleh tombol "Auto
// Generate" di bagian Perilaku Kerja menu Buat IPR (BuatIprClient.js).
//
// File ini murni data + helper tanpa dependensi server (aman diimpor dari
// Client Component). Jangan tambahkan import "googleapis" dsb di sini.
//
// Catatan dari sumbernya: rentang 100–105 dan 70–90 TIDAK memiliki narasi
// (sengaja tidak dibuatkan di tabel acuan) — getNarasiBand() mengembalikan
// null untuk nilai di rentang tsb, dan pemanggil wajib menanganinya (lihat
// handleAutoGenerateNarasi di BuatIprClient.js).

export const NARASI_BERAKHLAK_BANDS = [
  { key: "tertinggi", label: "Di Atas Ekspektasi (nilai tertinggi)", rentang: "118 – 120", test: (n) => n >= 118 && n <= 120 },
  { key: "sangatBaik", label: "Di Atas Ekspektasi (Sangat Baik)", rentang: "115 – 117,99", test: (n) => n >= 115 && n < 118 },
  { key: "baik", label: "Sesuai Ekspektasi (Baik)", rentang: "> 105 – 115", test: (n) => n > 105 && n < 115 },
  { key: "kurang", label: "Perlu Peningkatan / Kurang Memenuhi Ekspektasi", rentang: "90 – 100", test: (n) => n >= 90 && n <= 100 },
  { key: "sangatKurang", label: "Tidak Memenuhi Ekspektasi (Sangat Kurang)", rentang: "< 70", test: (n) => n < 70 },
];

/** "117,8" / "117.8" / 117.8 -> 117.8 (angka JS, koma Indonesia didukung). */
export function parseNilaiPerilaku(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Mengembalikan definisi band (kategori) untuk satu nilai Capaian, atau null
 * kalau nilainya di luar seluruh rentang yang terdefinisi (celah 100–105 /
 * 70–90, atau nilai tidak valid). */
export function getNarasiBand(value) {
  const n = parseNilaiPerilaku(value);
  if (n === null) return null;
  return NARASI_BERAKHLAK_BANDS.find((b) => b.test(n)) || null;
}

// narasi[bandKey][aspekLabel] = { umpanBalik, kendala, usulan }
// aspekLabel harus persis sama dengan ASPEK_PERILAKU[].label di BuatIprClient.js.
export const NARASI_BERAKHLAK = {
  tertinggi: {
    "Berorientasi Pelayanan": {
      umpanBalik:
        "Pegawai secara konsisten menunjukkan perilaku melayani yang melampaui ekspektasi. Pegawai ramah, cekatan, dan solutif, tidak hanya menjawab kebutuhan pengguna layanan tetapi juga mengantisipasi kebutuhan yang belum disampaikan. Sikap melayaninya tulus dan konsisten dalam berbagai situasi, bahkan saat menghadapi tekanan atau pengguna layanan yang sulit. Pegawai menjadi teladan pelayanan prima dan mendorong rekan kerja untuk melayani dengan standar yang sama. Pertahankan dan terus tularkan budaya pelayanan ini.",
      kendala:
        "Tidak ditemukan kendala yang berarti dalam penerapan perilaku berorientasi pelayanan. Satu-satunya tantangan yang perlu diantisipasi adalah menjaga konsistensi sikap melayani dan energi positif dalam jangka panjang, terutama pada saat kebutuhan layanan meningkat bersamaan, agar standar pelayanan yang sudah sangat baik tetap terjaga.",
      usulan:
        "Mempertahankan standar pelayanan yang ada, menjadi duta atau panutan pelayanan prima di unit kerja, membagikan praktik baik melayani kepada rekan kerja melalui forum berbagi, mengajak rekan kerja menumbuhkan budaya melayani sepenuh hati, serta terus menggali masukan pengguna layanan sebagai bahan penyempurnaan.",
    },
    Akuntabel: {
      umpanBalik:
        "Pegawai menunjukkan integritas dan rasa tanggung jawab yang sangat tinggi dan konsisten dalam seluruh perilaku kerjanya. Pegawai jujur, disiplin, cermat, dan amanah dalam menjalankan tugas serta menggunakan kewenangan dan sumber daya organisasi secara bijaksana dan transparan. Pegawai berani mengakui dan memperbaiki kesalahan secara terbuka serta menjadi contoh bagi rekan kerja dalam menjaga etika dan kode perilaku ASN. Pertahankan keteladanan ini.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu terus dijaga adalah konsistensi menjaga integritas dan kedisiplinan di tengah dinamika dan kesibukan kerja, serta kesiapan menjadi panutan yang selalu diamati oleh rekan kerja dan pimpinan.",
      usulan:
        "Terus menjaga disiplin, kejujuran, dan transparansi dalam bekerja, menjadi panutan integritas bagi rekan kerja, mendorong budaya saling mengingatkan secara positif dalam hal etika dan tanggung jawab, serta secara berkala melakukan refleksi diri agar nilai akuntabel tetap terjaga.",
    },
    Kompeten: {
      umpanBalik:
        "Pegawai memiliki semangat belajar yang sangat tinggi dan terus-menerus meningkatkan kemampuan dirinya secara mandiri dan proaktif, termasuk di bidang digital dan pengetahuan baru yang relevan. Pegawai melaksanakan tugas dengan kualitas terbaik, bersedia membantu dan membimbing rekan kerja yang membutuhkan, serta aktif berbagi pengetahuan. Pegawai telah menjadi rujukan bagi rekan kerja dalam bidangnya. Pertahankan dan perluas peran sebagai sumber belajar bagi lingkungan kerja.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga ritme belajar di tengah kesibukan dan percepatan perubahan pengetahuan, agar kompetensi yang sudah unggul tetap mutakhir dan relevan.",
      usulan:
        "Menyusun rencana pengembangan diri secara berkelanjutan, mengikuti pelatihan dan sumber belajar yang relevan, mengambil peran sebagai mentor atau fasilitator berbagi ilmu bagi rekan kerja, serta membangun budaya belajar bersama di lingkungan kerja agar kompetensi organisasi ikut meningkat.",
    },
    Harmonis: {
      umpanBalik:
        "Pegawai menunjukkan sikap saling menghargai, menerima perbedaan, dan peduli kepada sesama secara konsisten dan tulus. Pegawai suka menolong, mampu menjadi penengah yang menenangkan, dan aktif menciptakan suasana kerja yang kondusif, hangat, dan inklusif. Komunikasinya santun, terbuka, dan menghargai setiap orang tanpa membedakan latar belakang. Pegawai menjadi perekat tim dan teladan keharmonisan di lingkungan kerja. Pertahankan sikap ini.",
      kendala:
        "Tidak ditemukan kendala yang berarti dalam membangun hubungan kerja yang harmonis. Tantangan yang perlu terus diperhatikan adalah menjaga kepekaan terhadap perbedaan pandangan dan kebutuhan setiap orang seiring dinamika tim yang terus berubah.",
      usulan:
        "Mempertahankan sikap menghargai dan inklusif, terus menjadi perekat dan penengah di lingkungan kerja, menginisiasi kegiatan kebersamaan yang mempererat hubungan antarpegawai, serta menularkan budaya saling menghargai dan saling membantu kepada seluruh rekan kerja.",
    },
    Loyal: {
      umpanBalik:
        "Pegawai menunjukkan komitmen, dedikasi, dan kesetiaan yang sangat tinggi kepada organisasi dan negara. Pegawai memegang teguh nilai dasar ASN, menjaga nama baik pimpinan, rekan kerja, dan institusi dalam setiap situasi, menjaga rahasia jabatan dan negara dengan baik, serta patuh pada ketentuan yang berlaku. Pegawai konsisten mengutamakan kepentingan organisasi dan menjadi teladan loyalitas bagi rekan kerja. Pertahankan keteladanan ini.",
      kendala:
        "Tidak ditemukan kendala yang berarti dalam penerapan perilaku loyal. Hal yang tetap perlu dijaga adalah kehati-hatian dalam menyampaikan informasi dan bermedia sosial agar nama baik dan kerahasiaan organisasi senantiasa terlindungi.",
      usulan:
        "Mempertahankan komitmen dan kesetiaan kepada organisasi dan negara, menjadi duta nilai-nilai organisasi di lingkungan kerja, terus menjaga kerahasiaan informasi dan nama baik instansi termasuk dalam penggunaan media sosial, serta mengajak rekan kerja memperkuat rasa memiliki dan kebanggaan terhadap organisasi.",
    },
    Adaptif: {
      umpanBalik:
        "Pegawai menunjukkan sikap yang sangat terbuka, lentur, dan cepat menyesuaikan diri terhadap berbagai perubahan, baik lingkungan kerja, teknologi, maupun cara bekerja yang baru. Pegawai proaktif menjemput perubahan, berani mencoba hal baru, menyikapi tantangan secara positif, dan sering menjadi penggerak yang membantu rekan kerja agar nyaman menghadapi perubahan. Pegawai menjadi contoh agen perubahan di lingkungan kerja. Pertahankan dan perluas peran ini.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga semangat dan energi beradaptasi di tengah perubahan yang datang beruntun, serta memastikan rekan kerja lain ikut terbawa dalam proses penyesuaian tersebut.",
      usulan:
        "Terus menumbuhkan pola pikir bertumbuh dan keberanian mencoba hal baru, menjadi agen perubahan yang mendampingi rekan kerja menghadapi perubahan, membagikan pengalaman dan cara beradaptasi yang efektif, serta aktif menyampaikan gagasan perbaikan bagi lingkungan kerja.",
    },
    Kolaboratif: {
      umpanBalik:
        "Pegawai menunjukkan sikap kolaboratif yang sangat baik dan menjadi penggerak kerja sama di lingkungannya. Pegawai terbuka terhadap masukan dan gagasan orang lain, memberi ruang bagi setiap pihak untuk berkontribusi, serta bersedia berbagi informasi dan sumber daya demi tujuan bersama. Pegawai mampu membangun jejaring kerja sama dengan berbagai pihak dan memanfaatkan keahlian rekan kerja secara optimal. Pertahankan dan perluas sikap kolaboratif ini.",
      kendala:
        "Tidak ditemukan kendala yang berarti dalam membangun kolaborasi. Tantangan yang perlu diantisipasi adalah menjaga kesinambungan kerja sama dengan berbagai pihak yang memiliki kesibukan dan kepentingan berbeda, agar semangat kolaborasi tetap hidup dalam jangka panjang.",
      usulan:
        "Mempertahankan peran sebagai penggerak kolaborasi, memperluas jejaring kerja sama dengan berbagai pihak, menginisiasi forum bertukar gagasan dan informasi, mendorong rekan kerja untuk saling melibatkan dan memanfaatkan keahlian bersama, serta menjaga kepercayaan dan komunikasi terbuka antaranggota tim.",
    },
  },

  sangatBaik: {
    "Berorientasi Pelayanan": {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Berorientasi Pelayanan dengan sangat baik dan menjadi positive role model; pegawai ramah, sopan, cekatan, dan solutif dalam melayani pengguna layanan serta terus melakukan perbaikan. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk menjadi duta pelayanan prima dan membagikan praktik baik melayani kepada rekan kerja.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga konsistensi sikap melayani saat kebutuhan layanan meningkat bersamaan.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, menjadi duta pelayanan prima dan membagikan praktik baik melayani kepada rekan kerja, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
    Akuntabel: {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Akuntabel dengan sangat baik dan menjadi positive role model; pegawai jujur, disiplin, cermat, dan bertanggung jawab dalam menjalankan tugas serta menggunakan kewenangan secara bijaksana. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk menjadi panutan integritas dan mendorong budaya saling mengingatkan secara positif.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga konsistensi integritas dan kedisiplinan di tengah kesibukan kerja.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, menjadi panutan integritas dan mendorong budaya saling mengingatkan secara positif, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
    Kompeten: {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Kompeten dengan sangat baik dan menjadi positive role model; pegawai terus belajar, meningkatkan kemampuan diri, membantu orang lain belajar, dan melaksanakan tugas dengan kualitas terbaik. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk berperan sebagai mentor dan sumber belajar bagi rekan kerja.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga ritme belajar di tengah kesibukan dan perkembangan pengetahuan yang cepat.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, berperan sebagai mentor dan sumber belajar bagi rekan kerja, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
    Harmonis: {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Harmonis dengan sangat baik dan menjadi positive role model; pegawai saling menghargai, menerima perbedaan, suka menolong, dan membangun suasana kerja yang kondusif. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk menjadi perekat tim dan penengah yang menenangkan di lingkungan kerja.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga kepekaan terhadap perbedaan pandangan seiring dinamika tim.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, menjadi perekat tim dan penengah yang menenangkan di lingkungan kerja, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
    Loyal: {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Loyal dengan sangat baik dan menjadi positive role model; pegawai memegang teguh nilai dasar ASN, setia kepada organisasi dan negara, menjaga nama baik, serta menjaga rahasia jabatan. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk menjadi duta nilai organisasi dan menumbuhkan rasa memiliki di antara rekan kerja.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga kehati-hatian dalam menyampaikan informasi dan bermedia sosial.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, menjadi duta nilai organisasi dan menumbuhkan rasa memiliki di antara rekan kerja, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
    Adaptif: {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Adaptif dengan sangat baik dan menjadi positive role model; pegawai cepat menyesuaikan diri terhadap perubahan, terbuka pada hal baru, serta proaktif dan inovatif. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk menjadi agen perubahan yang membantu rekan kerja menghadapi perubahan.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga semangat beradaptasi di tengah perubahan yang datang beruntun.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, menjadi agen perubahan yang membantu rekan kerja menghadapi perubahan, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
    Kolaboratif: {
      umpanBalik:
        "Pegawai memenuhi seluruh indikator perilaku utama Kolaboratif dengan sangat baik dan menjadi positive role model; pegawai terbuka terhadap masukan, memberi ruang bagi orang lain berkontribusi, serta berbagi informasi dan sumber daya demi tujuan bersama. Perilakunya konsisten dan layak dicontoh rekan kerja. Disarankan untuk menjadi penggerak kolaborasi dan memperluas jejaring kerja sama.",
      kendala:
        "Tidak ditemukan kendala yang berarti. Tantangan yang perlu diantisipasi adalah menjaga kesinambungan kerja sama dengan pihak yang memiliki kesibukan dan kepentingan berbeda.",
      usulan:
        "Mempertahankan perilaku yang sudah sangat baik, menjadi penggerak kolaborasi dan memperluas jejaring kerja sama, serta melakukan refleksi diri secara berkala agar konsistensi perilaku tetap terjaga.",
    },
  },

  baik: {
    "Berorientasi Pelayanan": {
      umpanBalik:
        "Pegawai menunjukkan perilaku Berorientasi Pelayanan yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai ramah, sopan, cekatan, dan solutif dalam melayani pengguna layanan serta terus melakukan perbaikan. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada kecepatan merespons dan sikap solutif dalam menghadapi kebutuhan pengguna layanan yang kompleks.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya kecepatan merespons dan sikap solutif dalam menghadapi kebutuhan pengguna layanan yang kompleks. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada kecepatan merespons dan sikap solutif dalam menghadapi kebutuhan pengguna layanan yang kompleks, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
    Akuntabel: {
      umpanBalik:
        "Pegawai menunjukkan perilaku Akuntabel yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai jujur, disiplin, cermat, dan bertanggung jawab dalam menjalankan tugas serta menggunakan kewenangan secara bijaksana. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada ketelitian, keterbukaan dalam mengakui kesalahan, dan kedisiplinan pada situasi tertentu.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya ketelitian, keterbukaan dalam mengakui kesalahan, dan kedisiplinan pada situasi tertentu. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada ketelitian, keterbukaan dalam mengakui kesalahan, dan kedisiplinan pada situasi tertentu, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
    Kompeten: {
      umpanBalik:
        "Pegawai menunjukkan perilaku Kompeten yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai terus belajar, meningkatkan kemampuan diri, membantu orang lain belajar, dan melaksanakan tugas dengan kualitas terbaik. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada inisiatif belajar mandiri dan kesediaan berbagi pengetahuan dengan rekan kerja.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya inisiatif belajar mandiri dan kesediaan berbagi pengetahuan dengan rekan kerja. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada inisiatif belajar mandiri dan kesediaan berbagi pengetahuan dengan rekan kerja, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
    Harmonis: {
      umpanBalik:
        "Pegawai menunjukkan perilaku Harmonis yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai saling menghargai, menerima perbedaan, suka menolong, dan membangun suasana kerja yang kondusif. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada kepedulian dan inisiatif membantu rekan kerja serta sikap menghargai perbedaan pada situasi tertentu.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya kepedulian dan inisiatif membantu rekan kerja serta sikap menghargai perbedaan pada situasi tertentu. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada kepedulian dan inisiatif membantu rekan kerja serta sikap menghargai perbedaan pada situasi tertentu, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
    Loyal: {
      umpanBalik:
        "Pegawai menunjukkan perilaku Loyal yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai memegang teguh nilai dasar ASN, setia kepada organisasi dan negara, menjaga nama baik, serta menjaga rahasia jabatan. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada rasa memiliki terhadap organisasi dan kehati-hatian dalam menjaga nama baik serta informasi.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya rasa memiliki terhadap organisasi dan kehati-hatian dalam menjaga nama baik serta informasi. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada rasa memiliki terhadap organisasi dan kehati-hatian dalam menjaga nama baik serta informasi, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
    Adaptif: {
      umpanBalik:
        "Pegawai menunjukkan perilaku Adaptif yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai cepat menyesuaikan diri terhadap perubahan, terbuka pada hal baru, serta proaktif dan inovatif. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada inisiatif mencoba hal baru dan kecepatan menyesuaikan diri terhadap perubahan.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya inisiatif mencoba hal baru dan kecepatan menyesuaikan diri terhadap perubahan. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada inisiatif mencoba hal baru dan kecepatan menyesuaikan diri terhadap perubahan, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
    Kolaboratif: {
      umpanBalik:
        "Pegawai menunjukkan perilaku Kolaboratif yang baik dan memenuhi minimal empat indikator perilaku utama; pegawai terbuka terhadap masukan, memberi ruang bagi orang lain berkontribusi, serta berbagi informasi dan sumber daya demi tujuan bersama. Perilaku ini sudah sesuai ekspektasi, namun belum sampai menjadi teladan (positive role model) bagi rekan kerja. Perlu ditingkatkan pada keterbukaan berbagi informasi dan inisiatif membangun kerja sama dengan berbagai pihak.",
      kendala:
        "Kendala yang dihadapi tergolong ringan, yaitu belum optimalnya keterbukaan berbagi informasi dan inisiatif membangun kerja sama dengan berbagai pihak. Hal ini disebabkan perilaku tersebut belum menjadi kebiasaan yang konsisten pada semua situasi.",
      usulan:
        "Meningkatkan konsistensi pada keterbukaan berbagi informasi dan inisiatif membangun kerja sama dengan berbagai pihak, meminta umpan balik dari atasan dan rekan kerja secara berkala, serta menjadikan perilaku ini kebiasaan sehari-hari agar dapat meningkat menjadi tingkat teladan.",
    },
  },

  kurang: {
    "Berorientasi Pelayanan": {
      umpanBalik:
        "Perilaku Berorientasi Pelayanan pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa sikap ramah dan responsif dalam melayani yang belum konsisten, misalnya lambat menanggapi atau kurang memahami kebutuhan pengguna layanan. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah sikap ramah dan responsif dalam melayani yang belum konsisten, misalnya lambat menanggapi atau kurang memahami kebutuhan pengguna layanan. Penyebabnya antara lain pemahaman terhadap kebutuhan pengguna layanan yang belum mendalam dan kesadaran untuk melayani yang belum menjadi kebiasaan.",
      usulan:
        "Melakukan pelatihan komunikasi dan layanan prima, pendampingan atasan dalam melayani, serta permintaan umpan balik dari pengguna layanan secara rutin. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
    Akuntabel: {
      umpanBalik:
        "Perilaku Akuntabel pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa kedisiplinan dan kecermatan yang belum konsisten, serta kecenderungan kurang terbuka dalam mengakui dan memperbaiki kesalahan. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah kedisiplinan dan kecermatan yang belum konsisten, serta kecenderungan kurang terbuka dalam mengakui dan memperbaiki kesalahan. Penyebabnya antara lain pemahaman terhadap batas kewenangan dan kode etik yang belum kuat serta kebiasaan memeriksa kembali pekerjaan yang belum terbentuk.",
      usulan:
        "Melakukan penguatan pemahaman kode etik dan batas kewenangan, pendampingan atasan, serta pembiasaan disiplin waktu dan refleksi diri. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
    Kompeten: {
      umpanBalik:
        "Perilaku Kompeten pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa semangat belajar dan upaya meningkatkan kemampuan diri yang masih rendah serta kurang bersedia menerima masukan. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah semangat belajar dan upaya meningkatkan kemampuan diri yang masih rendah serta kurang bersedia menerima masukan. Penyebabnya antara lain motivasi belajar yang belum kuat dan rencana pengembangan diri yang belum tersusun.",
      usulan:
        "Melakukan penyusunan rencana pengembangan diri, pelatihan sesuai kebutuhan, bimbingan oleh rekan atau atasan yang lebih berpengalaman, serta evaluasi berkala. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
    Harmonis: {
      umpanBalik:
        "Perilaku Harmonis pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa sikap saling menghargai dan kepedulian kepada rekan kerja yang belum konsisten, serta komunikasi yang sesekali kurang santun. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah sikap saling menghargai dan kepedulian kepada rekan kerja yang belum konsisten, serta komunikasi yang sesekali kurang santun. Penyebabnya antara lain kebiasaan berkomunikasi yang kurang tepat dan pemahaman terhadap perbedaan gaya serta latar belakang rekan kerja yang masih terbatas.",
      usulan:
        "Melakukan pelatihan komunikasi efektif, pembiasaan sikap saling menghargai, kegiatan kebersamaan, serta pendampingan atasan dalam menyelesaikan perbedaan. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
    Loyal: {
      umpanBalik:
        "Perilaku Loyal pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa komitmen terhadap organisasi dan kehati-hatian menjaga nama baik serta rahasia jabatan yang belum konsisten. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah komitmen terhadap organisasi dan kehati-hatian menjaga nama baik serta rahasia jabatan yang belum konsisten. Penyebabnya antara lain pemahaman terhadap nilai dasar ASN dan arah organisasi yang belum mendalam serta rasa memiliki yang belum kuat.",
      usulan:
        "Melakukan penguatan pemahaman nilai dasar ASN dan etika bermedia sosial, pembinaan atasan, serta pelibatan dalam kegiatan yang memperkuat rasa memiliki. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
    Adaptif: {
      umpanBalik:
        "Perilaku Adaptif pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa sikap terbuka dan kecepatan menyesuaikan diri terhadap perubahan yang masih rendah, serta kecenderungan bertahan pada cara lama. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah sikap terbuka dan kecepatan menyesuaikan diri terhadap perubahan yang masih rendah, serta kecenderungan bertahan pada cara lama. Penyebabnya antara lain rasa kurang nyaman terhadap hal baru dan pola pikir bertumbuh yang belum terbentuk.",
      usulan:
        "Melakukan pendampingan saat terjadi perubahan, pelatihan penggunaan hal baru, pembiasaan mencoba perbaikan kecil, serta evaluasi berkala oleh atasan. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
    Kolaboratif: {
      umpanBalik:
        "Perilaku Kolaboratif pegawai masih kurang memenuhi ekspektasi dan perlu ditingkatkan. Pegawai baru memenuhi sebagian indikator perilaku utama, dengan catatan berupa keterbukaan berbagi informasi dan kesediaan bekerja sama yang belum konsisten, serta kecenderungan bekerja sendiri. Pegawai diharapkan lebih sungguh-sungguh memperbaiki perilaku ini dengan bimbingan atasan.",
      kendala:
        "Kendala yang dihadapi adalah keterbukaan berbagi informasi dan kesediaan bekerja sama yang belum konsisten, serta kecenderungan bekerja sendiri. Penyebabnya antara lain kebiasaan bekerja sendiri serta kepercayaan dan komunikasi dengan rekan kerja yang belum terbangun.",
      usulan:
        "Melakukan pembiasaan bekerja dalam tim, pembagian peran yang jelas, forum koordinasi rutin, serta pendampingan atasan dalam membangun kerja sama. Atasan memantau perkembangan perilaku secara berkala dan memberikan umpan balik langsung agar perilaku segera membaik.",
    },
  },

  sangatKurang: {
    "Berorientasi Pelayanan": {
      umpanBalik:
        "Perilaku Berorientasi Pelayanan pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan sikap mengabaikan kebutuhan pengguna layanan, mempersulit, atau bersikap kurang sopan dalam melayani. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah sikap mengabaikan kebutuhan pengguna layanan, mempersulit, atau bersikap kurang sopan dalam melayani. Penyebabnya antara lain pemahaman terhadap kebutuhan pengguna layanan yang belum mendalam dan kesadaran untuk melayani yang belum menjadi kebiasaan. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup pelatihan komunikasi dan layanan prima, pendampingan atasan dalam melayani, serta permintaan umpan balik dari pengguna layanan secara rutin, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
    Akuntabel: {
      umpanBalik:
        "Perilaku Akuntabel pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan pelanggaran kedisiplinan, ketidakjujuran, atau penyalahgunaan kewenangan yang bertentangan dengan kode etik ASN. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah pelanggaran kedisiplinan, ketidakjujuran, atau penyalahgunaan kewenangan yang bertentangan dengan kode etik ASN. Penyebabnya antara lain pemahaman terhadap batas kewenangan dan kode etik yang belum kuat serta kebiasaan memeriksa kembali pekerjaan yang belum terbentuk. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup penguatan pemahaman kode etik dan batas kewenangan, pendampingan atasan, serta pembiasaan disiplin waktu dan refleksi diri, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
    Kompeten: {
      umpanBalik:
        "Perilaku Kompeten pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan sikap enggan belajar, menolak masukan, dan tidak adanya upaya meningkatkan kemampuan diri. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah sikap enggan belajar, menolak masukan, dan tidak adanya upaya meningkatkan kemampuan diri. Penyebabnya antara lain motivasi belajar yang belum kuat dan rencana pengembangan diri yang belum tersusun. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup penyusunan rencana pengembangan diri, pelatihan sesuai kebutuhan, bimbingan oleh rekan atau atasan yang lebih berpengalaman, serta evaluasi berkala, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
    Harmonis: {
      umpanBalik:
        "Perilaku Harmonis pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan sikap tidak menghargai, pemicu konflik, atau perilaku diskriminatif terhadap rekan kerja. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah sikap tidak menghargai, pemicu konflik, atau perilaku diskriminatif terhadap rekan kerja. Penyebabnya antara lain kebiasaan berkomunikasi yang kurang tepat dan pemahaman terhadap perbedaan gaya serta latar belakang rekan kerja yang masih terbatas. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup pelatihan komunikasi efektif, pembiasaan sikap saling menghargai, kegiatan kebersamaan, serta pendampingan atasan dalam menyelesaikan perbedaan, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
    Loyal: {
      umpanBalik:
        "Perilaku Loyal pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan pelanggaran terhadap kesetiaan dan ketaatan, seperti membocorkan rahasia jabatan, merusak nama baik instansi, atau tidak menaati ketentuan. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah pelanggaran terhadap kesetiaan dan ketaatan, seperti membocorkan rahasia jabatan, merusak nama baik instansi, atau tidak menaati ketentuan. Penyebabnya antara lain pemahaman terhadap nilai dasar ASN dan arah organisasi yang belum mendalam serta rasa memiliki yang belum kuat. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup penguatan pemahaman nilai dasar ASN dan etika bermedia sosial, pembinaan atasan, serta pelibatan dalam kegiatan yang memperkuat rasa memiliki, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
    Adaptif: {
      umpanBalik:
        "Perilaku Adaptif pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan penolakan terhadap perubahan, keengganan menyesuaikan diri, dan sikap menghambat upaya perbaikan di lingkungan kerja. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah penolakan terhadap perubahan, keengganan menyesuaikan diri, dan sikap menghambat upaya perbaikan di lingkungan kerja. Penyebabnya antara lain rasa kurang nyaman terhadap hal baru dan pola pikir bertumbuh yang belum terbentuk. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup pendampingan saat terjadi perubahan, pelatihan penggunaan hal baru, pembiasaan mencoba perbaikan kecil, serta evaluasi berkala oleh atasan, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
    Kolaboratif: {
      umpanBalik:
        "Perilaku Kolaboratif pegawai tidak memenuhi ekspektasi dan tergolong sangat kurang. Ditemukan sikap tidak mau bekerja sama, menyembunyikan informasi, atau menghambat kerja tim. Pegawai perlu segera memperbaiki perilaku dan mendapat pembinaan intensif dari atasan; apabila tidak ada perubahan, dapat dikenakan hukuman disiplin sesuai ketentuan yang berlaku.",
      kendala:
        "Kendala utama adalah sikap tidak mau bekerja sama, menyembunyikan informasi, atau menghambat kerja tim. Penyebabnya antara lain kebiasaan bekerja sendiri serta kepercayaan dan komunikasi dengan rekan kerja yang belum terbangun. Kemauan untuk berubah juga masih sangat rendah.",
      usulan:
        "Melakukan pembinaan intensif oleh atasan dan menyusun rencana perbaikan perilaku dengan batas waktu yang jelas. Langkah pembinaan mencakup pembiasaan bekerja dalam tim, pembagian peran yang jelas, forum koordinasi rutin, serta pendampingan atasan dalam membangun kerja sama, dengan evaluasi berkala. Jika tidak ada perbaikan, diproses sesuai ketentuan disiplin pegawai.",
    },
  },
};

/** Narasi (umpanBalik/kendala/usulan) untuk satu aspek pada satu nilai
 * Capaian, atau null kalau nilainya di luar seluruh rentang yang
 * terdefinisi. */
export function getNarasiBerakhlak(aspekLabel, capaianValue) {
  const band = getNarasiBand(capaianValue);
  if (!band) return null;
  return NARASI_BERAKHLAK[band.key]?.[aspekLabel] || null;
}
