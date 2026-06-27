import { useState } from 'react'
import './ProductCard.css'

export type ProductCardData = {
  id: number
  name: string
  category: string
  description: string
  price: string
  emoji: string
  isBestSeller?: boolean
}

type ProductCardProps = {
  product: ProductCardData
  onAddToCart: () => void
  onOpenProduct?: () => void
}

function ProductCard({ product, onAddToCart, onOpenProduct }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = () => {
    navigator.vibrate?.(35)
    onAddToCart()
    setIsAdded(true)

    window.setTimeout(() => {
      setIsAdded(false)
    }, 420)
  }
  return (
    <article className={`productCard ${isAdded ? 'addedToCart' : ''}`} onClick={onOpenProduct} role="button" tabIndex={0}>
      <div className="productImageBox" aria-hidden="true">
        <span className="productEmoji">{product.emoji}</span>
      </div>

      <div className="productInfo">
        <div className="productMeta">
          <span className="productCategory">{product.category}</span>
          {product.isBestSeller ? <span className="bestBadge">Best</span> : null}
        </div>

        <h3>{product.name}</h3>
      </div>

      <div className="productFooter">
        <strong>{product.price}</strong>
        <button
          className="addProductButton"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleAddToCart()
          }}
        >
          Ajouter au panier
        </button>
      </div>
    </article>
  )
}

export default ProductCard
