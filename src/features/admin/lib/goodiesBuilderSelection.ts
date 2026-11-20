type BuilderIdentity = {business_id: string; builder_id: string};

/** Preview identities must include the merchant; stored builder IDs are scoped to a business. */
export const goodiesBuilderPreviewId = (row: BuilderIdentity) => 'admin-builder:' + encodeURIComponent(JSON.stringify([row.business_id, row.builder_id]));

export function selectedGoodiesBuilder<T extends BuilderIdentity>(rows: T[], previewId: string): T | undefined {
  return rows.find(row => goodiesBuilderPreviewId(row) === previewId);
}
