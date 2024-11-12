import { Article } from './article.entity';

export interface HomeArticlesResponse {
  coverArticle: Article | null;
  topArticles: Article[];
  homeArticles: Article[];
}
