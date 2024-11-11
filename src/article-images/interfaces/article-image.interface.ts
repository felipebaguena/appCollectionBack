import { ArticleImage } from '../article-image.entity';

export interface ArticleImageWithLegacyFields extends ArticleImage {
  articleId?: number;
  article?: any; // Añadimos también la relación legacy article
}
