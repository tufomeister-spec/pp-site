// /api/download?url=...&name=kullanici[&inline=1]
// Fotoğrafı sunucu üzerinden getirir (tarayıcı engellerini aşmak için).
// Güvenlik: yalnızca Instagram'ın görsel sunucularına izin verilir.

const ALLOWED = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i];

module.exports = async (req, res) => {
  try {
    const target = new URL(String(req.query.url || ""));
    if (target.protocol !== "https:" || !ALLOWED.some((re) => re.test(target.hostname))) {
      return res.status(400).send("İzin verilmeyen adres.");
    }
    const r = await fetch(target.href);
    if (!r.ok) return res.status(502).send("Fotoğraf alınamadı.");
    const buf = Buffer.from(await r.arrayBuffer());
    const name = String(req.query.name || "profil").replace(/[^A-Za-z0-9._-]/g, "");
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
    if (!req.query.inline) {
      res.setHeader("Content-Disposition", `attachment; filename="${name}-profil.jpg"`);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(400).send("Geçersiz istek.");
  }
};
