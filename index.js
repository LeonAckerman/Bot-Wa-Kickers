// File: index.js

const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const spamKeywords = ['http://', 'https://', 'promo', 'join grup', 'klik link'];
const toxicKeywords = [
  'bodoh', 'tolol', 'anjing', 'bangsat', 'goblok', 'idiot', 'brengsek', 'kontol',
  'memek', 'ngentot', 'cupu', 'cacat', 'babi', 'anjir', 'sinting', 'tol', 'asu',
  'plg', 'bacot', 'tai'
];
const strikeMap = {};

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startSock() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || !msg.key.remoteJid.endsWith('@g.us')) return;

    const senderId = msg.key.participant || msg.key.remoteJid;
    const from = msg.key.remoteJid;
    const messageText = msg.message.conversation?.toLowerCase() || '';

    // Cek spam
    const isSpam = spamKeywords.some(word => messageText.includes(word));
    if (isSpam) {
      console.log(`Spam terdeteksi dari ${senderId}`);
      await sock.groupParticipantsUpdate(from, [senderId], 'remove');
      await sock.sendMessage(from, { text: `@${senderId.split('@')[0]} dikeluarkan karena spam.`, mentions: [senderId] });
      return;
    }

    // Cek toxic
    const isToxic = toxicKeywords.some(word => messageText.includes(word));
    if (isToxic) {
      if (!strikeMap[senderId]) strikeMap[senderId] = 0;
      strikeMap[senderId] += 1;

      console.log(`Toxic terdeteksi dari ${senderId}, strike ke-${strikeMap[senderId]}`);

      if (strikeMap[senderId] >= 3) {
        await sock.groupParticipantsUpdate(from, [senderId], 'remove');
        await sock.sendMessage(from, { text: `@${senderId.split('@')[0]} dikeluarkan karena toxic 3x.`, mentions: [senderId] });
        delete strikeMap[senderId];
      } else {
        await sock.sendMessage(from, { text: `@${senderId.split('@')[0]} jangan toxic ya! Strike ${strikeMap[senderId]}/3`, mentions: [senderId] });
      }
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) {
        startSock();
      }
    } else if (connection === 'open') {
      console.log('Bot siap memantau grup...');
    }
  });
}

startSock();