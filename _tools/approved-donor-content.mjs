// A named transport junction in the user-approved Virgo listing is local content,
// not a reference copied from another agency's site. Approve this exact route only.
const hotelId = 'shk-c02-virgo-hotel-m4';
const approvedRoute = /МОСКВА-Шахты-Новошахтинск-Новочеркасск/giu;

export function maskApprovedHotelRoute(file, source) {
  const listingData = file === 'src/data/listings.json' || file === 'dist/assets/data/listings.json';
  const rendered = file.startsWith('dist/') && /\.(?:html|json)$/u.test(file);
  if ((listingData || rendered) && source.includes(hotelId)) {
    return source.replaceAll(approvedRoute, '[approved Virgo junction]');
  }
  return source;
}
