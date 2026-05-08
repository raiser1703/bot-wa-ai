const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- PENGATURAN KONEKSI ---
const GAS_URL = 'AKfycbw17huSINyUawve_lQeYtLD5lMrPhVIsa2i-TvRW2eefgqP5WQVB19SJvSmfRLzWcM'; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot Keuangan Bang Bot Sedang Berjalan!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server nyala di port ${port}`);
});

// --- PENGATURAN PUPPETEER KHUSUS TERMUX ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

// ... (Biarkan sisa kode di bawahnya tetap sama)

// Port akan otomatis disesuaikan oleh Render
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server nyala di port ${port}`);
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server nyala di port ${port}`);
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot Keuangan + AI sudah siap dan berjalan!');
});

// --- LOGIKA UTAMA BOT ---
client.on('message_create', async msg => {
    // Abaikan pesan grup atau status WA biar bot nggak spam
    if (msg.from === 'status@broadcast' || msg.isGroupMsg) return;

    // Ambil teks dari WA (hanya proses pesan berupa teks)
    const text = msg.body;
    if (!text || msg.hasMedia) return;

    // 🛑 ANTI-LOOP: Abaikan pesan yang ada emoji 🤖 (karena itu pesan dari bot sendiri)
    if (text.includes('🤖')) return;

    try {
        // Mengatur AI (Pastikan nama modelnya sesuai dengan yang jalan tadi, misal: gemini-pro atau gemini-2.0-flash)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
        
        // PROMPT SYSTEM: Perintah ketat agar AI tahu tugasnya
        const prompt = `Kamu adalah asisten keuangan pribadi bernama "Bang Bot". Sikapmu ramah, santai, dan asik seperti teman nongkrong.
        Tugasmu ada dua, pilih salah satu berdasarkan pesan user:
        
        ATURAN 1 (PENCATATAN): Jika pesan user menyatakan pengeluaran uang (contoh: "beli kopi 15rb", "bayar kos 1jt"), balas HANYA dengan format JSON murni ini:
        {"tipe": "catat", "kategori": "[makan/jajan/transport/tagihan/hiburan/dll]", "nominal": [angka bulat tanpa titik, contoh: 15000], "keterangan": "[keterangan singkat]"}
        
        ATURAN 2 (NGOBROL): Jika pesan user adalah sapaan, pertanyaan, atau curhatan biasa, balas HANYA dengan format JSON murni ini:
        {"tipe": "ngobrol", "pesan": "[jawaban santai kamu sebagai Bang Bot]"}
        
        Pesan user: "${text}"`;

        // Mengirim pesan ke AI
        const result = await model.generateContent(prompt);
        
        // Membersihkan respon AI dari format kode markdown jika ada
        const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanText);

        // --- AKSI BERDASARKAN KEPUTUSAN AI ---
        if (aiData.tipe === 'catat') {
            const tanggal = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            
            // Tembak data ke Google Sheets
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tanggal: tanggal,
                    kategori: aiData.kategori,
                    nominal: aiData.nominal,
                    keterangan: aiData.keterangan
                })
            });

            if (response.ok) {
                // Sisipkan emoji 🤖 di akhir pesan
                msg.reply(`✅ Beres bang, udah dicatet!\n\nKategori: ${aiData.kategori}\nNominal: Rp${aiData.nominal}\nKeterangan: ${aiData.keterangan}\n\n🤖`);
            } else {
                throw new Error('Gagal ngirim ke server Google');
            }

        } else if (aiData.tipe === 'ngobrol') {
            // Sisipkan emoji 🤖 di akhir pesan obrolan
            msg.reply(`${aiData.pesan} 🤖`);
        }

    } catch (error) {
        console.error("Waduh ada error:", error);
    }
});

client.initialize();