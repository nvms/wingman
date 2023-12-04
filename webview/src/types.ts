export interface Category {
  category: string;
  items: {
    title: string;
    description: string;
    category: string;
    promptId: string;
    message: string;
    mode: string;
    modeId: string;
  }[];
}
