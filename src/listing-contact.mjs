const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function listingAgent(ctx, listing) {
  return ctx.team?.find(person => person.id === listing.agentId && person.verified === true) || null;
}

export function listingContact(ctx) {
  return ctx.site.listingContact || { id: 'office', name: ctx.site.displayName, role: 'Офис', phone: ctx.site.phone, phoneHref: ctx.site.phoneHref };
}

export function phoneControl(ctx, listing, agent, placement) {
  const contact = listingContact(ctx);
  const context = `data-object-id="${esc(listing.id)}"${agent ? ` data-agent-id="${esc(agent.id)}"` : ''}${listing.officeId ? ` data-office-id="${esc(listing.officeId)}"` : ''} data-contact-id="${esc(contact.id)}" data-contact-role="administrator" data-placement="${esc(placement)}"`;
  const key = `${listing.id}-administrator`;
  return `<span class="phone-control" data-phone-control="${esc(key)}" ${context}><button class="button button--ghost phone-control__reveal" type="button" data-phone-reveal aria-expanded="false" aria-controls="phone-${esc(key)}-${esc(placement)}"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3 3 5c-1 7 9 17 16 16l2-4-5-3-2 2c-3-1-5-3-6-6l2-2Z"/></svg>Показать телефон</button><a id="phone-${esc(key)}-${esc(placement)}" class="button button--ghost phone-control__number" href="${esc(contact.phoneHref)}" data-analytics="phone_click" hidden>${esc(contact.phone)}</a></span>`;
}
