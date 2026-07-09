const form = document.querySelector("#guestbookForm");
const messageWall = document.querySelector("#messageWall");
const photoGrid = document.querySelector("#photoGrid");
const photoInput = document.querySelector("#photoInput");
const formNote = document.querySelector("#formNote");

const config = window.SUPABASE_CONFIG || {};
const hasSupabaseConfig =
  config.url &&
  config.anonKey &&
  !config.url.includes("PASTE_") &&
  !config.anonKey.includes("PASTE_") &&
  window.supabase;

const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;

const photoBucket = config.photoBucket || "celebration-photos";
const renderedMessageIds = new Set();
const allowedPhotoTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const createMessageCard = ({ id, name, message, prepend = false }) => {
  if (!message.trim()) {
    if (id) {
      renderedMessageIds.add(id);
    }
    return;
  }

  if (id && renderedMessageIds.has(id)) {
    return;
  }

  const card = document.createElement("article");
  card.className = "message-card message-card--accent";

  const text = document.createElement("p");
  text.textContent = message;

  const sender = document.createElement("span");
  sender.textContent = `- ${name}`;

  card.append(text, sender);

  if (prepend) {
    messageWall.prepend(card);
  } else {
    messageWall.append(card);
  }

  if (id) {
    renderedMessageIds.add(id);
  }
};

const createPhotoCard = ({ url, caption, prepend = false }) => {
  const figure = document.createElement("figure");
  figure.className = "photo-card";
  figure.style.backgroundImage = `url("${url}")`;

  const figcaption = document.createElement("figcaption");
  figcaption.textContent = caption;

  figure.append(figcaption);

  if (prepend) {
    photoGrid.prepend(figure);
  } else {
    photoGrid.append(figure);
  }
};

const renderEntry = (entry, options = {}) => {
  createMessageCard({
    id: entry.id,
    name: entry.name,
    message: entry.message,
    prepend: options.prepend,
  });

  (entry.photo_urls || []).forEach((url, index) => {
    createPhotoCard({
      url,
      caption: `${entry.name}'s photo ${index + 1}`,
      prepend: options.prepend,
    });
  });
};

const showLocalPreview = (name, message, files) => {
  createMessageCard({ name, message, prepend: true });

  files.forEach((file, index) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      createPhotoCard({
        url: reader.result,
        caption: `${name}'s photo ${index + 1}`,
        prepend: true,
      });
    });

    reader.readAsDataURL(file);
  });
};

const getFileExtension = (file) => {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName !== file.name) {
    return fromName.toLowerCase();
  }

  return file.type.split("/").pop() || "jpg";
};

const uploadPhotos = async (files) => {
  const urls = [];

  for (const file of files) {
    const extension = getFileExtension(file);
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabaseClient.storage.from(photoBucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabaseClient.storage.from(photoBucket).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
};

const loadEntries = async () => {
  if (!supabaseClient) {
    formNote.textContent =
      "Local preview mode. Add Supabase keys in supabase-config.js to sync entries for everyone.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("messages")
    .select("id, name, message, photo_urls, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    formNote.textContent = "Could not load shared entries yet.";
    return;
  }

  data.forEach((entry) => renderEntry(entry));
};

const subscribeToEntries = () => {
  if (!supabaseClient) {
    return;
  }

  supabaseClient
    .channel("celebration-messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => renderEntry(payload.new, { prepend: true })
    )
    .subscribe();
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const files = Array.from(photoInput.files || [])
    .filter((file) => allowedPhotoTypes.includes(file.type))
    .slice(0, 6);

  if ((photoInput.files || []).length > files.length) {
    formNote.textContent = "Please use JPG, PNG, GIF, or WebP photos.";
    return;
  }

  if (!name || (!message && files.length === 0)) {
    formNote.textContent = "Add a message or at least one photo.";
    return;
  }

  formNote.textContent = "Sending...";

  if (!supabaseClient) {
    showLocalPreview(name, message, files);
    form.reset();
    formNote.textContent =
      "Preview added here. Add Supabase keys in supabase-config.js to sync entries for everyone.";
    return;
  }

  try {
    const photoUrls = await uploadPhotos(files);

    const { data, error } = await supabaseClient
      .from("messages")
      .insert({
        name,
        message: message || "",
        photo_urls: photoUrls,
      })
      .select("id, name, message, photo_urls, created_at")
      .single();

    if (error) {
      throw error;
    }

    renderEntry(data, { prepend: true });
    form.reset();
    formNote.textContent = "Sent. Everyone will see it here soon.";
  } catch (error) {
    console.error(error);
    formNote.textContent = error?.message
      ? `Upload failed: ${error.message}`
      : "Something went wrong. Please try again.";
  }
});

loadEntries();
subscribeToEntries();
