
/*
 * MARCABYTE START — ESTÉTICA ROSA BELLA
 * Archivo: scripts/script.js
 * Compatible con index.html ampliado, styles.css y data/catalogo.json.
 * Sin backend, cookies, analítica ni almacenamiento de datos personales.
 */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const normalize = (value) => String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es").trim();
  const clean = (value) => String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

  // 1. NAVEGACIÓN MÓVIL
  const menuButton = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  if (menuButton && menu) {
    const isOpen = () => menuButton.getAttribute("aria-expanded") === "true";
    function closeMenu(focusButton = false) {
      if (!isOpen()) return;
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menú de navegación");
      menu.classList.remove("is-open");
      if (focusButton) menuButton.focus();
    }
    menuButton.addEventListener("click", () => {
      if (isOpen()) return closeMenu(true);
      menuButton.setAttribute("aria-expanded", "true");
      menuButton.setAttribute("aria-label", "Cerrar menú de navegación");
      menu.classList.add("is-open");
      $("a[href]", menu)?.focus();
    });
    $$('a[href]', menu).forEach(link => link.addEventListener("click", () => closeMenu()));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeMenu(true);
    });
    document.addEventListener("pointerdown", event => {
      if (isOpen() && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) closeMenu();
    });
  }

  // 2. FILTROS DE LAS NUEVE TARJETAS PRINCIPALES
  const filters = $$(".filter-chip[data-filter]");
  const cards = $$('[data-service-card][data-category]');
  const grid = $("#rejilla-servicios");
  if (filters.length && cards.length && grid) {
    grid.setAttribute("aria-live", "off");
    const announcement = document.createElement("p");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    grid.insertAdjacentElement("afterend", announcement);
    filters.forEach(button => button.addEventListener("click", () => {
      const group = button.dataset.filter;
      let count = 0;
      cards.forEach(card => {
        card.hidden = group !== "todos" && card.dataset.category !== group;
        if (!card.hidden) count++;
      });
      filters.forEach(chip => {
        const active = chip === button;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
      announcement.textContent = `${count} categorías visibles: ${button.textContent.trim()}.`;
    }));
  }

  // 3. FORMULARIO DE SOLICITUD EN TRES PASOS
  const form = $("[data-booking-form]");
  const steps = form ? $$('[data-step]', form) : [];
  const progress = $$("[data-progress]");
  const formStatus = $("#estado-formulario");
  const serviceField = $("#cita-servicio");
  const treatmentField = $("#cita-tratamiento");
  const dateField = $("#cita-fecha");
  const timeField = $("#cita-horario");
  const nameField = $("#cita-nombre");
  const commentField = $("#cita-comentario");
  const submitButton = $("[data-submit-booking]");
  const formReady = Boolean(form && steps.length === 3 && formStatus && serviceField &&
    treatmentField && dateField && timeField && commentField && submitButton);
  let currentStep = 1;
  let bookingSelection = null;

  // Se usa el día del salón, no el huso horario del dispositivo.
  function salonToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Havana", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const data = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    return `${data.year}-${data.month}-${data.day}`;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
  }
  function readableDate(value) {
    if (!value || !validDate(value)) return "Por coordinar";
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("es-CU", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
      .format(new Date(Date.UTC(y, m - 1, d)));
  }
  function notifyForm(message = "", isError = false) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.setAttribute("role", isError ? "alert" : "status");
  }
  function formError(message, field) {
    notifyForm(message, true);
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
    return false;
  }
  function checkService() {
    const selected = serviceField.value;
    if (![...serviceField.options].some(option => option.value && option.value === selected)) {
      return formError("Selecciona una categoría de servicio.", serviceField);
    }
    serviceField.removeAttribute("aria-invalid");
    return true;
  }
  function checkDate() {
    dateField.min = salonToday();
    const value = dateField.value;
    if (dateField.validity.badInput || (value && !validDate(value))) {
      return formError("Introduce una fecha válida o deja el campo vacío.", dateField);
    }
    if (value && value < salonToday()) return formError("Selecciona una fecha de hoy en adelante.", dateField);
    dateField.removeAttribute("aria-invalid");
    return true;
  }
  function formValues() {
    return {
      servicio: clean(serviceField.value),
      tratamiento: bookingSelection ? bookingSelection.name : clean(treatmentField.value),
      variante: bookingSelection?.variant?.concepto || "",
      nombre: clean(nameField?.value || ""),
      fecha: readableDate(dateField.value),
      horario: clean(timeField.value) || "Sin preferencia",
      comentario: clean(commentField.value)
    };
  }
  function renderSummary() {
    const data = formValues();
    const labels = {
      servicio: data.servicio,
      tratamiento: [data.tratamiento, data.variante].filter(Boolean).join(" — ") || "No especificado",
      nombre: data.nombre || "No indicado",
      fecha: data.fecha,
      horario: data.horario,
      comentario: data.comentario || "Sin comentarios"
    };
    $$('[data-summary]', form).forEach(item => {
      item.textContent = labels[item.dataset.summary] ?? "—";
    });
  }
  function showStep(number, focus = true) {
    if (!formReady || ![1, 2, 3].includes(number)) return;
    currentStep = number;
    if (number === 2) dateField.min = salonToday();
    if (number === 3) renderSummary();
    steps.forEach(step => { step.hidden = Number(step.dataset.step) !== number; });
    progress.forEach(item => {
      const index = Number(item.dataset.progress);
      item.classList.toggle("is-current", index === number);
      item.classList.toggle("is-complete", index < number);
      if (index === number) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    submitButton.disabled = number !== 3;
    notifyForm();
    if (focus) {
      const legend = steps[number - 1]?.querySelector("legend");
      if (legend) { legend.tabIndex = -1; legend.focus(); }
    }
  }

  if (formReady) {
    dateField.min = salonToday();
    showStep(1, false);
    form.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-next")) {
        const next = Number(button.dataset.next);
        if (next !== currentStep + 1) return;
        if (currentStep === 1 && !checkService()) return;
        if (currentStep === 2 && !checkDate()) return;
        showStep(next);
      } else if (button.hasAttribute("data-prev")) {
        const previous = Number(button.dataset.prev);
        if (previous === currentStep - 1) showStep(previous);
      }
    });
    [serviceField, treatmentField, nameField, dateField, timeField, commentField].filter(Boolean).forEach(field => {
      const reset = () => { field.removeAttribute("aria-invalid"); notifyForm(); };
      field.addEventListener("input", reset);
      field.addEventListener("change", reset);
    });
    serviceField.addEventListener("change", () => { bookingSelection = null; });
    treatmentField.addEventListener("input", () => { bookingSelection = null; });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (currentStep === 1) { if (checkService()) showStep(2); return; }
      if (currentStep === 2) { if (checkDate()) showStep(3); return; }
      if (!checkService()) { showStep(1); checkService(); return; }
      if (!checkDate()) { showStep(2); checkDate(); return; }

      const number = (form.dataset.whatsappNumber || "").replace(/\D/g, "");
      if (!/^\d{8,15}$/.test(number)) return formError("El WhatsApp del salón no está configurado correctamente.");
      const data = formValues();
      const lines = [
        "Hola, Rosa Bella. Me gustaría consultar una cita.",
        data.nombre ? `Nombre: ${data.nombre}` : null,
        `Categoría: ${data.servicio}`,
        data.tratamiento ? `Tratamiento: ${data.tratamiento}` : null,
        data.variante ? `Modalidad: ${data.variante}` : null,
        `Fecha preferida: ${data.fecha}`,
        `Horario preferido: ${data.horario}`,
        data.comentario ? `Comentario: ${data.comentario}` : null,
        "Entiendo que la reserva puede requerir un depósito inicial según el servicio.",
        "¿Podrían confirmarme disponibilidad, precio vigente y pasos para reservar?"
      ].filter(Boolean);
      // La persona envía el mensaje en WhatsApp: no hay cobro ni reserva automática.
      window.location.assign(`https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`);
    });
  } else {
    console.warn("Rosa Bella: no se pudo inicializar el formulario.");
  }

  // 4. CATÁLOGO: 10 CATEGORÍAS ORIGINALES → 9 GRUPOS VISUALES
  const dialog = $("#dialogo-catalogo");
  const searchField = $("[data-catalog-search]");
  const catalogList = $("[data-catalog-list]");
  const catalogStatus = $("#catalogo-estado");
  const detail = $("[data-catalog-detail]");
  const detailTitle = $("#catalogo-detalle-nombre");
  const variantField = $("[data-catalog-variant]");
  const priceField = $("[data-catalog-price]");
  const chooseButton = $("[data-catalog-to-booking]");
  const catalogReady = Boolean(dialog && searchField && catalogList && catalogStatus &&
    detail && detailTitle && variantField && priceField && chooseButton);
  const groupNames = {
    unas: "Uñas y pies", cabello: "Cabello", mirada: "Cejas y pestañas",
    facial: "Cuidado facial", corporal: "Corporal y depilación",
    masajes: "Masajes y bienestar", micro: "Micropigmentación",
    avanzada: "Estética avanzada", dental: "Estética dental"
  };
  let catalogData = null;
  let loadPromise = null;
  let allServices = [];
  let activeGroup = "unas";
  let selectedService = null;
  let selectedVariant = null;
  let opener = null;

  function setCatalogStatus(message) { if (catalogStatus) catalogStatus.textContent = message; }
  function create(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function canShowPrice(item) {
    return catalogData?.metadata?.todos_los_precios_pendientes_de_validacion === false &&
      catalogData?.metadata?.reglas_de_interfaz?.mostrar_importes_en_demo_publica === true &&
      item.mostrar_precio_publicamente === true &&
      item.estado_validacion === "confirmado_por_el_salon" &&
      (!item.requiere_revision_profesional || item.revision_profesional_aprobada === true) &&
      (!item.incidencias?.length || item.incidencias_resueltas === true);
  }
  function formatPrice(price) {
    if (!price || typeof price !== "object") return "Consultar tarifa";
    const number = n => Number(n).toLocaleString("es-ES", { maximumFractionDigits: 2 });
    const currency = clean(price.moneda || "USD");
    if (Number.isFinite(price.monto)) return `${number(price.monto)} ${currency}`;
    if (Number.isFinite(price.minimo) && Number.isFinite(price.maximo)) {
      return `${number(price.minimo)}–${number(price.maximo)} ${currency}`;
    }
    return "Consultar tarifa";
  }
  async function loadCatalog() {
    if (catalogData) return catalogData;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const response = await fetch("./data/catalogo.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!Array.isArray(json?.categorias_originales)) {
        throw new Error("Formato de catálogo no válido");
      }
      const entries = json.categorias_originales.flatMap(category =>
        (Array.isArray(category?.servicios) ? category.servicios : []).map(item => ({
          ...item,
          categoria_web_sugerida: Array.isArray(item?.categoria_web_sugerida) ? item.categoria_web_sugerida : [],
          tarifas_detalle: Array.isArray(item?.tarifas_detalle) ? item.tarifas_detalle : []
        }))
      );
      const ids = new Set(entries.map(item => item.id));
      if (!entries.length || ids.size !== entries.length ||
          entries.some(item => !item.id || !clean(item.nombre_original) ||
            !item.categoria_web_sugerida.some(group => Object.hasOwn(groupNames, group)))) {
        throw new Error("Hay fichas duplicadas, incompletas o sin categoría web válida");
      }
      if (json.metadata?.cantidad_fichas_originales &&
          Number(json.metadata.cantidad_fichas_originales) !== entries.length) {
        throw new Error("El total de fichas no coincide con los metadatos");
      }
      allServices = entries;
      catalogData = json;
      return json;
    })().catch(error => { loadPromise = null; throw error; });
    return loadPromise;
  }
  function clearDetail() {
    selectedService = null;
    selectedVariant = null;
    detail.hidden = true;
    chooseButton.disabled = true;
    variantField.replaceChildren();
  }
  function filteredServices() {
    const query = normalize(searchField.value);
    return allServices.filter(item => {
      if (!item.categoria_web_sugerida.includes(activeGroup)) return false;
      const text = [item.nombre_original,
        ...item.tarifas_detalle.map(t => t.concepto)].join(" ");
      return !query || normalize(text).includes(query);
    });
  }
  function renderCatalog() {
    if (!catalogReady || !catalogData) return;
    clearDetail();
    const filtered = filteredServices();
    const fragment = document.createDocumentFragment();
    filtered.forEach(item => {
      const article = create("article", "catalog-item");
      const heading = create("h3", "catalog-item__name", clean(item.nombre_original));
      const subtitle = create("p", "catalog-item__meta",
        item.tarifas_detalle.length ? `${item.tarifas_detalle.length} modalidad(es) o detalle(s)` : "Solicitar información");
      const price = create("p", "catalog-item__price",
        canShowPrice(item) && item.tarifas_detalle.length === 1
          ? `Tarifa publicada: ${formatPrice(item.tarifas_detalle[0].precio)}`
          : item.requiere_revision_profesional ? "Consultar valoración profesional" : "Precio por confirmar");
      const button = create("button", "catalog-item__action", "Ver detalles");
      button.type = "button";
      button.dataset.catalogId = item.id;
      article.append(heading, subtitle, price, button);
      fragment.append(article);
    });
    catalogList.replaceChildren(fragment);
    setCatalogStatus(`${filtered.length} ficha(s) en ${groupNames[activeGroup]}. Consulta tarifas y disponibilidad con el salón.`);
    if (!filtered.length) catalogList.append(create("p", "catalog-item__meta", "No hay coincidencias. Prueba con otra palabra."));
  }
  function renderPrice() {
    if (!selectedService) return;
    if (selectedService.requiere_revision_profesional) {
      priceField.textContent = "Requiere valoración profesional y confirmación de tarifa.";
    } else if (!canShowPrice(selectedService)) {
      priceField.textContent = "Precio pendiente de confirmación por Rosa Bella.";
    } else {
      const price = selectedVariant?.precio ||
        (!selectedService.tarifas_detalle.length ? selectedService.precio_tarjeta : null);
      priceField.textContent = `Tarifa publicada: ${formatPrice(price)}. Confirmar con el salón.`;
    }
    chooseButton.disabled = !selectedService; // Se puede consultar sin escoger variante.
  }
  function showDetail(item) {
    selectedService = item;
    selectedVariant = null;
    detailTitle.textContent = clean(item.nombre_original);
    variantField.replaceChildren();
    const options = item.tarifas_detalle;
    if (options.length > 1) {
      const placeholder = new Option("Consultar sin elegir una modalidad", "");
      variantField.append(placeholder);
    }
    options.forEach((variant, index) => {
      const label = canShowPrice(item)
        ? `${variant.concepto} · ${formatPrice(variant.precio)}`
        : variant.concepto;
      variantField.add(new Option(label, String(index)));
    });
    if (options.length === 1) {
      variantField.value = "0";
      selectedVariant = options[0];
    } else if (!options.length) {
      variantField.add(new Option("Consultar directamente", ""));
    }
    variantField.disabled = options.length <= 1;
    detail.hidden = false;
    renderPrice();
    detail.scrollIntoView({ behavior: "auto", block: "nearest" });
    detailTitle.setAttribute("tabindex", "-1");
    detailTitle.focus();
  }
  function closeCatalog() { if (dialog?.open) dialog.close(); }

  if (catalogReady) {
    $$('[data-open-catalog]').forEach(link => link.addEventListener("click", async event => {
      if (!formReady) return; // Conservar el enlace #cita si falta el formulario.
      event.preventDefault();
      activeGroup = link.dataset.openCatalog;
      opener = link;
      searchField.value = "";
      clearDetail();
      catalogList.replaceChildren();
      setCatalogStatus("Cargando tratamientos...");
      if (!dialog.open) dialog.showModal();
      try {
        await loadCatalog();
        renderCatalog();
        searchField.focus();
      } catch (error) {
        // El sitio no depende del JSON para recibir una solicitud de cita.
        console.warn("Rosa Bella: el catálogo detallado no está disponible.", error);
        closeCatalog();
        const selectedCategory = groupNames[activeGroup] || link.dataset.selectService;
        if ([...serviceField.options].some(option => option.value === selectedCategory)) {
          serviceField.value = selectedCategory;
          bookingSelection = null;
          treatmentField.value = "";
        }
        showStep(1, false);
        notifyForm("El catálogo detallado no está disponible. Puedes consultar esta categoría directamente con Rosa Bella.");
        $("#cita")?.scrollIntoView({ behavior: "smooth", block: "start" });
        serviceField.focus({ preventScroll: true });
      }
    }));
    $("[data-close-catalog]")?.addEventListener("click", closeCatalog);
    dialog.addEventListener("click", event => { if (event.target === dialog) closeCatalog(); });
    dialog.addEventListener("close", () => { if (!document.activeElement || document.activeElement === document.body) opener?.focus(); });
    searchField.addEventListener("input", renderCatalog);
    catalogList.addEventListener("click", event => {
      const button = event.target.closest("[data-catalog-id]");
      if (!button) return;
      const item = allServices.find(entry => entry.id === button.dataset.catalogId);
      if (item) showDetail(item);
    });
    variantField.addEventListener("change", () => {
      const index = variantField.value;
      selectedVariant = index === "" ? null : selectedService?.tarifas_detalle[Number(index)] || null;
      renderPrice();
    });
    chooseButton.addEventListener("click", () => {
      if (!formReady || !selectedService || chooseButton.disabled) return;
      const category = groupNames[activeGroup];
      if (![...serviceField.options].some(option => option.value === category)) return;
      serviceField.value = category;
      treatmentField.value = clean(selectedService.nombre_original)
        .slice(0, treatmentField.maxLength || 80);
      bookingSelection = {
        id: selectedService.id,
        name: clean(selectedService.nombre_original),
        variant: selectedVariant
      };
      serviceField.removeAttribute("aria-invalid");
      showStep(1, false);
      closeCatalog();
      $("#cita")?.scrollIntoView({ behavior: "smooth", block: "start" });
      serviceField.focus({ preventScroll: true });
    });
  } else {
    console.warn("Rosa Bella: no se encontraron todos los elementos del explorador.");
  }

  // Fallback de accesibilidad para tarjetas si no se ha habilitado el catálogo.
  $$('[data-select-service]:not([data-open-catalog])').forEach(link => {
    link.addEventListener("click", () => {
      if (!formReady) return;
      const requested = link.dataset.selectService;
      if ([...serviceField.options].some(option => option.value === requested)) {
        bookingSelection = null;
        serviceField.value = requested;
        showStep(1, false);
      }
    });
  });
})();
