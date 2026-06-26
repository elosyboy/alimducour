import './CategoryTabs.css'

export type CategoryName = 'Best seller' | 'All' | 'Soft' | 'Alcool' | 'Sucré' | 'Salé' | 'Entretien' | 'Divers'

type CategoryTabsProps = {
  categories: CategoryName[]
  activeCategory: CategoryName
  onCategoryChange: (category: CategoryName) => void
}

function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
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
  )
}

export default CategoryTabs