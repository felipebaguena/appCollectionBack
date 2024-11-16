import { ArticleImage } from '../../article-images/article-image.entity';

interface CoverImage {
  id: number;
  path: string;
}

export interface FormattedArticle {
  id: number;
  title: string;
  subtitle: string;
  publishedAt: Date;
  coverImage?: CoverImage;
}
