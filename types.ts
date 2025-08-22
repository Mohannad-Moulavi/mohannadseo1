export interface ProductData {
  correctedProductName: string; // The name corrected by AI
  englishProductName: string; // The English name of the product
  fullDescription: string;
  shortDescription: string; // A short, catchy product description
  seoTitle: string;
  slug: string; // SEO-friendly URL slug
  focusKeyword: string;
  metaDescription: string;
  keyphraseSynonyms: string[];
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}