

require('dotenv').config()
const fs = require('fs')
const os = require('os')
const path = require('path')
const TelegramBotModule = require('node-telegram-bot-api')
const TelegramBot = TelegramBotModule.default || TelegramBotModule.TelegramBot || TelegramBotModule
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { v2: cloudinary } = require('cloudinary')

const serviceAccount = require('./serviceAccountKey.json')

const botToken = process.env.TELEGRAM_BOT_TOKEN
const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN est manquant dans telegram-bot/.env')
}

if (adminIds.length === 0) {
  throw new Error('TELEGRAM_ADMIN_IDS est manquant dans telegram-bot/.env')
}

initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const bot = new TelegramBot(botToken, { polling: true })
const userSessions = new Map()

const categories = ['Soft', 'Alcool', 'Puff', 'Sucré', 'Salé', 'Entretien', 'Divers']
const orderStatuses = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled']

const statusLabels = {
  pending: 'En attente',
  accepted: 'Acceptée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Terminée',
  cancelled: 'Annulée',
}

function isAdminChat(chatId) {
  return adminIds.includes(String(chatId))
}

function requireAdmin(message) {
  const chatId = message.chat.id

  if (!isAdminChat(chatId)) {
    bot.sendMessage(chatId, 'Accès refusé. Ce bot est réservé aux admins de la boutique.')
    return false
  }

  return true
}

function formatPrice(value) {
  const cleaned = String(value || '')
    .replace(',', '.')
    .replace('€', '')
    .trim()

  const amount = Number(cleaned)

  if (Number.isNaN(amount)) {
    return String(value || '').trim()
  }

  return `${amount.toFixed(2).replace('.', ',')} €`
}

function formatDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return 'Date inconnue'
  }

  return timestamp.toDate().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getMainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Ajouter un produit', callback_data: 'menu:add_product' }],
        [{ text: '🛒 Produits', callback_data: 'menu:products' }],
        [{ text: '📦 Commandes', callback_data: 'menu:orders' }],
      ],
    },
  }
}

function getCategoryKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: categories.map((category) => [
        { text: category, callback_data: `add_category:${category}` },
      ]),
    },
  }
}

function getBestSellerKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Oui, afficher en Best seller', callback_data: 'add_bestseller:true' }],
        [{ text: 'Non', callback_data: 'add_bestseller:false' }],
      ],
    },
  }
}

function resetSession(chatId) {
  userSessions.delete(String(chatId))
}

function setSession(chatId, session) {
  userSessions.set(String(chatId), session)
}

function getSession(chatId) {
  return userSessions.get(String(chatId))
}

async function showStart(chatId) {
  await bot.sendMessage(
    chatId,
    'Bienvenue sur le bot admin Alim du Cours.\n\nChoisis une action :',
    getMainMenu(),
  )
}

async function listProducts(chatId) {
  const snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(20).get()

  if (snapshot.empty) {
    await bot.sendMessage(chatId, 'Aucun produit pour le moment.')
    return
  }

  for (const doc of snapshot.docs) {
    const product = doc.data()
    const visibleText = product.isVisible === false ? 'Masqué' : 'Visible'
    const bestText = product.isBestSeller ? 'Best seller' : 'Standard'

    await bot.sendMessage(
      chatId,
      `🛒 ${product.name || 'Produit'}\n` +
        `Prix : ${product.price || '-'}\n` +
        `Catégorie : ${product.category || '-'}\n` +
        `Sous-catégorie : ${product.subCategory || '-'}\n` +
        `Statut : ${visibleText}\n` +
        `Mise en avant : ${bestText}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: product.isVisible === false ? 'Afficher' : 'Masquer',
                callback_data: `product_toggle_visible:${doc.id}`,
              },
              {
                text: product.isBestSeller ? 'Retirer Best' : 'Mettre Best',
                callback_data: `product_toggle_best:${doc.id}`,
              },
            ],
            [{ text: 'Supprimer', callback_data: `product_delete:${doc.id}` }],
          ],
        },
      },
    )
  }
}

async function listOrders(chatId) {
  const snapshot = await db
    .collection('orders')
    .orderBy('createdAt', 'desc')
    .limit(15)
    .get()

  if (snapshot.empty) {
    await bot.sendMessage(chatId, 'Aucune commande pour le moment.')
    return
  }

  for (const doc of snapshot.docs) {
    const order = doc.data()
    const items = Array.isArray(order.items) ? order.items : []
    const itemText = items
      .map((item) => `• ${item.quantity || 1}x ${item.name || 'Produit'}`)
      .join('\n')

    const deliveryText = order.deliveryMode === 'pickup' ? 'Retrait boutique' : 'Livraison'
    const status = String(order.status || 'pending')

    await bot.sendMessage(
      chatId,
      `📦 Commande\n` +
        `Client : ${order.customerName || '-'}\n` +
        `Téléphone : ${order.customerPhone || '-'}\n` +
        `Mode : ${deliveryText}\n` +
        `Adresse : ${order.customerAddress || '-'} ${order.customerPostalCode || ''}\n` +
        `Total : ${Number(order.total || 0).toFixed(2).replace('.', ',')} €\n` +
        `Statut : ${statusLabels[status] || status}\n` +
        `Date : ${formatDate(order.createdAt)}\n\n` +
        `Produits :\n${itemText || '-'}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Acceptée', callback_data: `order_status:${doc.id}:accepted` },
              { text: 'Préparation', callback_data: `order_status:${doc.id}:preparing` },
            ],
            [
              { text: 'Prête', callback_data: `order_status:${doc.id}:ready` },
              { text: 'Terminée', callback_data: `order_status:${doc.id}:delivered` },
            ],
            [{ text: 'Annuler', callback_data: `order_status:${doc.id}:cancelled` }],
          ],
        },
      },
    )
  }
}

async function startAddProduct(chatId) {
  setSession(chatId, {
    action: 'add_product',
    step: 'name',
    data: {},
  })

  await bot.sendMessage(chatId, 'Nom du produit ?\nExemple : Coca-Cola 1,5L')
}

async function finishProductCreation(chatId, session) {
  const product = session.data

  await db.collection('products').add({
    name: product.name,
    category: product.category,
    subCategory: product.subCategory,
    description: product.description,
    price: product.price,
    emoji: '🛒',
    imageUrl: product.imageUrl || null,
    cloudinaryPublicId: product.cloudinaryPublicId || null,
    isBestSeller: Boolean(product.isBestSeller),
    isVisible: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  resetSession(chatId)

  await bot.sendMessage(
    chatId,
    `Produit ajouté avec succès.\n\n${product.name}\n${product.price}\n${product.category} / ${product.subCategory}`,
    getMainMenu(),
  )
}

async function uploadTelegramPhoto(fileId, chatId) {
  const tempDir = path.join(os.tmpdir(), 'alimducour-telegram-bot')
  fs.mkdirSync(tempDir, { recursive: true })

  const downloadedPath = await bot.downloadFile(fileId, tempDir)

  try {
    const result = await cloudinary.uploader.upload(downloadedPath, {
      folder: 'alimducour/products',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    })

    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
    }
  } catch (error) {
    console.error('Erreur upload Cloudinary:', error)
    await bot.sendMessage(
      chatId,
      `Erreur Cloudinary : ${error.message || 'upload impossible'}\n\nVérifie CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans telegram-bot/.env`,
    )
    throw error
  } finally {
    fs.unlink(downloadedPath, () => {})
  }
}

bot.onText(/\/start/, async (message) => {
  if (!requireAdmin(message)) return

  resetSession(message.chat.id)
  await showStart(message.chat.id)
})

bot.onText(/\/menu/, async (message) => {
  if (!requireAdmin(message)) return

  resetSession(message.chat.id)
  await showStart(message.chat.id)
})

bot.onText(/\/addproduct/, async (message) => {
  if (!requireAdmin(message)) return

  await startAddProduct(message.chat.id)
})

bot.onText(/\/products/, async (message) => {
  if (!requireAdmin(message)) return

  await listProducts(message.chat.id)
})

bot.onText(/\/orders/, async (message) => {
  if (!requireAdmin(message)) return

  await listOrders(message.chat.id)
})

bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message
  const chatId = message.chat.id
  const data = callbackQuery.data || ''

  if (!isAdminChat(chatId)) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Accès refusé.' })
    return
  }

  await bot.answerCallbackQuery(callbackQuery.id)

  if (data === 'menu:add_product') {
    await startAddProduct(chatId)
    return
  }

  if (data === 'menu:products') {
    await listProducts(chatId)
    return
  }

  if (data === 'menu:orders') {
    await listOrders(chatId)
    return
  }

  if (data.startsWith('add_category:')) {
    const session = getSession(chatId)

    if (!session || session.action !== 'add_product') return

    session.data.category = data.replace('add_category:', '')
    session.step = 'subcategory'
    setSession(chatId, session)

    await bot.sendMessage(chatId, 'Sous-catégorie ?\nExemple : Canettes, Bouteilles, Bonbons, Chips, Hygiène')
    return
  }

  if (data.startsWith('add_bestseller:')) {
    const session = getSession(chatId)

    if (!session || session.action !== 'add_product') return

    session.data.isBestSeller = data.replace('add_bestseller:', '') === 'true'
    await finishProductCreation(chatId, session)
    return
  }

  if (data.startsWith('product_toggle_visible:')) {
    const productId = data.replace('product_toggle_visible:', '')
    const ref = db.collection('products').doc(productId)
    const snap = await ref.get()

    if (!snap.exists) {
      await bot.sendMessage(chatId, 'Produit introuvable.')
      return
    }

    const current = snap.data()
    await ref.update({
      isVisible: current.isVisible === false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await bot.sendMessage(chatId, 'Visibilité du produit mise à jour.')
    return
  }

  if (data.startsWith('product_toggle_best:')) {
    const productId = data.replace('product_toggle_best:', '')
    const ref = db.collection('products').doc(productId)
    const snap = await ref.get()

    if (!snap.exists) {
      await bot.sendMessage(chatId, 'Produit introuvable.')
      return
    }

    const current = snap.data()
    await ref.update({
      isBestSeller: !Boolean(current.isBestSeller),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await bot.sendMessage(chatId, 'Best seller mis à jour.')
    return
  }

  if (data.startsWith('product_delete:')) {
    const productId = data.replace('product_delete:', '')
    await db.collection('products').doc(productId).delete()
    await bot.sendMessage(chatId, 'Produit supprimé.')
    return
  }

  if (data.startsWith('order_status:')) {
    const [, orderId, nextStatus] = data.split(':')

    if (!orderStatuses.includes(nextStatus)) {
      await bot.sendMessage(chatId, 'Statut invalide.')
      return
    }

    await db.collection('orders').doc(orderId).update({
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await bot.sendMessage(chatId, `Commande passée en statut : ${statusLabels[nextStatus] || nextStatus}`)
  }
})

bot.on('message', async (message) => {
  if (!requireAdmin(message)) return

  const chatId = message.chat.id
  const text = String(message.text || '').trim()

  if (text.startsWith('/')) return

  const session = getSession(chatId)

  if (!session || session.action !== 'add_product') return

  if (session.step === 'name') {
    if (!text) {
      await bot.sendMessage(chatId, 'Écris le nom du produit.')
      return
    }

    session.data.name = text
    session.step = 'price'
    setSession(chatId, session)
    await bot.sendMessage(chatId, 'Prix ?\nExemple : 2,90 €')
    return
  }

  if (session.step === 'price') {
    if (!text) {
      await bot.sendMessage(chatId, 'Écris le prix du produit.')
      return
    }

    session.data.price = formatPrice(text)
    session.step = 'category'
    setSession(chatId, session)
    await bot.sendMessage(chatId, 'Catégorie ?', getCategoryKeyboard())
    return
  }

  if (session.step === 'subcategory') {
    if (!text) {
      await bot.sendMessage(chatId, 'Écris la sous-catégorie.')
      return
    }

    session.data.subCategory = text
    session.step = 'description'
    setSession(chatId, session)
    await bot.sendMessage(chatId, 'Description courte ?\nExemple : Boisson fraîche disponible en boutique.')
    return
  }

  if (session.step === 'description') {
    session.data.description = text || 'Produit disponible en boutique.'
    session.step = 'photo'
    setSession(chatId, session)
    await bot.sendMessage(chatId, 'Envoie maintenant une photo du produit.\nSi tu veux continuer sans photo, écris : sans photo')
    return
  }

  if (session.step === 'photo' && text.toLowerCase() === 'sans photo') {
    session.data.imageUrl = ''
    session.data.cloudinaryPublicId = ''
    session.step = 'bestseller'
    setSession(chatId, session)
    await bot.sendMessage(chatId, 'Afficher dans les Best sellers ?', getBestSellerKeyboard())
  }
})

bot.on('photo', async (message) => {
  if (!requireAdmin(message)) return

  const chatId = message.chat.id
  const session = getSession(chatId)

  if (!session || session.action !== 'add_product' || session.step !== 'photo') {
    await bot.sendMessage(chatId, 'Photo reçue. Pour ajouter un produit, utilise /addproduct.')
    return
  }

  try {
    await bot.sendMessage(chatId, 'Upload de la photo en cours...')

    const bestPhoto = message.photo[message.photo.length - 1]
    const uploadedImage = await uploadTelegramPhoto(bestPhoto.file_id, chatId)

    session.data.imageUrl = uploadedImage.imageUrl
    session.data.cloudinaryPublicId = uploadedImage.publicId
    session.step = 'bestseller'
    setSession(chatId, session)

    await bot.sendMessage(chatId, 'Photo ajoutée. Afficher dans les Best sellers ?', getBestSellerKeyboard())
  } catch (error) {
    console.error(error)
    await bot.sendMessage(chatId, 'Impossible d’envoyer la photo. Réessaie ou écris : sans photo')
  }
})

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
})

console.log('Bot Telegram Alim du Cours lancé.')