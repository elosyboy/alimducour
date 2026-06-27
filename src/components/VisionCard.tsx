

import './VisionCard.css'

type VisionProduct = {
  id: number
  name: string
  category: string
  description: string
  price: string
  emoji: string
  isBestSeller?: boolean
}

type VisionCardProps = {
  product: VisionProduct
  onClose: () => void
  onAddToCart: () => void
}

function VisionCard({ product, onClose, onAddToCart }: VisionCardProps) {
  return (
    <div className="visionOverlay" role="presentation" onClick={onClose}>
      <article className="visionCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="visionCloseButton" type="button" onClick={onClose} aria-label="Fermer la fiche produit">
          ×
        </button>

        <div className="visionImageBox" aria-hidden="true">
          <span className="visionEmoji">{product.emoji}</span>
        </div>

        <div className="visionContent">
          <div className="visionTopLine">
            <span>{product.category}</span>
            {product.isBestSeller ? <strong>Best seller</strong> : null}
          </div>

          <h2>{product.name}</h2>
          <p>{product.description}</p>

          <div className="visionFooter">
            <strong>{product.price}</strong>
            <button className="visionAddButton" type="button" onClick={onAddToCart}>
              Ajouter au panier
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}

export default VisionCard