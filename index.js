const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- PENGATURAN KONEKSI ---
// MASUKKAN LINK GOOGLE SCRIPT ABANG DI BAWAH INI:
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw17huSINyUawve_lQeYtLD5lMrPhVIsa2i-TvRW2eefgqP5WQVB19SJvSmfRLzWcM/exec'; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const express = require('express');
const app = express();

// --- PENGATURAN SERVER WEB BOHONGAN ---
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

// --- LOGIKA BOT WA ---
client.on('qr', (qr) => {
    console.log('SCAN QR CODE INI BANG:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready! Bot sukses nyala!');
});

client.on('message', async msg => {
    
    // --- FITUR 1: PENCATAT KEUANGAN ---
    if (msg.body.toLowerCase().startsWith('catat')) {
        const prompt = `Saya punya pesan pencatatan keuangan: "${msg.body}". 
        Tolong ekstrak menjadi format JSON dengan key: "tanggal" (DD/MM/YYYY), "kategori" (Pemasukan/Pengeluaran), "nominal" (angka tanpa titik/koma), dan "deskripsi".
        Hanya berikan balasan berupa teks JSON murni tanpa markdown, tanpa penjelasan apapun.`;

        try {
            msg.reply('Sebentar bang, lagi dicatat...');
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            
            const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            const dataJSON = JSON.parse(cleanJson);

            const fetch = require('node-fetch');
            const responseGAS = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(dataJSON),
                headers: { 'Content-Type': 'application/json' }
            });

            if (responseGAS.ok) {
                msg.reply(`✅ *Sukses Dicatat!*\n\nTanggal: ${dataJSON.tanggal}\nKategori: ${dataJSON.kategori}\nNominal: Rp${dataJSON.nominal}\nDeskripsi: ${dataJSON.deskripsi}`);
            } else {
                msg.reply('❌ Gagal ngirim data ke Google Sheet nih bang.');
            }

        } catch (error) {
            console.error('Error:', error);
            msg.reply('❌ Waduh, ada error pas memproses pesan abang.');
        }
    } 
    
    // --- FITUR 2: CHAT ISENG ---
    else if (msg.body.toLowerCase().startsWith('bot')) {
        const pertanyaan = msg.body.substring(3).trim(); 
        
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const promptIseng = `Kamu adalah asisten AI yang santai dan asyik diajak ngobrol. Balas pertanyaan ini dengan gaya bahasa gaul: "${pertanyaan}"`;
            
            const result = await model.generateContent(promptIseng);
            msg.reply(result.response.text());
        } catch (error) {
            console.error('Error Chat Iseng:', error);
            msg.reply('Aduh bang, pala bot lagi pusing nih (Limit API).');
        }
    }

});