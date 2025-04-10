// File: index.js

const { Client, LocalAuth } = require('whatsapp-web.js'); const qrcode = require('qrcode-terminal');

const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] } });

const spamKeywords = ['http://', 'https://', 'promo', 'join grup', 'klik link']; const toxicKeywords = [ 'bodoh', 'tolol', 'anjing', 'bangsat', 'goblok', 'idiot', 'brengsek', 'kontol', 'memek', 'ngentot', 'cupu', 'cacat', 'babi', 'anjir', 'sinting', 'tol', 'asu', 'plg', 'bacot', 'tai' ]; const strikeMap = {}; // Simpan strike user

client.on('qr', (qr) => { console.log('Scan QR ini pake WhatsApp kamu:'); qrcode.generate(qr, { small: true }); });

client.on('ready', () => { console.log('Bot siap memantau grup...'); });

client.on('message', async (msg) => { if (!msg.from.endsWith('@g.us')) return; // Cek apakah pesan dari grup

const chat = await msg.getChat(); const sender = await msg.getContact(); const messageText = msg.body.toLowerCase();

// Cek spam const isSpam = spamKeywords.some((word) => messageText.includes(word)); if (isSpam) { const isAdmin = chat.participants.find( (p) => p.id._serialized === sender.id._serialized && p.isAdmin );

if (!isAdmin && chat.isGroup) {
  try {
    await chat.removeParticipants([sender.id._serialized]);
    await chat.sendMessage(`@${sender.id.user} dikeluarkan karena spam.`, {
      mentions: [sender]
    });
    console.log(`Spam terdeteksi. ${sender.id.user} dikeluarkan.`);
  } catch (err) {
    console.error('Gagal kick member:', err);
  }
}
return;

}

// Cek toxic const isToxic = toxicKeywords.some((word) => messageText.includes(word)); if (isToxic) { const userId = sender.id._serialized; if (!strikeMap[userId]) strikeMap[userId] = 0; strikeMap[userId] += 1;

console.log(`Toxic terdeteksi dari ${userId}, strike ke-${strikeMap[userId]}`);

if (strikeMap[userId] >= 3) {
  const isAdmin = chat.participants.find(
    (p) => p.id._serialized === sender.id._serialized && p.isAdmin
  );

  if (!isAdmin && chat.isGroup) {
    try {
      await chat.removeParticipants([userId]);
      await chat.sendMessage(`@${sender.id.user} dikeluarkan karena toxic 3x berturut-turut.`, {
        mentions: [sender]
      });
      delete strikeMap[userId]; // Reset strike
    } catch (err) {
      console.error('Gagal kick toxic member:', err);
    }
  }
} else {
  chat.sendMessage(`@${sender.id.user} jangan toxic ya! Strike ${strikeMap[userId]}/3`, {
    mentions: [sender]
  });
}

} });

client.initialize();

