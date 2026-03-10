import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { Category } from './schemas/category.schema';

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  productCount?: number;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findAll(tree: boolean, includeCounts: boolean): Promise<{ items: CategoryTreeNode[] }> {
    const categories = await this.categoriesRepository.findAll(includeCounts);

    const mapped = categories.map((cat) => this.toDto(cat, includeCounts));

    if (!tree) {
      return { items: mapped.map((c) => ({ ...c, children: [] })) };
    }

    return { items: this.buildTree(categories, includeCounts) };
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepository.findBySlug(slug);
  }

  private buildTree(categories: Category[], includeCounts: boolean): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const cat of categories) {
      const id = (cat as unknown as { _id: { toString(): string } })._id.toString();
      map.set(id, { ...this.toDto(cat, includeCounts), children: [] });
    }

    for (const cat of categories) {
      const id = (cat as unknown as { _id: { toString(): string } })._id.toString();
      const node = map.get(id)!;
      const parentId = cat.parent?.toString() ?? null;

      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private toDto(cat: Category, includeCounts: boolean): CategoryTreeNode {
    const id = (cat as unknown as { _id: { toString(): string } })._id.toString();
    const dto: CategoryTreeNode = {
      id,
      name: cat.name,
      slug: cat.slug,
      iconUrl: cat.iconUrl,
      children: [],
    };
    if (includeCounts) {
      dto.productCount = cat.productCount;
    }
    return dto;
  }
}
