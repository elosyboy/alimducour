const { setGlobalOptions } = require('firebase-functions/v2')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
})

const telegramBotToken = defineSecret('TELEGRAM_BOT_TOKEN')
const telegramAdminIds = defineSecret('TELEGRAM_ADMIN_IDS')

function formatPrice(value) {
  const amount = Number(value || 0)

  if (Number.isNaN(amount)) {
    return '0,00 €'
  }

  return `${amount.toFixed(2).replace('.', ',')} €`
}

function formatDeliveryMode(mode) {
  return mode === 'pickup' ? 'Retrait boutique' : 'Livraison'
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
    `Sous-total : ${formatPrice(order.subtotal)}\n` +
    `Livraison : ${formatPrice(order.deliveryPrice)}\n` +
    `Service : ${formatPrice(order.serviceFee)}\n` +
    `Total : ${formatPrice(order.total)}\n\n` +
    'Statut : En attente'
  )
}

async function sendTelegramMessage(token, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Telegram error ${response.status}: ${errorText}`)
  }
}

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
    const token = telegramBotToken.value()
    const adminIds = telegramAdminIds
      .value()
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    if (!token || adminIds.length === 0) {
      logger.error('Secrets Telegram manquants.')
      return
    }

    const message = buildOrderMessage(order)

    await Promise.all(
      adminIds.map((adminId) => sendTelegramMessage(token, adminId, message)),
    )

    logger.info('Notification Telegram envoyée pour une nouvelle commande.', {
      orderId: event.params.orderId,
      adminCount: adminIds.length,
    })
  },
)
