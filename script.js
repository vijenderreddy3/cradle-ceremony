(() => {
  "use strict";
  const cfg = window.CRADLE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const form = $("rsvp-form");
  const status = $("form-status");
  const submitButton = $("submit-button");
  const confirmationActions = $("confirmation-actions");
  const confirmationId = $("confirmation-id");
  const whatsappConfirm = $("whatsapp-confirm");
  const vegInput = $("veg-count");
  const nonvegInput = $("nonveg-count");
  let currentMode = "new";

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function validCount(input) {
    const value = Number(input.value);
    return Number.isInteger(value) && value >= 0 && value <= 500;
  }

  function updateTotal() {
    const veg = Number(vegInput.value) || 0;
    const nonveg = Number(nonvegInput.value) || 0;
    $("total-count").textContent = String(veg + nonveg);
  }
  vegInput.addEventListener("input", updateTotal);
  nonvegInput.addEventListener("input", updateTotal);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentMode = tab.dataset.mode;
      $("form-mode").value = currentMode;
      document.querySelectorAll(".tab").forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      $("new-fields").hidden = currentMode !== "new";
      $("update-fields").hidden = currentMode !== "update";
      $("update-phone-field").hidden = currentMode !== "update";
      $("guest-name").required = currentMode === "new";
      $("guest-phone").required = currentMode === "new";
      $("submit-button").textContent = currentMode === "new" ? "Submit RSVP" : "Update RSVP";
      confirmationActions.hidden = true;
      setStatus("");
    });
  });

  function makeRsvpId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "CRADLE-";
    const bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      for (const b of bytes) id += chars[b % chars.length];
    } else {
      for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  function normalizePhone(phone) {
    return phone.replace(/[^\d]/g, "");
  }

  function whatsappUrl(message) {
    const host = (cfg.HOST_WHATSAPP || "").replace(/[^\d]/g, "");
    if (!host || host === "REPLACE_WITH_YOUR_WHATSAPP_NUMBER") return "";
    return `https://wa.me/${host}?text=${encodeURIComponent(message)}`;
  }

  async function sendToSheet(payload) {
    const endpoint = cfg.APPS_SCRIPT_URL || "";
    if (!endpoint || endpoint.includes("PASTE_YOUR_")) {
      throw new Error("The Google Sheets connection has not been configured yet. Please contact the hosts.");
    }
    // Apps Script web apps commonly redirect their response across Google domains.
    // no-cors lets the browser send this simple form POST without requiring CORS headers.
    // The page cannot inspect the response; the confirmation therefore means the request
    // was sent, not that the server's result was independently read back by this page.
    const body = new URLSearchParams(payload);
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      body
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    confirmationActions.hidden = true;
    setStatus("");

    if (!validCount(vegInput) || !validCount(nonvegInput)) {
      setStatus("Please enter whole numbers from 0 to 500 for each meal preference.", true);
      return;
    }
    const veg = Number(vegInput.value);
    const nonveg = Number(nonvegInput.value);
    if (veg + nonveg < 1) {
      setStatus("Please enter at least one attendee.", true);
      return;
    }

    let payload;
    let id;
    let name;
    let phone;
    if (currentMode === "new") {
      name = $("guest-name").value.trim();
      phone = normalizePhone($("guest-phone").value);
      if (!name || phone.length < 7) {
        setStatus("Please enter your name and a valid phone number.", true);
        return;
      }
      id = makeRsvpId();
      payload = {
        action: "submit",
        rsvpId: id,
        name,
        phone,
        veg: String(veg),
        nonveg: String(nonveg),
        notes: $("guest-note").value.trim()
      };
    } else {
      id = $("rsvp-id").value.trim().toUpperCase();
      phone = normalizePhone($("update-phone").value);
      if (!/^CRADLE-[A-Z2-9]{6}$/.test(id) || phone.length < 7) {
        setStatus("Please enter a valid RSVP ID and the phone number used for the original RSVP.", true);
        return;
      }
      name = ""; // Apps Script preserves the original name when an update omits it.
      payload = {
        action: "update",
        rsvpId: id,
        phone,
        name,
        veg: String(veg),
        nonveg: String(nonveg),
        notes: $("guest-note").value.trim()
      };
    }

    submitButton.disabled = true;
    submitButton.textContent = currentMode === "new" ? "Sending RSVP…" : "Updating RSVP…";
    try {
      await sendToSheet(payload);
      setStatus(currentMode === "new"
        ? "Your RSVP request has been sent. Please use WhatsApp below to share/confirm your details with the hosts."
        : "Your update request has been sent. Please use WhatsApp below to notify the hosts.");
      confirmationId.textContent = `Your RSVP ID: ${id} — please save this for future updates.`;
      const message = currentMode === "new"
        ? `Hello Vijender & Mounika! I have submitted my cradle ceremony RSVP.\nName: ${name}\nRSVP ID: ${id}\nVegetarian guests: ${veg}\nNon-vegetarian guests: ${nonveg}\nTotal guests: ${veg + nonveg}\nPhone: ${phone}`
        : `Hello Vijender & Mounika! I have updated my cradle ceremony RSVP.\nRSVP ID: ${id}\nVegetarian guests: ${veg}\nNon-vegetarian guests: ${nonveg}\nTotal guests: ${veg + nonveg}\nPhone: ${phone}`;
      const wa = whatsappUrl(message);
      if (wa) {
        whatsappConfirm.href = wa;
        whatsappConfirm.hidden = false;
        whatsappConfirm.textContent = "Notify hosts on WhatsApp";
      } else {
        whatsappConfirm.hidden = true;
        setStatus(status.textContent + " WhatsApp host number is not configured yet.");
      }
      confirmationActions.hidden = false;
      if (currentMode === "new") {
        $("rsvp-id").value = id;
      }
    } catch (error) {
      setStatus(error.message || "Unable to send your RSVP. Please try again or contact the hosts.", true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = currentMode === "new" ? "Submit RSVP" : "Update RSVP";
    }
  });
})();
