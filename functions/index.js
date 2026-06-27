const crypto = require('crypto')
const { setGlobalOptions } = require('firebase-functions/v2')
const { onRequest } = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
})

const db = getFirestore()

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN')
const telegramAdminIds = defineSecret('TELEGRAM_ADMIN_IDS')
const cloudinaryCloudName = defineSecret('CLOUDINARY_CLOUD_NAME')
const cloudinaryApiKey = defineSecret('CLOUDINARY_API_KEY')
const cloudinaryApiSecret = defineSecret('CLOUDINARY_API_SECRET')

const categories = ['Soft', 'Alcool', 'Puff', 'Sucré', 'Salé', 'Entretien', 'Divers']

const subCategoriesByCategory = {
  Soft: ['Canettes', 'Bouteilles', 'Energy drink', 'Jus', 'Eau', 'Sirops'],
  Alcool: ['Bières', 'Vins', 'Spiritueux', 'Prêt à boire', 'Champagnes'],
  Puff: ['Puff', 'Recharge', 'E-liquides', 'Accessoires'],
  Sucré: ['Bonbons', 'Chocolats', 'Gâteaux', 'Glaces', 'Biscuits'],
  Salé: ['Chips', 'Gâteaux apéro', 'Nouilles', 'Conserves', 'Sandwichs'],
  Entretien: ['Hygiène', 'Maison', 'Animaux', 'Nettoyage', 'Lessive'],
  Divers: ['Autres', 'Accessoires', 'Dépannage'],
}
const orderStatuses = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled']

const statusLabels = {
  pending: 'En attente',
  accepted: 'Acceptée',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Terminée',
  cancelled: 'Annulée',
}

function getAdminIds() {
  return telegramAdminIds
    .value()
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function isAdminChat(chatId) {
  return getAdminIds().includes(String(chatId))
}

function formatPrice(value) {
  const cleaned = String(value || '')
    .replace(',', '.')
    .replace('€', '')
    .trim()

  const amount = Number(cleaned)

  if (Number.isNaN(amount)) {
    return String(value || '').trim() || '0,00 €'
  }

  return `${amount.toFixed(2).replace('.', ',')} €`
}

function formatMoney(value) {
  const amount = Number(value || 0)

  if (Number.isNaN(amount)) {
    return '0,00 €'
  }

  return `${amount.toFixed(2).replace('.', ',')} €`
}

function formatDeliveryMode(mode) {
  return mode === 'pickup' ? 'Retrait boutique' : 'Livraison'
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

function formatItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '• Aucun produit indiqué'
  }

  return items
    .map((item) => {
      const quantity = Number(item.quantity || 1)
      const name = item.name || 'Produit'
      const price = item.price ? ` — ${item.price}` : ''

      return `• ${quantity}x ${name}${price}`
    })
    .join('\n')
}

function buildOrderMessage(order) {
  const customerName = order.customerName || 'Client non renseigné'
  const customerPhone = order.customerPhone || 'Téléphone non renseigné'
  const deliveryMode = formatDeliveryMode(order.deliveryMode)
  const address = order.deliveryMode === 'pickup'
    ? 'Retrait directement en boutique'
    : `${order.customerAddress || 'Adresse non renseignée'} ${order.customerPostalCode || ''}`.trim()
  const wantedTime = order.wantedTime ? `\nHeure souhaitée : ${order.wantedTime}` : ''
  const note = order.orderNote ? `\nNote : ${order.orderNote}` : ''
  const items = formatItems(order.items)

  return (
    '🚨 Nouvelle commande Alim du Cours\n\n' +
    `Client : ${customerName}\n` +
    `Téléphone : ${customerPhone}\n` +
    `Mode : ${deliveryMode}\n` +
    `Adresse : ${address}${wantedTime}${note}\n\n` +
    `Produits :\n${items}\n\n` +
    `Sous-total : ${formatMoney(order.subtotal)}\n` +
    `Livraison : ${formatMoney(order.deliveryPrice)}\n` +
    `Service : ${formatMoney(order.serviceFee)}\n` +
    `Total : ${formatMoney(order.total)}\n\n` +
    'Statut : En attente'
  )
}

function getMainMenu() {
  return {
    inline_keyboard: [
      [{ text: '➕ Ajouter un produit', callback_data: 'menu:add_product' }],
      [{ text: '🛒 Produits', callback_data: 'menu:products' }],
      [{ text: '📦 Commandes', callback_data: 'menu:orders' }],
    ],
  }
}

function getCategoryKeyboard() {
  return {
    inline_keyboard: categories.map((category) => [
      { text: category, callback_data: `add_category:${category}` },
    ]),
  }
}

function getBestSellerKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Oui, afficher en Best seller', callback_data: 'add_bestseller:true' }],
      [{ text: 'Non', callback_data: 'add_bestseller:false' }],
    ],
  }
}

function getSubCategoryKeyboard(category) {
  const subCategories = subCategoriesByCategory[category] || subCategoriesByCategory.Divers
  const rows = subCategories.map((subCategory) => [
    { text: subCategory, callback_data: `add_subcategory:${subCategory}` },
  ])

  return {
    inline_keyboard: [
      ...rows,
      [{ text: '➕ Ajouter une autre sous-section', callback_data: 'add_subcategory_custom' }],
    ],
  }
}

async function telegramApi(method, payload) {
  const token = telegramBotToken.value()
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Telegram error ${response.status}: ${errorText}`)
  }

  return response.json()
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  })
}

async function answerCallbackQuery(callbackQueryId, text) {
  return telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  })
}

async function getTelegramFile(fileId) {
  const response = await telegramApi('getFile', { file_id: fileId })
  return response.result
}

function getSessionRef(chatId) {
  return db.collection('telegramSessions').doc(String(chatId))
}

async function getSession(chatId) {
  const snap = await getSessionRef(chatId).get()
  return snap.exists ? snap.data() : null
}

async function setSession(chatId, session) {
  await getSessionRef(chatId).set({
    ...session,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

async function resetSession(chatId) {
  await getSessionRef(chatId).delete().catch(() => {})
}

async function showStart(chatId) {
  await sendTelegramMessage(
    chatId,
    'Bienvenue sur le bot admin Alim du Cours.\n\nChoisis une action :',
    getMainMenu(),
  )
}

async function startAddProduct(chatId) {
  await setSession(chatId, {
    action: 'add_product',
    step: 'name',
    data: {},
  })

  await sendTelegramMessage(chatId, 'Nom du produit ?\nExemple : Coca-Cola 1,5L')
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

  await resetSession(chatId)

  await sendTelegramMessage(
    chatId,
    `Produit ajouté avec succès.\n\n${product.name}\n${product.price}\n${product.category} / ${product.subCategory}`,
    getMainMenu(),
  )
}

function buildCloudinarySignature(params, apiSecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return crypto
    .createHash('sha1')
    .update(`${sorted}${apiSecret}`)
    .digest('hex')
}

async function uploadTelegramPhotoToCloudinary(fileId) {
  const file = await getTelegramFile(fileId)
  const token = telegramBotToken.value()
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`)

  if (!fileResponse.ok) {
    throw new Error(`Impossible de télécharger la photo Telegram: ${fileResponse.status}`)
  }

  const imageBuffer = Buffer.from(await fileResponse.arrayBuffer())
  const cloudName = cloudinaryCloudName.value()
  const apiKey = cloudinaryApiKey.value()
  const apiSecret = cloudinaryApiSecret.value()
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'alimducour/products'
  const signature = buildCloudinarySignature({ folder, timestamp }, apiSecret)

  const formData = new FormData()
  formData.append('file', new Blob([imageBuffer]), 'telegram-product.jpg')
  formData.append('folder', folder)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  const uploadData = await uploadResponse.json()

  if (!uploadResponse.ok || !uploadData.secure_url) {
    throw new Error(uploadData.error?.message || 'Upload Cloudinary impossible')
  }

  return {
    imageUrl: uploadData.secure_url,
    publicId: uploadData.public_id || '',
  }
}

async function listProducts(chatId) {
  const snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(20).get()

  if (snapshot.empty) {
    await sendTelegramMessage(chatId, 'Aucun produit pour le moment.')
    return
  }

  for (const doc of snapshot.docs) {
    const product = doc.data()
    const visibleText = product.isVisible === false ? 'Masqué' : 'Visible'
    const bestText = product.isBestSeller ? 'Best seller' : 'Standard'

    await sendTelegramMessage(
      chatId,
      `🛒 ${product.name || 'Produit'}\n` +
        `Prix : ${product.price || '-'}\n` +
        `Catégorie : ${product.category || '-'}\n` +
        `Sous-catégorie : ${product.subCategory || '-'}\n` +
        `Statut : ${visibleText}\n` +
        `Mise en avant : ${bestText}`,
      {
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
    await sendTelegramMessage(chatId, 'Aucune commande pour le moment.')
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

    await sendTelegramMessage(
      chatId,
      `📦 Commande\n` +
        `Client : ${order.customerName || '-'}\n` +
        `Téléphone : ${order.customerPhone || '-'}\n` +
        `Mode : ${deliveryText}\n` +
        `Adresse : ${order.customerAddress || '-'} ${order.customerPostalCode || ''}\n` +
        `Total : ${formatMoney(order.total)}\n` +
        `Statut : ${statusLabels[status] || status}\n` +
        `Date : ${formatDate(order.createdAt)}\n\n` +
        `Produits :\n${itemText || '-'}`,
      {
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
    )
  }
}

async function handleCallbackQuery(callbackQuery) {
  const message = callbackQuery.message
  const chatId = message.chat.id
  const data = callbackQuery.data || ''

  if (!isAdminChat(chatId)) {
    await answerCallbackQuery(callbackQuery.id, 'Accès refusé.')
    return
  }

  await answerCallbackQuery(callbackQuery.id)

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
    const session = await getSession(chatId)

    if (!session || session.action !== 'add_product') return

    session.data.category = data.replace('add_category:', '')
    session.step = 'subcategory_choice'
    await setSession(chatId, session)

    await sendTelegramMessage(
      chatId,
      `Choisis une sous-section pour ${session.data.category}.`,
      getSubCategoryKeyboard(session.data.category),
    )
    return
  }

  if (data.startsWith('add_subcategory:')) {
    const session = await getSession(chatId)

    if (!session || session.action !== 'add_product') return

    session.data.subCategory = data.replace('add_subcategory:', '')
    session.step = 'description'
    await setSession(chatId, session)

    await sendTelegramMessage(chatId, 'Description courte ?\nExemple : Boisson fraîche disponible en boutique.')
    return
  }

  if (data === 'add_subcategory_custom') {
    const session = await getSession(chatId)

    if (!session || session.action !== 'add_product') return

    session.step = 'subcategory_custom'
    await setSession(chatId, session)

    await sendTelegramMessage(chatId, 'Écris le nom de la nouvelle sous-section.\nExemple : Produits frais')
    return
  }

  if (data.startsWith('add_bestseller:')) {
    const session = await getSession(chatId)

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
      await sendTelegramMessage(chatId, 'Produit introuvable.')
      return
    }

    const current = snap.data()
    await ref.update({
      isVisible: current.isVisible === false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await sendTelegramMessage(chatId, 'Visibilité du produit mise à jour.')
    return
  }

  if (data.startsWith('product_toggle_best:')) {
    const productId = data.replace('product_toggle_best:', '')
    const ref = db.collection('products').doc(productId)
    const snap = await ref.get()

    if (!snap.exists) {
      await sendTelegramMessage(chatId, 'Produit introuvable.')
      return
    }

    const current = snap.data()
    await ref.update({
      isBestSeller: !Boolean(current.isBestSeller),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await sendTelegramMessage(chatId, 'Best seller mis à jour.')
    return
  }

  if (data.startsWith('product_delete:')) {
    const productId = data.replace('product_delete:', '')
    await db.collection('products').doc(productId).delete()
    await sendTelegramMessage(chatId, 'Produit supprimé.')
    return
  }

  if (data.startsWith('order_status:')) {
    const [, orderId, nextStatus] = data.split(':')

    if (!orderStatuses.includes(nextStatus)) {
      await sendTelegramMessage(chatId, 'Statut invalide.')
      return
    }

    await db.collection('orders').doc(orderId).update({
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await sendTelegramMessage(chatId, `Commande passée en statut : ${statusLabels[nextStatus] || nextStatus}`)
  }
}

async function handleTextMessage(message) {
  const chatId = message.chat.id
  const text = String(message.text || '').trim()

  if (!isAdminChat(chatId)) {
    await sendTelegramMessage(chatId, 'Accès refusé. Ce bot est réservé aux admins de la boutique.')
    return
  }

  if (text === '/start' || text === '/menu') {
    await resetSession(chatId)
    await showStart(chatId)
    return
  }

  if (text === '/addproduct') {
    await startAddProduct(chatId)
    return
  }

  if (text === '/products') {
    await listProducts(chatId)
    return
  }

  if (text === '/orders') {
    await listOrders(chatId)
    return
  }

  if (text.startsWith('/')) {
    await sendTelegramMessage(chatId, 'Commande inconnue. Écris /start pour ouvrir le menu.')
    return
  }

  const session = await getSession(chatId)

  if (!session || session.action !== 'add_product') return

  if (session.step === 'name') {
    session.data.name = text
    session.step = 'price'
    await setSession(chatId, session)
    await sendTelegramMessage(chatId, 'Prix ?\nExemple : 2,90 €')
    return
  }

  if (session.step === 'price') {
    session.data.price = formatPrice(text)
    session.step = 'category'
    await setSession(chatId, session)
    await sendTelegramMessage(chatId, 'Catégorie ?', getCategoryKeyboard())
    return
  }

  if (session.step === 'subcategory_choice') {
    await sendTelegramMessage(
      chatId,
      'Choisis une sous-section avec les boutons pour éviter les fautes.\nOu clique sur “➕ Ajouter une autre sous-section”.',
      getSubCategoryKeyboard(session.data.category),
    )
    return
  }

  if (session.step === 'subcategory_custom') {
    session.data.subCategory = text
    session.step = 'description'
    await setSession(chatId, session)
    await sendTelegramMessage(chatId, 'Description courte ?\nExemple : Boisson fraîche disponible en boutique.')
    return
  }

  if (session.step === 'description') {
    session.data.description = text || 'Produit disponible en boutique.'
    session.step = 'photo'
    await setSession(chatId, session)
    await sendTelegramMessage(chatId, 'Envoie maintenant une photo du produit.\nSi tu veux continuer sans photo, écris : sans photo')
    return
  }

  if (session.step === 'photo' && text.toLowerCase() === 'sans photo') {
    session.data.imageUrl = ''
    session.data.cloudinaryPublicId = ''
    session.step = 'bestseller'
    await setSession(chatId, session)
    await sendTelegramMessage(chatId, 'Afficher dans les Best sellers ?', getBestSellerKeyboard())
  }
}

async function handlePhotoMessage(message) {
  const chatId = message.chat.id

  if (!isAdminChat(chatId)) {
    await sendTelegramMessage(chatId, 'Accès refusé. Ce bot est réservé aux admins de la boutique.')
    return
  }

  const session = await getSession(chatId)

  if (!session || session.action !== 'add_product' || session.step !== 'photo') {
    await sendTelegramMessage(chatId, 'Photo reçue. Pour ajouter un produit, utilise /addproduct.')
    return
  }

  try {
    await sendTelegramMessage(chatId, 'Upload de la photo en cours...')

    const bestPhoto = message.photo[message.photo.length - 1]
    const uploadedImage = await uploadTelegramPhotoToCloudinary(bestPhoto.file_id)

    session.data.imageUrl = uploadedImage.imageUrl
    session.data.cloudinaryPublicId = uploadedImage.publicId
    session.step = 'bestseller'
    await setSession(chatId, session)

    await sendTelegramMessage(chatId, 'Photo ajoutée. Afficher dans les Best sellers ?', getBestSellerKeyboard())
  } catch (error) {
    logger.error('Erreur upload photo webhook Telegram', error)
    await sendTelegramMessage(chatId, `Impossible d’envoyer la photo : ${error.message || 'erreur inconnue'}\n\nRéessaie ou écris : sans photo`)
  }
}

exports.telegramWebhook = onRequest(
  {
    secrets: [
      telegramBotToken,
      telegramAdminIds,
      cloudinaryCloudName,
      cloudinaryApiKey,
      cloudinaryApiSecret,
    ],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(200).send('Telegram webhook actif.')
      return
    }

    try {
      const update = request.body

      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query)
      } else if (update.message?.photo) {
        await handlePhotoMessage(update.message)
      } else if (update.message?.text) {
        await handleTextMessage(update.message)
      }

      response.status(200).send('ok')
    } catch (error) {
      logger.error('Erreur webhook Telegram', error)
      response.status(200).send('ok')
    }
  },
)

exports.notifyAdminsOnNewOrder = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    secrets: [telegramBotToken, telegramAdminIds],
  },
  async (event) => {
    const snapshot = event.data

    if (!snapshot) {
      logger.warn('Nouvelle commande sans données.')
      return
    }

    const order = snapshot.data()
    const adminIds = getAdminIds()

    if (adminIds.length === 0) {
      logger.error('Admins Telegram manquants.')
      return
    }

    const message = buildOrderMessage(order)

    await Promise.all(
      adminIds.map((adminId) => sendTelegramMessage(adminId, message)),
    )

    logger.info('Notification Telegram envoyée pour une nouvelle commande.', {
      orderId: event.params.orderId,
      adminCount: adminIds.length,
    })
  },
)
