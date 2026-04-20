const revealItems = document.querySelectorAll("[data-reveal]");
const leadForm = document.querySelector("#lead-form");
const formStatus = document.querySelector("#form-status");
const phoneInput = leadForm ? leadForm.querySelector('[name="phone"]') : null;

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  for (const item of revealItems) {
    observer.observe(item);
  }
} else {
  for (const item of revealItems) {
    item.classList.add("is-visible");
  }
}

if (phoneInput instanceof HTMLInputElement) {
  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatKazakhPhone(phoneInput.value);
    validatePhoneInput(phoneInput, { silent: true });
  });

  phoneInput.addEventListener("blur", () => {
    validatePhoneInput(phoneInput);
  });
}

if (leadForm && formStatus) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = leadForm.querySelector('button[type="submit"]');
    const formData = new FormData(leadForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: formatKazakhPhone(String(formData.get("phone") || "")),
      website: String(formData.get("website") || "").trim(),
      page: window.location.href
    };

    if (!(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    if (!(phoneInput instanceof HTMLInputElement) || !validatePhoneInput(phoneInput)) {
      if (phoneInput instanceof HTMLInputElement) {
        phoneInput.focus();
      }

      setFormStatus("Введите номер в формате +7 (700) 000-00-00.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";
    setFormStatus("Отправляем ваш контакт…", "");

    try {
      const apiEndpoint =
        window.location.protocol === "file:"
          ? "http://localhost:3000/api/lead"
          : "/api/lead";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Не удалось отправить контакт.");
      }

      leadForm.reset();

      if (phoneInput instanceof HTMLInputElement) {
        phoneInput.setCustomValidity("");
      }

      setFormStatus(
        "Спасибо. Мы свяжемся с вами и обсудим специфику вашего учета.",
        "success"
      );
    } catch (error) {
      setFormStatus(
        "Не получилось отправить форму. Напишите в WhatsApp по ссылке рядом или позвоните по номеру +7 702 132 4161.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Обсудить специфику";
    }
  });
}

function normalizeKazakhDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (!digits.startsWith("7")) {
    digits = `7${digits}`;
  }

  return digits.slice(0, 11);
}

function formatKazakhPhone(value) {
  const digits = normalizeKazakhDigits(value);

  if (!digits) {
    return "";
  }

  const local = digits.slice(1);
  let result = "+7";

  if (local.length > 0) {
    result += ` (${local.slice(0, 3)}`;
  }

  if (local.length >= 3) {
    result += ")";
  }

  if (local.length > 3) {
    result += ` ${local.slice(3, 6)}`;
  }

  if (local.length > 6) {
    result += `-${local.slice(6, 8)}`;
  }

  if (local.length > 8) {
    result += `-${local.slice(8, 10)}`;
  }

  return result;
}

function validatePhoneInput(input, options = {}) {
  const formattedValue = formatKazakhPhone(input.value);
  const isValid = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(formattedValue);

  input.value = formattedValue;

  if (!formattedValue) {
    input.setCustomValidity("Введите номер в формате +7 (700) 000-00-00.");

    if (!options.silent) {
      input.reportValidity();
    }

    return false;
  }

  if (!isValid) {
    input.setCustomValidity("Введите номер в формате +7 (700) 000-00-00.");

    if (!options.silent) {
      input.reportValidity();
    }

    return false;
  }

  input.setCustomValidity("");
  return true;
}

function setFormStatus(message, state) {
  formStatus.textContent = message;

  if (state) {
    formStatus.dataset.state = state;
  } else {
    delete formStatus.dataset.state;
  }
}
