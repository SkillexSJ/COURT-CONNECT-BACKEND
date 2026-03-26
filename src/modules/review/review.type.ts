export interface CreateReviewInput {
  courtId?: string;
  organizerId?: string;
  rating?: number;
  comment: string;
  parentId?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}
