/**
 * MYS Platform — Standardised API Response Utilities
 */

export const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const created = (res, data = null, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

export const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
};

export const error = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

export const notFound = (res, resource = 'Resource') => {
  return error(res, `${resource} not found`, 404);
};

export const unauthorized = (res, message = 'Unauthorised. Please log in.') => {
  return error(res, message, 401);
};

export const forbidden = (res, message = 'You do not have permission to perform this action.') => {
  return error(res, message, 403);
};

export const serverError = (res, message = 'Internal server error. Please try again later.') => {
  return error(res, message, 500);
};

export const validationError = (res, errors, message = 'Validation failed. Please check your inputs.') => {
  return res.status(422).json({ success: false, message, errors });
};

/**
 * Build pagination object for paginated queries
 */
export const buildPagination = (total, page, limit, rowCount = null) => {
  const t   = parseInt(total);
  const p   = parseInt(page);
  const l   = parseInt(limit);
  const off = (p - 1) * l;
  return {
    total:      t,
    page:       p,
    limit:      l,
    pages:      Math.ceil(t / l),       // DataTable uses .pages
    totalPages: Math.ceil(t / l),       // alias
    from:       t === 0 ? 0 : off + 1,  // DataTable uses .from
    to:         Math.min(off + (rowCount ?? l), t), // DataTable uses .to
    hasNext:    p * l < t,
    hasPrev:    p > 1,
  };
};

/**
 * Success with inline pagination meta (4th argument)
 * Used when returning paginated arrays without a wrapper
 */
export const successPaginated = (res, data, meta, message = 'Success') => {
  return res.status(200).json({ success: true, message, data, pagination: meta });
};
