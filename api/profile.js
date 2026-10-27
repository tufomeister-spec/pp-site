// /api/profile?username=kullaniciadi
// Üçüncü taraf bir Instagram API servisine istek atar ve profil fotoğrafı adresini döner.
// Ayarlar Vercel'de "Environment Variables" bölümünden girilir (BASLA.md'ye bak):
//   API_URL  : örn. https://SERVIS.p.rapidapi.com/user?username={username}
//   API_HOST : örn. SERVIS.p.rapidapi.com
//   API_KEY  : RapidAPI anahtarın

function findPic(obj) {
  // Yanıtın içinde en yüksek çözünürlüklü profil fotoğrafını arar.
  const priority = [
    "hd_profile_pic_url_info",
    "profile_pic_url_hd",
    "hd_profile_pic_versions",
    "profile_pic_url",
    "profile_picture",
    "avatar",
  ];
  const seen = new Set();
  function walk(node) {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    for (const key of priority) {
      const v = node[key];
      if (typeof v === "string" && v.startsWith("http")) return v;
      if (v && typeof v === "object") {
        if (typeof v.url === "string") return v.url;
        if (Array.isArray(v) && v.length) {
          const last = v[v.length - 1];
          if (last && typeof last.url === "string") return last.url;
        }
      }
    }
    for (const k of Object.keys(node)) {
      const found = walk(node[k]);
      if (found) return found;
    }
    return null;
  }
  return walk(obj);
}

module.exports = async (req, res) => {
  const username = String(req.query.username || "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return res.status(400).json({ error: "Geçerli bir kullanıcı adı gir." });
  }
  const { API_URL, API_HOST, API_KEY } = process.env;
  if (!API_URL || !API_KEY) {
    return res.status(500).json({ error: "Sunucu ayarları eksik (API_URL, API_KEY)." });
  }
  try {
    const headers = { "x-rapidapi-key": API_KEY };
    if (API_HOST) headers["x-rapidapi-host"] = API_HOST;
    const r = await fetch(API_URL.replace("{username}", encodeURIComponent(username)), { headers });
    if (r.status === 404) return res.status(404).json({ error: "Bu kullanıcı bulunamadı." });
    if (!r.ok) return res.status(502).json({ error: "Veri servisi şu an yanıt vermiyor." });
    const data = await r.json();
    const url = findPic(data);
    if (!url) return res.status(404).json({ error: "Profil fotoğrafı bulunamadı." });
    // Aynı kullanıcı tekrar aranırsa API'ye yeniden ücret ödememek için 1 gün önbellek.
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({ username, url });
  } catch (e) {
    return res.status(500).json({ error: "Beklenmeyen bir hata oluştu." });
  }
};
