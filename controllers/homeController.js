export function showHome(req, res) {
  res.render("index", { user: req.user });
}
