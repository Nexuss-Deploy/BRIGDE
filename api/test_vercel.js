module.exports = async (req, res) => {
  res.status(200).json({ status: "ok", message: "Vercel is running" });
};
