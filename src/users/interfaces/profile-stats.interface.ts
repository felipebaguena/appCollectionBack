export interface ProfileStats {
  recentOwnedGames: {
    id: number;
    title: string;
    addedAt: Date;
    coverImage?: {
      id: number;
      path: string;
    };
  }[];
  recentWishedGames: {
    id: number;
    title: string;
    addedAt: Date;
    coverImage?: {
      id: number;
      path: string;
    };
  }[];
  totalStats: {
    ownedGames: number;
    wishedGames: number;
    totalGames: number;
  };
  favoritePlatform?: {
    id: number;
    name: string;
    code: string;
    gamesCount: number;
  };
}
