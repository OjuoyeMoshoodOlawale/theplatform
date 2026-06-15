/**
 * useForm.js — Standard form composable for MYS Platform
 *
 * Provides consistent validation, error state, submission handling,
 * and loading state for all forms in the app.
 *
 * Usage:
 *   const { form, errs, valid, saving, serverError, handleSubmit, setError, reset } = useForm({
 *     name: '',
 *     email: '',
 *   }, {
 *     name:  (v) => !v.trim() && 'Name is required.',
 *     email: (v) => !/\S+@\S+\.\S+/.test(v) && 'Valid email required.',
 *   });
 *
 *   const save = handleSubmit(async (data) => {
 *     await api.post('/endpoint', data);
 *   });
 */

import { reactive, ref, computed } from 'vue';

/**
 * Built-in validators (return error string or false if valid)
 */
export const validators = {
  required:     (label = 'This field') => (v) => !String(v||'').trim() && `${label} is required.`,
  email:        ()                     => (v) => !/\S+@\S+\.\S+/.test(v) && 'Enter a valid email address.',
  phone:        ()                     => (v) => !v && 'Phone number is required.',
  minLen:       (n, label = 'Field')   => (v) => String(v||'').length < n && `${label} must be at least ${n} characters.`,
  maxLen:       (n, label = 'Field')   => (v) => String(v||'').length > n && `${label} cannot exceed ${n} characters.`,
  number:       (label = 'Value')      => (v) => isNaN(Number(v)) && `${label} must be a number.`,
  positive:     (label = 'Amount')     => (v) => Number(v) <= 0 && `${label} must be greater than 0.`,
  match:        (other, label)         => (v) => v !== other.value && `${label || 'Fields'} do not match.`,
  url:          ()                     => (v) => v && !/^https?:\/\/.+/.test(v) && 'Enter a valid URL (https://…).',
  nigerianPhone:()                     => (v) => v && !/^0[789][01]\d{8}$/.test(v.replace(/\s/g,'')) && 'Enter a valid Nigerian phone number (e.g. 08012345678).',
};

/**
 * Main useForm composable
 * @param {Object} initialValues     - Initial form field values
 * @param {Object} rules             - Validation rules: { fieldName: validatorFn | validatorFn[] }
 */
export function useForm(initialValues = {}, rules = {}) {
  const form        = reactive({ ...initialValues });
  const errs        = reactive(Object.fromEntries(Object.keys(initialValues).map(k => [k, ''])));
  const saving      = ref(false);
  const serverError = ref('');

  /** True only when all rule-validated fields have no error and are not empty */
  const valid = computed(() =>
    Object.keys(rules).every(k => !errs[k]) &&
    Object.keys(rules).every(k => String(form[k]||'').trim() !== '')
  );

  /** Validate a single field */
  const validateField = (field) => {
    const rule = rules[field];
    if (!rule) return true;
    const ruleList = Array.isArray(rule) ? rule : [rule];
    for (const fn of ruleList) {
      const result = fn(form[field], form);
      if (result) { errs[field] = result; return false; }
    }
    errs[field] = '';
    return true;
  };

  /** Validate all fields — returns true if all pass */
  const validate = () => {
    let ok = true;
    for (const field of Object.keys(rules)) {
      if (!validateField(field)) ok = false;
    }
    return ok;
  };

  /** Wrap an async submit handler with validation + loading state */
  const handleSubmit = (submitFn) => async (event) => {
    event?.preventDefault?.();
    serverError.value = '';
    if (!validate()) return;
    saving.value = true;
    try {
      await submitFn({ ...form });
    } catch (err) {
      serverError.value = err.response?.data?.message || err.message || 'An error occurred.';
    } finally {
      saving.value = false;
    }
  };

  /** Set a server-returned field error (e.g. duplicate email) */
  const setError = (field, message) => { errs[field] = message; };

  /** Reset form to initial values */
  const reset = (newValues) => {
    const vals = newValues || initialValues;
    Object.keys(vals).forEach(k => { form[k] = vals[k]; });
    Object.keys(errs).forEach(k => { errs[k] = ''; });
    serverError.value = '';
  };

  /** Set multiple form values at once (e.g. when editing) */
  const setValues = (values) => {
    Object.keys(values).forEach(k => {
      if (k in form) form[k] = values[k];
    });
  };

  return {
    form,
    errs,
    valid,
    saving,
    serverError,
    validate,
    validateField,
    handleSubmit,
    setError,
    reset,
    setValues,
  };
}
