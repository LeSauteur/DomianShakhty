export const PUBLICATION_DATE = '2026-11-03';
export const ACTIVE_LABEL = 'Актуально';
export const OWNER_APPROVAL = Object.freeze({
  date: PUBLICATION_DATE, basis: 'owner-decision', scope: 'continued-publication',
  note: 'Решение владельца от 03.11.2026 о сохранении всех опубликованных объявлений; не индивидуальный осмотр или независимая проверка.'
});
export function publicationApproval(item) {
  return {...item,status:'available',statusLabel:ACTIVE_LABEL,pageUpdatedAt:PUBLICATION_DATE,
    verifiedAt:item.verifiedAt||PUBLICATION_DATE,
    verifiedBy:item.verifiedBy||'Решение владельца от 03.11.2026: подтверждение дальнейшей публикации, не осмотр объекта',
    publicationApproval:{...OWNER_APPROVAL}};
}
export function listingFacts(item) {
  const text=[item.description,...item.features||[]].join('\n');
  const unique = re => {const a=[...new Set([...text.matchAll(re)].map(m=>Number(m[1].replace(',','.'))))];return a.length===1?a[0]:null;};
  const floor=unique(/(?:^|\n)(\d{1,3})\s*этаж(?:\s+из\s+\d+)?/giu);
  const kitchen=item.contentIssues?.some(i=>i.field==='kitchenArea')?null:unique(/(?:кухня|площадь\s+кухни)\s*(\d+(?:[.,]\d+)?)\s*м²/giu);
  const living=unique(/жилая\s+площадь\s*(\d+(?:[.,]\d+)?)\s*м²/giu);
  return {floor,kitchen,living};
}
export function publicListing(item,transform = value=>value) {
  // The existing browser catalogue needs presentation data, not approval provenance.
  const {verifiedAt,verifiedBy,publicationApproval,pageUpdatedAt,contentIssues,descriptionOriginal,featuresOriginal,source,provenance,...visible}=item;
  return {...visible,description:transform(item.description),features:(item.features||[]).map(transform)};
}
