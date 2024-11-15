import { Article } from './article.entity';

export interface HomeArticlesResponse {
  coverArticle: Article | null;
  topArticles: Article[];
  homeArticles: Article[];
}

export interface ArticleCardResponse {
  id: number;
  title: string;
  subtitle: string | null;
  updatedAt: Date;
  publishedAt: Date;
  metadata: string;
  coverImage: {
    id: number;
    path: string;
  } | null;
}

export interface ArticleCardPaginatedResponse {
  data: ArticleCardResponse[];
  totalItems: number;
  totalPages: number;
}

export interface ArticlesPageResponse {
  topArticles: ArticleCardResponse[];
  archivedArticles: {
    data: ArticleCardResponse[];
    totalItems: number;
    totalPages: number;
  };
}
