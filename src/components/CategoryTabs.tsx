import './CategoryTabs.css'

export type CategoryName = 'Best seller' | 'All' | 'Soft' | 'Alcool' | 'Puff' | 'Sucré' | 'Salé' | 'Entretien' | 'Divers'

type CategoryTabsProps = {
  categories: CategoryName[]
  activeCategory: CategoryName
  onCategoryChange: (category: CategoryName) => void
}

function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="categoryTabsWrapper">
      <section className="categoryTabs" aria-label="Catégories de produits">
        {categories.map((category) => (
          <button
            className={`categoryTab ${activeCategory === category ? 'active' : ''}`}
            type="button"
            key={category}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </section>

      <div className="scrollHint" aria-hidden="true">
        <span>›</span>
        <span>›</span>
        <span>›</span>
      </div>
    </div>
  )
}

export default CategoryTabs