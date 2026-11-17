(function () {
  'use strict';
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-phone-reveal]');
    if (!button) return;
    var control = button.closest('[data-phone-control]');
    if (!control || button.hidden) return;
    var key = control.dataset.phoneControl;
    document.querySelectorAll('[data-phone-control]').forEach(function (other) {
      if (other.dataset.phoneControl !== key) return;
      var reveal = other.querySelector('[data-phone-reveal]');
      reveal.setAttribute('aria-expanded', 'true');
      reveal.hidden = true;
      other.querySelector('a').hidden = false;
    });
    control.querySelector('a').focus({ preventScroll: true });
    if (window.domianTrack) window.domianTrack('phone_reveal', {
      object_id: control.dataset.objectId, agent_id: control.dataset.agentId,
      office_id: control.dataset.officeId, placement: control.dataset.placement, event_type: 'phone_reveal', contact_id: control.dataset.contactId, contact_role: control.dataset.contactRole
    });
  });
}());
