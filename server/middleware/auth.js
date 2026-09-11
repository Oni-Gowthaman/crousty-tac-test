function requireChef(req, res, next) {
  if (req.session && req.session.staff && req.session.staff.role === 'chef') {
    return next();
  }
  return res.redirect('/chef/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.staff && req.session.staff.role === 'admin') {
    return next();
  }
  return res.redirect('/admin/login');
}

module.exports = { requireChef, requireAdmin };
