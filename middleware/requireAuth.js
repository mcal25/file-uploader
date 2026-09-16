// Folder and file routes need a logged-in user because every database query
// is scoped to that user's id.
export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}
