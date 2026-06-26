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
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="productCard">
      <div className="productEmoji">{product.emoji}</div>

      <div className="productContent">
        <div className="productTopLine">
          <p className="productCategory">{product.category}</p>
          {product.isBestSeller ? <span className="bestBadge">Best</span> : null}
        </div>

        <h3>{product.name}</h3>
        <p className="productDescription">{product.description}</p>
      </div>

      <div className="productBottomLine">
        <strong>{product.price}</strong>
        <button className="addProductButton" type="button">
          Ajouter
        </button>
      </div>
    </article>
  )
}

export default ProductCard
