const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const FormData = require("form-data");

const BOT_TOKEN = "8536705149:AAFKk0RImIu1IlbhobSZLT8EChFC8yeBlgI"; // <-- Apna token yaha dal do
const RENDER_API = "https://hu-ter.onrender.com/upload"; // <-- Tumhari Render API

const botInstance = new TelegramBot(BOT_TOKEN, { polling: true });

// Map to track which chats are waiting to upload
const pendingUpload = new Map();

// Dummy membership check
async function checkMembership(chatId, senderId, isRootBot) {
  // Agar real membership system hai to use karo
  return { isMember: true };
}

// Dummy getUserBot function
function getUserBot(bot) {
  return bot;
}

// Command /getapi
botInstance.onText(/\/getapi/, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  const membership = await checkMembership(chatId, senderId, false);
  if (!membership.isMember) return;

  const userBot = getUserBot(botInstance);
  pendingUpload.set(chatId, true);
  await userBot.sendMessage(chatId, "📂 Please send the file you want to upload.");
});

// Global document listener
botInstance.on("document", async (msgDoc) => {
  const chatId = msgDoc.chat.id;

  if (!pendingUpload.has(chatId)) return; // ignore if not waiting
  pendingUpload.delete(chatId); // remove pending state

  try {
    const fileId = msgDoc.document.file_id;
    const file = await botInstance.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const responseStream = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "stream"
    });

    const form = new FormData();
    form.append("file", responseStream.data, msgDoc.document.file_name);

    // Upload to Render API
    const uploadRes = await axios.post(RENDER_API, form, {
      headers: form.getHeaders()
    });

    const userBot = getUserBot(botInstance);
    await userBot.sendMessage(
      chatId,
      `✅ File uploaded successfully!\n🌍 Public Link: ${uploadRes.data.url}`
    );

  } catch (err) {
    console.error("File Upload Error:", err);
    const userBot = getUserBot(botInstance);
    userBot.sendMessage(chatId, "❌ Upload failed. Try again.");
  }
});
