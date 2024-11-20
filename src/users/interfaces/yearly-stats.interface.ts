export interface YearlyStats {
  months: {
    month: string; // Ejemplo: "2024-01"
    owned: {
      count: number;
      games: {
        id: number;
        title: string;
        addedAt: Date;
        coverImage?: {
          id: number;
          path: string;
        };
      }[];
    };
    wished: {
      count: number;
      games: {
        id: number;
        title: string;
        addedAt: Date;
        coverImage?: {
          id: number;
          path: string;
        };
      }[];
    };
  }[];
}
