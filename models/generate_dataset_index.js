// File: generate_dataset_index.js

const fs = require('fs');
const path = require('path');

// Tentukan path ke folder dataset Anda
const datasetDirectory = path.join(__dirname, 'public', 'dataset'); // Sesuaikan 'public/dataset' jika perlu

// Objek untuk menampung hasil pengelompokan
const groupedFiles = {};

console.log(`Memindai file di: ${datasetDirectory}`);

try {
    // Baca semua file yang ada di dalam direktori dataset
    const files = fs.readdirSync(datasetDirectory);

    // Loop melalui setiap file
    files.forEach(file => {
        // Pastikan hanya memproses file gambar dan bukan file JSON itu sendiri
        if (/\.(jpg|jpeg|png)$/i.test(file)) {

            // Ekstrak label dari nama file (ambil teks sebelum '_')
            // Contoh: 'afif_1.jpg' -> 'afif'
            const label = file.split('_')[0];

            if (label) {
                // Jika label ini belum ada di objek, buat array baru untuknya
                if (!groupedFiles[label]) {
                    groupedFiles[label] = [];
                }
                // Tambahkan nama file ke array yang sesuai dengan labelnya
                groupedFiles[label].push(file);
            }
        }
    });

    // Tentukan di mana file JSON akan disimpan
    const outputPath = path.join(datasetDirectory, 'dataset_index.json');

    // Tulis objek groupedFiles ke dalam file dataset_index.json
    // 'JSON.stringify' dengan spasi 2 agar filenya rapi dan mudah dibaca
    fs.writeFileSync(outputPath, JSON.stringify(groupedFiles, null, 2));

    console.log('✅ File dataset_index.json berhasil dibuat/diperbarui!');
    console.log(JSON.stringify(groupedFiles, null, 2));

} catch (error) {
    console.error('❌ Terjadi kesalahan saat memindai direktori dataset:', error);
    console.log('Pastikan path ke folder dataset sudah benar.');
}