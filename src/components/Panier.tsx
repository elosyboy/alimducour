import { type Dispatch, type SetStateAction, useState } from 'react'
import './Panier.css'

type CartItem = {
  id: number
  name: string
  category: string
  subCategory: string
  description: string
  price: string
  quantity: number
  emoji: string
  isBestSeller: boolean
}

type PanierProps = {
  cartItems: CartItem[]
  setCartItems: Dispatch<SetStateAction<CartItem[]>>
  onBack: () => void
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function parseProductPrice(price: string) {
  const normalizedPrice = price.replace('€', '').replace(',', '.').trim()
  const parsedPrice = Number.parseFloat(normalizedPrice)

  return Number.isNaN(parsedPrice) ? 0 : parsedPrice
}

function Panier({ cartItems, setCartItems, onBack }: PanierProps) {
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const subtotal = cartItems.reduce(
    (total, item) => total + parseProductPrice(item.price) * item.quantity,
    0,
  )
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)
  const deliveryPrice = deliveryMode === 'delivery' ? 3.5 : 0
  const serviceFee = cartItems.length > 0 ? 0.5 : 0
  const total = subtotal + deliveryPrice + serviceFee

  const increaseQuantity = (itemId: number) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }

  const decreaseQuantity = (itemId: number) => {
    setCartItems((items) =>
      items
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeItem = (itemId: number) => {
    setCartItems((items) => items.filter((item) => item.id !== itemId))
  }

  if (isCheckoutOpen) {
    return (
      <main className="cartPage">
        <header className="cartHeader">
          <button className="backButton" type="button" onClick={() => setIsCheckoutOpen(false)}>
            ← Retour panier
          </button>

          <div>
            <p className="cartEyebrow">Finalisation</p>
            <h1>{deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'}</h1>
          </div>
        </header>

        <section className="checkoutLayout">
          <form className="checkoutForm">
            <div className="checkoutFormHeader">
              <p className="cartEyebrow">Vos informations</p>
              <h2>Complétez la commande</h2>
              <p>
                Ces informations serviront à préparer la commande et organiser
                {deliveryMode === 'delivery' ? ' la livraison.' : ' le retrait en boutique.'}
              </p>
            </div>

            <div className="formGrid">
              <label>
                Prénom
                <input type="text" placeholder="Votre prénom" />
              </label>

              <label>
                Numéro de téléphone
                <input type="tel" placeholder="07 00 00 00 00" />
              </label>

              <label className="fullField">
                Adresse
                <input
                  type="text"
                  placeholder={
                    deliveryMode === 'delivery'
                      ? 'Adresse complète de livraison'
                      : 'Adresse facultative pour le retrait'
                  }
                />
              </label>

              <label>
                Code postal
                <input type="text" placeholder="13100" />
              </label>

              <label>
                Heure souhaitée
                <input type="time" />
              </label>

              <label className="fullField">
                Note pour la commande
                <textarea placeholder="Étage, interphone, précision, remplacement si produit absent..." />
              </label>
            </div>

            <button className="checkoutButton" type="button">
              Valider la commande
            </button>
          </form>

          <aside className="checkoutSummary">
            <p className="cartEyebrow">Résumé</p>
            <h3>{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</h3>

            <div className="summaryLines">
              <div>
                <span>Sous-total</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div>
                <span>{deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'}</span>
                <strong>{formatPrice(deliveryPrice)}</strong>
              </div>
              <div>
                <span>Service</span>
                <strong>{formatPrice(serviceFee)}</strong>
              </div>
            </div>

            <div className="totalLine">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <p className="cartNote">
              Ensuite, cette page pourra envoyer automatiquement la commande au bot Telegram.
            </p>
          </aside>
        </section>
      </main>
    )
  }

  return (
    <main className="cartPage">
      <header className="cartHeader">
        <button className="backButton" type="button" onClick={onBack}>
          ← Retour
        </button>

        <div>
          <p className="cartEyebrow">Votre commande</p>
          <h1>Panier</h1>
        </div>
      </header>

      <section className="cartLayout">
        <div className="cartItemsCard">
          <div className="cartSectionTitle">
            <h2>Articles sélectionnés</h2>
            <span>{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</span>
          </div>

          <div className="cartItemsList">
            {cartItems.length === 0 ? (
              <div className="emptyCartMessage">
                <h3>Votre panier est vide</h3>
                <p>Ajoutez des produits depuis la boutique pour commencer une commande.</p>
              </div>
            ) : null}

            {cartItems.map((item) => (
              <article className="cartItem" key={item.id}>
                <div className="cartItemEmoji">{item.emoji}</div>

                <div className="cartItemInfo">
                  <h3>{item.name}</h3>
                  <p>{item.subCategory}</p>
                </div>

                <div className="cartItemActions">
                  <div className="quantityControls" aria-label={`Quantité ${item.name}`}>
                    <button type="button" onClick={() => decreaseQuantity(item.id)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => increaseQuantity(item.id)}>
                      +
                    </button>
                  </div>

                  <button
                    className="removeItemButton"
                    type="button"
                    onClick={() => removeItem(item.id)}
                  >
                    Supprimer
                  </button>
                </div>

                <strong>{formatPrice(parseProductPrice(item.price) * item.quantity)}</strong>
              </article>
            ))}
          </div>
        </div>

        <aside className="cartSummaryCard">
          <div className="deliveryChoice">
            <button
              className={`deliveryOption ${deliveryMode === 'delivery' ? 'active' : ''}`}
              type="button"
              onClick={() => setDeliveryMode('delivery')}
            >
              Livraison
            </button>
            <button
              className={`deliveryOption ${deliveryMode === 'pickup' ? 'active' : ''}`}
              type="button"
              onClick={() => setDeliveryMode('pickup')}
            >
              Retrait
            </button>
          </div>

          <div className="addressBox">
            <p className="cartEyebrow">Adresse</p>
            <h3>6 rue de la Mule Noire</h3>
            <p>13100 Aix-en-Provence</p>
            <span>Proche Cours Mirabeau · Route d’Italie</span>
          </div>

          <div className="summaryLines">
            <div>
              <span>Sous-total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div>
              <span>Livraison</span>
              <strong>{formatPrice(deliveryPrice)}</strong>
            </div>
            <div>
              <span>Service</span>
              <strong>{formatPrice(serviceFee)}</strong>
            </div>
          </div>

          <div className="totalLine">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>

          <button
            className="checkoutButton"
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cartItems.length === 0}
          >
            Commander maintenant
          </button>

          <p className="cartNote">
            Votre panier est maintenant connecté aux produits ajoutés depuis la boutique.
          </p>
        </aside>
      </section>
    </main>
  )
}

export default Panier