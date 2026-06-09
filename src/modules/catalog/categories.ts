import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { CategoryInput } from "./schemas";

async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "kategoria";
  let slug = root;
  let i = 1;
  for (;;) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
}

/** Buduje drzewo kategorii (parent → children). */
export async function listCategoryTree(): Promise<CategoryNode[]> {
  const flat = await listCategories();
  const byId = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const c of flat) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      productCount: c._count.products,
      children: [],
    });
  }
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function createCategory(input: CategoryInput) {
  const slug = await uniqueCategorySlug(input.slug || input.name);
  return prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      parentId: input.parentId || null,
    },
  });
}

export async function updateCategory(id: string, input: CategoryInput) {
  const slug = input.slug ? await uniqueCategorySlug(input.slug, id) : undefined;
  return prisma.category.update({
    where: { id },
    data: {
      ...(slug ? { slug } : {}),
      name: input.name,
      description: input.description,
      parentId: input.parentId || null,
    },
  });
}

export async function deleteCategory(id: string) {
  // odepnij dzieci do korzenia, potem soft-delete
  await prisma.category.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });
  return prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
