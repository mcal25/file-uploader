// Folder and file routes need a logged-in user because every database query
// is scoped to that user's id.
export function requireAuth(req, res, next) {
  // A stale session can pass Passport's session check even when its user no
  // longer exists. Controllers need both pieces to safely use req.user.id.
  if (req.isAuthenticated() && req.user) {
    return next();
  }

  res.redirect("/login");
}
